import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  hasMedicalPilotAccess,
  mappedStatus,
  MedicalEngineConfigurationError,
  MedicalEngineUpstreamError,
  medicalEngineJson,
  normalizeMedicalAssetId,
  normalizeMedicalJobId,
} from "../../../../../../src/server/medical-simulation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ jobId: string }> };
type RecordValue = Record<string, unknown>;

export async function GET(request: NextRequest, context: Context) {
  if (!hasMedicalPilotAccess(request)) return NextResponse.json({ detail: "Pilot access is required." }, { status: 401 });
  const { jobId: raw } = await context.params;
  const jobId = normalizeMedicalJobId(raw);
  if (!jobId) return NextResponse.json({ detail: "Invalid job ID." }, { status: 400 });
  try {
    const upstream = await medicalEngineJson(`/api/medical/jobs/${jobId}/result`);
    const body = typeof upstream.body === "object" && upstream.body !== null
      ? { ...(upstream.body as RecordValue) }
      : upstream.body;
    if (typeof body === "object" && body !== null && "video_url" in body) {
      const original = (body as RecordValue).video_url;
      const asset = typeof original === "string" ? normalizeMedicalAssetId(original.split("/").pop()) : null;
      (body as RecordValue).video_url = asset ? `/api/medical-simulation/media/${asset}` : null;
    }
    return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof MedicalEngineConfigurationError) return NextResponse.json({ detail: error.message }, { status: 503 });
    if (error instanceof MedicalEngineUpstreamError) return NextResponse.json(error.body, { status: mappedStatus(error.status) });
    return NextResponse.json({ detail: "Medical result is unavailable." }, { status: 502 });
  }
}
