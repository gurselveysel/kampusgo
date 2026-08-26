import { NextResponse } from "next/server";
import {
  mapUpstreamStatus,
  VisualLabConfigurationError,
  VisualLabUpstreamError,
  visualLabGatewayEnabled,
  visualLabRequest,
} from "../../../../src/server/visual-lab";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!visualLabGatewayEnabled()) {
    return NextResponse.json(
      {
        service: "kampusgo-visual-lab",
        status: "disabled",
        productionAllowed: false,
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const upstream = await visualLabRequest("/api/pilot", {}, 5_000);
    return NextResponse.json(
      {
        service: "kampusgo-visual-lab",
        status: "authenticated",
        upstreamStatus: upstream.status,
        upstream: upstream.body,
        productionAllowed: false,
      },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof VisualLabConfigurationError) {
      return NextResponse.json(
        {
          service: "kampusgo-visual-lab",
          status: "not_configured",
          detail: error.message,
          productionAllowed: false,
        },
        { status: 503, headers: { "cache-control": "no-store" } },
      );
    }
    if (error instanceof VisualLabUpstreamError) {
      return NextResponse.json(
        {
          service: "kampusgo-visual-lab",
          status: "upstream_error",
          upstreamStatus: error.status,
          upstream: error.body,
          productionAllowed: false,
        },
        {
          status: mapUpstreamStatus(error.status),
          headers: { "cache-control": "no-store" },
        },
      );
    }
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        {
          service: "kampusgo-visual-lab",
          status: "timeout",
          productionAllowed: false,
        },
        { status: 504, headers: { "cache-control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        service: "kampusgo-visual-lab",
        status: "unreachable",
        productionAllowed: false,
      },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
