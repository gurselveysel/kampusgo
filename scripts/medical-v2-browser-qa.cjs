const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");

const playwrightModule = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "playwright")
  : "playwright";
const { chromium } = require(playwrightModule);

const port = Number(process.env.MEDICAL_V2_QA_PORT || 4174);
const suppliedBaseURL = process.env.MEDICAL_V2_QA_BASE_URL;
const baseURL = suppliedBaseURL || `http://127.0.0.1:${port}`;
const route = `${baseURL}/medikal-simulasyon/v2`;

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function ready() {
  try {
    const response = await fetch(route, { redirect: "manual" });
    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  }
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
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await ready()) return child;
    if (child.exitCode !== null) throw new Error(`Next.js QA sunucusu kapanmış: ${output.slice(-2000)}`);
    await sleep(200);
  }
  child.kill("SIGTERM");
  throw new Error(`Next.js QA sunucusu hazır olmadı: ${output.slice(-2000)}`);
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function state(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("teys-stemi-bedside-v5-session")));
}

async function clickButton(page, label) {
  const button = page.getByRole("button", { name: label }).first();
  await button.waitFor({ state: "visible" });
  await button.click();
}

async function verifyModeDifferences(page) {
  await clickButton(page, "Değerlendirme");
  await clickButton(page, /Ağrının başlangıcını/);
  check((await page.locator("body").innerText()).includes("Gerekçe ve mekanizma, değerlendirme tamamlandığında açılır."), "Değerlendirme modu mekanizmayı gizlemedi");
  check((await state(page)).records[0].mechanismVisible === false, "Değerlendirme olayında mechanismVisible false değil");

  await clickButton(page, "OSCE");
  await clickButton(page, /Ağrının başlangıcını/);
  const osce = await state(page);
  check(osce.state.osce.remainingSeconds === 840, `OSCE saati beklenen 840 saniyeye inmedi: ${osce.state.osce.remainingSeconds}`);
  check(osce.records[0].mechanismVisible === false, "OSCE olayında mekanizma gizlenmedi");

  await clickButton(page, "Eğitim");
  await clickButton(page, /Ağrının başlangıcını/);
  const training = await state(page);
  check(training.records[0].mechanismVisible === true, "Eğitim olayında mekanizma görünür değil");
  check((await page.locator("body").innerText()).includes("Fizyolojik mekanizma:"), "Eğitim modu mekanizma panelini göstermedi");
}

async function verifyScenarioLibrary(page) {
  await clickButton(page, "Olgu kütüphanesi");
  await page.getByRole("heading", { name: "Aynı klinik çekirdekte üç farklı başlangıç" }).waitFor();
  check(await page.locator("article").filter({ hasText: "RUNTIME_READY" }).count() >= 3, "üç çalışan olgu kartı görünmedi");
  await clickButton(page, /İleri/);
  let snapshot = await state(page);
  check(snapshot.state.difficulty === "advanced" && snapshot.state.physiology.configuration.progressionRate > 1, "ileri zorluk fizyolojiye uygulanmadı");

  await clickButton(page, "Olgu kütüphanesi");
  await clickButton(page, /Standart/);
  await clickButton(page, "Olgu kütüphanesi");
  const atypical = page.locator("article").filter({ hasText: "Atipik başlangıç" });
  await atypical.getByRole("button", { name: "Bu olguyu başlat" }).click();
  snapshot = await state(page);
  check(snapshot.state.encounterId === "enc_atypical_diabetes" && snapshot.state.patient.age === 67, "atipik olgu hasta durumuna yüklenmedi");

  await clickButton(page, "Olgu kütüphanesi");
  const classic = page.locator("article").filter({ hasText: "Klasik başlangıç" });
  await classic.getByRole("button", { name: "Bu olguyu başlat" }).click();
  snapshot = await state(page);
  check(snapshot.state.encounterId === "enc_classic_stemi" && snapshot.state.difficulty === "standard", "klasik standart olgu geri yüklenmedi");
}

