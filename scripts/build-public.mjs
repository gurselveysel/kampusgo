import { cpSync, mkdirSync, rmSync } from "node:fs";
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
  ["src/supabase.js", "src/supabase.js"],
  ["src/workflow.js", "src/workflow.js"],
  ["assets/brand/go-icon-web.png", "assets/brand/go-icon-web.png"],
  ["assets/brand/kdpu-logo-web.png", "assets/brand/kdpu-logo-web.png"],
  ["assets/illustrations/myys-hero.webp", "assets/illustrations/myys-hero.webp"],
  ["assets/illustrations/commission-review.webp", "assets/illustrations/commission-review.webp"],
  ["assets/illustrations/digital-wallet.webp", "assets/illustrations/digital-wallet.webp"],
  ["assets/illustrations/integration-gates.webp", "assets/illustrations/integration-gates.webp"],
];

for (const [source, destination] of files) {
  const target = `${output}/${destination}`;
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target);
}

console.log("Next.js public/ pilot paketi hazırlandı.");
