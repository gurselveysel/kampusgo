import {
  REFERENCE_DATA_VERSION,
  qualificationDatasetRegistry,
  qualificationFrameworks
} from "./reference-data.js";
import {
  QUALIFICATION_FRAMEWORK_IDS,
  QUALIFICATION_SUGGESTION_LIMITS
} from "./qualification-suggestion.js";

export const SMART_SUGGESTION_SNAPSHOT_SCHEMA = "smart-suggestion-report-snapshot-v1";
export const SMART_SUGGESTION_SNAPSHOT_INTEGRITY_ALGORITHM = "fnv1a32-canonical-json-v1";

const DIMENSIONS = Object.freeze(["knowledge", "skills", "competence"]);
const CONFIDENCE_LEVELS = Object.freeze(["low", "medium", "high"]);

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpsUrl(value) {
  return isText(value) && /^https:\/\//.test(value);
}

function isLevel(frameworkId, value) {
  return Number.isInteger(value) && value >= (frameworkId === "tyyc" ? 5 : 1) && value <= 8;
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Snapshot yalnız sonlu sayılar içerebilir.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  throw new TypeError("Snapshot yalnız JSON uyumlu alanlar içerebilir.");
}

function fnv1a32(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

function currentSourceContext() {
  return {
    frameworks: qualificationFrameworks.map((item) => ({
      id: item.id,
      code: item.code,
      verifiedAt: item.verifiedAt,
      sourceStatus: item.sourceStatus,
      officialSourceUrl: item.officialSourceUrl,
      descriptorSourceUrl: item.descriptorSourceUrl || item.officialSourceUrl,
      legalSourceUrl: item.legalSourceUrl || item.officialSourceUrl,
      descriptorContentStatus: item.descriptorContentStatus || "canonical_official_descriptor"
    })),
    datasets: qualificationDatasetRegistry.map((item) => ({
      id: item.id,
      verifiedAt: item.verifiedAt,
      ingestionStatus: item.ingestionStatus,
      automatedIngestionEnabled: item.automatedIngestionEnabled,
      accessUrl: item.accessUrl,
      documentationUrl: item.documentationUrl
    }))
  };
}

function integrityPayload(snapshot) {
  const { integrityHash: _ignored, ...payload } = snapshot;
  return payload;
}

export function smartSuggestionSnapshotIntegrityHash(snapshot) {
  return `FNV1A32-${fnv1a32(canonicalJson(integrityPayload(snapshot)))}`;
}

export function createSmartSuggestionSnapshot(report, selectionContext, options = {}) {
  if (!isObject(report) || !Array.isArray(report.outcomes) || !report.outcomes.length) {
    throw new TypeError("Tam akıllı öneri raporu olmadan snapshot oluşturulamaz.");
  }
  if (!isObject(selectionContext) || !Array.isArray(selectionContext.outcomes) || !selectionContext.outcomes.length) {
    throw new TypeError("Snapshot için öğrenme çıktısı ve insan seçim bağlamı gerekir.");
  }
  const capturedAt = String(options.capturedAt || new Date().toISOString());
  if (!Number.isFinite(Date.parse(capturedAt))) throw new TypeError("Snapshot yakalama zamanı ISO tarih olmalıdır.");
  const snapshot = {
    schemaVersion: SMART_SUGGESTION_SNAPSHOT_SCHEMA,
    capturedAt,
    engineVersion: String(report.engineVersion || ""),
    engineMode: String(report.engineMode || ""),
    referenceDataVersion: String(options.referenceDataVersion || REFERENCE_DATA_VERSION),
    sourceContext: cloneJson(options.sourceContext || currentSourceContext()),
    report: cloneJson(report),
    selectionContext: cloneJson(selectionContext),
    integrityAlgorithm: SMART_SUGGESTION_SNAPSHOT_INTEGRITY_ALGORITHM
  };
  snapshot.integrityHash = smartSuggestionSnapshotIntegrityHash(snapshot);
  return deepFreeze(snapshot);
}

function validateAssessment(item) {
  return isObject(item) && ["method", "evidence", "rationale"].every((key) => isText(item[key]));
}

function validateSuggestion(suggestion, frameworkId, errors, path) {
  if (!isObject(suggestion)) {
    errors.push(`${path}: öneri nesnesi eksik`);
    return;
  }
  if (suggestion.frameworkId !== frameworkId) errors.push(`${path}: çerçeve kimliği farklı`);
  if (!isLevel(frameworkId, suggestion.level)) errors.push(`${path}: seviye aralık dışında`);
  if (!DIMENSIONS.includes(suggestion.dimension)) errors.push(`${path}: boyut geçersiz`);
  if (!Number.isFinite(suggestion.score) || suggestion.score < 0 || suggestion.score > 100) errors.push(`${path}: skor geçersiz`);
  if (!CONFIDENCE_LEVELS.includes(suggestion.confidence)) errors.push(`${path}: güven düzeyi geçersiz`);
  for (const key of ["frameworkCode", "descriptor", "descriptorDisplayTr", "rationale", "method"]) {
    if (!isText(suggestion[key])) errors.push(`${path}: ${key} eksik`);
  }
  if (!isHttpsUrl(suggestion.officialSourceUrl)) errors.push(`${path}: resmî kaynak URL'si eksik`);
  if (!Array.isArray(suggestion.alternatives) || suggestion.alternatives.length < 2 || suggestion.alternatives.some((item) =>
    !isObject(item) || !isLevel(frameworkId, item.level) || !DIMENSIONS.includes(item.dimension) || !Number.isFinite(item.score) || !isText(item.descriptor))) {
    errors.push(`${path}: alternatif adaylar eksik veya geçersiz`);
  }
  if (!Array.isArray(suggestion.evidenceGapWarnings) || suggestion.evidenceGapWarnings.some((item) => typeof item !== "string")) {
    errors.push(`${path}: eksik kanıt uyarıları geçersiz`);
  }
  if (!Array.isArray(suggestion.matchedSignals) || suggestion.matchedSignals.some((item) => !isObject(item))) errors.push(`${path}: eşleşen sinyaller geçersiz`);
  if (!Array.isArray(suggestion.suggestedContent) || !suggestion.suggestedContent.length || suggestion.suggestedContent.some((item) => !isText(item))) errors.push(`${path}: içerik önerileri geçersiz`);
  if (!Array.isArray(suggestion.suggestedAssessments) || !suggestion.suggestedAssessments.length || suggestion.suggestedAssessments.some((item) => !validateAssessment(item))) errors.push(`${path}: ölçme/kanıt önerileri geçersiz`);
  const effective = suggestion.effectiveSelection;
  if (!isObject(effective) || !isLevel(frameworkId, effective.level) || !DIMENSIONS.includes(effective.dimension) ||
      !["engine_suggestion", "manual_override"].includes(effective.source) || effective.institutionalValidationRequired !== true) {
    errors.push(`${path}: etkin seçim geçersiz`);
  }
  if (suggestion.autonomousDecision !== false || suggestion.institutionalValidationRequired !== true) errors.push(`${path}: insan denetimi sınırı eksik`);
  if (frameworkId === "tyyc") {
    if (suggestion.descriptorStatus !== "advisory_summary_not_verbatim") errors.push(`${path}: TYYÇ tanımlayıcı statüsü geçersiz`);
    if (!isObject(suggestion.qualificationTypeSuggestion) || !isObject(suggestion.qualificationTypeSuggestion.selected) ||
        !isText(suggestion.qualificationTypeSuggestion.selected.id) || !isText(suggestion.qualificationTypeSuggestion.selected.titleTr) ||
        !isLevel("tyyc", suggestion.qualificationTypeSuggestion.selected.level)) errors.push(`${path}: TYYÇ yeterlilik türü snapshot'ı eksik`);
    for (const claim of ["officialPlacementClaim", "equivalenceClaim", "logoRightClaim"]) {
      if (suggestion[claim] !== false) errors.push(`${path}: ${claim} yanlış biçimde ileri sürülüyor`);
    }
  }
}

function validateReport(report, errors) {
  if (!isObject(report) || !isText(report.engineVersion) || !isText(report.engineMode) || !isText(report.programId) || !isText(report.advisoryNotice)) {
    errors.push("report: temel motor/bağlam alanları eksik");
    return;
  }
  if (!Array.isArray(report.outcomes) || report.outcomes.length < 1 || report.outcomes.length > QUALIFICATION_SUGGESTION_LIMITS.maxOutcomeCount) {
    errors.push("report: öğrenme çıktısı sayısı geçersiz");
    return;
  }
  const ids = new Set();
  report.outcomes.forEach((outcome, outcomeIndex) => {
    const path = `report.outcomes[${outcomeIndex}]`;
    if (!isObject(outcome) || !isText(outcome.outcomeId) || !isText(outcome.outcomeText)) {
      errors.push(`${path}: çıktı kimliği/metni eksik`);
      return;
    }
    if (ids.has(outcome.outcomeId)) errors.push(`${path}: yinelenen çıktı kimliği`);
    ids.add(outcome.outcomeId);
    if (!isObject(outcome.suggestions) || !QUALIFICATION_FRAMEWORK_IDS.every((frameworkId) => Object.hasOwn(outcome.suggestions, frameworkId))) {
      errors.push(`${path}: üç bağımsız çerçeve önerisi eksik`);
      return;
    }
    QUALIFICATION_FRAMEWORK_IDS.forEach((frameworkId) => validateSuggestion(outcome.suggestions[frameworkId], frameworkId, errors, `${path}.${frameworkId}`));
  });
  if (!isObject(report.program) || !isObject(report.program.suggestedLevels) || !QUALIFICATION_FRAMEWORK_IDS.every((frameworkId) => isLevel(frameworkId, report.program.suggestedLevels[frameworkId]))) {
    errors.push("report.program: üç çerçeve program önerisi eksik");
  }
  if (!Array.isArray(report.manualOverrides)) errors.push("report.manualOverrides: dizi olmalıdır");
  if (!isObject(report.finalDecision) || report.finalDecision.status !== "pending_human_board" || report.finalDecision.autonomousDecision !== false) {
    errors.push("report.finalDecision: snapshot insan kurul kararından ayrı ve beklemede olmalıdır");
  }
}

function validateSourceContext(snapshot, errors) {
  if (!isText(snapshot.referenceDataVersion)) errors.push("referenceDataVersion eksik");
  const frameworks = snapshot.sourceContext?.frameworks;
  const datasets = snapshot.sourceContext?.datasets;
  if (!Array.isArray(frameworks) || frameworks.length !== 3 || !QUALIFICATION_FRAMEWORK_IDS.every((frameworkId) => frameworks.some((item) => item.id === frameworkId))) {
    errors.push("sourceContext.frameworks: TYÇ/AYÇ/TYYÇ kaynak bağlamı eksik");
  } else if (frameworks.some((item) => !isText(item.code) || !isText(item.verifiedAt) || !isText(item.sourceStatus) || !isHttpsUrl(item.officialSourceUrl) || !isHttpsUrl(item.descriptorSourceUrl))) {
    errors.push("sourceContext.frameworks: kaynak sürümü/provenansı geçersiz");
  }
  if (!Array.isArray(datasets) || !datasets.length || datasets.some((item) => !isText(item.id) || !isText(item.verifiedAt) || !isText(item.ingestionStatus) || !isHttpsUrl(item.accessUrl))) {
    errors.push("sourceContext.datasets: veri seti kaynak bağlamı geçersiz");
  }
}

function effectiveSelection(suggestion) {
  return { ...suggestion, ...(suggestion?.effectiveSelection || {}) };
}

function validateSelectionLinks(snapshot, links, errors) {
  const context = snapshot.selectionContext;
  if (!isObject(context) || !Array.isArray(context.outcomes) || !Array.isArray(context.manualOverrides) || !Array.isArray(context.appliedSelections)) {
    errors.push("selectionContext: azaltılmış çıktı/insan seçim bağlamı eksik");
    return;
  }
  for (const key of ["orderedOutcomeFingerprint", "outcomes", "program", "manualOverrides", "appliedSelections", "higherEducationCycleSuggestion"]) {
    if (links[key] !== undefined && canonicalJson(context[key]) !== canonicalJson(links[key])) errors.push(`selectionContext.${key}: kalıcı kayıtla eşleşmiyor`);
  }
  if (links.engineVersion !== undefined && links.engineVersion !== snapshot.engineVersion) errors.push("engineVersion: kalıcı kayıtla eşleşmiyor");
  const reportOutcomes = snapshot.report?.outcomes || [];
  if (!isText(context.orderedOutcomeFingerprint) || snapshot.report?.orderedOutcomeFingerprint !== context.orderedOutcomeFingerprint) {
    errors.push("selectionContext.orderedOutcomeFingerprint: tam rapor sıralı çıktı bağı kopuk");
  }
  if (canonicalJson(context.program) !== canonicalJson(snapshot.report?.program)) {
    errors.push("selectionContext.program: tam rapor program özetiyle eşleşmiyor");
  }
  if (context.outcomes.length !== reportOutcomes.length) {
    errors.push("selectionContext.outcomes: tam raporla satır sayısı eşleşmiyor");
    return;
  }
  context.outcomes.forEach((reduced, outcomeIndex) => {
    const full = reportOutcomes[outcomeIndex];
    if (!isObject(reduced) || reduced.outcomeId !== full?.outcomeId || reduced.outcomeIndex !== full?.outcomeIndex ||
        reduced.outcomeFingerprint !== full?.outcomeFingerprint || String(reduced.text).trim() !== String(full?.outcomeText).trim()) {
      errors.push(`selectionContext.outcomes[${outcomeIndex}]: tam rapor çıktı bağı kopuk`);
      return;
    }
    if (!Array.isArray(reduced.selections) || reduced.selections.length !== 3) {
      errors.push(`selectionContext.outcomes[${outcomeIndex}]: üç azaltılmış seçim eksik`);
      return;
    }
    for (const frameworkId of QUALIFICATION_FRAMEWORK_IDS) {
      const reducedSelection = reduced.selections.find((item) => item.frameworkId === frameworkId);
      const fullSuggestion = full.suggestions?.[frameworkId];
      const applied = context.appliedSelections.find((item) => item.outcomeId === reduced.outcomeId && item.frameworkId === frameworkId);
      const expected = applied || effectiveSelection(fullSuggestion);
      if (!reducedSelection || !expected || Number(reducedSelection.level) !== Number(expected.level) || reducedSelection.dimension !== expected.dimension ||
          Number(reducedSelection.score) !== Number(expected.score || fullSuggestion?.score || 0) || reducedSelection.descriptor !== (expected.descriptor || fullSuggestion?.descriptor || "") ||
          reducedSelection.rationale !== (expected.reason || expected.rationale || fullSuggestion?.rationale || "") || reducedSelection.officialSourceUrl !== (expected.officialSourceUrl || fullSuggestion?.officialSourceUrl || "")) {
        errors.push(`selectionContext.outcomes[${outcomeIndex}].${frameworkId}: tam öneri/uygulanan seçim bağı kopuk`);
      }
    }
  });
  if (canonicalJson(context.manualOverrides) !== canonicalJson(snapshot.report.manualOverrides || [])) {
    errors.push("selectionContext.manualOverrides: tam rapor insan override kaydıyla eşleşmiyor");
  }
}

export function validateSmartSuggestionSnapshot(snapshot, links = {}) {
  const errors = [];
  try {
    if (!isObject(snapshot) || snapshot.schemaVersion !== SMART_SUGGESTION_SNAPSHOT_SCHEMA) errors.push("schemaVersion geçersiz");
    if (!isText(snapshot?.capturedAt) || !Number.isFinite(Date.parse(snapshot.capturedAt))) errors.push("capturedAt geçersiz");
    if (!isText(snapshot?.engineVersion) || !isText(snapshot?.engineMode)) errors.push("motor sürümü/modu eksik");
    if (snapshot?.integrityAlgorithm !== SMART_SUGGESTION_SNAPSHOT_INTEGRITY_ALGORITHM) errors.push("integrityAlgorithm geçersiz");
    if (!isText(snapshot?.integrityHash) || snapshot.integrityHash !== smartSuggestionSnapshotIntegrityHash(snapshot)) errors.push("integrityHash doğrulanamadı");
    validateSourceContext(snapshot, errors);
    validateReport(snapshot?.report, errors);
    if (snapshot?.report?.engineVersion !== snapshot?.engineVersion || snapshot?.report?.engineMode !== snapshot?.engineMode) errors.push("snapshot/report motor bağlamı farklı");
    validateSelectionLinks(snapshot, links, errors);
  } catch (error) {
    errors.push(`snapshot doğrulama hatası: ${error.message}`);
  }
  return { valid: errors.length === 0, errors };
}

export function readSmartSuggestionSnapshot(snapshot, links = {}) {
  const validation = validateSmartSuggestionSnapshot(snapshot, links);
  if (!validation.valid) return { ok: false, report: null, errors: validation.errors };
  return { ok: true, report: cloneJson(snapshot.report), errors: [] };
}
