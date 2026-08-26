import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createMedicalPilotCookieValue,
  medicalSimulationAccessCookieName,
  medicalSimulationGatewayEnabled,
  requestHasSameOrigin,
  validateMedicalPilotToken,
  MedicalSimulationConfigurationError,
} from "../../../../src/server/medical-simulation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!requestHasSameOrigin(request)) {
    return NextResponse.json({ detail: "Origin check failed." }, { status: 403 });
  }
  if (!medicalSimulationGatewayEnabled()) {
    return NextResponse.json(
      { detail: "arXivisual medical gateway is not configured.", productionAllowed: false },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }
  const token =
    typeof body === "object" && body !== null && "token" in body
      ? (body as { token?: unknown }).token
      : undefined;
  if (!validateMedicalPilotToken(token)) {
    return NextResponse.json({ detail: "Pilot access key is invalid." }, { status: 401 });
  }

  try {
    const response = NextResponse.json({ access: true, expiresInSeconds: 28_800 });
    response.cookies.set({
      name: medicalSimulationAccessCookieName(),
      value: createMedicalPilotCookieValue(),
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 28_800,
    });
    return response;
  } catch (error) {
    const detail =
      error instanceof MedicalSimulationConfigurationError
        ? error.message
        : "Pilot access could not be established.";
    return NextResponse.json({ detail }, { status: 503 });
  }
}
