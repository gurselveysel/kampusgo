import { existsSync, readFileSync } from "node:fs";
import {
  qualificationFrameworks,
  qualificationLevelDescriptors,
  qualificationMatrixTemplates
} from "../src/reference-data.js";
import {
  dpuInstitutionalSystems,
  pilotIntegrationAuditEvents,
  pilotIntegrationMappings,
  pilotIntegrationScenarios
} from "../src/institutional-integration-reference.js";

const required = [
  "index.html",
  "qa-responsive.html",
  "styles.css",
  "src/app.js",
  "src/data.js",
  "src/institutional-integration-reference.js",
  "src/workflow.js",
  "src/reference-data.js",
  "src/qualification-suggestion.js",
  "src/supabase.js",
  "scripts/build-static.mjs",
  "scripts/institutional-integration-contract.mjs",
  "scripts/qualification-suggestion-contract.mjs",
  "scripts/reference-data-contract.mjs",
  "scripts/smart-alignment-contract.mjs",
  "README.md",
  "docs/smart-alignment-acceptance.md",
  "docs/source-traceability.md",
  "docs/test-report.md",
  "assets/brand/kdpu-logo-web.png",
  "assets/brand/go-icon-web.png",
  "assets/illustrations/myys-hero.webp",
  "supabase/migrations/20260819010000_myys_pilot_schema.sql",
  "supabase/migrations/20260820010000_framework_matrix_finance_role_seed.sql",
  "supabase/migrations/20260820011000_framework_matrix_performance_indexes.sql",
  "supabase/migrations/20260820012000_dpu_institutional_integration_catalog.sql",
  "supabase/migrations/20260820013000_dpu_institutional_integration_performance_indexes.sql",
  "supabase/migrations/20260820014000_dpu_institutional_source_provenance.sql",
  "supabase/migrations/20260820020000_smart_qualification_suggestion_engine.sql",
  "supabase/migrations/20260820021000_smart_qualification_performance_indexes.sql"
];

const missing = required.filter((file) => {
  if (existsSync(file)) return false;
  return !/\.(?:png|webp)$/i.test(file) || !existsSync(`${file}.b64`);
});
if (missing.length) throw new Error(`Eksik dosyalar: ${missing.join(", ")}`);

if (!dpuInstitutionalSystems.length || pilotIntegrationMappings.length !== dpuInstitutionalSystems.length || pilotIntegrationScenarios.length !== dpuInstitutionalSystems.length || pilotIntegrationAuditEvents.length !== dpuInstitutionalSystems.length) {
  throw new Error("DPÜ kurumsal entegrasyon referans sözleşmesinde her sistem için bir eşleme, senaryo ve audit kaydı olmalıdır");
}
if (dpuInstitutionalSystems.some((item) => item.realDataEnabled !== false || item.productionAllowed !== false || !/^https:\/\//.test(item.publicUrl))) {
  throw new Error("DPÜ kurumsal entegrasyon kataloğu güvenli pilot veya kaynak URL sınırını ihlal ediyor");
}

if (qualificationFrameworks.length !== 2 || !qualificationFrameworks.some((item) => item.id === "tyc") || !qualificationFrameworks.some((item) => item.id === "eqf")) {
  throw new Error("TYÇ ve AYÇ/EQF çerçeve tanımları eksik");
}
for (const frameworkId of ["tyc", "eqf"]) {
  const descriptors = qualificationLevelDescriptors.filter((item) => item.frameworkId === frameworkId);
  const templates = qualificationMatrixTemplates.filter((item) => item.frameworkId === frameworkId);
  if (descriptors.length !== 8 || templates.length !== 8) {
    throw new Error(`${frameworkId} için 8 seviye tanımlayıcısı ve 8 matris şablonu zorunludur`);
  }
  if (descriptors.some((item, index) => item.level !== index + 1 || !item.knowledge || !item.skills || !item.competence)) {
    throw new Error(`${frameworkId} seviye 1–8 tanımlayıcı bütünlüğü bozuk`);
  }
  if (templates.some((item) => item.institutionalValidationRequired !== true || item.isSyntheticTemplate !== true)) {
    throw new Error(`${frameworkId} şablonlarında pilot/kurumsal doğrulama sınırı eksik`);
  }
}

const html = readFileSync("index.html", "utf8");
for (const ref of ["styles.css", "src/app.js", "kdpu-logo-web.png", "go-icon-web.png"]) {
  if (!html.includes(ref)) throw new Error(`index.html içinde beklenen referans yok: ${ref}`);
}

const source = ["index.html", "styles.css", "src/app.js", "src/data.js", "src/qualification-suggestion.js"].map((file) => readFileSync(file, "utf8")).join("\n");
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
const forbiddenBrowserApis = [
  ["getUserMedia", /\bgetUserMedia\s*\(/],
  ["mediaDevices", /\bnavigator\.mediaDevices\b/],
  ["geolocation.getCurrentPosition", /\b(?:navigator\.)?geolocation\.getCurrentPosition\s*\(/],
  ["PaymentRequest", /\b(?:new\s+PaymentRequest|(?:window|globalThis|self)\.PaymentRequest)\b/]
];
for (const [label, pattern] of forbiddenBrowserApis) {
  if (pattern.test(source)) throw new Error(`Kontrollü pilotta yasak tarayıcı API'si bulundu: ${label}`);
}

console.log(`Doğrulama başarılı: ${required.length} zorunlu dosya bulundu; production güvenlik taraması temiz.`);
