import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const engineUrl = process.env.MEDICAL_SIMULATION_ENGINE_URL?.replace(/\/$/, "");
const engineToken = process.env.MEDICAL_SIMULATION_ENGINE_TOKEN;

function authHeaders(includeJson = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (includeJson) headers["Content-Type"] = "application/json";
  if (engineToken) headers.Authorization = `Bearer ${engineToken}`;
  return headers;
}

function previewCapabilities() {
  return {
    connected: false,
    status: "preview-contract",
    message:
      "Medikal Simülasyon arayüzü çalışıyor; AI/Manim container adresi bu Vercel ortamına henüz bağlanmamış.",
    capabilities: {
      service: "TEYS/MAMS Medical Simulation Engine",
      requested_mode: "preview",
      effective_mode: "preview",
      upstream_present: true,
      llm_configured: false,
      renderer_available: false,
      render_enabled: false,
      raw_code_endpoint_exposed: false,
      supported_modules: [1, 2, 3, 4, 5, 6, 7, 8],
      curriculum_composition: {
        ucep_referenced_core: 70,
        institutional_autonomy: 30,
      },
      safety_boundary:
        "Yalnız sentetik eğitim simülasyonu; klinik karar desteği değildir.",
    },
  };
}

async function proxy(path: string, init?: RequestInit) {
  if (!engineUrl) {
    return NextResponse.json(previewCapabilities(), { status: 200 });
  }

  try {
    const response = await fetch(`${engineUrl}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(init?.method === "POST" ? 25_000 : 10_000),
    });
    const text = await response.text();
    const contentType = response.headers.get("content-type") ?? "application/json";
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": contentType },
    });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        status: "engine-unreachable",
        message: error instanceof Error ? error.message : "Motor bağlantısı kurulamadı.",
      },
      { status: 503 },
    );
  }
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("job_id");
  const example = request.nextUrl.searchParams.get("example");

  if (jobId) {
    return proxy(`/v1/scene-jobs/${encodeURIComponent(jobId)}`, {
      headers: authHeaders(),
    });
  }
  if (example === "stemi-vf") {
    return proxy("/v1/examples/stemi-vf", { headers: authHeaders() });
  }
  return proxy("/health");
}

export async function POST(request: NextRequest) {
  if (!engineUrl) {
    return NextResponse.json(
      {
        ...previewCapabilities(),
        code: "engine_url_not_configured",
      },
      { status: 503 },
    );
  }

  const body = await request.text();
  if (body.length > 120_000) {
    return NextResponse.json({ message: "İstek gövdesi çok büyük." }, { status: 413 });
  }

  return proxy("/v1/scene-jobs", {
    method: "POST",
    headers: authHeaders(true),
    body,
  });
}
