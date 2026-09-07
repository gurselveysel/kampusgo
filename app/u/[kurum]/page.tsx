import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { getPilotContext, getPilotWorkspace } from "../../../lib/pilot/broker";
import { DpuWorkspace, GaziWorkspace } from "./WorkspaceCommon";
import styles from "./workspace.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ kurum: string }>;
  searchParams: Promise<{ rol?: string; durum?: string; hata?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { kurum } = await params;
  if (kurum === "gazi") return { title: "Gazi Üniversitesi MYYS", description: "Gazi Üniversitesi hesaplı ve sentetik KampüsGO MYYS pilot çalışma alanı." };
  if (kurum === "dpu") return { title: "DPÜ MYYS", description: "Kütahya Dumlupınar Üniversitesi hesaplı KampüsGO MYYS pilot çalışma alanı." };
  return { title: "Yetkisiz çalışma alanı", description: "KampüsGO hesaplı pilot erişim denetimi." };
}

export async function generateViewport({ params }: Pick<Props, "params">): Promise<Viewport> {
  const { kurum } = await params;
  return { width: "device-width", initialScale: 1, themeColor: kurum === "gazi" ? "#113971" : kurum === "dpu" ? "#10233F" : "#0B1F33" };
}

export default async function WorkspacePage({ params, searchParams }: Props) {
  const [{ kurum }, query] = await Promise.all([params, searchParams]);
  if (kurum !== "dpu" && kurum !== "gazi") redirect("/kurum-sec?durum=yetkisiz");
  const contextResult = await getPilotContext();
  if (!contextResult.ok) redirect("/giris?durum=oturum");
  const context = contextResult.context;
  if (context.accessState !== "active") redirect("/kurum-sec");
  const membership = context.memberships.find((item) => item.routeSlug === kurum);
  if (!membership) redirect("/kurum-sec?durum=yetkisiz");
  const roleKey = query.rol ?? "";
  if (!membership.roles.some((role) => role.key === roleKey)) redirect("/kurum-sec?durum=yetkisiz");

  const workspaceResult = await getPilotWorkspace(kurum, roleKey);
  if (!workspaceResult.ok) {
    if (workspaceResult.code === "SESSION_INVALID") redirect("/giris?durum=oturum");
    redirect("/kurum-sec?durum=yetkisiz");
  }

  const message = query.durum === "basarili"
    ? <p className={styles.success} role="status">İşlem SENTETİK pilot kaydına işlendi.</p>
    : query.hata
      ? <p className={styles.failure} role="alert">İşlem tamamlanamadı. Yetki, kayıt durumu veya alanları kontrol edin.</p>
      : null;

  const props = { membership, displayName: context.displayName, roleKey, workspace: workspaceResult.workspace, message };
  return kurum === "gazi" ? <GaziWorkspace {...props} /> : <DpuWorkspace {...props} />;
}