async function verifyGoldenFlow(page) {
  check(await page.getByLabel("Yatak başı hızlı klinik eylemleri").isVisible(), "Yatak başı hızlı eylem şeridi görünmüyor");
  check(await page.locator('[data-testid^="bedside-action-"]').count() === 4, "Klinik faz için dört bağlamsal yatak başı eylemi sunulmadı");
  await page.getByLabel("Hastaya kendi sorunuzu sorun").fill("Bulantınız, terlemeniz veya nefes darlığınız var mı?");
  await clickButton(page, "Sor");
  await clickButton(page, /İlaçları ve son kullanım zamanını sor/);

  await clickButton(page, "Kararı Manim ile açıkla");
  await page.getByText("BLOCKED_EXTERNAL_ACCESS", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
  check((await state(page)).state.visualizations.at(-1).status === "blocked", "Manim erişim engeli olay durumuna yazılmadı");

  await page.getByRole("tab", { name: /Klinik gerekçe/ }).click();
  await page.getByLabel("Problem temsili").fill("Baskı tarzı göğüs ağrısı ve otonom bulguları olan yüksek riskli sentetik hasta.");
  await page.getByRole("checkbox", { name: "Akut koroner sendrom / STEMI", exact: true }).check();
  await page.getByRole("checkbox", { name: "Aort diseksiyonu", exact: true }).check();
  await page.getByRole("checkbox", { name: "Pulmoner emboli", exact: true }).check();
  await page.getByLabel("Çalışma tanısı").selectOption("stemi");
  await page.getByLabel("Yeniden değerlendirme planı").fill("EKG, ritim ve perfüzyonu sonuçla birlikte yeniden değerlendir.");
  await clickButton(page, /Gerekçeyi değişmez olay olarak kaydet/);
  check((await state(page)).state.reasoning.length === 1, "klinik gerekçe revizyonu olay günlüğüne yazılmadı");

  await page.getByRole("tab", { name: /Muayene/ }).click();
  await clickButton(page, /Kalp odaklarını dinle/);
  await clickButton(page, /Akciğer alanlarını dinle/);

  await page.getByRole("tab", { name: /Tetkikler/ }).click();
  await clickButton(page, /12 derivasyonlu EKG/);
  let snapshot = await state(page);
  check(snapshot.state.orders[0].status === "pending" && snapshot.state.financialCost === 95, "EKG gecikme/maliyet durumu oluşmadı");
  await clickButton(page, "+3 dk");
  snapshot = await state(page);
  check(snapshot.state.orders[0].status === "ready" && snapshot.state.phase === "stemi", "EKG sonucu XState STEMI fazını açmadı");
  check((await page.locator("body").innerText()).includes("V2–V5 derivasyonlarında belirgin ST yükselmesi"), "Hazır EKG bulgusu araç çıktısında görünmedi");
  check(await page.getByLabel("Hazır 12 derivasyonlu EKG sonucu").isVisible(), "EKG tanısal çalışma alanı hazır traseyi göstermedi");

  await page.getByRole("tab", { name: /İlaçlar/ }).click();
  await clickButton(page, /Aspirin protokol kartını uygula/);

  await page.getByRole("tab", { name: /Ekip/ }).click();
  await clickButton(page, /Kritik ekip rollerini ata/);
  await clickButton(page, /Kapalı döngü iletişimi başlat/);

  await page.getByRole("tab", { name: /Müdahaleler/ }).click();
  await clickButton(page, /Monitörizasyon ve damar yolu/);
  await clickButton(page, /STEMI yolunu aktive et/);
  await clickButton(page, "+5 dk");
  snapshot = await state(page);
  check(snapshot.state.phase === "vf" && snapshot.state.vitals.rhythm === "vf" && snapshot.state.vitals.heartRate === 0, "Zamana bağlı VF oluşmadı");

  await clickButton(page, /Arrest ekibini aktive et/);
  await clickButton(page, /Yüksek kaliteli CPR başlat/);
  await clickButton(page, /Güvenli defibrilasyon uygula/);
  await clickButton(page, /Şok sonrası CPR'a hemen dön/);
  snapshot = await state(page);
  check(snapshot.state.phase === "rosc" && snapshot.state.vitals.rhythm === "rosc", "CPR/defibrilasyon yolu ROSC üretmedi");

  await clickButton(page, /ROSC sonrası ABCDE değerlendirmesi/);
  await clickButton(page, /SBAR ile sorumluluğu devret/);
  snapshot = await state(page);
  check(snapshot.state.status === "completed" && snapshot.state.phase === "handoff", "SBAR sonrası oturum tamamlanmadı");
  const hashBeforeReload = snapshot.stateHash;
  await page.getByLabel("Eğitici gözlem notu").fill("Kapalı döngü iletişim doğru zamanda başlatıldı.");

  await page.reload({ waitUntil: "networkidle" });
  const restored = await state(page);
  check(restored.stateHash === hashBeforeReload && restored.state.status === "completed", "Yenileme sonrası final hash/oturum geri yüklenmedi");
  check(await page.getByLabel("Eğitici gözlem notu").inputValue() === "Kapalı döngü iletişim doğru zamanda başlatıldı.", "Eğitici gözlem notu yenileme sonrası korunmadı");

  await page.locator("ol button").first().click();
  await page.getByRole("button", { name: "Canlı duruma dön" }).waitFor({ state: "visible" });
  await clickButton(page, "Canlı duruma dön");
  check((await state(page)).stateHash === hashBeforeReload, "Replay canlı oturum hash'ini değiştirdi");
  return { hash: hashBeforeReload, events: restored.records.length };
}

async function verifyAccessibilityAndMobile(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "networkidle" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 1, `390px görünüm yatay taşıyor: ${overflow}px`);
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => {
    const element = document.activeElement;
    const style = element ? getComputedStyle(element) : null;
    return { tag: element?.tagName, outline: style?.outlineStyle, width: style?.outlineWidth };
  });
  check(["A", "BUTTON", "INPUT"].includes(focus.tag) && focus.outline !== "none" && focus.width !== "0px", `Klavye odağı görünür değil: ${JSON.stringify(focus)}`);
  const animationDuration = await page.locator('[class*="ecg"] svg').first().evaluate((element) => getComputedStyle(element).animationDuration);
  check(Number.parseFloat(animationDuration) <= 0.001, `Azaltılmış hareket uygulanmadı: ${animationDuration}`);
  const sceneLayout = await page.evaluate(() => {
    const canvasRegion = document.querySelector('[class*="threeScene"]');
    const monitor = document.querySelector('[aria-label="Hasta monitörü"]');
    const speech = document.querySelector('[class*="patientSpeech"]');
    const commands = document.querySelector('[aria-label="Yatak başı hızlı klinik eylemleri"]');
    const hotspotButtons = [...document.querySelectorAll('[aria-label="Hasta üzerinde muayene bölgesi seçimi"] button')];
    if (!canvasRegion || !monitor || !speech || !commands) return null;
    const canvasRect = canvasRegion.getBoundingClientRect();
    const monitorRect = monitor.getBoundingClientRect();
    const speechRect = speech.getBoundingClientRect();
    const commandsRect = commands.getBoundingClientRect();
    return {
      canvasBottom: canvasRect.bottom,
      monitorTop: monitorRect.top,
      monitorBottom: monitorRect.bottom,
      speechTop: speechRect.top,
      speechBottom: speechRect.bottom,
      commandsTop: commandsRect.top,
      commandButtons: commands.querySelectorAll("button").length,
      hotspotLabels: hotspotButtons.map((button) => button.textContent?.trim()),
      hotspotFontSizes: hotspotButtons.map((button) => Number.parseFloat(getComputedStyle(button).fontSize)),
    };
  });
  check(sceneLayout, "Mobil klinik sahne yerleşimi ölçülemedi");
  check(sceneLayout.monitorTop >= sceneLayout.canvasBottom + 8, `Monitör 3B hasta alanını kapatıyor: ${JSON.stringify(sceneLayout)}`);
  check(sceneLayout.speechTop >= sceneLayout.monitorBottom + 8, `Hasta konuşması monitörle çakışıyor: ${JSON.stringify(sceneLayout)}`);
  check(sceneLayout.commandsTop >= sceneLayout.speechBottom + 8, `Yatak başı eylemleri hasta konuşmasıyla çakışıyor: ${JSON.stringify(sceneLayout)}`);
  check(sceneLayout.commandButtons >= 3, `Mobil yatak başı eylemleri eksik: ${JSON.stringify(sceneLayout)}`);
  check(
    ["Baş / genel durum", "Göğüs", "Periferik dolaşım"].every((label) => sceneLayout.hotspotLabels.some((text) => text?.includes(label))),
    `Mobil muayene bölgesi etiketleri eksik: ${sceneLayout.hotspotLabels.join(" | ")}`,
  );
  check(sceneLayout.hotspotFontSizes.every((size) => size >= 8), `Mobil muayene etiketleri okunamaz: ${sceneLayout.hotspotFontSizes.join(",")}`);
  const screenshot = path.join(os.tmpdir(), "teys-medical-v2-mobile-390.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  return screenshot;
}

(async () => {
  const server = await ensureServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const browserErrors = [];
    const expectedGatewayBlocks = [];
    page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
    });
    page.on("response", (response) => {
      if (response.url().includes("/api/medical-simulation/jobs") && [401, 403, 503].includes(response.status())) {
        expectedGatewayBlocks.push(response.status());
      }
    });
    await page.goto(route, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.removeItem("teys-stemi-bedside-v5-session"));
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Hasta görüşmesi" }).waitFor();
    await verifyScenarioLibrary(page);
    await verifyModeDifferences(page);
    const golden = await verifyGoldenFlow(page);
    const desktopScreenshot = path.join(os.tmpdir(), "teys-medical-v2-desktop.png");
    await page.screenshot({ path: desktopScreenshot, fullPage: true });
    const mobileScreenshot = await verifyAccessibilityAndMobile(page);
    const unexpectedErrors = browserErrors.filter((message) => !(expectedGatewayBlocks.length && message.includes("Failed to load resource")));
    check(expectedGatewayBlocks.length === 1, `Manim erişim kapısı beklenen 401/403/503 kanıtını üretmedi: ${expectedGatewayBlocks.join(",")}`);
    check(unexpectedErrors.length === 0, `Tarayıcı hataları: ${unexpectedErrors.join(" | ")}`);
    console.log(`medical-v2-browser-qa: PASS · ${golden.events} olay · ${golden.hash}`);
    console.log(`desktop=${desktopScreenshot}`);
    console.log(`mobile=${mobileScreenshot}`);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill("SIGTERM");
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
