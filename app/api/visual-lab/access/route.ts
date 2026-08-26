import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createPilotAccessCookieValue,
  requestHasSameOrigin,
  validatePilotAccessToken,
  visualLabAccessCookieName,
  visualLabGatewayEnabled,
} from "@/src/server/visual-lab";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COOKIE_MAX_AGE_SECONDS = 8 * 60 * 60;

export async function POST(request: NextRequest) {
  if (!visualLabGatewayEnabled()) {
    return NextResponse.json(
      { status: "disabled", productionAllowed: false },
      { status: 503 },
    );
  }

  if (!requestHasSameOrigin(request)) {
    return NextResponse.json({ detail: "Origin check failed." }, { status: 403 });
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

  if (!validatePilotAccessToken(token)) {
    return NextResponse.json({ detail: "Invalid pilot access token." }, { status: 401 });
  }

  const response = NextResponse.json({ status: "authenticated", productionAllowed: false });
  response.cookies.set({
    name: visualLabAccessCookieName(),
    value: createPilotAccessCookieValue(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/visual-lab",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  response.headers.set("cache-control", "no-store");
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!requestHasSameOrigin(request)) {
    return NextResponse.json({ detail: "Origin check failed." }, { status: 403 });
  }

  const response = NextResponse.json({ status: "signed_out", productionAllowed: false });
  response.cookies.set({
    name: visualLabAccessCookieName(),
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/visual-lab",
    maxAge: 0,
  });
  response.headers.set("cache-control", "no-store");
  return response;
}
