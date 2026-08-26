import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  hasMedicalPilotAccess,
  mapMedicalUpstreamStatus,
  medicalSimulationGatewayEnabled,
  medicalSimulationRequest,
  MedicalSimulationConfigurationError,
  MedicalSimulationUpstreamError,
} from "../../../../src/server/medical-simulation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!medicalSimulationGatewayEnabled()) {
    return NextResponse.json(
      {
        configured: false,
        access: false,
        mode: "controlled_pilot",
        productionAllowed: false,
      },
      { status: 503 },
    );
  }

  try {
    const upstream = await medicalSimulationRequest("/api/medical/pilot");
    return NextResponse.json(
      {
        ...(typeof upstream.body === "object" && upstream.body !== null ? upstream.body : {}),
        configured: true,
        access: hasMedicalPilotAccess(request),
      },
      { status: upstream.status, headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof MedicalSimulationConfigurationError) {
      return NextResponse.json(
        { configured: false, access: false, detail: error.message, productionAllowed: false },
        { status: 503 },
      );
    }
    if (error instanceof MedicalSimulationUpstreamError) {
      return NextResponse.json(error.body, { status: mapMedicalUpstreamStatus(error.status) });
    }
    return NextResponse.json(
      { configured: true, access: false, detail: "arXivisual medical engine is unavailable." },
      { status: 502 },
    );
  }
}
