import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

const page = read("app/medikal-simulasyon/page.tsx");
const data = read("app/medikal-simulasyon/simulation-data.ts");
const css = read("app/medikal-simulasyon/medical-simulation.module.css");
const panel = read("app/medikal-simulasyon/ArxivisualScenePanel.tsx");
const sceneLibrary = read("app/medikal-simulasyon/scene-library.ts");
const studio = read("app/medikal-simulasyon/ai-studio/page.tsx");
const vercel = read("vercel.json");
const serverGateway = read("src/server/medical-simulation.ts");
const accessRoute = read("app/api/medical-simulation/access/route.ts");
const jobsRoute = read("app/api/medical-simulation/jobs/route.ts");
const mediaRoute = read("app/api/medical-simulation/media/[assetId]/route.ts");
const engineReadme = read("services/medical-simulation-engine/README.md");
const engineApp = read("services/medical-simulation-engine/runtime/medical_engine/app.py");
const enginePipeline = read("services/medical-simulation-engine/runtime/medical_engine/pipeline.py");
const engineSchemas = read("services/medical-simulation-engine/runtime/medical_engine/schemas.py");
const prompt = read(
  "services/medical-simulation-engine/prompts/clinical-simulation-scene-generator.md",
);
const schema = JSON.parse(
  read("services/medical-simulation-engine/contracts/scenario-event.schema.json"),
);
const proofManifest = JSON.parse(read("assets/medical-simulation/manifest.json"));
const smokePreset = JSON.parse(read("services/medical-simulation-engine/presets/vf-rosc.json"));
const moduleLibraryPreset = JSON.parse(
  read("services/medical-simulation-engine/presets/module-library.json"),
);

