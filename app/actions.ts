"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  loginDestination,
  pilotLogin,
  revokePilotSession,
  runPilotCommand,
  setPilotSession,
} from "../lib/pilot/broker";

export type LoginState = { error?: string };

const ROUTES = new Set(["dpu", "gazi"]);
const ROLES = new Set([
  "ogrenci", "ic-egitici", "dis-egitici", "koordinator", "komisyon", "komisyon-baskani",
  "ogrenci-isleri", "bilgi-islem", "mali-isler", "sistem-yoneticisi",
]);
const COMMANDS = new Set([
  "create_student_application", "create_program_proposal", "coordinator_forward", "commission_decide",
  "student_affairs_issue", "finance_dry_run", "integration_dry_run", "admin_access_check",
]);

async function assertSameOrigin() {
  const incoming = await headers();
  const origin = incoming.get("origin");
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host");
  if (!origin || !host) throw new Error("ORIGIN_REQUIRED");
  let originHost = "";
  try { originHost = new URL(origin).host; } catch { throw new Error("ORIGIN_INVALID"); }
  if (originHost.toLowerCase() !== host.split(",")[0].trim().toLowerCase()) throw new Error("ORIGIN_MISMATCH");
}

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await assertSameOrigin();
  } catch {
    return { error: "Güvenlik doğrulaması tamamlanamadı. Sayfayı yenileyip tekrar deneyin." };
  }

  const username = String(formData.get("username") ?? "").normalize("NFKC").trim().toLocaleLowerCase("tr-TR");
  const password = String(formData.get("password") ?? "");
  if (!/^[a-z0-9._-]{3,64}$/.test(username) || password.length < 12 || password.length > 256) {
    return { error: "Kullanıcı adı veya parola hatalı." };
  }

  const result = await pilotLogin(username, password);
  if (!result.ok) {
    if (result.code === "RATE_LIMITED") return { error: "Çok sayıda deneme yapıldı. 15 dakika sonra tekrar deneyin." };
    if (result.code === "SERVICE_UNAVAILABLE") return { error: "Giriş servisi geçici olarak kullanılamıyor. Lütfen biraz sonra yeniden deneyin." };
    return { error: "Kullanıcı adı veya parola hatalı." };
  }

  await setPilotSession(result.sessionToken, result.expiresIn);
  redirect(loginDestination(result.context));
}

export async function logoutAction() {
  try { await assertSameOrigin(); } catch { redirect("/giris?durum=guvenlik"); }
  await revokePilotSession();
  redirect("/giris?durum=cikis");
}

export async function workspaceCommandAction(routeSlug: string, roleKey: string, formData: FormData) {
  if (!ROUTES.has(routeSlug) || !ROLES.has(roleKey)) redirect("/kurum-sec?durum=yetkisiz");
  try { await assertSameOrigin(); } catch { redirect(`/u/${routeSlug}?rol=${encodeURIComponent(roleKey)}&hata=guvenlik`); }

  const command = String(formData.get("command") ?? "");
  if (!COMMANDS.has(command)) redirect(`/u/${routeSlug}?rol=${encodeURIComponent(roleKey)}&hata=islem`);
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    redirect(`/u/${routeSlug}?rol=${encodeURIComponent(roleKey)}&hata=islem`);
  }

  const payload: Record<string, unknown> = {};
  for (const key of ["catalogItemId", "caseId", "title", "summary", "rationale", "decision", "amount", "integrationKey"]) {
    const value = formData.get(key);
    if (typeof value === "string") payload[key] = value.slice(0, 1200);
  }

  const result = await runPilotCommand(routeSlug, roleKey, command, payload, idempotencyKey);
  if (!result.ok) {
    if (result.code === "SESSION_INVALID") redirect("/giris?durum=oturum");
    if (result.code === "ACCESS_DENIED") redirect("/kurum-sec?durum=yetkisiz");
    redirect(`/u/${routeSlug}?rol=${encodeURIComponent(roleKey)}&hata=islem`);
  }
  redirect(`/u/${routeSlug}?rol=${encodeURIComponent(roleKey)}&durum=basarili`);
}
