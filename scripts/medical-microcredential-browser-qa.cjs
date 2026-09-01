const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");

const playwrightModule = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "playwright")
  : "playwright";
const { chromium } = require(playwrightModule);

const port = Number(process.env.MEDICAL_MICRO_QA_PORT || 4176);
const suppliedBaseURL = process.env.MEDICAL_MICRO_QA_BASE_URL;
const baseURL = suppliedBaseURL || `http://127.0.0.1:${port}`;
const route = `${baseURL}/medikal-simulasyon/mikroyeterlilik`;
const storageKey = "teys-mams-microcredential-v1";

function sleep(milliseconds) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
function check(condition, message) { if (!condition) throw new Error(message); }

async function ready() {
  try {
    const response = await fetch(route, { redirect: "manual" });
    return response.status >= 200 && response.status < 500;
  } catch { return false; }
}

async function ensureServer() {
  if (suppliedBaseURL || await ready()) return null;
  const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextBin, "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += String(chunk); });
  child.stderr.on("data", (chunk) => { output += String(chunk); });
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await ready()) return child;
    if (child.exitCode !== null) throw new Error(`Next.js QA sunucusu kapandı: ${output.slice(-2400)}`);
    await sleep(250);
  }
  child.kill("SIGTERM");
  throw new Error(`Next.js QA sunucusu hazır olmadı: ${output.slice(-2400)}`);
}

async function click(page, name) {
  const button = page.getByRole("button", { name }).first();
  await button.waitFor({ state: "visible" });
  await button.click();
}

async function openTool(page, name) {
  const tab = page.getByRole("tab", { name: new RegExp(name, "i") });
  if (await tab.getAttribute("aria-selected") !== "true") await tab.click();
}

async function submitReasoning(page) {
  await openTool(page, "Klinik gerekçe");
  await page.getByLabel("Problem temsili").fill("Baskı tarzı göğüs ağrısı ve otonom bulguları olan yüksek riskli sentetik hasta.");
  await page.getByRole("checkbox", { name: "Akut koroner sendrom / STEMI", exact: true }).check();
  await page.getByRole("checkbox", { name: "Aort diseksiyonu", exact: true }).check();
  await page.getByRole("checkbox", { name: "Pulmoner emboli", exact: true }).check();
  await page.getByLabel("Çalışma tanısı").selectOption("stemi");
  await page.getByLabel("Yeniden değerlendirme planı").fill("EKG, ritim ve perfüzyonu yeniden değerlendir.");
  await click(page, "Klinik gerekçeyi kaydet");
}

async function performPractice(page) {
  await click(page, /Ağrının başlangıcını/);
  await click(page, /Eşlik eden belirtileri sor/);
  await openTool(page, "Muayene");
  await page.getByTestId("mc-exam-region-chest").click();
  await click(page, /Kalp odaklarını dinle/);
  await click(page, /Akciğer alanlarını dinle/);
  await openTool(page, "Tetkikler");
  await click(page, /12 derivasyonlu EKG/);
  await openTool(page, "Müdahaleler");
  await click(page, /Monitörizasyon ve damar yolu/);
  await submitReasoning(page);
}

