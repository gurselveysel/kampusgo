import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "teys_medical_pilot";
const COOKIE_CONTEXT = "teys-medical-simulation-pilot-v1";
const DEFAULT_TIMEOUT_MS = 15_000;

export class MedicalEngineConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MedicalEngineConfigurationError";
  }
}

export class MedicalEngineUpstreamError extends Error {
  constructor(readonly status: number, readonly body: unknown) {
    super(`Medical simulation engine returned HTTP ${status}.`);
    this.name = "MedicalEngineUpstreamError";
  }
}

function flag(name: string, fallback = false): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new MedicalEngineConfigurationError(`${name} is not configured.`);
  return value;
}

function equal(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function cookieValue(secret: string): string {
  return createHmac("sha256", secret).update(COOKIE_CONTEXT).digest("hex");
}

export function medicalGatewayEnabled(): boolean {
  return flag("MEDICAL_SIMULATION_GATEWAY_ENABLED", false);
}

export function medicalCookieName(): string {
  return COOKIE_NAME;
}

export function validateMedicalPilotToken(candidate: unknown): boolean {
  if (typeof candidate !== "string") return false;
  const expected = process.env.MEDICAL_SIMULATION_PILOT_ACCESS_TOKEN?.trim();
  if (!expected || expected.length < 32) return false;
  return equal(candidate.trim(), expected);
}

export function createMedicalCookieValue(): string {
  const secret = required("MEDICAL_SIMULATION_PILOT_ACCESS_TOKEN");
  if (secret.length < 32) {
    throw new MedicalEngineConfigurationError(
      "MEDICAL_SIMULATION_PILOT_ACCESS_TOKEN must contain at least 32 characters.",
    );
  }
  return cookieValue(secret);
}

export function hasMedicalPilotAccess(request: NextRequest): boolean {
  if (!medicalGatewayEnabled()) return false;
  const secret = process.env.MEDICAL_SIMULATION_PILOT_ACCESS_TOKEN?.trim();
  const supplied = request.cookies.get(COOKIE_NAME)?.value;
  return Boolean(secret && secret.length >= 32 && supplied && equal(supplied, cookieValue(secret)));
}

export function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export function normalizeMedicalJobId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^med_[0-9a-f]{16}$/.test(value.trim()) ? value.trim() : null;
}

export function normalizeMedicalAssetId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^med_[0-9a-f]{16}\.mp4$/.test(value.trim()) ? value.trim() : null;
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return response.json();
  const text = await response.text();
  return { message: text.slice(0, 2000) };
}

export async function medicalEngineFetch(
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  if (!medicalGatewayEnabled()) {
    throw new MedicalEngineConfigurationError("Medical simulation gateway is disabled.");
  }
  if (!path.startsWith("/api/medical/")) {
    throw new Error("Only /api/medical/* engine paths are permitted.");
  }
  const baseUrl = required("MEDICAL_SIMULATION_ENGINE_URL").replace(/\/+$/, "");
  const engineKey = required("MEDICAL_SIMULATION_ENGINE_KEY");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers(init.headers);
    headers.set("accept", headers.get("accept") ?? "application/json");
    headers.set("x-teys-engine-key", engineKey);
    if (init.body !== undefined && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    return await fetch(`${baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers,
      redirect: "manual",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function medicalEngineJson(
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<{ status: number; body: unknown }> {
  const response = await medicalEngineFetch(path, init, timeoutMs);
  const body = await parseBody(response);
  if (!response.ok) throw new MedicalEngineUpstreamError(response.status, body);
  return { status: response.status, body };
}

export function mappedStatus(status: number): number {
  if ([400, 401, 403, 404, 409, 413, 422, 428, 429].includes(status)) return status;
  return status >= 500 ? 502 : status;
}
