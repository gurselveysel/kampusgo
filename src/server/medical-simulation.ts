import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

const DEFAULT_TIMEOUT_MS = 15_000;
const ACCESS_COOKIE_NAME = "teys_medical_simulation_pilot";
const ACCESS_COOKIE_CONTEXT = "teys-medical-simulation-pilot-cookie-v1";

export class MedicalSimulationConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MedicalSimulationConfigurationError";
  }
}

export class MedicalSimulationUpstreamError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`Medical simulation upstream returned HTTP ${status}.`);
    this.name = "MedicalSimulationUpstreamError";
    this.status = status;
    this.body = body;
  }
}

function envFlag(name: string, defaultValue = false): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new MedicalSimulationConfigurationError(`${name} is not configured.`);
  return value;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function accessCookieValue(secret: string): string {
  return createHmac("sha256", secret).update(ACCESS_COOKIE_CONTEXT).digest("hex");
}

export function medicalSimulationGatewayEnabled(): boolean {
  return envFlag("MEDICAL_SIMULATION_GATEWAY_ENABLED", false);
}

export function medicalSimulationAccessCookieName(): string {
  return ACCESS_COOKIE_NAME;
}

export function validateMedicalPilotToken(candidate: unknown): boolean {
  if (typeof candidate !== "string") return false;
  const expected = process.env.MEDICAL_SIMULATION_PILOT_ACCESS_TOKEN?.trim();
  const supplied = candidate.trim();
  if (!expected || expected.length < 32 || !supplied) return false;
  return safeEqual(supplied, expected);
}

export function createMedicalPilotCookieValue(): string {
  const secret = requiredEnv("MEDICAL_SIMULATION_PILOT_ACCESS_TOKEN");
  if (secret.length < 32) {
    throw new MedicalSimulationConfigurationError(
      "MEDICAL_SIMULATION_PILOT_ACCESS_TOKEN must contain at least 32 characters.",
    );
  }
  return accessCookieValue(secret);
}

export function hasMedicalPilotAccess(request: NextRequest): boolean {
  if (!medicalSimulationGatewayEnabled()) return false;
  const secret = process.env.MEDICAL_SIMULATION_PILOT_ACCESS_TOKEN?.trim();
  const supplied = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (!secret || secret.length < 32 || !supplied) return false;
  return safeEqual(supplied, accessCookieValue(secret));
}

export function requestHasSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export function normalizeMedicalJobId(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  return /^medjob_[0-9a-f]{16}$/.test(value) ? value : null;
}

export function normalizeMedicalVideoId(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  return /^medviz_[0-9a-f]{16}$/.test(value) ? value : null;
}

export function allowedMedicalMediaUrl(input: string | null): URL | null {
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;

  const allowedHosts = (process.env.MEDICAL_SIMULATION_MEDIA_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const hostname = url.hostname.toLowerCase();
  const allowed = allowedHosts.some((pattern) => {
    if (pattern.startsWith("*.")) {
      const suffix = pattern.slice(1);
      return hostname.endsWith(suffix) && hostname.length > suffix.length;
    }
    return hostname === pattern;
  });
  return allowed ? url : null;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return response.json();
  const text = await response.text();
  return text ? { detail: text.slice(0, 2_000) } : {};
}

export async function medicalSimulationFetchResponse(
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  if (!medicalSimulationGatewayEnabled()) {
    throw new MedicalSimulationConfigurationError("Medical simulation gateway is disabled.");
  }
  if (!path.startsWith("/api/medical/")) {
    throw new Error("Medical simulation gateway permits only /api/medical/* paths.");
  }

  const baseUrl = normalizeBaseUrl(requiredEnv("MEDICAL_SIMULATION_API_URL"));
  const apiKey = requiredEnv("MEDICAL_SIMULATION_API_KEY");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(init.headers);
    if (!headers.has("accept")) headers.set("accept", "application/json");
    headers.set("x-medical-simulation-key", apiKey);
    if (init.body !== undefined && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    return await fetch(`${baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function medicalSimulationRequest(
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<{ status: number; body: unknown }> {
  const response = await medicalSimulationFetchResponse(path, init, timeoutMs);
  const body = await parseResponseBody(response);
  if (!response.ok) throw new MedicalSimulationUpstreamError(response.status, body);
  return { status: response.status, body };
}

export function mapMedicalUpstreamStatus(status: number): number {
  if ([400, 401, 403, 404, 409, 413, 422, 428, 429].includes(status)) return status;
  return status >= 500 ? 502 : status;
}