async function performAssessment(page) {
  await openTool(page, "Hasta görüşmesi");
  await click(page, /Ağrının başlangıcını/);
  await click(page, /Eşlik eden belirtileri sor/);
  await click(page, /İlaçları ve son kullanım zamanını sor/);
  await submitReasoning(page);
  await openTool(page, "Muayene");
  await page.getByTestId("mc-exam-region-chest").click();
  await click(page, /Kalp odaklarını dinle/);
  await click(page, /Akciğer alanlarını dinle/);
  await openTool(page, "Tetkikler");
  await click(page, /12 derivasyonlu EKG/);
  await click(page, "+3 dk");
  await openTool(page, "İlaçlar");
  await click(page, /Aspirin protokol kartını uygula/);
  await openTool(page, "Ekip");
  await click(page, /Kritik ekip rollerini ata/);
  await click(page, /Kapalı döngü iletişimi başlat/);
  await openTool(page, "Müdahaleler");
  await click(page, /Monitörizasyon ve damar yolu/);
  await click(page, /STEMI yolunu aktive et/);
  await click(page, "+5 dk");
  await click(page, /Arrest ekibini aktive et/);
  await click(page, /Yüksek kaliteli CPR başlat/);
  await click(page, /Güvenli defibrilasyon uygula/);
  await click(page, /Şok sonrası CPR'a hemen dön/);
  await click(page, /ROSC sonrası ABCDE değerlendirmesi/);
  await click(page, /SBAR ile sorumluluğu devret/);
}

(async () => {
  const server = await ensureServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  try {
    await page.goto(route, { waitUntil: "networkidle" });
    await page.evaluate((key) => localStorage.removeItem(key), storageKey);
    await page.reload({ waitUntil: "networkidle" });

    check(await page.getByRole("heading", { name: "Akut Göğüs Ağrısında Güvenli İlk Yaklaşım" }).isVisible(), "Mikro-yeterlilik program başlığı görünmedi");
    check((await page.locator("body").innerText()).includes("11 ZORUNLU ALAN"), "Standart mikro-yeterlilik alanları görünmedi");
    check((await page.locator("body").innerText()).includes("Resmî belge düzenlemez"), "Pilot belgelendirme sınırı görünmedi");
    const theme = await page.locator("main").evaluate((element) => ({ colorScheme: getComputedStyle(element).colorScheme, background: getComputedStyle(element).backgroundColor }));
    check(theme.colorScheme === "light", `Açık tema etkin değil: ${JSON.stringify(theme)}`);
    check(!theme.background.includes("7, 19, 24"), `Koyu kabuk arka planı kaldı: ${theme.background}`);
    await page.getByLabel("Öğrenenin adı ve soyadı").fill("Pilot Öğrenen");
    await page.getByRole("checkbox", { name: /Ön koşulu karşıladığımı/ }).check();
    await page.getByRole("checkbox", { name: /sentetik eğitim pilotu/ }).check();
    await click(page, "Öğrenmeye başla");

    const patient = page.getByAltText("Eylemlere göre klinik durumu değişen fotogerçekçi sentetik hasta");
    await patient.waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const image = document.querySelector('img[alt="Eylemlere göre klinik durumu değişen fotogerçekçi sentetik hasta"]');
      return image instanceof HTMLImageElement && image.complete && image.naturalWidth >= 640;
    });
    check(await page.getByLabel("Hasta monitörü").isVisible(), "Canlı hasta monitörü görünmedi");

    await page.setViewportSize({ width: 390, height: 844 });
    const identityBox = await page.getByTestId("mc-patient-identity").boundingBox();
    const sceneBox = await page.getByTestId("mc-patient-scene").boundingBox();
    const monitorBox = await page.getByTestId("mc-patient-monitor").boundingBox();
    check(Boolean(identityBox && sceneBox && monitorBox), "Mobil hasta sahnesi ölçülemedi");
    check(identityBox.y + identityBox.height <= sceneBox.y + 1, "Mobil hasta bilgisi muayene seçeneklerinin üzerine biniyor");
    check(monitorBox.y - (sceneBox.y + sceneBox.height) <= 12, "Mobil hasta görseli ile monitör arasında gereksiz boşluk oluşuyor");
    check(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "Mobil öğrenme görünümü yatay taşma üretiyor");
    if (process.env.MEDICAL_MICRO_QA_SCREENSHOT) await page.screenshot({ path: process.env.MEDICAL_MICRO_QA_SCREENSHOT, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });

    await performPractice(page);
    check((await page.locator("body").innerText()).includes("5/5 tamamlandı"), "Öğrenme kapıları gerçek eylemlerle tamamlanmadı");
    await click(page, "Öğrenmeyi tamamla ve değerlendirmeyi başlat");
    check((await page.locator("body").innerText()).includes("YETERLİLİK DEĞERLENDİRMESİ"), "Bağımsız değerlendirme aşaması açılmadı");
    check((await page.locator("body").innerText()).includes("Anlık öğretici gerekçe kapalıdır"), "Değerlendirme geri bildirim sınırı görünmedi");

    await performAssessment(page);
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
    check(stored.stage === "assessment", "Mikro-yeterlilik aşaması ayrı saklama alanına yazılmadı");
    check(stored.assessmentSession.state.status === "completed", "Değerlendirme olgusu tamamlanmadı");
    check(stored.assessmentSession.records.length === 20, `Beklenen 20 değerlendirme olayı yerine ${stored.assessmentSession.records.length} kayıt oluştu`);
    const legacyV2Storage = await page.evaluate(() => localStorage.getItem("teys-stemi-bedside-v5-session"));
    check(legacyV2Storage === null, "Yeni sürüm korunan V2 oturum alanına yazdı");
    check(await page.getByRole("button", { name: "Sonucu ve kanıtları incele" }).isVisible(), "Sonuç eylemi görünmedi");
    await click(page, "Sonucu ve kanıtları incele");
    check((await page.locator("body").innerText()).includes("Başarı kanıtlandı"), "Öğrenme başarısı görünmedi");
    check((await page.locator("body").innerText()).includes("RESMÎ DÜZENLEME KAPILARI"), "Resmî düzenleme kapıları ayrıştırılmadı");
    check((await page.locator("body").innerText()).includes("DOĞRULANMADI"), "Doğrulanmamış kurum kapıları görünmedi");

    const downloadPromise = page.waitForEvent("download");
    await click(page, "Kanıt paketini indir");
    const download = await downloadPromise;
    const downloadPath = path.join(os.tmpdir(), `medical-microcredential-${Date.now()}.json`);
    await download.saveAs(downloadPath);
    const downloadedEvidence = JSON.parse(require("node:fs").readFileSync(downloadPath, "utf8"));
    check(downloadedEvidence.status.includes("RESMÎ BELGE DEĞİL"), "İndirilen kanıt paketi resmî belge sınırını taşımıyor");
    check(downloadedEvidence.officialIssuanceReady === false, "Kanıt paketi resmî düzenlemeyi yanlışlıkla açtı");
    check(downloadedEvidence.assessment.replayableEventCount === 20, "Kanıt paketinde olay günlüğü sayısı yanlış");

    const missingContracts = page.locator("main button:enabled:not([data-action-contract])");
    check(await missingContracts.count() === 0, `Etkin düğmelerden ${await missingContracts.count()} tanesinde eylem sözleşmesi eksik`);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "networkidle" });
    check(await page.getByRole("heading", { name: "Başarı kanıtlandı" }).isVisible(), "Mobil görünümde kanıt sonucu korunmadı");
    check(await page.getByRole("button", { name: "Kanıt paketini indir" }).isVisible(), "Mobil görünümde kanıt indirme eylemi görünmedi");
    check((await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)), "Mobil görünüm yatay taşma üretiyor");

    check(consoleErrors.length === 0, `Tarayıcı hataları oluştu: ${consoleErrors.join(" | ")}`);
    console.log(`Medical micro-credential browser QA passed: 20 events, ${downloadedEvidence.assessment.finalStateIntegrityRecord}, desktop + 390px mobile`);
  } finally {
    await browser.close();
    if (server) server.kill("SIGTERM");
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
