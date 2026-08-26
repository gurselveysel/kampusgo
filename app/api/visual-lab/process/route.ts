import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  hasPilotAccess,
  mapUpstreamStatus,
  normalizeArxivId,
  requestHasSameOrigin,
  VisualLabConfigurationError,
  VisualLabUpstreamError,
  visualLabRequest,
} from "../../../../src/server/visual-lab";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!requestHasSameOrigin(request)) {
    return NextResponse.json({ detail: "Origin check failed." }, { status: 403 });
  }

  if (!hasPilotAccess(request)) {
    return NextResponse.json({ detail: "Pilot access is required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  const bodyRecord = typeof body === "object" && body !== null ? body : null;
  const rawArxivId =
    bodyRecord && "arxiv_id" in bodyRecord
      ? (bodyRecord as { arxiv_id?: unknown }).arxiv_id
      : undefined;
  const rightsConfirmed =
    bodyRecord && "rights_confirmed" in bodyRecord
      ? (bodyRecord as { rights_confirmed?: unknown }).rights_confirmed === true
      : false;
  const arxivId = normalizeArxivId(rawArxivId);

  if (!arxivId) {
    return NextResponse.json(
      {
        detail:
          "Geçerli bir modern arXiv kimliği girin. Örnek: 1706.03762 veya 1706.03762v1.",
      },
      { status: 400 },
    );
  }

  if (!rightsConfirmed) {
    return NextResponse.json(
      {
        detail:
          "Kaynağı işleme ve türev görsel anlatım üretme hakkının bulunduğunu onaylamalısınız.",
      },
      { status: 428 },
    );
  }

  try {
    const upstream = await visualLabRequest(
      "/api/process",
      {
        method: "POST",
        headers: {
          "x-visual-lab-rights-confirmed": "true",
        },
        body: JSON.stringify({ arxiv_id: arxivId }),
      },
      20_000,
    );

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
