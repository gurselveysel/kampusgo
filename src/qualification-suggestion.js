import {
  higherEducationCycleCrosswalk,
  qualificationFrameworks,
  qualificationLevelDescriptors,
  qualificationLevelTranslations
} from "./reference-data.js";

export const QUALIFICATION_SUGGESTION_ENGINE_VERSION = "2026-08-20.1";
export const QUALIFICATION_ADVISORY_NOTICE = "Bu çıktı karar değil; öğrenme çıktısını TYÇ ve AYÇ/EQF tanımlayıcılarıyla karşılaştıran açıklanabilir, deterministik bir pilot öneridir. Nihai akademik seviye ve yeterlilik kararı yetkili kurulundur.";
export const QUALIFICATION_DIMENSIONS = Object.freeze(["knowledge", "skills", "competence"]);
export const QUALIFICATION_SUGGESTION_LIMITS = Object.freeze({ maxOutcomeCount: 40, maxOutcomeLength: 600 });

const FRAMEWORK_META = Object.freeze({
  tyc: {
    frameworkCode: "TYÇ",
    dimensionLabels: { knowledge: "Bilgi", skills: "Beceri", competence: "Yetkinlik" }
  },
  eqf: {
    frameworkCode: "AYÇ/EQF",
    dimensionLabels: { knowledge: "Bilgi / Knowledge", skills: "Beceri / Skills", competence: "Sorumluluk ve özerklik / Responsibility and autonomy" }
  }
});

const DIMENSION_SIGNALS = Object.freeze({
  knowledge: [
    ["tanımlar", "tanımlama", 8], ["açıklar", "açıklama", 8], ["sınıflandırır", "sınıflandırma", 7],
    ["özetler", "özetleme", 7], ["kavram", "kavramsal bilgi", 5], ["kuram", "kuramsal bilgi", 6],
    ["ilke", "ilkeler", 5], ["olgusal", "olgusal bilgi", 6], ["bilgi sahibi", "bilgi kazanımı", 6],
    ["yorumlar", "bilgiyi yorumlama", 4], ["explains", "explain", 8], ["defines", "define", 8],
    ["knowledge", "knowledge", 5], ["theory", "theory", 6], ["principle", "principle", 5]
  ],
  skills: [
    ["uygular", "uygulama", 8], ["kullanır", "araç/yöntem kullanma", 7], ["analiz eder", "analiz", 8],
    ["çözer", "problem çözme", 9], ["geliştirir", "geliştirme", 8], ["tasarlar", "tasarım", 9],
    ["üretir", "ürün/çözüm üretme", 8], ["doğrular", "doğrulama", 7], ["karşılaştırır", "karşılaştırma", 7],
    ["değerlendirir", "değerlendirme", 6], ["hesaplar", "hesaplama", 7], ["ölçer", "ölçme", 7],
    ["apply", "apply", 8], ["uses", "use", 7], ["analyses", "analyse", 8], ["analyzes", "analyze", 8],
    ["solves", "solve", 9], ["develops", "develop", 8], ["designs", "design", 9], ["creates", "create", 8],
    ["evaluates", "evaluate", 6], ["validates", "validate", 7]
  ],
  competence: [
    ["sorumluluk alır", "sorumluluk alma", 10], ["yönetir", "yönetim", 9], ["liderlik", "liderlik", 9],
    ["bağımsız", "bağımsız çalışma", 8], ["özerk", "özerklik", 9], ["karar verir", "karar verme", 9],
    ["gözetir", "gözetim", 7], ["dönüştürür", "bağlamı dönüştürme", 9], ["etik", "etik sorumluluk", 6],
    ["ekip", "ekip sorumluluğu", 5], ["mesleki gelişim", "mesleki gelişim sorumluluğu", 7],
    ["takes responsibility", "take responsibility", 10], ["manages", "manage", 9], ["leadership", "leadership", 9],
    ["autonomy", "autonomy", 9], ["independently", "independent work", 8], ["transforms", "transform", 9],
    ["ethical", "ethical responsibility", 6]
  ]
});

