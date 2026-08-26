import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildSourceUsageRecord, SOURCE_USAGE_ROLES } from "../services/medical-simulation-engine/source-usage.js";

const registryPath = path.join(process.cwd(), "services", "medical-simulation-engine", "open-source-sources.json");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const sources = registry.sources;

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
  assert.equal(usage.codeImported, false, `${source.repository}: kod aktarımı kanıtsız biçimde true olamaz`);
  assert.ok(usage.assetLicense, `${source.repository}: veri/model/3B varlık lisans alanı eksik`);
  assert.ok(usage.licenseEvidenceFile, `${source.repository}: lisans kanıt dosyası alanı eksik`);
  assert.ok(usage.securityRisk, `${source.repository}: güvenlik riski eksik`);
  assert.ok(usage.maintenanceRisk, `${source.repository}: bakım riski eksik`);
  assert.ok(usage.integrationStatus, `${source.repository}: entegrasyon durumu eksik`);
  assert.match(usage.testEvidence, new RegExp(source.commit), `${source.repository}: test kanıtı commit izini taşımıyor`);

  if (source.adoption === "candidate") {
    assert.equal(source.licenseClass, "permissive", `${source.repository}: yalnız izinli lisans candidate olabilir`);
  }

  if (source.licenseClass === "missing" || source.licenseClass === "non-commercial") {
    assert.notEqual(source.adoption, "candidate", `${source.repository}: eksik/kısıtlı lisans doğrudan aday olamaz`);
  }
}

console.log("medical-open-source-contract: 40/40 kaynak, tekil kullanım rolü ve lisans kapısı doğrulandı");
