import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  hasPilotAccess,
  normalizeVideoId,
  VisualLabConfigurationError,
  visualLabFetchResponse,
} from "../../../../../src/server/visual-lab";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ videoId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  if (!hasPilotAccess(request)) {
    return NextResponse.json({ detail: "Pilot access is required." }, { status: 401 });
  }

  const { videoId: rawVideoId } = await context.params;
  const videoId = normalizeVideoId(rawVideoId);
  if (!videoId) {
    return NextResponse.json({ detail: "Invalid Visual Lab video ID." }, { status: 400 });
  }

  try {
    const headers = new Headers({
      accept: "video/mp4,application/octet-stream;q=0.9,*/*;q=0.8",
    });
    const range = request.headers.get("range");
    if (range) headers.set("range", range);

    const upstream = await visualLabFetchResponse(
      `/api/video/${encodeURIComponent(videoId)}`,
      { headers, redirect: "follow" },
      30_000,
    );

    if (!upstream.ok) {
      return NextResponse.json(
        { detail: upstream.status === 404 ? "Video not found." : "Video is unavailable." },
        { status: upstream.status === 404 ? 404 : 502 },
      );
    }

    const responseHeaders = new Headers({
      "cache-control": "private, no-store",
      "content-disposition": `inline; filename="${videoId}.mp4"`,
      "content-type": upstream.headers.get("content-type") ?? "video/mp4",
      "x-content-type-options": "nosniff",
    });

    for (const name of ["content-length", "content-range", "accept-ranges", "etag"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    if (error instanceof VisualLabConfigurationError) {
      return NextResponse.json(
        { detail: error.message, productionAllowed: false },
        { status: 503 },
      );
    }
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ detail: "Video request timed out." }, { status: 504 });
    }
    return NextResponse.json({ detail: "Video is unavailable." }, { status: 502 });
  }
}
