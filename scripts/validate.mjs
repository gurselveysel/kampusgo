import { existsSync, readFileSync } from "node:fs";
import {
  qualificationFrameworks,
  qualificationLevelDescriptors,
  qualificationMatrixTemplates,
  tyycQualificationTypeDescriptors
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
  "src/directive-pilot.js",
  "src/institutional-integration-reference.js",
  "src/workflow.js",
  "src/reference-data.js",
  "src/qualification-suggestion.js",
  "src/smart-snapshot.js",
  "src/supabase.js",
  "scripts/build-static.mjs",
  "scripts/institutional-integration-contract.mjs",
  "scripts/qualification-suggestion-contract.mjs",
  "scripts/reference-data-contract.mjs",
  "scripts/smart-alignment-contract.mjs",
  "scripts/directive-pilot-contract.mjs",
  "scripts/directive-access-hardening-contract.mjs",
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
  "supabase/migrations/20260820021000_smart_qualification_performance_indexes.sql",
  "supabase/migrations/20260820030000_directive_alignment_pilot_schema.sql",
  "supabase/migrations/20260820031000_directive_alignment_performance_indexes.sql",
  "supabase/migrations/20260820032000_tyyc_smart_alignment_program_spine.sql",
  "supabase/rollback/20260820032000_tyyc_smart_alignment_program_spine.rollback.sql",
  "supabase/rollback/20260820031000_directive_alignment_performance_indexes.rollback.sql",
  "supabase/migrations/20260820033000_directive_reference_access_hardening.sql",
  "supabase/rollback/20260820033000_directive_reference_access_hardening.rollback.sql",
  "supabase/migrations/20260820034000_tyyc_spine_integrity_performance.sql",
  "supabase/rollback/20260820034000_tyyc_spine_integrity_performance.rollback.sql",
  "supabase/reference/directive_official_sources.json",
  "supabase/tests/20260820033000_directive_access_hardening.sql",
  "supabase/tests/20260820034000_tyyc_spine_integrity.sql"
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

if (qualificationFrameworks.length !== 3 || !["tyc", "eqf", "tyyc"].every((frameworkId) => qualificationFrameworks.some((item) => item.id === frameworkId))) {
  throw new Error("TYÇ, AYÇ/EQF ve TYYÇ çerçeve tanımları eksik");
}
for (const frameworkId of ["tyc", "eqf", "tyyc"]) {
  const descriptors = qualificationLevelDescriptors.filter((item) => item.frameworkId === frameworkId);
  const templates = qualificationMatrixTemplates.filter((item) => item.frameworkId === frameworkId);
  const expectedLevels = frameworkId === "tyyc" ? [5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7, 8];
  if (descriptors.length !== expectedLevels.length || templates.length !== expectedLevels.length) {
    throw new Error(`${frameworkId} için ${expectedLevels.length} seviye tanımlayıcısı ve matris şablonu zorunludur`);
  }
  if (descriptors.some((item, index) => item.level !== expectedLevels[index] || !item.knowledge || !item.skills || !item.competence)) {
    throw new Error(`${frameworkId} seviye tanımlayıcı bütünlüğü bozuk`);
  }
  if (templates.some((item) => item.institutionalValidationRequired !== true || item.isSyntheticTemplate !== true)) {
    throw new Error(`${frameworkId} şablonlarında pilot/kurumsal doğrulama sınırı eksik`);
  }
}
if (tyycQualificationTypeDescriptors.length !== 6 || !tyycQualificationTypeDescriptors.every((item) => item.level >= 5 && item.level <= 8 && item.operationalDescriptorStatus === "advisory_summary_not_verbatim" && item.placementClaim === false && item.equivalenceClaim === false && item.logoRightClaim === false)) {
  throw new Error("TYYÇ 5–8 düzeyindeki altı resmî form türü/advisory sınırı eksik");
}

const html = readFileSync("index.html", "utf8");
for (const ref of ["styles.css", "src/app.js", "kdpu-logo-web.png", "go-icon-web.png"]) {
  if (!html.includes(ref)) throw new Error(`index.html içinde beklenen referans yok: ${ref}`);
}

const source = ["index.html", "styles.css", "src/app.js", "src/data.js", "src/directive-pilot.js", "src/qualification-suggestion.js"].map((file) => readFileSync(file, "utf8")).join("\n");
const appSource = readFileSync("src/app.js", "utf8");
if (!appSource.includes('canonical: "Kanonik tanımlayıcı"') || !appSource.includes('tyyc: "YÖK/MYK form siciline dayalı pilot operasyonel özet — birebir alıntı değildir"')) {
  throw new Error("Akıllı öneri UI'sında TYÇ/AYÇ kanonik tanımlayıcısı ile TYYÇ form siciline dayalı, birebir olmayan pilot özet provenansı ayrılmıyor");
}
if (/<dt>Kanonik tanımlayıcı<\/dt>/.test(appSource)) {
  throw new Error("TYYÇ dahil bütün çerçevelere koşulsuz kanonik tanımlayıcı etiketi uygulanamaz");
}
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
