import { TOOL_CATALOG } from "./engine.js";

const toolOutcome = {
  interview: "Hasta yanıtı ve karar geçmişi güncellenir.",
  exam: "Muayene bulgusu ve karar geçmişi güncellenir.",
  test: "Tetkik isteği, sonuç zamanı, maliyet ve hazır olduğunda klinik bulgu güncellenir.",
  medication: "İlaç kaydı, güvenlik kontrolü, vital bulgular ve karar geçmişi güncellenir.",
  intervention: "Müdahale durumu, hasta görünümü, vital bulgular ve sonraki seçenekler güncellenir.",
  team: "Ekip görevi, klinik akış ve değerlendirme ölçütleri güncellenir.",
  reasoning: "Klinik gerekçenin yeni sürümü karar geçmişine eklenir.",
};

export const CLINICAL_INTERACTION_CONTRACTS = Object.entries(TOOL_CATALOG).flatMap(([tool, actions]) => actions.map((action) => ({
  id: `${tool}:${action.id}`,
  tool,
  actionId: action.id,
  label: action.label,
  precondition: "getAvailableActions tarafından çalışma anında değerlendirilir.",
  observableOutcome: toolOutcome[tool],
  auditEvidence: "Zaman, kabul/red, önceki ve sonraki hasta durumu ile klinik geri bildirim kaydedilir.",
})));

export const NAVIGATION_INTERACTION_CONTRACTS = [
  { id: "mode", observableOutcome: "Seçilen modda yeni oturum başlar; geri bildirim ve puan görünürlüğü değişir." },
  { id: "case-library", observableOutcome: "Olgu seçimi hasta öyküsünü, rezervi, bozulma zamanını ve seçenekleri değiştirir." },
  { id: "curriculum", observableOutcome: "Dönem ve kurum modeli seçimi kalıcılaşır ve olgu program bağlamında görünür." },
  { id: "visualization", observableOutcome: "Seçili karar için video hazırlanır veya erişilememe durumu kullanıcı dilinde gösterilir." },
  { id: "report", observableOutcome: "Okunabilir oturum değerlendirme raporu indirilir." },
];

export function validateInteractionContracts() {
  const ids = new Set();
  const errors = [];
  for (const contract of [...CLINICAL_INTERACTION_CONTRACTS, ...NAVIGATION_INTERACTION_CONTRACTS]) {
    if (ids.has(contract.id)) errors.push(`Tekrarlanan etkileşim: ${contract.id}`);
    ids.add(contract.id);
    if (!contract.observableOutcome) errors.push(`Gözlenebilir sonuç eksik: ${contract.id}`);
  }
  return { valid: errors.length === 0, errors, clinicalActions: CLINICAL_INTERACTION_CONTRACTS.length, navigationActions: NAVIGATION_INTERACTION_CONTRACTS.length };
}
