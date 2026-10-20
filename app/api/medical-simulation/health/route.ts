import { NextResponse } from "next/server";
import {
  mappedStatus,
  MedicalEngineConfigurationError,
  MedicalEngineUpstreamError,
  medicalEngineJson,
  medicalGatewayEnabled,
} from "../../../../src/server/medical-simulation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!medicalGatewayEnabled()) {
    return NextResponse.json(
      { status: "disabled", engine: "arXivisual", productionAllowed: false },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
  try {
    const upstream = await medicalEngineJson("/api/medical/health", {}, 5000);
    return NextResponse.json(
      { status: "reachable", upstream: upstream.body, productionAllowed: false },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof MedicalEngineConfigurationError) {
      return NextResponse.json({ status: "not_configured", detail: error.message }, { status: 503 });
    }
    if (error instanceof MedicalEngineUpstreamError) {
      return NextResponse.json({ status: "upstream_error", upstream: error.body }, { status: mappedStatus(error.status) });
    }
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ status: "timeout" }, { status: 504 });
    }
    return NextResponse.json({ status: "unreachable" }, { status: 502 });
  }
}
