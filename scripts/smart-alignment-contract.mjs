import assert from "node:assert/strict";
import {
  QUALIFICATION_ADVISORY_NOTICE,
  QUALIFICATION_DIMENSIONS,
  QUALIFICATION_SUGGESTION_LIMITS,
  QUALIFICATION_SUGGESTION_ENGINE_VERSION,
  applyManualQualificationOverride,
  buildQualificationSelectionOptions,
  recordHumanBoardQualificationDecision,
  suggestOutcomeQualificationAlignment,
  suggestProgramQualificationAlignment
} from "../src/qualification-suggestion.js";
import { findQualificationDescriptor } from "../src/reference-data.js";

const cases = [];

function test(name, callback) {
  try {
    callback();
    cases.push({ name, ok: true });
  } catch (error) {
    cases.push({ name, ok: false, error });
  }
}

const sampleOutcomes = Object.freeze([
  {
    id: "LO-KNOWLEDGE",
    text: "Alanındaki ileri düzey kuramsal ve olgusal bilgiyi sorgulayıcı bir bakışla açıklar.",
    expectedDimension: "knowledge"
  },
  {
    id: "LO-SKILLS",
    text: "Karmaşık ve öngörülemeyen bir veri problemini eleştirel olarak analiz eder ve kanıta dayalı yenilikçi çözüm tasarlar.",
    expectedDimension: "skills"
  },
  {
    id: "LO-COMPETENCE",
    text: "Öngörülemeyen çalışma ortamında karmaşık projeleri yönetir ve ekiplerin mesleki gelişim sorumluluğunu alır.",
    expectedDimension: "competence"
  }
]);

function selectionFor(outcome, frameworkId) {
  return outcome.suggestions[frameworkId];
}