const LEVEL_SIGNALS = Object.freeze([
  {
    level: 1,
    signals: [["basit görev", "basit görev", 10], ["temel genel", "temel genel bilgi", 8], ["doğrudan gözetim", "doğrudan gözetim", 10], ["simple task", "simple task", 10], ["direct supervision", "direct supervision", 10]]
  },
  {
    level: 2,
    signals: [["başlangıç düzey", "başlangıç düzeyi", 9], ["rutin sorun", "rutin sorun", 8], ["sınırlı özerklik", "sınırlı özerklik", 10], ["basit kural", "basit kural", 7], ["routine problem", "routine problem", 8], ["some autonomy", "some autonomy", 9]]
  },
  {
    level: 3,
    signals: [["seçip kullan", "yöntem seçme ve kullanma", 8], ["seçer", "seçim yapma", 6], ["uyarlar", "değişen koşula uyarlama", 7], ["görevi tamam", "görev tamamlama sorumluluğu", 7], ["selecting and applying", "selecting and applying", 8], ["adapt", "adaptation", 7]]
  },
  {
    level: 4,
    signals: [["belirli sorun", "belirli sorun çözme", 8], ["öngörülebilir", "öngörülebilir bağlam", 8], ["öz yönetim", "öz yönetim", 9], ["rutin işlerin gözetimi", "rutin işlerin gözetimi", 9], ["specific problem", "specific problem", 8], ["self-management", "self-management", 9]]
  },
  {
    level: 5,
    signals: [["kapsamlı", "kapsamlı bilgi/beceri", 8], ["soyut sorun", "soyut sorun", 9], ["yaratıcı çözüm", "yaratıcı çözüm", 9], ["bilginin sınır", "bilginin sınırlarının farkında olma", 8], ["yönetim ve gözetim", "yönetim ve gözetim", 8], ["comprehensive", "comprehensive", 8], ["abstract problem", "abstract problem", 9], ["creative solution", "creative solution", 9]]
  },
  {
    level: 6,
    signals: [["ileri düzey", "ileri düzey", 9], ["eleştirel", "eleştirel yaklaşım", 8], ["karmaşık", "karmaşık problem/bağlam", 8], ["öngörülemeyen", "öngörülemeyen problem/bağlam", 9], ["uzmanlık", "uzmanlık", 8], ["yenilikçi", "yenilik", 8], ["proje yönet", "karmaşık proje yönetimi", 9], ["advanced", "advanced", 9], ["critical understanding", "critical understanding", 9], ["complex", "complex", 8], ["unpredictable", "unpredictable", 9], ["innovation", "innovation", 8]]
  },
  {
    level: 7,
    signals: [["yüksek düzeyde uzman", "yüksek uzmanlık", 10], ["ihtisas", "ihtisas bilgisi", 9], ["araştırma", "araştırma", 7], ["yeni yöntem", "yeni yöntem geliştirme", 10], ["bütünleştir", "farklı alanlardan bilgiyi bütünleştirme", 9], ["stratejik", "stratejik yaklaşım", 9], ["dönüşüm", "karmaşık bağlamı dönüştürme", 9], ["dönüştür", "karmaşık bağlamı dönüştürme", 9], ["ekip performans", "ekiplerin stratejik performansını değerlendirme", 9], ["highly specialised", "highly specialised", 10], ["new knowledge", "new knowledge", 8], ["integrate", "integration across fields", 9], ["strategic", "strategic approach", 9], ["transform", "transform", 9], ["team performance", "strategic team performance", 9]]
  },
  {
    level: 8,
    signals: [["en ileri", "en ileri düzey", 11], ["özgün yaklaşım", "özgün yaklaşım geliştirme", 11], ["özgün araştırma", "özgün araştırma", 11], ["yeni bilgi üret", "yeni bilgi üretme", 11], ["yeniden tanıml", "mevcut bilgiyi yeniden tanımlama", 11], ["bilimsel bütünlük", "bilimsel bütünlük", 10], ["araştırmanın ön cephesi", "araştırmanın ön cephesi", 11], ["most advanced", "most advanced", 11], ["redefine", "redefine knowledge/practice", 11], ["forefront", "forefront", 11], ["scholarly integrity", "scholarly integrity", 10]]
  }
]);

const STOP_WORDS = new Set([
  "bir", "ve", "veya", "ile", "icin", "bu", "olan", "olarak", "ilgili", "alanda", "alaninda",
  "the", "and", "or", "with", "for", "in", "of", "to", "a", "an", "that", "within"
]);

