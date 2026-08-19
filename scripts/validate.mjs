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

const vercel = readFileSync("vercel.json", "utf8");
for (const deniedCapability of ["camera=()", "microphone=()", "geolocation=()", "payment=()"]) {
  if (!vercel.includes(deniedCapability)) throw new Error(`Pilot tarayıcı yetenek kapısı eksik: ${deniedCapability}`);
}

const supabase = readFileSync("src/supabase.js", "utf8");
if (/method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i.test(supabase)) {
  throw new Error("Supabase pilot adaptöründe salt-okunur olmayan istek bulundu");
}
for (const forbiddenBrowserApi of ["getUserMedia", "mediaDevices", "geolocation.getCurrentPosition", "PaymentRequest"]) {
  if (source.includes(forbiddenBrowserApi)) throw new Error(`Kontrollü pilotta yasak tarayıcı API'si bulundu: ${forbiddenBrowserApi}`);
}

console.log(`Doğrulama başarılı: ${required.length} zorunlu dosya bulundu; production güvenlik taraması temiz.`);
