import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  hasPilotAccess,
  mapUpstreamStatus,
  normalizeJobId,
  VisualLabConfigurationError,
  VisualLabUpstreamError,
  visualLabRequest,
} from "../../../../../src/server/visual-lab";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  if (!hasPilotAccess(request)) {
    return NextResponse.json({ detail: "Pilot access is required." }, { status: 401 });
  }

  const { jobId: rawJobId } = await context.params;
  const jobId = normalizeJobId(rawJobId);
  if (!jobId) {
    return NextResponse.json({ detail: "Invalid Visual Lab job ID." }, { status: 400 });
  }

  try {
    const upstream = await visualLabRequest(`/api/status/${encodeURIComponent(jobId)}`);
    return NextResponse.json(upstream.body, {
      status: upstream.status,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof VisualLabConfigurationError) {
      return NextResponse.json(
        { detail: error.message, productionAllowed: false },
        { status: 503 },
      );
    }
    if (error instanceof VisualLabUpstreamError) {
      return NextResponse.json(error.body, {
        status: mapUpstreamStatus(error.status),
        headers: { "cache-control": "no-store" },
      });
    }
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ detail: "Visual Lab request timed out." }, { status: 504 });
    }

    return NextResponse.json({ detail: "Visual Lab is unavailable." }, { status: 502 });
  }
}
