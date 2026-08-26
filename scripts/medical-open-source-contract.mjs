import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildSourceUsageRecord, SOURCE_USAGE_ROLES } from "../services/medical-simulation-engine/source-usage.js";

const registryPath = path.join(process.cwd(), "services", "medical-simulation-engine", "open-source-sources.json");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const sources = registry.sources;
const directRuntime = new Map([
  ["mrdoob/three.js", { packageName: "three", version: "0.185.1" }],
  ["pmndrs/react-three-fiber", { packageName: "@react-three/fiber", version: "9.7.0" }],
  ["statelyai/xstate", { packageName: "xstate", version: "5.32.6" }],
]);
const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));

assert.equal(registry.schemaVersion, "1.0.0", "Kaynak kütüğü şema sürümü beklenmiyor");
assert.equal(sources.length, 40, "Tam olarak 40 GitHub kaynağı kayıtlı olmalı");
assert.equal(new Set(sources.map((source) => source.repository)).size, 40, "Depo adları benzersiz olmalı");
assert.equal(new Set(sources.map((source) => source.order)).size, 40, "Kaynak sıraları benzersiz olmalı");

for (const [index, source] of sources.entries()) {
  const usage = buildSourceUsageRecord(source);
  assert.equal(source.order, index + 1, `${source.repository}: kaynak sırası bozuk`);
  assert.match(source.url, /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, `${source.repository}: GitHub URL geçersiz`);
  assert.match(source.commit, /^[a-f0-9]{12}$/, `${source.repository}: 12 karakterli commit izi eksik`);
  assert.ok(source.branch, `${source.repository}: dal eksik`);
  assert.ok(source.capability, `${source.repository}: mimari yetenek eksik`);
  assert.ok(source.use, `${source.repository}: kullanım açıklaması eksik`);
  assert.ok(source.note, `${source.repository}: sınır notu eksik`);
  assert.ok(SOURCE_USAGE_ROLES.includes(usage.usageRole), `${source.repository}: izinli kullanım rolü eksik`);
  assert.ok(usage.technology, `${source.repository}: teknoloji/yetenek alanı eksik`);
  if (directRuntime.has(source.repository)) {
    const expected = directRuntime.get(source.repository);
    assert.equal(source.adoption, "direct-dependency", `${source.repository}: gerçek çalışma zamanı bağımlılığı olarak sınıflandırılmalı`);
    assert.equal(usage.usageRole, "direct-dependency", `${source.repository}: doğrudan bağımlılık rolü eksik`);
    assert.equal(usage.codeImported, true, `${source.repository}: kurulu runtime bağımlılığı görünür olmalı`);
    assert.equal(usage.packageName, expected.packageName, `${source.repository}: paket adı yanlış`);
    assert.equal(usage.packageVersion, expected.version, `${source.repository}: sabit sürüm yanlış`);
    assert.equal(packageJson.dependencies[expected.packageName], expected.version, `${source.repository}: package.json sürümü sabit değil`);
    assert.equal(usage.integrationStatus, "RUNTIME_INTEGRATED", `${source.repository}: çalışan entegrasyon durumu eksik`);
  } else {
    assert.equal(usage.codeImported, false, `${source.repository}: kod aktarımı kanıtsız biçimde true olamaz`);
  }
  assert.ok(usage.assetLicense, `${source.repository}: veri/model/3B varlık lisans alanı eksik`);
  assert.ok(usage.licenseEvidenceFile, `${source.repository}: lisans kanıt dosyası alanı eksik`);
  assert.ok(usage.securityRisk, `${source.repository}: güvenlik riski eksik`);
  assert.ok(usage.maintenanceRisk, `${source.repository}: bakım riski eksik`);
  assert.ok(usage.integrationStatus, `${source.repository}: entegrasyon durumu eksik`);
  assert.ok(["RUNTIME_INTEGRATED", "ISOLATED_ADAPTER", "TEST_OR_BENCHMARK", "ARCHITECTURE_REFERENCE", "LICENSE_BLOCKED", "ARCHIVED_OR_DUPLICATE"].includes(usage.integrationStatus), `${source.repository}: zorunlu altı statüden biri atanmalı`);
  assert.match(usage.testEvidence, new RegExp(source.commit), `${source.repository}: test kanıtı commit izini taşımıyor`);

  if (["candidate", "direct-dependency"].includes(source.adoption)) {
    assert.equal(source.licenseClass, "permissive", `${source.repository}: yalnız izinli lisans candidate olabilir`);
  }

  if (source.licenseClass === "missing" || source.licenseClass === "non-commercial") {
    assert.notEqual(source.adoption, "candidate", `${source.repository}: eksik/kısıtlı lisans doğrudan aday olamaz`);
  }
}

console.log("medical-open-source-contract: 40/40 kaynak, tekil kullanım rolü ve lisans kapısı doğrulandı");
