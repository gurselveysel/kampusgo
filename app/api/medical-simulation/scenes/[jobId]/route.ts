import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  hasMedicalPilotAccess,
  mapMedicalUpstreamStatus,
  medicalSimulationRequest,
  normalizeMedicalJobId,
  MedicalSimulationConfigurationError,
  MedicalSimulationUpstreamError,
} from "../../../../../src/server/medical-simulation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  if (!hasMedicalPilotAccess(request)) {
    return NextResponse.json({ detail: "Pilot access is required." }, { status: 401 });
  }
  const { jobId: rawJobId } = await context.params;
  const jobId = normalizeMedicalJobId(rawJobId);
  if (!jobId) return NextResponse.json({ detail: "Invalid medical scene job ID." }, { status: 400 });

  try {
    const upstream = await medicalSimulationRequest(
      `/api/medical/scenes/${encodeURIComponent(jobId)}`,
    );
    return NextResponse.json(upstream.body, {
      status: upstream.status,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof MedicalSimulationConfigurationError) {
      return NextResponse.json({ detail: error.message }, { status: 503 });
    }
    if (error instanceof MedicalSimulationUpstreamError) {
      return NextResponse.json(error.body, { status: mapMedicalUpstreamStatus(error.status) });
    }
    return NextResponse.json({ detail: "Scene status is unavailable." }, { status: 502 });
  }
}
