import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

await import("./validate.mjs");

const output = "public";
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const exactSha = (value) => /^[a-f0-9]{40}$/i.test(value ?? "") ? value.toLowerCase() : "";
const generated = ".generated";
mkdirSync(generated, { recursive: true });
writeFileSync(`${generated}/build-info.json`, `${JSON.stringify({
  commitSha: exactSha(process.env.VERCEL_GIT_COMMIT_SHA) || exactSha(process.env.KAMPUSGO_SOURCE_COMMIT),
  sourceTreeSha: exactSha(process.env.KAMPUSGO_SOURCE_TREE),
  attestationMode: process.env.VERCEL_GIT_COMMIT_SHA ? "vercel-git" : process.env.KAMPUSGO_SOURCE_COMMIT ? "direct-files" : "local",
}, null, 2)}\n`);

const files = [
  ["index.html", "pilot.html"],
  ["qa-responsive.html", "qa-responsive.html"],
  ["styles.css", "styles.css"],
  ["src/app.js", "src/app.js"],
  ["src/data.js", "src/data.js"],
  ["src/directive-pilot.js", "src/directive-pilot.js"],
  ["src/institutional-integration-reference.js", "src/institutional-integration-reference.js"],
  ["src/reference-data.js", "src/reference-data.js"],
  ["src/qualification-suggestion.js", "src/qualification-suggestion.js"],
  ["src/smart-snapshot.js", "src/smart-snapshot.js"],
  ["src/supabase.js", "src/supabase.js"],
  ["src/workflow.js", "src/workflow.js"],
  ["assets/brand/go-icon-web.png", "assets/brand/go-icon-web.png"],
  ["assets/brand/kdpu-logo-web.png", "assets/brand/kdpu-logo-web.png"],
  ["assets/brand/gazi/gazi-universitesi-logo.png", "assets/brand/gazi/gazi-universitesi-logo.png"],
  ["assets/illustrations/myys-hero.webp", "assets/illustrations/myys-hero.webp"],
  ["assets/illustrations/commission-review.webp", "assets/illustrations/commission-review.webp"],
  ["assets/illustrations/digital-wallet.webp", "assets/illustrations/digital-wallet.webp"],
  ["assets/illustrations/integration-gates.webp", "assets/illustrations/integration-gates.webp"],
];

for (const [source, destination] of files) {
  const target = `${output}/${destination}`;
  mkdirSync(dirname(target), { recursive: true });
  const base64Sidecar = `${source}.b64`;
  if (existsSync(base64Sidecar)) {
    writeFileSync(target, Buffer.from(readFileSync(base64Sidecar, "utf8").trim(), "base64"));
  } else {
    cpSync(source, target);
  }
}

console.log("Next.js public/ pilot paketi hazırlandı.");
