import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  hasMedicalPilotAccess,
  mappedStatus,
  MedicalEngineConfigurationError,
  MedicalEngineUpstreamError,
  medicalEngineJson,
  normalizeMedicalJobId,
} from "../../../../../src/server/medical-simulation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ jobId: string }> };

export async function GET(request: NextRequest, context: Context) {
  if (!hasMedicalPilotAccess(request)) return NextResponse.json({ detail: "Pilot access is required." }, { status: 401 });
  const { jobId: raw } = await context.params;
  const jobId = normalizeMedicalJobId(raw);
  if (!jobId) return NextResponse.json({ detail: "Invalid job ID." }, { status: 400 });
  try {
    const upstream = await medicalEngineJson(`/api/medical/jobs/${jobId}`);
    return NextResponse.json(upstream.body, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof MedicalEngineConfigurationError) return NextResponse.json({ detail: error.message }, { status: 503 });
    if (error instanceof MedicalEngineUpstreamError) return NextResponse.json(error.body, { status: mappedStatus(error.status) });
    return NextResponse.json({ detail: "Medical engine is unavailable." }, { status: 502 });
  }
}
