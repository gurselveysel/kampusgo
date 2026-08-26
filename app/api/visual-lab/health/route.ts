import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_TIMEOUT_MS = 5_000;

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export async function GET() {
  const configuredUrl = process.env.VISUAL_LAB_API_URL?.trim();

  if (!configuredUrl) {
    return NextResponse.json(
      {
        service: "kampusgo-visual-lab",
        status: "not_configured",
        mode: "controlled_pilot",
        productionAllowed: false,
      },
      { status: 503 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${normalizeBaseUrl(configuredUrl)}/api/health`, {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const upstreamBody = contentType.includes("application/json")
      ? await response.json()
      : { message: await response.text() };

    return NextResponse.json(
      {
        service: "kampusgo-visual-lab",
        status: response.ok ? "reachable" : "upstream_error",
        upstreamStatus: response.status,
        upstream: upstreamBody,
        productionAllowed: false,
      },
      { status: response.ok ? 200 : 502 },
    );
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";

    return NextResponse.json(
      {
        service: "kampusgo-visual-lab",
        status: timedOut ? "timeout" : "unreachable",
        productionAllowed: false,
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
