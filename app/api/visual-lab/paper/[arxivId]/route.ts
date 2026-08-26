import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  hasPilotAccess,
  mapUpstreamStatus,
  normalizeArxivId,
  normalizeVideoId,
  VisualLabConfigurationError,
  VisualLabUpstreamError,
  visualLabRequest,
} from "../../../../../src/server/visual-lab";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ arxivId: string }>;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function protectVideoUrls(body: unknown): unknown {
  if (!isRecord(body)) return body;

  const rawVisualizations = Array.isArray(body.visualizations) ? body.visualizations : [];
  const visualizationBySection = new Map<string, string>();

  const visualizations = rawVisualizations.map((value) => {
    if (!isRecord(value)) return value;

    const videoId = normalizeVideoId(value.id);
    const sectionId = typeof value.section_id === "string" ? value.section_id : null;
    const complete = value.status === "complete";
    const gatewayUrl = complete && videoId ? `/api/visual-lab/video/${videoId}` : null;

    if (gatewayUrl && sectionId && !visualizationBySection.has(sectionId)) {
      visualizationBySection.set(sectionId, gatewayUrl);
    }

    return {
      ...value,
      video_url: gatewayUrl,
    };
  });

  const sections = Array.isArray(body.sections)
    ? body.sections.map((value) => {
        if (!isRecord(value)) return value;
        const sectionId = typeof value.id === "string" ? value.id : null;
        return {
          ...value,
          video_url: sectionId ? visualizationBySection.get(sectionId) ?? null : null,
        };
      })
    : body.sections;

  return {
    ...body,
    sections,
    visualizations,
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  if (!hasPilotAccess(request)) {
    return NextResponse.json({ detail: "Pilot access is required." }, { status: 401 });
  }

  const { arxivId: rawArxivId } = await context.params;
  const arxivId = normalizeArxivId(rawArxivId);
  if (!arxivId) {
    return NextResponse.json({ detail: "Invalid arXiv ID." }, { status: 400 });
  }

  try {
    const upstream = await visualLabRequest(`/api/paper/${encodeURIComponent(arxivId)}`);
    return NextResponse.json(protectVideoUrls(upstream.body), {
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
