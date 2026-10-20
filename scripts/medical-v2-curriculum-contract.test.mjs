import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CURRICULUM_PERIODS,
  INSTITUTION_MODELS,
  OFFICIAL_SOURCE_REGISTRY,
  SCENARIO_CURRICULUM_ALIGNMENT,
} from "../services/medical-simulation-v2/curriculum-catalog.js";
import { TOOL_CATALOG } from "../services/medical-simulation-v2/engine.js";
import { CLINICAL_INTERACTION_CONTRACTS, validateInteractionContracts } from "../services/medical-simulation-v2/interaction-contract.js";

assert.deepEqual(CURRICULUM_PERIODS.map((period) => period.id), ["d1", "d2", "d3", "d4", "d5", "d6"], "altı yıllık dönem zinciri eksiksiz olmalı");
assert.ok(CURRICULUM_PERIODS.every((period) => period.modules.length >= 5 && period.simulationRole.length > 30), "her dönemde içerik ve simülasyon rolü olmalı");
assert.ok(INSTITUTION_MODELS.length >= 5, "ulusal çekirdek ve başlıca kurum program modelleri bulunmalı");

const requiredSources = ["ucep-2020", "tyc", "tyyc-health", "eqf", "tepdad-2025", "yok-atlas-medicine"];
assert.deepEqual(OFFICIAL_SOURCE_REGISTRY.map((source) => source.id), requiredSources, "resmî kaynak zinciri eksik veya sırası bozuk");
for (const source of OFFICIAL_SOURCE_REGISTRY) {
  assert.match(source.url, /^https:\/\//, `${source.id}: resmî kaynak adresi yok`);
  assert.equal(source.accessedAt, "2026-08-28", `${source.id}: erişim tarihi sürümlü değil`);
  assert.ok(source.location.length >= 20, `${source.id}: kaynak konumu açıklanmamış`);
  assert.match(source.expertApprovalStatus, /DOĞRULANMADI|AKREDİTASYON İDDİASI YOK/, `${source.id}: onay sınırı açık değil`);
}

assert.ok(Object.keys(SCENARIO_CURRICULUM_ALIGNMENT).length >= 3, "çalışan olguların program eşlemesi eksik");
for (const alignment of Object.values(SCENARIO_CURRICULUM_ALIGNMENT)) {
  assert.ok(alignment.recommendedPeriods.every((id) => CURRICULUM_PERIODS.some((period) => period.id === id)), "olgu bilinmeyen döneme bağlanamaz");
  assert.deepEqual(alignment.qualificationDimensions, ["Bilgi", "Beceri", "Yetkinlik"], "TYÇ boyutları ayrı tutulmalı");
  assert.match(alignment.practiceLevelStatus, /UÇEP/, "UÇEP uygulama düzeyi ayrı açıklanmalı");
  assert.match(alignment.approvalStatus, /DOĞRULANMADI/, "kurum ve uzman onayı kanıtsız yükseltilemez");
}

const clinicalActionCount = Object.values(TOOL_CATALOG).reduce((sum, actions) => sum + actions.length, 0);
assert.equal(CLINICAL_INTERACTION_CONTRACTS.length, clinicalActionCount, "her klinik eylemin gözlenebilir sonuç sözleşmesi olmalı");
assert.equal(validateInteractionContracts().valid, true, "etkileşim sözleşmeleri benzersiz ve tam olmalı");

const ui = fs.readFileSync(new URL("../app/medikal-simulasyon/v2/MedicalSimulationV2.tsx", import.meta.url), "utf8");
const curriculumUi = fs.readFileSync(new URL("../app/medikal-simulasyon/v2/CurriculumNavigator.tsx", import.meta.url), "utf8");
const patientUi = fs.readFileSync(new URL("../app/medikal-simulasyon/v2/PatientRoom3D.tsx", import.meta.url), "utf8");
const buttonCount = (ui.match(/<button\b/g) ?? []).length + (curriculumUi.match(/<button\b/g) ?? []).length + (patientUi.match(/<button\b/g) ?? []).length;
const contractCount = (ui.match(/data-action-contract=/g) ?? []).length + (curriculumUi.match(/data-action-contract=/g) ?? []).length + (patientUi.match(/data-action-contract=/g) ?? []).length;
assert.equal(contractCount, buttonCount, "ana çalışma alanındaki her düğmenin görünür eylem sözleşmesi olmalı");

const coverage = fs.readFileSync(new URL("../docs/medical-simulation-v2-faculty-coverage.md", import.meta.url), "utf8");
assert.match(coverage, /doğrulanmış program sayısı: \*\*0\*\*/i, "fakülte kapsamı kanıtsız genellenmemeli");
assert.doesNotMatch(coverage, /tüm tıp fakülteleriyle uyumludur/i, "evrensel fakülte uyumu iddia edilmemeli");

console.log(`medical-v2-curriculum-contract: PASS · 6 dönem · ${OFFICIAL_SOURCE_REGISTRY.length} resmî kaynak · ${clinicalActionCount} klinik eylem sözleşmesi`);
