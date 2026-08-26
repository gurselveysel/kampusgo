import assert from "node:assert/strict";
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
const engineReadme = read("services/medical-simulation-engine/README.md");
const prompt = read(
  "services/medical-simulation-engine/prompts/clinical-simulation-scene-generator.md",
);
const schema = JSON.parse(
  read("services/medical-simulation-engine/contracts/scenario-event.schema.json"),
);

assert.ok(exists("app/medikal-simulasyon/layout.tsx"));
assert.match(page, /localStorage/);
assert.match(page, /moduleIsUnlocked/);
assert.match(page, /Simülasyonu bitir ve debriefing'i aç/);
assert.match(page, /PatientFigure/);
assert.match(page, /VitalMonitor/);
assert.match(page, /TeamPanel/);
assert.match(page, /production/i);

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

assert.match(engineReadme, /NO-GO/);
assert.match(engineReadme, /Gözlemle/);
assert.match(engineReadme, /UPSTREAM_COMMIT/);
assert.match(prompt, /educational clinical simulation visualizations/);
assert.match(prompt, /Do not invent a diagnosis, dose, contraindication or physiological response/);

assert.equal(schema.title, "TEYS Medical Simulation Scenario Event");
assert.equal(schema.additionalProperties, false);
assert.equal(schema.$defs.patientState.additionalProperties, false);
assert.deepEqual(schema.properties.module_id.minimum, 1);
assert.deepEqual(schema.properties.module_id.maximum, 8);
assert.ok(schema.required.includes("expert_approval_reference"));

console.log("TEYS medical simulation contract passed.");
