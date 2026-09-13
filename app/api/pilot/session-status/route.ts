import { getPilotContext } from "../../../../lib/pilot/broker";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const result = await getPilotContext();
  return Response.json(result.ok ? { userId: result.context.userId } : { code: result.code }, {
    status: result.ok ? 200 : result.code === "SESSION_INVALID" ? 401 : 503,
    headers: { "cache-control": "private, no-store, max-age=0", vary: "Cookie", "x-content-type-options": "nosniff" },
  });
}
