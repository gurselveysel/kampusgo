export const SOURCE_USAGE_ROLES = [
  "direct-dependency",
  "isolated-adapter",
  "benchmark",
  "architecture-reference",
  "license-blocked-reference",
  "historical-reference",
];

const benchmarkCapabilities = new Set([
  "llm-evaluation",
  "research-catalogue",
  "virtual-patient",
  "emergency-simulation",
  "physiology",
]);

export function usageRoleFor(source) {
  if (source.adoption === "blocked") return "license-blocked-reference";
  if (source.adoption === "retired-reference") return "historical-reference";
  if (source.adoption === "isolated-service") return "isolated-adapter";
  if (source.adoption === "reference") return "architecture-reference";
  if (source.adoption === "candidate" && benchmarkCapabilities.has(source.capability)) return "benchmark";
  return "architecture-reference";
}

export function buildSourceUsageRecord(source) {
  const usageRole = usageRoleFor(source);
  const blocked = usageRole === "license-blocked-reference";
  const historical = usageRole === "historical-reference";
  const isolated = usageRole === "isolated-adapter";
  return {
    ...source,
    usageRole,
    technology: source.capability,
    codeImported: false,
    assetLicense: "Kod dışı veri, model ağırlığı veya 3B varlık aktarılmadı.",
    licenseEvidenceFile: source.licenseClass === "missing"
      ? "DOĞRULANMADI"
      : "GitHub lisans kaydı doğrulandı; dosya yolu ürün kütüğünde ayrıca saklanmalıdır.",
    securityRisk: isolated ? "yüksek - süreç/ağ sınırı gerekir" : blocked ? "yüksek - kod kullanımı kapalı" : "orta - bağımlılık ve veri yüzeyi ayrı incelenir",
    maintenanceRisk: historical ? "yüksek - arşiv/eski/WIP" : isolated ? "orta-yüksek - ayrı çalışma zamanı" : "orta - upstream değişikliği izlenir",
    integrationStatus: blocked
      ? "blocked"
      : historical
        ? "historical-only"
        : isolated
          ? "adapter-boundary-defined"
          : usageRole === "benchmark"
            ? "benchmark-applied"
            : "reference-applied",
    testEvidence: `medical-open-source-contract · ${source.repository}@${source.commit}`,
  };
}
