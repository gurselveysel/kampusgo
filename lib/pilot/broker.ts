import "server-only";

import { cookies } from "next/headers";
import type { BrokerResult, PilotContext, PilotWorkspace } from "./types";

const FALLBACK_BROKER_URL = "https://xpjkrwzgimdxsasqszfi.supabase.co/functions/v1/pilot-auth-broker";
const COOKIE_NAME = process.env.NODE_ENV === "production"
  ? "__Host-kampusgo-session"
  : "kampusgo-session-dev";

type LoginResult = BrokerResult<{
  sessionToken: string;
  expiresIn: number;
  context: PilotContext;
}>;

async function requestBroker<T>(body: Record<string, unknown>, sessionToken?: string): Promise<BrokerResult<T>> {
  const brokerUrl = process.env.PILOT_AUTH_BROKER_URL ?? FALLBACK_BROKER_URL;
  try {
    const response = await fetch(brokerUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(sessionToken ? { "x-pilot-session": sessionToken } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const payload = await response.json().catch(() => null) as BrokerResult<T> | null;
    if (!payload || typeof payload !== "object" || !("ok" in payload)) {
      return { ok: false, code: "SERVICE_UNAVAILABLE" };
    }
    return payload;
  } catch {
    return { ok: false, code: "SERVICE_UNAVAILABLE" };
  }
}

export async function pilotLogin(username: string, password: string): Promise<LoginResult> {
  return requestBroker({ op: "login", username, password });
}

export async function setPilotSession(sessionToken: string, expiresIn: number) {
  const store = await cookies();
  store.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.min(expiresIn, 8 * 60 * 60),
    priority: "high",
  });
}

export async function clearPilotSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getPilotSessionToken() {
  return (await cookies()).get(COOKIE_NAME)?.value ?? null;
}

export async function getPilotContext(): Promise<BrokerResult<{ context: PilotContext }>> {
  const token = await getPilotSessionToken();
  if (!token) return { ok: false, code: "SESSION_INVALID" };
  return requestBroker({ op: "context" }, token);
}

export async function getPilotWorkspace(routeSlug: string, roleKey: string): Promise<BrokerResult<{ workspace: PilotWorkspace }>> {
  const token = await getPilotSessionToken();
  if (!token) return { ok: false, code: "SESSION_INVALID" };
  return requestBroker({ op: "workspace", routeSlug, roleKey }, token);
}

export async function runPilotCommand(
  routeSlug: string,
  roleKey: string,
  command: string,
  payload: Record<string, unknown>,
  idempotencyKey: string,
): Promise<BrokerResult<{ result: Record<string, unknown> }>> {
  const token = await getPilotSessionToken();
  if (!token) return { ok: false, code: "SESSION_INVALID" };
  return requestBroker({ op: "command", routeSlug, roleKey, command, payload, idempotencyKey }, token);
}

export async function revokePilotSession(): Promise<BrokerResult<{ revoked: true }>> {
  const token = await getPilotSessionToken();
  if (token) {
    const result = await requestBroker({ op: "logout" }, token);
    // A network failure is not proof of revocation. Keep the cookie for a retry.
    if (!result.ok && result.code !== "SESSION_INVALID") return result;
  }
  await clearPilotSession();
  return { ok: true, revoked: true };
}

export function loginDestination(context: PilotContext) {
  if (context.accessState !== "active" || context.memberships.length !== 1) return "/kurum-sec";
  const membership = context.memberships[0];
  if (membership.roles.length !== 1) return "/kurum-sec";
  return `/u/${membership.routeSlug}?rol=${encodeURIComponent(membership.roles[0].key)}`;
}
