import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  hasMedicalPilotAccess,
  medicalEngineFetch,
  normalizeMedicalAssetId,
} from "../../../../../src/server/medical-simulation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ assetId: string }> };

export async function GET(request: NextRequest, context: Context) {
  if (!hasMedicalPilotAccess(request)) return NextResponse.json({ detail: "Pilot access is required." }, { status: 401 });
  const { assetId: raw } = await context.params;
  const assetId = normalizeMedicalAssetId(raw);
  if (!assetId) return NextResponse.json({ detail: "Invalid asset ID." }, { status: 400 });
  try {
    const headers = new Headers({ accept: "video/mp4,application/octet-stream;q=0.9" });
    const range = request.headers.get("range");
    if (range) headers.set("range", range);
    const upstream = await medicalEngineFetch(`/api/medical/media/${assetId}`, { headers }, 30000);
    if (!upstream.ok) return NextResponse.json({ detail: "Media unavailable." }, { status: upstream.status === 404 ? 404 : 502 });
    const responseHeaders = new Headers({
      "content-type": upstream.headers.get("content-type") ?? "video/mp4",
      "content-disposition": `inline; filename="${assetId}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    });
    for (const key of ["content-length", "content-range", "accept-ranges", "etag"]) {
      const value = upstream.headers.get(key);
      if (value) responseHeaders.set(key, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return NextResponse.json({ detail: "Media request timed out." }, { status: 504 });
    return NextResponse.json({ detail: "Media unavailable." }, { status: 502 });
  }
}
