import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

const DEFAULT_TIMEOUT_MS = 12_000;
const ACCESS_COOKIE_NAME = "kampusgo_visual_lab_pilot";
const ACCESS_COOKIE_CONTEXT = "kampusgo-visual-lab-pilot-cookie-v1";

export class VisualLabConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisualLabConfigurationError";
  }
}

export class VisualLabUpstreamError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`Visual Lab upstream returned HTTP ${status}.`);
    this.name = "VisualLabUpstreamError";
    this.status = status;
    this.body = body;
  }
}

function envFlag(name: string, defaultValue = false): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new VisualLabConfigurationError(`${name} is not configured.`);
  }
  return value;
}

function safeEqualText(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function accessCookieValue(secret: string): string {
  return createHmac("sha256", secret).update(ACCESS_COOKIE_CONTEXT).digest("hex");
}

export function visualLabGatewayEnabled(): boolean {
  return envFlag("VISUAL_LAB_GATEWAY_ENABLED", false);
}

export function visualLabAccessCookieName(): string {
  return ACCESS_COOKIE_NAME;
}

export function validatePilotAccessToken(candidate: unknown): boolean {
  if (typeof candidate !== "string") return false;
  const expected = process.env.VISUAL_LAB_PILOT_ACCESS_TOKEN?.trim();
  const supplied = candidate.trim();
  if (!expected || expected.length < 32 || !supplied) return false;
  return safeEqualText(supplied, expected);
}

export function createPilotAccessCookieValue(): string {
  const secret = getRequiredEnv("VISUAL_LAB_PILOT_ACCESS_TOKEN");
  if (secret.length < 32) {
    throw new VisualLabConfigurationError(
      "VISUAL_LAB_PILOT_ACCESS_TOKEN must contain at least 32 characters.",
    );
  }
  return accessCookieValue(secret);
}

export function hasPilotAccess(request: NextRequest): boolean {
  if (!visualLabGatewayEnabled()) return false;

  const secret = process.env.VISUAL_LAB_PILOT_ACCESS_TOKEN?.trim();
  const supplied = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (!secret || secret.length < 32 || !supplied) return false;

  return safeEqualText(supplied, accessCookieValue(secret));
}

export function requestHasSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === request.nextUrl.origin;
}

export function normalizeArxivId(input: unknown): string | null {
  if (typeof input !== "string") return null;

  let value = input.trim();
  if (!value || value.length > 160) return null;

  value = value
    .replace(/^arxiv:\s*/i, "")
    .replace(/^https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf)\//i, "")
    .split(/[?#]/, 1)[0]
    .replace(/\.pdf$/i, "")
    .trim();

  // The pilot intentionally accepts modern IDs only. The upstream API's path
  // endpoints are not slash-safe for legacy identifiers such as hep-th/9901001.
  return /^\d{4}\.\d{4,5}(?:v\d+)?$/.test(value) ? value : null;
}

export function normalizeJobId(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  return /^job_[0-9a-f]{12}$/.test(value) ? value : null;
}

export function normalizeVideoId(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  return /^viz_[a-zA-Z0-9_]{1,120}$/.test(value) ? value : null;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  return text ? { message: text.slice(0, 2_000) } : {};
}

export async function visualLabFetchResponse(
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  if (!visualLabGatewayEnabled()) {
    throw new VisualLabConfigurationError("Visual Lab gateway is disabled.");
  }
  if (!path.startsWith("/api/")) {
    throw new Error("Visual Lab gateway only permits /api/* paths.");
  }

  const baseUrl = normalizeBaseUrl(getRequiredEnv("VISUAL_LAB_API_URL"));
  const apiKey = getRequiredEnv("VISUAL_LAB_API_KEY");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(init.headers);
    if (!headers.has("accept")) headers.set("accept", "application/json");
    headers.set("x-visual-lab-key", apiKey);
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

export async function visualLabRequest(
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<{ status: number; body: unknown }> {
  const response = await visualLabFetchResponse(path, init, timeoutMs);
  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new VisualLabUpstreamError(response.status, body);
  }

  return { status: response.status, body };
}

export function mapUpstreamStatus(status: number): number {
  if ([400, 401, 403, 404, 409, 413, 422, 429].includes(status)) return status;
  return status >= 500 ? 502 : status;
}