const ASSESSMENT_BANK = Object.freeze({
  knowledge: {
    lower: [
      { method: "Yapılandırılmış kısa yanıt + kavram haritası", evidence: "Doğru kavram ilişkileri ve gerekçeli kısa yanıt", rationale: "Bilginin yalnız hatırlanmasını değil, ilişkilendirilmesini görünür kılar." },
      { method: "Senaryo temelli bilgi kontrolü", evidence: "Senaryodaki olgu ve ilkelerin doğru açıklanması", rationale: "Tanımlayıcıdaki olgusal/kuramsal bilgi kapsamını gözlenebilir kılar." }
    ],
    upper: [
      { method: "Gerekçeli vaka analizi + analitik rubrik", evidence: "Kaynak izli analiz raporu ve rubrik kaydı", rationale: "İleri/eleştirel bilgi kullanımını ve kanıt sınırlarını görünür kılar." },
      { method: "Karşılaştırmalı literatür veya kaynak eleştirisi", evidence: "Karşılaştırma matrisi, kaynak izi ve gerekçeli sonuç", rationale: "Kuramsal, metodolojik ve eleştirel bilgi düzeyini ayırt eder." }
    ]
  },
  skills: {
    lower: [
      { method: "Uygulama görevi + kontrol listesi", evidence: "Tamamlanan işlem, süreç kaydı ve ölçüt karşılama durumu", rationale: "Bilişsel ve uygulamalı beceriyi doğrudan performansla ölçer." },
      { method: "Yapılandırılmış problem çözme", evidence: "Seçilen yöntem, uygulama adımları ve sonuç", rationale: "Yöntem seçme ve kullanma davranışını gözlenebilir kılar." }
    ],
    upper: [
      { method: "Karmaşık performans görevi + ürün dosyası", evidence: "Çalışan ürün/çözüm, karar günlüğü ve analitik rubrik", rationale: "Uzmanlık, yenilik, sentez ve doğrulama becerilerini birlikte sınar." },
      { method: "Vaka çözümü + bağımsız uzman değerlendirmesi", evidence: "Gerekçeli çözüm, alternatif analizi ve değerlendirme tutanağı", rationale: "Karmaşık ve öngörülemeyen problemlerde karar kalitesini ayırt eder." }
    ]
  },
  competence: {
    lower: [
      { method: "Görev simülasyonu + gözlem kontrol listesi", evidence: "Sorumluluk, öz yönetim ve iletişim davranışlarının gözlem kaydı", rationale: "Yetkinliği yalnız beyana değil davranış kanıtına bağlar." },
      { method: "Yansıtıcı rapor + öz değerlendirme", evidence: "Karar gerekçesi, öğrenme ihtiyacı ve iyileştirme adımı", rationale: "Özerklik ve öğrenme sorumluluğunu görünür kılar." }
    ],
    upper: [
      { method: "Proje/ekip simülasyonu + çok kaynaklı rubrik", evidence: "Karar günlüğü, risk kaydı, ekip geri bildirimi ve rubrik", rationale: "Karmaşık bağlamda sorumluluk, yönetim ve etik yargıyı birlikte gözler." },
      { method: "Kurul savunması + stratejik etki dosyası", evidence: "Savunma tutanağı, etki ölçütleri ve gerekçeli iyileştirme planı", rationale: "Özerklik, liderlik ve dönüşüm sorumluluğuna ilişkin karşılaştırılabilir kanıt üretir." }
    ]
  }
});