function assertSuggestion(selection, frameworkId, outcomeId) {
  assert.equal(selection.frameworkId, frameworkId, `${outcomeId}/${frameworkId}: çerçeve kimliği`);
  assert.ok(Number.isInteger(selection.level) && selection.level >= 1 && selection.level <= 8, `${outcomeId}/${frameworkId}: seviye 1–8 dışında`);
  assert.ok(QUALIFICATION_DIMENSIONS.includes(selection.dimension), `${outcomeId}/${frameworkId}: boyut hatalı`);
  assert.ok(Number.isFinite(selection.score) && selection.score >= 0 && selection.score <= 100, `${outcomeId}/${frameworkId}: skor 0–100 dışında`);
  assert.ok(["low", "medium", "high"].includes(selection.confidence), `${outcomeId}/${frameworkId}: güven bandı hatalı`);
  assert.ok(String(selection.rationale).length >= 80 && selection.rationale.includes(`${selection.score}/100`), `${outcomeId}/${frameworkId}: açıklanabilir gerekçe/skor yok`);
  assert.ok(Array.isArray(selection.matchedSignals), `${outcomeId}/${frameworkId}: eşleşen sinyaller yok`);
  assert.ok(Array.isArray(selection.suggestedContent) && selection.suggestedContent.length >= 2, `${outcomeId}/${frameworkId}: içerik önerisi yok`);
  assert.ok(Array.isArray(selection.suggestedAssessments) && selection.suggestedAssessments.length >= 2, `${outcomeId}/${frameworkId}: ölçme önerisi yok`);
  for (const item of selection.suggestedAssessments) {
    assert.ok(String(item.method).length >= 8, `${outcomeId}/${frameworkId}: ölçme yöntemi eksik`);
    assert.ok(String(item.evidence).length >= 8, `${outcomeId}/${frameworkId}: kanıt eksik`);
    assert.ok(String(item.rationale).length >= 8, `${outcomeId}/${frameworkId}: ölçme gerekçesi eksik`);
  }
  assert.equal(selection.autonomousDecision, false, `${outcomeId}/${frameworkId}: otomatik karar bayrağı açık`);
  assert.equal(selection.institutionalValidationRequired, true, `${outcomeId}/${frameworkId}: kurumsal doğrulama bayrağı kapalı`);
  assert.match(selection.officialSourceUrl, /^https:\/\//, `${outcomeId}/${frameworkId}: resmî kaynak bağlantısı yok`);
  const descriptor = findQualificationDescriptor(frameworkId, selection.level);
  assert.equal(selection.descriptor, descriptor?.[selection.dimension], `${outcomeId}/${frameworkId}: canonical tanımlayıcıyla eşleşmiyor`);
  assert.ok(Array.isArray(selection.alternatives) && selection.alternatives.length >= 2, `${outcomeId}/${frameworkId}: seçilebilir alternatifler yok`);
  assert.ok(selection.alternatives.every((item) => Number.isInteger(item.level) && item.level >= 1 && item.level <= 8), `${outcomeId}/${frameworkId}: alternatif seviye sınırı hatalı`);
}

test("TYÇ ve AYÇ/EQF seçim katalogları 1–8 ve üç canonical boyutu eksiksiz sunuyor", () => {
  for (const frameworkId of ["tyc", "eqf"]) {
    const options = buildQualificationSelectionOptions(frameworkId);
    assert.deepEqual(options.map((item) => item.level), [1, 2, 3, 4, 5, 6, 7, 8], `${frameworkId}: seviye dizisi`);
    for (const option of options) {
      assert.deepEqual(option.dimensions.map((item) => item.dimension), QUALIFICATION_DIMENSIONS, `${frameworkId}-${option.level}: boyut dizisi`);
      assert.ok(option.dimensions.every((item) => String(item.descriptor).length >= 10), `${frameworkId}-${option.level}: boş tanımlayıcı`);
      assert.equal(option.autonomousDecision, false);
      assert.equal(option.institutionalValidationRequired, true);
    }
  }
  assert.throws(() => buildQualificationSelectionOptions("unknown"), /Desteklenmeyen/);
});

test("kanonik eylem boyutu ortak sinyali korurken TYÇ ve AYÇ seviye/tanımlayıcı/puan hesapları çerçeveye özgü kalıyor", () => {
  for (const input of sampleOutcomes) {
    const result = suggestOutcomeQualificationAlignment(input, { preferredLevels: { tyc: 6, eqf: 6 } });
    assert.equal(result.outcomeId, input.id);
    assert.equal(result.outcomeText, input.text);
    assert.deepEqual(Object.keys(result.suggestions).sort(), ["eqf", "tyc"]);
    for (const frameworkId of ["tyc", "eqf"]) {
      const selection = selectionFor(result, frameworkId);
      assert.equal(selection.dimension, input.expectedDimension, `${input.id}/${frameworkId}: Türkçe eylem boyutu yanlış`);
      assertSuggestion(selection, frameworkId, input.id);
    }
    assert.equal(result.crossFrameworkConsistency.equalityForced, false, `${input.id}: çerçeve seviyeleri eşitliğe zorlandı`);
    assert.notEqual(result.suggestions.tyc.officialSourceUrl, result.suggestions.eqf.officialSourceUrl, `${input.id}: çerçeveye özgü resmî kaynaklar ayrışmıyor`);
    assert.notEqual(result.suggestions.tyc.descriptor, result.suggestions.eqf.descriptor, `${input.id}: TYÇ ve AYÇ tanımlayıcıları tek metne indirgenmiş`);
  }
});

test("çoklu öğrenme çıktısı program düzeyinde kapsama, tutarlılık ve açıklanabilir aggregate üretiyor", () => {
  const result = suggestProgramQualificationAlignment({
    programId: "PROGRAM-SMART-QA",
    outcomes: sampleOutcomes,
    preferredLevels: { tyc: 6, eqf: 6 }
  });
  assert.equal(result.programId, "PROGRAM-SMART-QA");
  assert.equal(result.engineVersion, QUALIFICATION_SUGGESTION_ENGINE_VERSION);
  assert.equal(result.outcomes.length, 3);
  assert.equal(new Set(result.outcomes.map((item) => item.outcomeId)).size, 3);
  assert.equal(result.program.coverage.outcomeCount, 3);
  assert.equal(result.program.coverage.frameworkCoverage.tyc.percent, 100);
  assert.equal(result.program.coverage.frameworkCoverage.eqf.percent, 100);
  assert.deepEqual(result.program.dimensionCoverage.tyc, { knowledge: 1, skills: 1, competence: 1 });
  assert.deepEqual(result.program.dimensionCoverage.eqf, { knowledge: 1, skills: 1, competence: 1 });
  for (const frameworkId of ["tyc", "eqf"]) {
    assert.ok(Number.isInteger(result.program.suggestedLevels[frameworkId]));
    assert.ok(result.program.suggestedLevels[frameworkId] >= 1 && result.program.suggestedLevels[frameworkId] <= 8);
    assert.ok(typeof result.program.consistency[frameworkId].consistent === "boolean");
  }
  assert.match(result.program.rationale, /ağırlıklandırılmış medyan/);
  assert.equal(result.program.autonomousDecision, false);
  assert.equal(result.finalDecision.status, "pending_human_board");
  assert.equal(result.finalDecision.autonomousDecision, false);
});

test("eğitici seçimi ve manuel override serialize/hydrate sonrasında programla bağlı kalıyor", () => {
  const base = suggestProgramQualificationAlignment({ programId: "PROGRAM-PERSIST", outcomes: sampleOutcomes });
  const originalSnapshot = structuredClone(base);
  const overridden = applyManualQualificationOverride(base, {
    outcomeId: "LO-SKILLS",
    frameworkId: "tyc",
    level: 7,
    dimension: "skills",
    reason: "Eğitici, disiplinler arası yeni yöntem geliştirme kanıtını ayrıca incelemiştir.",
    actorRole: "instructor",
    recordedAt: "2026-08-20T12:00:00.000Z"
  });
  assert.deepEqual(base, originalSnapshot, "manuel seçim kaynak öneri nesnesini mutasyona uğrattı");
  const effective = overridden.outcomes.find((item) => item.outcomeId === "LO-SKILLS").suggestions.tyc.effectiveSelection;
  assert.deepEqual([effective.level, effective.dimension, effective.source, effective.actorRole], [7, "skills", "manual_override", "instructor"]);
  assert.equal(overridden.manualOverrides.length, 1);
  assert.equal(overridden.manualOverrides[0].outcomeId, "LO-SKILLS");
  assert.equal(overridden.manualOverrides[0].recordedAt, "2026-08-20T12:00:00.000Z");
  assert.equal(overridden.programId, "PROGRAM-PERSIST");

  const hydrated = JSON.parse(JSON.stringify(overridden));
  const rebuilt = suggestProgramQualificationAlignment({
    programId: hydrated.programId,
    outcomes: sampleOutcomes,
    manualOverrides: hydrated.manualOverrides
  });
  const restored = rebuilt.outcomes.find((item) => item.outcomeId === "LO-SKILLS").suggestions.tyc.effectiveSelection;
  assert.deepEqual([restored.level, restored.dimension, restored.source], [7, "skills", "manual_override"]);
  assert.equal(rebuilt.manualOverrides[0].reason, overridden.manualOverrides[0].reason);

  const external = applyManualQualificationOverride(base, {
    outcomeId: "LO-KNOWLEDGE",
    frameworkId: "eqf",
    level: 6,
    dimension: "knowledge",
    reason: "Kurum dışı eğitici kaynak eleştirisi kanıtını insan gözüyle incelemiştir.",
    actorRole: "externalInstructor"
  });
  assert.equal(external.manualOverrides[0].actorRole, "externalInstructor");
});

test("koordinatörlük, komisyon ve diğer roller öneri seçimini değiştiremiyor", () => {
  const base = suggestProgramQualificationAlignment({ programId: "PROGRAM-RBAC", outcomes: sampleOutcomes });
  const before = structuredClone(base);
  for (const actorRole of ["coordinator", "commission", "admin", "learner", "finance"]) {
    assert.throws(() => applyManualQualificationOverride(base, {
      outcomeId: "LO-SKILLS",
      frameworkId: "tyc",
      level: 6,
      dimension: "skills",
      reason: "Yetkisiz rol bu açıklanabilir öneriyi değiştirmeye çalışmaktadır.",
      actorRole
    }), /yalnız.*eğitici|salt-okunur/i, actorRole);
  }
  assert.deepEqual(base, before, "yetkisiz override denemesi öneriyi değiştirdi");
});

test("komisyonun insan kurul kararı öneriden ayrı kaydediliyor ve öneriyi değiştirmiyor", () => {
  const result = suggestProgramQualificationAlignment({ programId: "PROGRAM-BOARD", outcomes: sampleOutcomes });
  const suggestionSnapshot = structuredClone(result.outcomes);
  const decided = recordHumanBoardQualificationDecision(result, {
    actorRole: "commission",
    decision: "revision_requested",
    decidedBy: "Mikro Yeterlilik Komisyonu",
    rationale: "Ölçme kanıtlarının insan incelemesiyle güçlendirilmesi ve yeniden sunulması gerekir.",
    tycLevel: 6,
    eqfLevel: 6
  });
  assert.deepEqual(decided.outcomes, suggestionSnapshot);
  assert.equal(decided.finalDecision.source, "human_commission");
  assert.equal(decided.finalDecision.suggestionMutated, false);
  assert.equal(decided.finalDecision.autonomousDecision, false);
  assert.throws(() => recordHumanBoardQualificationDecision(result, {
    actorRole: "coordinator",
    decision: "approved",
    decidedBy: "Koordinatörlük",
    rationale: "Yetkisiz kurul kararı denemesidir ve kabul edilmemelidir."
  }), /yalnız komisyon/);
});

test("boş, yinelenen ve sınır dışı girdiler güvenli biçimde reddediliyor", () => {
  assert.throws(() => suggestOutcomeQualificationAlignment("   "), /boş olamaz|metni bulunamadı/);
  assert.throws(() => suggestProgramQualificationAlignment({ outcomes: [] }), /en az bir/);
  assert.throws(() => suggestProgramQualificationAlignment({ outcomes: [
    { id: "LO-X", text: "Kuramsal bilgiyi açıklar." },
    { id: "LO-X", text: "Uygulama problemini çözer." }
  ] }), /benzersiz/);
  const base = suggestProgramQualificationAlignment({ outcomes: sampleOutcomes });
  const invalidOverrides = [
    { outcomeId: "LO-SKILLS", frameworkId: "tyc", level: 0, dimension: "skills", reason: "Geçerli uzunlukta insan gerekçesidir.", actorRole: "instructor" },
    { outcomeId: "LO-SKILLS", frameworkId: "eqf", level: 9, dimension: "skills", reason: "Geçerli uzunlukta insan gerekçesidir.", actorRole: "instructor" },
    { outcomeId: "LO-SKILLS", frameworkId: "invalid", level: 6, dimension: "skills", reason: "Geçerli uzunlukta insan gerekçesidir.", actorRole: "instructor" },
    { outcomeId: "LO-SKILLS", frameworkId: "tyc", level: 6, dimension: "unknown", reason: "Geçerli uzunlukta insan gerekçesidir.", actorRole: "instructor" },
    { outcomeId: "LO-MISSING", frameworkId: "tyc", level: 6, dimension: "skills", reason: "Geçerli uzunlukta insan gerekçesidir.", actorRole: "instructor" },
    { outcomeId: "LO-SKILLS", frameworkId: "tyc", level: 6, dimension: "skills", reason: "kısa", actorRole: "instructor" }
  ];
  for (const override of invalidOverrides) assert.throws(() => applyManualQualificationOverride(base, override));
  assert.throws(() => suggestOutcomeQualificationAlignment("x".repeat(QUALIFICATION_SUGGESTION_LIMITS.maxOutcomeLength + 1)), /en fazla/);
  assert.throws(() => suggestProgramQualificationAlignment({
    outcomes: Array.from({ length: QUALIFICATION_SUGGESTION_LIMITS.maxOutcomeCount + 1 }, (_, index) => ({ id: `LO-${index}`, text: "Kuramsal bilgiyi açıklar." }))
  }), /en fazla/);
});

test("ölçülemeyen kısa girdi güvenli düşük-güven önerisi ve düzeltme yönlendirmesi üretiyor", () => {
  const result = suggestOutcomeQualificationAlignment({ id: "LO-LOW", text: "Öğrenir." });
  assert.equal(result.inputQuality.status, "insufficient");
  assert.equal(result.inputQuality.isMeasurable, false);
  assert.ok(result.inputQuality.warnings.length >= 1);
  assert.ok(String(result.inputQuality.improvementPrompt).length >= 20);
  for (const frameworkId of ["tyc", "eqf"]) {
    assert.equal(result.suggestions[frameworkId].confidence, "low");
    assert.ok(result.suggestions[frameworkId].score <= 45);
    assert.match(result.suggestions[frameworkId].rationale, /Girdi kalitesi yetersizdir/);
  }
});

test("TYÇ ve AYÇ/EQF yakınlığı eşitliğe zorlanmadan açıklanabilir tutarlılık kaydı taşıyor", () => {
  const outcome = suggestOutcomeQualificationAlignment(sampleOutcomes[1], { preferredLevels: { tyc: 6, eqf: 7 } });
  assert.equal(outcome.crossFrameworkConsistency.equalityForced, false);
  assert.equal(outcome.crossFrameworkConsistency.institutionalValidationRequired, true);
  assert.ok(["aligned", "adjacent_review", "material_discrepancy"].includes(outcome.crossFrameworkConsistency.classification));
  const program = suggestProgramQualificationAlignment({ outcomes: sampleOutcomes, preferredLevels: { tyc: 6, eqf: 7 } });
  assert.equal(program.program.crossFrameworkConsistency.equalityForced, false);
  assert.equal(program.program.crossFrameworkConsistency.institutionalValidationRequired, true);
  assert.equal(
    program.program.crossFrameworkConsistency.exactMatchCount
      + program.program.crossFrameworkConsistency.adjacentReviewCount
      + program.program.crossFrameworkConsistency.materialDiscrepancyCount,
    sampleOutcomes.length
  );
});

test("kullanıcı metni ve motor meta verisi otomatik/nihai karar iddiası taşımıyor", () => {
  assert.match(QUALIFICATION_ADVISORY_NOTICE, /karar değil/i);
  assert.match(QUALIFICATION_ADVISORY_NOTICE, /Nihai akademik.*yetkili kurul/i);
  assert.match(QUALIFICATION_SUGGESTION_ENGINE_VERSION, /^\d{4}-\d{2}-\d{2}\./);
  const result = suggestProgramQualificationAlignment({ outcomes: sampleOutcomes });
  const serialized = JSON.stringify(result);
  assert.equal(/"autonomousDecision":true/.test(serialized), false);
  assert.equal(result.engineMode, "deterministic_explainable_pilot");
});

const failures = cases.filter((item) => !item.ok);
for (const item of cases) {
  console.log(`${item.ok ? "✓" : "✗"} ${item.name}`);
  if (!item.ok) console.error(item.error?.stack || item.error);
}
if (failures.length) throw new Error(`${failures.length}/${cases.length} akıllı yeterlilik eşleme sözleşmesi başarısız`);
console.log(`Akıllı yeterlilik eşleme sözleşmesi başarılı: ${cases.length}/${cases.length}; iki çerçeve, açıklanabilir öneri, aggregate, RBAC, kalıcılık ve insan karar sınırı.`);
