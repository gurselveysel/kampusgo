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

const directDependencies = new Map([
  ["mrdoob/three.js", { packageName: "three", packageVersion: "0.185.1" }],
  ["pmndrs/react-three-fiber", { packageName: "@react-three/fiber", packageVersion: "9.7.0" }],
  ["statelyai/xstate", { packageName: "xstate", packageVersion: "5.32.6" }],
]);

export function usageRoleFor(source) {
  if (source.adoption === "direct-dependency" && directDependencies.has(source.repository)) return "direct-dependency";
  if (source.adoption === "blocked") return "license-blocked-reference";
  if (source.adoption === "retired-reference") return "historical-reference";
  if (source.adoption === "isolated-service") return "isolated-adapter";
  if (source.adoption === "reference") return "architecture-reference";
  if (source.adoption === "candidate" && benchmarkCapabilities.has(source.capability)) return "benchmark";
  return "architecture-reference";
}

export function buildSourceUsageRecord(source) {
  const usageRole = usageRoleFor(source);
  const direct = usageRole === "direct-dependency";
  const directPackage = directDependencies.get(source.repository) ?? null;
  const blocked = usageRole === "license-blocked-reference";
  const historical = usageRole === "historical-reference";
  const isolated = usageRole === "isolated-adapter";
  return {
    ...source,
    usageRole,
    technology: source.capability,
    codeImported: direct,
    packageName: directPackage?.packageName ?? null,
    packageVersion: directPackage?.packageVersion ?? null,
    assetLicense: "Kod dışı veri, model ağırlığı veya 3B varlık aktarılmadı.",
    licenseEvidenceFile: direct
      ? `package-lock.json · ${source.repository}@${source.commit}`
      : source.licenseClass === "missing"
      ? "DOĞRULANMADI"
      : "GitHub lisans kaydı doğrulandı; dosya yolu ürün kütüğünde ayrıca saklanmalıdır.",
    securityRisk: direct ? "orta - sabit paket sürümü, tarama ve istemci performans bütçesi izlenir" : isolated ? "yüksek - süreç/ağ sınırı gerekir" : blocked ? "yüksek - kod kullanımı kapalı" : "orta - bağımlılık ve veri yüzeyi ayrı incelenir",
    maintenanceRisk: direct ? "orta - package-lock ve kabul testleriyle sabitlenir" : historical ? "yüksek - arşiv/eski/WIP" : isolated ? "orta-yüksek - ayrı çalışma zamanı" : "orta - upstream değişikliği izlenir",
    integrationStatus: direct
      ? "RUNTIME_INTEGRATED"
      : blocked
      ? "LICENSE_BLOCKED"
      : historical
        ? "ARCHIVED_OR_DUPLICATE"
        : isolated
          ? "ISOLATED_ADAPTER"
          : usageRole === "benchmark"
            ? "TEST_OR_BENCHMARK"
            : "ARCHITECTURE_REFERENCE",
    testEvidence: `medical-open-source-contract · ${source.repository}@${source.commit}`,
  };
}
