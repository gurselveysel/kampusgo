import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

await import("./validate.mjs");

const output = "public";
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

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
  ["assets/illustrations/myys-hero.webp", "assets/illustrations/myys-hero.webp"],
  ["assets/illustrations/commission-review.webp", "assets/illustrations/commission-review.webp"],
  ["assets/illustrations/digital-wallet.webp", "assets/illustrations/digital-wallet.webp"],
  ["assets/illustrations/integration-gates.webp", "assets/illustrations/integration-gates.webp"],
  ["assets/medical-simulation/arxivisual-stemi-preview.mp4", "medical-simulation/manim/med_seed_vf_rosc.mp4"],
  ["assets/medical-simulation/manifest.json", "medical-simulation/manim/manifest.json"],
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
