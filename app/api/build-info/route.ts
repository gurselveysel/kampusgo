import { NextResponse } from "next/server";
import buildInfo from "../../../.generated/build-info.json";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA || buildInfo.commitSha || null,
    sourceTreeSha: buildInfo.sourceTreeSha || null,
    attestationMode: process.env.VERCEL_GIT_COMMIT_SHA ? "vercel-git" : buildInfo.attestationMode,
    projectId: process.env.VERCEL_PROJECT_ID ?? null,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    application: "kampusgo-accounted-pilot",
  }, {
    headers: {
      "cache-control": "public, max-age=0, must-revalidate",
      "x-content-type-options": "nosniff",
    },
  });
}
