import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  hasMedicalPilotAccess,
  mapMedicalUpstreamStatus,
  medicalSimulationRequest,
  requestHasSameOrigin,
  MedicalSimulationConfigurationError,
  MedicalSimulationUpstreamError,
} from "../../../../src/server/medical-simulation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!requestHasSameOrigin(request)) {
    return NextResponse.json({ detail: "Origin check failed." }, { status: 403 });
  }
  if (!hasMedicalPilotAccess(request)) {
    return NextResponse.json({ detail: "Pilot access is required." }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 64_000) {
    return NextResponse.json({ detail: "Scene request is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }
  const scene =
    typeof body === "object" && body !== null && "scene" in body
      ? (body as { scene?: unknown }).scene
      : null;
  const approval =
    typeof scene === "object" && scene !== null && "expert_approval_reference" in scene
      ? (scene as { expert_approval_reference?: unknown }).expert_approval_reference
      : null;
  if (typeof approval !== "string" || approval.trim().length < 6) {
    return NextResponse.json(
      { detail: "Expert approval reference is required." },
      { status: 428 },
    );
  }

  try {
    const upstream = await medicalSimulationRequest(
      "/api/medical/scenes",
      {
        method: "POST",
        headers: { "x-expert-approval-confirmed": "true" },
        body: JSON.stringify(body),
      },
      30_000,
    );
    return NextResponse.json(upstream.body, {
      status: upstream.status,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof MedicalSimulationConfigurationError) {
      return NextResponse.json(
        { detail: error.message, productionAllowed: false },
        { status: 503 },
      );
    }
    if (error instanceof MedicalSimulationUpstreamError) {
      return NextResponse.json(error.body, { status: mapMedicalUpstreamStatus(error.status) });
    }
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ detail: "Scene request timed out." }, { status: 504 });
    }
    return NextResponse.json({ detail: "arXivisual medical engine is unavailable." }, { status: 502 });
  }
}
