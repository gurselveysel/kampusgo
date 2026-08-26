import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  hasMedicalPilotAccess,
  mappedStatus,
  MedicalEngineConfigurationError,
  MedicalEngineUpstreamError,
  medicalEngineJson,
  sameOrigin,
} from "../../../../src/server/medical-simulation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ detail: "Origin check failed." }, { status: 403 });
  if (!hasMedicalPilotAccess(request)) return NextResponse.json({ detail: "Pilot access is required." }, { status: 401 });
  let payload: unknown;
  try { payload = await request.json(); }
  catch { return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 }); }
  try {
    const upstream = await medicalEngineJson(
      "/api/medical/jobs",
      { method: "POST", body: JSON.stringify(payload) },
      25000,
    );
    return NextResponse.json(upstream.body, {
      status: upstream.status,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof MedicalEngineConfigurationError) {
      return NextResponse.json({ detail: error.message }, { status: 503 });
    }
    if (error instanceof MedicalEngineUpstreamError) {
      return NextResponse.json(error.body, { status: mappedStatus(error.status) });
    }
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ detail: "Medical engine request timed out." }, { status: 504 });
    }
    return NextResponse.json({ detail: "Medical engine is unavailable." }, { status: 502 });
  }
}
