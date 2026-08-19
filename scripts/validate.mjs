import { existsSync, readFileSync } from "node:fs";

const required = [
  "index.html",
  "qa-responsive.html",
  "styles.css",
  "src/app.js",
  "src/data.js",
  "src/workflow.js",
  "src/supabase.js",
  "scripts/build-static.mjs",
  "README.md",
  "docs/source-traceability.md",
  "docs/test-report.md",
  "assets/brand/kdpu-logo-web.png",
  "assets/brand/go-icon-web.png",
  "assets/illustrations/myys-hero.webp",
  "supabase/migrations/20260819010000_myys_pilot_schema.sql"
];

const missing = required.filter((file) => !existsSync(file));
if (missing.length) throw new Error(`Eksik dosyalar: ${missing.join(", ")}`);

const html = readFileSync("index.html", "utf8");
for (const ref of ["styles.css", "src/app.js", "kdpu-logo-web.png", "go-icon-web.png"]) {
  if (!html.includes(ref)) throw new Error(`index.html içinde beklenen referans yok: ${ref}`);
}

const source = ["index.html", "styles.css", "src/app.js", "src/data.js"].map((file) => readFileSync(file, "utf8")).join("\n");
for (const forbidden of ["vercel --prod", "service_role", "sk_live_", "Gerçek veri gönderildi"]) {
  if (source.includes(forbidden)) throw new Error(`Yasaklı production ifadesi bulundu: ${forbidden}`);
}

console.log(`Doğrulama başarılı: ${required.length} zorunlu dosya bulundu; production güvenlik taraması temiz.`);
