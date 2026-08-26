import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("app/medikal-simulasyon/v2/page.tsx");
const experience = read("app/medikal-simulasyon/v2/MedicalSimulationV2.tsx");
const scene = read("app/medikal-simulasyon/v2/PatientRoom3D.tsx");
const css = read("app/medikal-simulasyon/v2/simulation-v2.module.css");

assert.match(page, /MedicalSimulationV2/, "V2 rotası ayrı çalışma alanını yüklemeli");
assert.match(experience, /dynamic\(.*PatientRoom3D/s, "3B sahne dinamik yüklenmeli");
assert.match(experience, /ssr:\s*false/, "Three.js sunucu render paketine girmemeli");
assert.match(scene, /@react-three\/fiber/, "React Three Fiber gerçek runtime bağımlılığı olmalı");
assert.match(scene, /useFrame/, "hasta görünümü fizyolojik duruma göre hareket etmeli");
assert.match(scene, /exam-hotspot/, "sahne muayene bölgesi etkileşimi sunmalı");
assert.doesNotMatch(experience, /module-0[1-8].*\.mp4/, "V2 hazır sahne kitaplığı MP4'ünü canlı render gibi göstermemeli");
assert.match(experience, /visualization\.videoUrl/, "yalnız gerçek iş sonucundaki adres video olarak gösterilmeli");
assert.match(experience, /BLOCKED_EXTERNAL_ACCESS/, "render servisi yoksa dürüst engel durumu görünmeli");
assert.match(experience, /localStorage/, "oturum yenileme sonrası korunmalı");
assert.match(experience, /Eğitim/, "eğitim modu görünmeli");
assert.match(experience, /Değerlendirme/, "değerlendirme modu görünmeli");
assert.match(experience, /OSCE/, "OSCE modu görünmeli");
assert.match(experience, /Eğitici gözlem notu/, "OSCE/eğitici gözlem alanı görünmeli");
assert.match(css, /@media \(max-width:\s*600px\)/, "390 px mobil düzen tanımlı olmalı");
assert.match(css, /prefers-reduced-motion/, "azaltılmış hareket desteği olmalı");
assert.match(css, /:focus-visible/, "klavye odağı görünür olmalı");

console.log("medical-v2-ui-contract: ayrı rota, gerçek 3B runtime, modlar ve erişilebilirlik sözleşmesi başarılı");
