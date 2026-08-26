import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createMedicalCookieValue,
  hasMedicalPilotAccess,
  medicalCookieName,
  medicalGatewayEnabled,
  sameOrigin,
  validateMedicalPilotToken,
} from "../../../../src/server/medical-simulation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const enabled = medicalGatewayEnabled();
  return NextResponse.json(
    {
      status: !enabled ? "disabled" : hasMedicalPilotAccess(request) ? "authenticated" : "locked",
      productionAllowed: false,
    },
    { status: enabled ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (!medicalGatewayEnabled()) {
    return NextResponse.json({ status: "disabled", productionAllowed: false }, { status: 503 });
  }
  if (!sameOrigin(request)) return NextResponse.json({ detail: "Origin check failed." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 }); }
  const token = typeof body === "object" && body !== null && "token" in body
    ? (body as { token?: unknown }).token
    : undefined;
  if (!validateMedicalPilotToken(token)) {
    return NextResponse.json({ detail: "Invalid pilot access token." }, { status: 401 });
  }
  const response = NextResponse.json({ status: "authenticated", productionAllowed: false });
  response.cookies.set({
    name: medicalCookieName(),
    value: createMedicalCookieValue(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/medical-simulation",
    maxAge: 8 * 60 * 60,
  });
  response.headers.set("cache-control", "no-store");
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ detail: "Origin check failed." }, { status: 403 });
  const response = NextResponse.json({ status: "signed_out", productionAllowed: false });
  response.cookies.set({
    name: medicalCookieName(), value: "", httpOnly: true,
    secure: process.env.NODE_ENV === "production", sameSite: "strict",
    path: "/api/medical-simulation", maxAge: 0,
  });
  return response;
}
