import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_TIMEOUT_MS = 5_000;

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export async function GET() {
  const configuredUrl = process.env.VISUAL_LAB_API_URL?.trim();
  const apiKey = process.env.VISUAL_LAB_API_KEY?.trim();

  if (!configuredUrl || !apiKey) {
    return NextResponse.json(
      {
        service: "kampusgo-visual-lab",
        status: "not_configured",
        missing: [
          !configuredUrl ? "VISUAL_LAB_API_URL" : null,
          !apiKey ? "VISUAL_LAB_API_KEY" : null,
        ].filter(Boolean),
        productionAllowed: false,
      },
      { status: 503 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${normalizeBaseUrl(configuredUrl)}/api/pilot`, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "x-visual-lab-key": apiKey,
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
        status: response.ok ? "authenticated" : "upstream_error",
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