function normalizeText(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9çğıöşü\s/-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function plainClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function asOutcome(outcome, index = 0) {
  if (typeof outcome === "string") {
    const text = outcome.trim();
    if (!text) throw new TypeError("Öğrenme çıktısı boş olamaz.");
    if (text.length > QUALIFICATION_SUGGESTION_LIMITS.maxOutcomeLength) throw new RangeError(`Öğrenme çıktısı en fazla ${QUALIFICATION_SUGGESTION_LIMITS.maxOutcomeLength} karakter olabilir.`);
    return { id: `LO-${index + 1}`, text };
  }
  if (!outcome || typeof outcome !== "object") throw new TypeError("Öğrenme çıktısı metin veya nesne olmalıdır.");
  const text = String(outcome.text || outcome.learningOutcome || outcome.title || "").trim();
  if (!text) throw new TypeError("Öğrenme çıktısı metni bulunamadı.");
  if (text.length > QUALIFICATION_SUGGESTION_LIMITS.maxOutcomeLength) throw new RangeError(`Öğrenme çıktısı en fazla ${QUALIFICATION_SUGGESTION_LIMITS.maxOutcomeLength} karakter olabilir.`);
  return { ...outcome, id: String(outcome.id || outcome.code || `LO-${index + 1}`), text };
}

function assessInputQuality(outcomeText, dimensionProfile) {
  const normalized = normalizeText(outcomeText);
  const wordCount = normalized ? normalized.split(" ").filter(Boolean).length : 0;
  const observableSignalCount = dimensionProfile.ranking.reduce((sum, item) => sum + item.signals.length, 0);
  const warnings = [];
  if (normalized.length < 12 || wordCount < 3) warnings.push("Öğrenme çıktısı çok kısa; bağlam, nesne ve başarı koşulu ekleyin.");
  if (observableSignalCount === 0) warnings.push("Ölçülebilir/gözlenebilir bir eylem fiili bulunamadı; ör. açıklar, uygular, analiz eder, geliştirir veya yönetir kullanın.");
  if (/<[^>]+>/.test(outcomeText)) warnings.push("İşaretleme/HTML benzeri içerik bulundu; yalnız düz metin öğrenme çıktısı kullanın.");
  const isMeasurable = normalized.length >= 12 && wordCount >= 3 && observableSignalCount > 0;
  return {
    status: isMeasurable && warnings.length === 0 ? "sufficient" : isMeasurable ? "review" : "insufficient",
    isMeasurable,
    wordCount,
    characterCount: outcomeText.length,
    observableSignalCount,
    warnings,
    improvementPrompt: warnings.length ? "Çıktıyı; öğrenenin ne yapacağını, hangi içerik/bağlamda yapacağını ve hangi gözlenebilir kanıtla göstereceğini belirtecek şekilde geliştirin." : null
  };
}

function descriptorRecord(frameworkId, level) {
  return qualificationLevelDescriptors.find((item) => item.frameworkId === frameworkId && item.level === level);
}

function translatedDescriptor(frameworkId, level) {
  if (frameworkId === "tyc") return descriptorRecord(frameworkId, level);
  return qualificationLevelTranslations.find((item) => item.frameworkId === frameworkId && item.level === level);
}

function descriptorText(frameworkId, level, dimension, displayTr = false) {
  const descriptor = displayTr ? translatedDescriptor(frameworkId, level) : descriptorRecord(frameworkId, level);
  return descriptor?.[dimension] || "";
}

function cycleForLevel(level) {
  const match = higherEducationCycleCrosswalk.find((item) => item.tycLevel === level && item.eqfLevel === level);
  return match ? plainClone(match) : null;
}

function tokenize(value) {
  return normalizeText(value).split(" ").filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

function overlapScore(text, descriptor) {
  const textTokens = new Set(tokenize(text));
  const descriptorTokens = new Set(tokenize(descriptor));
  if (!textTokens.size || !descriptorTokens.size) return 0;
  let overlap = 0;
  for (const token of textTokens) if (descriptorTokens.has(token)) overlap += 1;
  return Math.min(10, overlap * 2);
}

function matchedDimensionSignals(normalized) {
  const result = {};
  for (const dimension of QUALIFICATION_DIMENSIONS) {
    result[dimension] = DIMENSION_SIGNALS[dimension]
      .filter(([pattern]) => normalized.includes(normalizeText(pattern)))
      .map(([pattern, label, weight]) => ({ pattern, label, weight, category: "dimension", dimension }));
  }
  return result;
}

function chooseDimension(normalized) {
  const matches = matchedDimensionSignals(normalized);
  const tieOrder = { skills: 0, knowledge: 1, competence: 2 };
  const ranked = QUALIFICATION_DIMENSIONS.map((dimension) => ({
    dimension,
    rawScore: matches[dimension].reduce((total, signal) => total + signal.weight, 0),
    signals: matches[dimension]
  })).sort((a, b) => b.rawScore - a.rawScore || tieOrder[a.dimension] - tieOrder[b.dimension]);
  const selected = ranked[0];
  const next = ranked[1];
  return {
    dimension: selected.dimension,
    confidence: selected.rawScore === 0 ? "low" : selected.rawScore - next.rawScore >= 5 ? "high" : "medium",
    matchedSignals: selected.signals,
    ranking: ranked
  };
}

function matchedLevelSignals(normalized) {
  return LEVEL_SIGNALS.map(({ level, signals }) => ({
    level,
    signals: signals
      .filter(([pattern]) => normalized.includes(normalizeText(pattern)))
      .map(([pattern, label, weight]) => ({ pattern, label, weight, category: "level", level }))
  }));
}

function rankLevels(outcomeText, frameworkId, dimension, preferredLevel) {
  const normalized = normalizeText(outcomeText);
  const levelMatches = matchedLevelSignals(normalized);
  const candidates = Array.from({ length: 8 }, (_, index) => index + 1).map((level) => {
    const matched = levelMatches.find((item) => item.level === level)?.signals || [];
    const official = descriptorText(frameworkId, level, dimension, false);
    const displayTr = descriptorText(frameworkId, level, dimension, true) || official;
    const fallbackBias = Math.max(0, 3 - Math.abs(level - 4) * 0.6);
    const preferredBoost = Number(preferredLevel) === level ? 5 : 0;
    const rawScore = fallbackBias + preferredBoost + matched.reduce((total, signal) => total + signal.weight, 0) + overlapScore(outcomeText, displayTr);
    return { level, rawScore, matchedSignals: matched, official, displayTr };
  }).sort((a, b) => b.rawScore - a.rawScore || a.level - b.level);
  const selected = candidates[0];
  const margin = selected.rawScore - candidates[1].rawScore;
  const hasLevelSignals = levelMatches.some((item) => item.signals.length > 0);
  const score = hasLevelSignals
    ? Math.round(Math.min(98, 52 + selected.rawScore * 1.7 + Math.max(0, margin)))
    : Math.round(Math.min(58, 38 + selected.rawScore * 3));
  const confidence = !hasLevelSignals ? "low" : score >= 80 && margin >= 5 ? "high" : score >= 65 ? "medium" : "low";
  return { selected, candidates, score, confidence, hasLevelSignals };
}

function contentSuggestions(outcomeText, dimension, level) {
  const levelBand = level <= 4 ? "temel ve yapılandırılmış" : level <= 6 ? "ileri ve uygulama ağırlıklı" : "araştırma, yenilik ve dönüşüm odaklı";
  const dimensionCore = {
    knowledge: "kavramlar, ilkeler, kuramsal/olgusal dayanaklar ve kaynak güvenilirliği",
    skills: "uygulama adımları, yöntem/araç seçimi, problem çözme ve ürün doğrulama",
    competence: "sorumluluk, özerklik, etik yargı, ekip/bağlam yönetimi ve iyileştirme"
  }[dimension];
  return [
    `“${outcomeText}” çıktısını destekleyen ${levelBand} öğrenme içeriği`,
    dimensionCore,
    `Seviye ${level} tanımlayıcısıyla ilişkiyi görünür kılan örnek, karşı örnek ve kanıt etkinliği`
  ];
}

function assessmentSuggestions(dimension, level) {
  return plainClone(ASSESSMENT_BANK[dimension][level <= 4 ? "lower" : "upper"]);
}

function rationaleFor({ frameworkId, level, dimension, score, confidence, signals, descriptorDisplayTr }) {
  const frameworkCode = FRAMEWORK_META[frameworkId].frameworkCode;
  const dimensionLabel = FRAMEWORK_META[frameworkId].dimensionLabels[dimension];
  const signalText = signals.length
    ? signals.slice(0, 5).map((signal) => `“${signal.label}”`).join(", ")
    : "belirgin düzey anahtarı bulunmaması";
  return `${frameworkCode} ${level}. seviye / ${dimensionLabel} önerisi; ${signalText} sinyalleri ve ilgili tanımlayıcıyla sözcüksel yakınlık üzerinden ${score}/100 puanla (${confidence}) üretildi. Karşılaştırılan tanımlayıcı: ${descriptorDisplayTr} Bu gerekçe akademik karar değildir.`;
}

function outcomeFrameworkSuggestion(outcome, frameworkId, dimensionProfile, options = {}) {
  const preferredLevel = options.preferredLevels?.[frameworkId];
  const ranking = rankLevels(outcome.text, frameworkId, dimensionProfile.dimension, preferredLevel);
  const { selected } = ranking;
  const framework = qualificationFrameworks.find((item) => item.id === frameworkId);
  const dimensionLabel = FRAMEWORK_META[frameworkId].dimensionLabels[dimensionProfile.dimension];
  const signals = [...dimensionProfile.matchedSignals, ...selected.matchedSignals]
    .filter((signal, index, all) => all.findIndex((candidate) => candidate.label === signal.label && candidate.category === signal.category) === index);
  const alternatives = ranking.candidates.slice(1, 4).map((candidate) => ({
    level: candidate.level,
    dimension: dimensionProfile.dimension,
    score: Math.round(Math.min(96, 42 + candidate.rawScore * 1.7)),
    descriptor: candidate.official,
    descriptorDisplayTr: candidate.displayTr
  }));
  const suggestion = {
    frameworkId,
    frameworkCode: framework.code,
    level: selected.level,
    dimension: dimensionProfile.dimension,
    dimensionLabel,
    score: ranking.score,
    confidence: ranking.confidence,
    dimensionConfidence: dimensionProfile.confidence,
    descriptor: selected.official,
    descriptorDisplayTr: selected.displayTr,
    officialSourceUrl: framework.descriptorSourceUrl || framework.officialSourceUrl,
    matchedSignals: signals,
    suggestedContent: contentSuggestions(outcome.text, dimensionProfile.dimension, selected.level),
    suggestedAssessments: assessmentSuggestions(dimensionProfile.dimension, selected.level),
    alternatives,
    higherEducationCycleSuggestion: cycleForLevel(selected.level),
    method: "deterministic_weighted_rules_and_descriptor_overlap",
    autonomousDecision: false,
    institutionalValidationRequired: true
  };
  suggestion.suggestedAssessmentMethods = suggestion.suggestedAssessments.map((item) => item.method);
  suggestion.rationale = rationaleFor({
    frameworkId,
    level: selected.level,
    dimension: dimensionProfile.dimension,
    score: ranking.score,
    confidence: ranking.confidence,
    signals,
    descriptorDisplayTr: selected.displayTr
  });
  suggestion.computedSelection = Object.freeze({
    level: suggestion.level,
    dimension: suggestion.dimension,
    score: suggestion.score,
    confidence: suggestion.confidence
  });
  suggestion.effectiveSelection = {
    level: suggestion.level,
    dimension: suggestion.dimension,
    source: "engine_suggestion",
    reason: suggestion.rationale,
    actorRole: null,
    institutionalValidationRequired: true
  };
  return suggestion;
}

export function buildQualificationSelectionOptions(frameworkId) {
  if (!FRAMEWORK_META[frameworkId]) throw new RangeError(`Desteklenmeyen yeterlilik çerçevesi: ${frameworkId}`);
  const framework = qualificationFrameworks.find((item) => item.id === frameworkId);
  return Array.from({ length: 8 }, (_, index) => index + 1).map((level) => ({
    frameworkId,
    frameworkCode: framework.code,
    level,
    dimensions: QUALIFICATION_DIMENSIONS.map((dimension) => ({
      dimension,
      dimensionLabel: FRAMEWORK_META[frameworkId].dimensionLabels[dimension],
      descriptor: descriptorText(frameworkId, level, dimension, false),
      descriptorDisplayTr: descriptorText(frameworkId, level, dimension, true) || descriptorText(frameworkId, level, dimension, false)
    })),
    higherEducationCycleSuggestion: cycleForLevel(level),
    officialSourceUrl: framework.descriptorSourceUrl || framework.officialSourceUrl,
    institutionalValidationRequired: true,
    autonomousDecision: false
  }));
}

export function suggestOutcomeQualificationAlignment(outcome, options = {}) {
  const normalizedOutcome = asOutcome(outcome, Number(options.index) || 0);
  const dimensionProfile = chooseDimension(normalizeText(normalizedOutcome.text));
  const inputQuality = assessInputQuality(normalizedOutcome.text, dimensionProfile);
  const result = {
    outcomeId: normalizedOutcome.id,
    outcomeText: normalizedOutcome.text,
    outcomeMetadata: Object.fromEntries(Object.entries(normalizedOutcome).filter(([key]) => !["id", "text"].includes(key))),
    suggestions: {
      tyc: outcomeFrameworkSuggestion(normalizedOutcome, "tyc", dimensionProfile, options),
      eqf: outcomeFrameworkSuggestion(normalizedOutcome, "eqf", dimensionProfile, options)
    },
    inputQuality,
    advisoryNotice: QUALIFICATION_ADVISORY_NOTICE
  };
  if (!inputQuality.isMeasurable) {
    for (const frameworkId of ["tyc", "eqf"]) {
      result.suggestions[frameworkId].confidence = "low";
      result.suggestions[frameworkId].score = Math.min(45, result.suggestions[frameworkId].score);
      result.suggestions[frameworkId].rationale += ` Girdi kalitesi yetersizdir: ${inputQuality.warnings.join(" ")}`;
      result.suggestions[frameworkId].computedSelection = {
        ...result.suggestions[frameworkId].computedSelection,
        score: result.suggestions[frameworkId].score,
        confidence: "low"
      };
      result.suggestions[frameworkId].effectiveSelection.reason = result.suggestions[frameworkId].rationale;
    }
  }
  result.crossFrameworkConsistency = crossFrameworkConsistencyForOutcome(result);
  return result;
}

function effectiveLevel(outcome, frameworkId) {
  return outcome.suggestions[frameworkId].effectiveSelection?.level || outcome.suggestions[frameworkId].level;
}

function effectiveDimension(outcome, frameworkId) {
  return outcome.suggestions[frameworkId].effectiveSelection?.dimension || outcome.suggestions[frameworkId].dimension;
}

function crossFrameworkConsistencyForOutcome(outcome) {
  const tycLevel = effectiveLevel(outcome, "tyc");
  const eqfLevel = effectiveLevel(outcome, "eqf");
  const levelDifference = Math.abs(tycLevel - eqfLevel);
  const exactMatch = levelDifference === 0;
  const classification = exactMatch ? "aligned" : levelDifference === 1 ? "adjacent_review" : "material_discrepancy";
  return {
    tycLevel,
    eqfLevel,
    levelDifference,
    exactMatch,
    classification,
    requiresHumanReview: !exactMatch,
    discrepancyRationale: exactMatch
      ? `TYÇ ve AYÇ/EQF önerileri ${tycLevel}. seviyede aynı açıklanabilir sinyal kümesine yakınsamıştır.`
      : `TYÇ ${tycLevel} ve AYÇ/EQF ${eqfLevel} önerileri farklı tanımlayıcı metinleri ve sözcüksel yakınlıklar nedeniyle ayrışmıştır. Bu fark eşdeğerlik iddiası değildir; aday eğitici gerekçesi ve komisyon incelemesi gerekir.`,
    institutionalValidationRequired: true,
    equalityForced: false
  };
}

function weightedMedian(items) {
  if (!items.length) return null;
  const ordered = [...items].sort((a, b) => a.level - b.level);
  const total = ordered.reduce((sum, item) => sum + item.weight, 0);
  let running = 0;
  for (const item of ordered) {
    running += item.weight;
    if (running >= total / 2) return item.level;
  }
  return ordered[ordered.length - 1].level;
}

function aggregateProgram(outcomes) {
  const suggestedLevels = {};
  const levelSummaries = {};
  const dimensionCoverage = {};
  const frameworkCoverage = {};
  const consistency = {};
  for (const frameworkId of ["tyc", "eqf"]) {
    const weighted = outcomes.map((outcome) => ({
      level: effectiveLevel(outcome, frameworkId),
      weight: Math.max(1, outcome.suggestions[frameworkId].score)
    }));
    const level = weightedMedian(weighted);
    const levels = weighted.map((item) => item.level);
    const averageScore = outcomes.length
      ? Math.round(outcomes.reduce((sum, outcome) => sum + outcome.suggestions[frameworkId].score, 0) / outcomes.length)
      : 0;
    const counts = { knowledge: 0, skills: 0, competence: 0 };
    outcomes.forEach((outcome) => { counts[effectiveDimension(outcome, frameworkId)] += 1; });
    suggestedLevels[frameworkId] = level;
    levelSummaries[frameworkId] = {
      level,
      averageScore,
      confidence: averageScore >= 80 ? "high" : averageScore >= 65 ? "medium" : "low",
      descriptorSetAvailable: Boolean(level),
      manualOverrideCount: outcomes.filter((outcome) => outcome.suggestions[frameworkId].effectiveSelection?.source === "manual_override").length
    };
    dimensionCoverage[frameworkId] = counts;
    frameworkCoverage[frameworkId] = {
      suggestedOutcomeCount: outcomes.length,
      totalOutcomeCount: outcomes.length,
      percent: outcomes.length ? 100 : 0
    };
    const min = levels.length ? Math.min(...levels) : null;
    const max = levels.length ? Math.max(...levels) : null;
    const spread = min === null || max === null ? null : max - min;
    consistency[frameworkId] = {
      min,
      max,
      spread,
      consistent: spread === null ? false : spread <= 2,
      warning: spread !== null && spread > 2 ? "Öğrenme çıktıları arasında üç veya daha fazla seviye farkı var; insan incelemesi gerekir." : null
    };
  }
  const lowConfidenceOutcomeIds = outcomes
    .filter((outcome) => ["tyc", "eqf"].some((frameworkId) => outcome.suggestions[frameworkId].confidence === "low"))
    .map((outcome) => outcome.outcomeId);
  const explainableSignalOutcomeCount = outcomes.filter((outcome) =>
    ["tyc", "eqf"].some((frameworkId) => outcome.suggestions[frameworkId].matchedSignals.length > 0)
  ).length;
  const crossFrameworkOutcomes = outcomes.map(crossFrameworkConsistencyForOutcome);
  const discrepancyOutcomeIds = outcomes
    .filter((_, index) => crossFrameworkOutcomes[index].levelDifference > 0)
    .map((outcome) => outcome.outcomeId);
  const cycleLevel = suggestedLevels.tyc === suggestedLevels.eqf ? suggestedLevels.tyc : null;
  return {
    suggestedLevels,
    levelSummaries,
    dimensionCoverage,
    coverage: {
      outcomeCount: outcomes.length,
      frameworkCoverage,
      explainableSignalOutcomeCount,
      explainableSignalPercent: outcomes.length ? Math.round((explainableSignalOutcomeCount / outcomes.length) * 100) : 0,
      lowConfidenceOutcomeIds
    },
    consistency,
    crossFrameworkConsistency: {
      exactMatchCount: crossFrameworkOutcomes.filter((item) => item.exactMatch).length,
      adjacentReviewCount: crossFrameworkOutcomes.filter((item) => item.classification === "adjacent_review").length,
      materialDiscrepancyCount: crossFrameworkOutcomes.filter((item) => item.classification === "material_discrepancy").length,
      discrepancyOutcomeIds,
      allExact: discrepancyOutcomeIds.length === 0,
      equalityForced: false,
      institutionalValidationRequired: true
    },
    higherEducationCycleSuggestion: cycleLevel ? cycleForLevel(cycleLevel) : null,
    rationale: `Program düzeyi, ${outcomes.length} öğrenme çıktısının puanla ağırlıklandırılmış medyanından üretildi. TYÇ ${suggestedLevels.tyc ?? "—"} ve AYÇ/EQF ${suggestedLevels.eqf ?? "—"} önerileri karar değildir; tek tek çıktılar, ölçme kanıtları, iş yükü ve kurul değerlendirmesi birlikte incelenmelidir.`,
    aggregationMethod: "score_weighted_median",
    autonomousDecision: false,
    institutionalValidationRequired: true
  };
}

export function suggestProgramQualificationAlignment({
  programId = "pilot-program",
  outcomes,
  preferredLevels = {},
  manualOverrides = [],
  boardDecision = null
} = {}) {
  if (!Array.isArray(outcomes) || outcomes.length === 0) throw new TypeError("Program için en az bir öğrenme çıktısı gerekir.");
  if (outcomes.length > QUALIFICATION_SUGGESTION_LIMITS.maxOutcomeCount) throw new RangeError(`Bir programda en fazla ${QUALIFICATION_SUGGESTION_LIMITS.maxOutcomeCount} öğrenme çıktısı aynı anda önerilebilir.`);
  const uniqueIds = new Set();
  const outcomeSuggestions = outcomes.map((outcome, index) => {
    const normalized = asOutcome(outcome, index);
    if (uniqueIds.has(normalized.id)) throw new RangeError(`Öğrenme çıktısı kimliği benzersiz olmalıdır: ${normalized.id}`);
    uniqueIds.add(normalized.id);
    return suggestOutcomeQualificationAlignment(normalized, { index, preferredLevels });
  });
  let result = {
    engineVersion: QUALIFICATION_SUGGESTION_ENGINE_VERSION,
    engineMode: "deterministic_explainable_pilot",
    programId,
    advisoryNotice: QUALIFICATION_ADVISORY_NOTICE,
    outcomes: outcomeSuggestions,
    program: aggregateProgram(outcomeSuggestions),
    manualOverrides: [],
    finalDecision: {
      status: "pending_human_board",
      decision: null,
      source: "human_commission_required",
      autonomousDecision: false,
      advisoryNotice: QUALIFICATION_ADVISORY_NOTICE
    }
  };
  for (const override of manualOverrides) result = applyManualQualificationOverride(result, override);
  if (boardDecision) result = recordHumanBoardQualificationDecision(result, boardDecision);
  return result;
}

export function applyManualQualificationOverride(result, override) {
  if (!result?.outcomes || !override || typeof override !== "object") throw new TypeError("Geçerli öneri sonucu ve manuel seçim gerekir.");
  if (!["instructor", "externalInstructor"].includes(override.actorRole)) {
    throw new Error("Manuel öneri seçimi yalnız üniversite içi veya kurum dışı eğitici tarafından yapılabilir; koordinatörlük ve komisyon salt-okunur inceleme yapar.");
  }
  if (!FRAMEWORK_META[override.frameworkId]) throw new RangeError("Manuel seçim çerçevesi tyc veya eqf olmalıdır.");
  const level = Number(override.level ?? override.selectedLevel);
  if (!Number.isInteger(level) || level < 1 || level > 8) throw new RangeError("Manuel seçim düzeyi 1–8 arasında olmalıdır.");
  const selectedDimension = override.dimension ?? override.selectedDimension;
  if (!QUALIFICATION_DIMENSIONS.includes(selectedDimension)) throw new RangeError("Manuel seçim boyutu knowledge, skills veya competence olmalıdır.");
  const reason = String(override.reason || "").trim();
  if (reason.length < 10) throw new Error("Manuel seçim için en az 10 karakterlik insan gerekçesi gerekir.");
  const clone = plainClone(result);
  const outcome = clone.outcomes.find((item) => item.outcomeId === override.outcomeId);
  if (!outcome) throw new RangeError(`Manuel seçim öğrenme çıktısı bulunamadı: ${override.outcomeId}`);
  const suggestion = outcome.suggestions[override.frameworkId];
  const overrideId = String(override.id || `OVR-${override.outcomeId}-${override.frameworkId}-${clone.manualOverrides.filter((item) => item.outcomeId === override.outcomeId && item.frameworkId === override.frameworkId).length + 1}`);
  suggestion.effectiveSelection = {
    level,
    dimension: selectedDimension,
    dimensionLabel: FRAMEWORK_META[override.frameworkId].dimensionLabels[selectedDimension],
    descriptor: descriptorText(override.frameworkId, level, selectedDimension, false),
    descriptorDisplayTr: descriptorText(override.frameworkId, level, selectedDimension, true) || descriptorText(override.frameworkId, level, selectedDimension, false),
    source: "manual_override",
    reason,
    actorRole: override.actorRole,
    overrideId,
    recordedAt: override.recordedAt || null,
    institutionalValidationRequired: true,
    autonomousDecision: false
  };
  outcome.crossFrameworkConsistency = crossFrameworkConsistencyForOutcome(outcome);
  clone.manualOverrides = clone.manualOverrides.filter((item) => !(item.outcomeId === override.outcomeId && item.frameworkId === override.frameworkId));
  clone.manualOverrides.push({
    id: overrideId,
    outcomeId: override.outcomeId,
    frameworkId: override.frameworkId,
    computedLevel: suggestion.computedSelection.level,
    computedDimension: suggestion.computedSelection.dimension,
    level,
    dimension: selectedDimension,
    selectedLevel: level,
    selectedDimension,
    reason,
    actorRole: override.actorRole,
    recordedAt: override.recordedAt || null,
    isHumanSelection: true,
    finalBoardDecision: false
  });
  clone.program = aggregateProgram(clone.outcomes);
  return clone;
}

export function recordHumanBoardQualificationDecision(result, decision) {
  if (!result?.outcomes || !decision || typeof decision !== "object") throw new TypeError("Geçerli öneri sonucu ve kurul kararı gerekir.");
  if (decision.actorRole !== "commission") throw new Error("Nihai akademik karar kaydı yalnız komisyon rolü tarafından oluşturulabilir.");
  const allowed = ["approved", "revision_requested", "rejected", "deferred"];
  if (!allowed.includes(decision.decision)) throw new RangeError(`Kurul kararı şu değerlerden biri olmalıdır: ${allowed.join(", ")}`);
  const decidedBy = String(decision.decidedBy || "").trim();
  const rationale = String(decision.rationale || "").trim();
  if (decidedBy.length < 3) throw new Error("Kurul kararını kaydeden insan/kurul adı gerekir.");
  if (rationale.length < 10) throw new Error("Kurul kararı için en az 10 karakterlik insan gerekçesi gerekir.");
  const tycLevel = Number(decision.tycLevel ?? result.program.suggestedLevels.tyc);
  const eqfLevel = Number(decision.eqfLevel ?? result.program.suggestedLevels.eqf);
  for (const [frameworkId, level] of [["tyc", tycLevel], ["eqf", eqfLevel]]) {
    if (!Number.isInteger(level) || level < 1 || level > 8) throw new RangeError(`${frameworkId.toUpperCase()} kurul düzeyi 1–8 arasında olmalıdır.`);
  }
  const clone = plainClone(result);
  clone.finalDecision = {
    status: "recorded_human_board_decision",
    decision: decision.decision,
    source: "human_commission",
    actorRole: "commission",
    decidedBy,
    rationale,
    decidedAt: decision.decidedAt || null,
    meetingReference: decision.meetingReference || null,
    decidedLevels: { tyc: tycLevel, eqf: eqfLevel },
    differsFromSuggestion: tycLevel !== clone.program.suggestedLevels.tyc || eqfLevel !== clone.program.suggestedLevels.eqf,
    suggestionSnapshot: {
      engineVersion: clone.engineVersion,
      suggestedLevels: plainClone(clone.program.suggestedLevels)
    },
    suggestionMutated: false,
    autonomousDecision: false,
    institutionalValidationRequired: true
  };
  return clone;
}