assert.ok(exists("app/medikal-simulasyon/layout.tsx"));
assert.match(page, /localStorage/);
assert.match(page, /moduleIsUnlocked/);
assert.match(page, /Simülasyonu bitir ve debriefing'i aç/);
assert.match(page, /PatientFigure/);
assert.match(page, /VitalMonitor/);
assert.match(page, /TeamPanel/);
assert.match(page, /ArxivisualScenePanel/);
assert.match(page, /taskRunner/);
assert.match(page, /disabled=\{!canEvaluate \|\| Boolean\(debrief\)\}/);
assert.match(page, /completedRequiredCount/);
assert.match(page, /production/i);

assert.match(panel, /ARXIVISUAL DOĞRULAMA \+ GERÇEK MANIM RENDER/);
assert.match(panel, /\/medikal-simulasyon\/ai-studio/);
assert.match(panel, /medicalSceneLibrary/);
assert.match(panel, /autoPlay/);
assert.match(sceneLibrary, /module-01-virtual-patient\.mp4/);
assert.match(sceneLibrary, /module-08-integrated\.mp4/);
assert.equal((sceneLibrary.match(/moduleId: [1-8],/g) ?? []).length, 8);
assert.match(studio, /OLAY SÖZLEŞMESİ → ARXIVISUAL AI → MANIM → VIDEO → DEBRIEF/);
assert.match(studio, /expert_approval_reference: ""/);
assert.match(studio, /useState\(false\)/);
assert.match(studio, /rights_confirmed/);
assert.match(studio, /synthetic_patient_confirmed/);
assert.match(studio, /\/api\/medical-simulation\/jobs/);
assert.match(
  vercel,
  /script-src 'self' 'unsafe-inline'/,
  "Next.js hydration bootstrap must be permitted by the production CSP.",
);
assert.match(serverGateway, /timingSafeEqual/);
assert.match(serverGateway, /MEDICAL_SIMULATION_GATEWAY_ENABLED/);
assert.match(serverGateway, /x-teys-engine-key/);
assert.match(accessRoute, /httpOnly: true/);
assert.match(accessRoute, /sameSite: "strict"/);
assert.match(jobsRoute, /hasMedicalPilotAccess/);
assert.match(jobsRoute, /sameOrigin/);
assert.match(mediaRoute, /normalizeMedicalAssetId/);

for (let moduleId = 1; moduleId <= 8; moduleId += 1) {
  assert.match(data, new RegExp(`id: ${moduleId},`), `Module ${moduleId} is missing.`);
}

assert.match(data, /ucepCore: 70/);
assert.match(data, /institutionalAutonomy: 30/);
assert.match(data, /Sanal Hasta/);
assert.match(data, /Olguya Dayalı Öğrenme/);
assert.match(data, /Klinik Akıl Yürütme/);
assert.match(data, /Tanı ve Tetkik/);
assert.match(data, /Tedavi ve Müdahale/);
assert.match(data, /Acil Durum Simülasyonları/);
assert.match(data, /Ekip Yönetimi & Klinik Liderlik/);
assert.match(data, /Entegre Klinik Simülasyon/);

assert.match(css, /@keyframes breathing/);
assert.match(css, /@keyframes ecgSweep/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /patientCritical/);
assert.match(css, /moduleLocked/);
assert.match(css, /sceneStudioLink/);

assert.match(engineReadme, /NO-GO/);
assert.match(engineReadme, /Gözlemle/);
assert.match(engineReadme, /UPSTREAM_COMMIT/);
assert.match(prompt, /educational clinical simulation visualizations/);
assert.match(prompt, /Do not invent a diagnosis, dose, contraindication or physiological response/);

assert.match(engineApp, /rawCodeEndpoint.*False/);
assert.match(engineApp, /productionAllowed.*False/);
assert.match(enginePipeline, /ManimGenerator/);
assert.match(enginePipeline, /CodeValidator/);
assert.match(enginePipeline, /SpatialValidator/);
assert.match(enginePipeline, /RenderTester/);
assert.match(enginePipeline, /FORBIDDEN_IMPORT_ROOTS/);
assert.match(engineSchemas, /rights_confirmed/);
assert.match(engineSchemas, /synthetic_patient_confirmed/);
assert.match(engineSchemas, /production_allowed: bool = False/);

assert.equal(schema.title, "TEYS Medical Simulation Scenario Event");
assert.equal(schema.additionalProperties, false);
assert.equal(schema.$defs.patientState.additionalProperties, false);
assert.deepEqual(schema.properties.module_id.minimum, 1);
assert.deepEqual(schema.properties.module_id.maximum, 8);
assert.ok(schema.required.includes("expert_approval_reference"));

const proofVideo = fs.readFileSync(path.join(root, "assets/medical-simulation/arxivisual-stemi-preview.mp4"));
assert.equal(proofManifest.sha256, createHash("sha256").update(proofVideo).digest("hex"));
assert.equal(proofManifest.expert_approval, "DOĞRULANMADI");
assert.equal(proofManifest.production_allowed, false);
assert.match(smokePreset.expert_approval_reference, /^DOĞRULANMADI-/);
assert.equal(smokePreset.request_ai_generation, false);
assert.equal(moduleLibraryPreset.length, 8);
assert.deepEqual(moduleLibraryPreset.map((entry) => entry.request.module_id), [1, 2, 3, 4, 5, 6, 7, 8]);
assert.ok(moduleLibraryPreset.every((entry) => entry.request.request_ai_generation === false));
assert.ok(moduleLibraryPreset.every((entry) => entry.request.synthetic_patient_confirmed === true));
assert.ok(moduleLibraryPreset.every((entry) => entry.request.expert_approval_reference.startsWith("DOĞRULANMADI-")));

for (const requiredPath of [
  "services/medical-simulation-engine/Dockerfile",
  "services/medical-simulation-engine/docker-compose.yml",
  "services/medical-simulation-engine/runtime/medical_engine/app.py",
  "services/medical-simulation-engine/runtime/medical_engine/pipeline.py",
  "services/medical-simulation-engine/runtime/medical_engine/safety_contract.py",
  "services/medical-simulation-engine/END-TO-END-RUNBOOK.md",
  "services/medical-simulation-engine/render-medical.yaml",
]) {
  assert.ok(exists(requiredPath), `${requiredPath} is missing.`);
}

console.log("TEYS medical simulation contract passed.");
