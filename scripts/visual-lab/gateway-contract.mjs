import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const rootEnv = read(".env.example");
const backendEnv = read("services/visual-lab/.env.example");
const backendOverlay = read("services/visual-lab/overlays/backend/main.py");
const helper = read("src/server/visual-lab.ts");
const accessRoute = read("app/api/visual-lab/access/route.ts");
const healthRoute = read("app/api/visual-lab/health/route.ts");
const pilotRoute = read("app/api/visual-lab/pilot/route.ts");
const processRoute = read("app/api/visual-lab/process/route.ts");
const paperRoute = read("app/api/visual-lab/paper/[arxivId]/route.ts");
const videoRoute = read("app/api/visual-lab/video/[videoId]/route.ts");

assert.match(rootEnv, /^VISUAL_LAB_GATEWAY_ENABLED=false$/m);
assert.match(rootEnv, /^VISUAL_LAB_PILOT_ACCESS_TOKEN=.+$/m);
assert.match(rootEnv, /^VISUAL_LAB_MEDIA_ALLOWED_HOSTS=$/m);
assert.doesNotMatch(rootEnv, /^NEXT_PUBLIC_VISUAL_LAB_/m);

assert.match(backendEnv, /^VISUAL_LAB_RAW_RENDER_ENABLED=false$/m);
assert.match(backendEnv, /^VISUAL_LAB_ALLOW_UNAUTHENTICATED=false$/m);
assert.match(backendOverlay, /path == "\/api\/render" and not RAW_RENDER_ENABLED/);
assert.match(backendOverlay, /productionAllowed": False/);

assert.match(helper, /visualLabGatewayEnabled/);
assert.match(helper, /timingSafeEqual/);
assert.match(helper, /createHmac\("sha256"/);
assert.match(helper, /modern IDs only/);
assert.match(helper, /x-visual-lab-key/);
assert.match(helper, /allowedVisualLabMediaUrl/);
assert.match(helper, /url\.protocol !== "https:"/);

assert.match(accessRoute, /httpOnly: true/);
assert.match(accessRoute, /sameSite: "strict"/);
assert.match(accessRoute, /validatePilotAccessToken/);
assert.match(healthRoute, /if \(!visualLabGatewayEnabled\(\)\)/);
assert.match(pilotRoute, /if \(!visualLabGatewayEnabled\(\)\)/);
assert.match(processRoute, /hasPilotAccess\(request\)/);
assert.match(processRoute, /requestHasSameOrigin\(request\)/);
assert.doesNotMatch(processRoute, /\/api\/render/);

assert.match(paperRoute, /protectVideoUrls/);
assert.match(paperRoute, /\/api\/visual-lab\/video\//);
assert.match(videoRoute, /hasPilotAccess\(request\)/);
assert.match(videoRoute, /redirect: "manual"/);
assert.match(videoRoute, /contains no Visual Lab service key/);
assert.match(videoRoute, /x-content-type-options/);

console.log("Visual Lab gateway contract passed.");
