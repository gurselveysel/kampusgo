const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const playwrightModule = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "playwright")
  : "playwright";
const { chromium } = require(playwrightModule);

const port = Number(process.env.QA_PORT || 4181);
const suppliedBaseURL = process.env.QA_BASE_URL;
const baseURL = (suppliedBaseURL || `http://127.0.0.1:${port}`).replace(/\/$/, "");
const evidenceDir = path.join(process.cwd(), "test-results", "accounted-pilot");
fs.mkdirSync(evidenceDir, { recursive: true });

function credentials(username, envPrefix) {
  if (process.env.PILOT_CREDENTIALS_FILE) {
    const parsed = JSON.parse(fs.readFileSync(process.env.PILOT_CREDENTIALS_FILE, "utf8"));
    const found = parsed.credentials.find((item) => item.username === username);
    if (!found) throw new Error(`${username} test hesabı bulunamadı`);
    return { username, password: found.password };
  }
  const password = process.env[`${envPrefix}_PASSWORD`];
  const configuredUsername = process.env[`${envPrefix}_USERNAME`] || username;
  if (!password) throw new Error(`${envPrefix}_PASSWORD gerekli`);
  return { username: configuredUsername, password };
}

const gazi = credentials("gazi.ogrenci", "PILOT_QA_GAZI");
const dpu = credentials("dpu.ogrenci", "PILOT_QA_DPU");
const multi = credentials("cift.kurum", "PILOT_QA_MULTI");
const inactive = credentials("pilot.pasif", "PILOT_QA_INACTIVE");
const unassigned = credentials("pilot.atamasiz", "PILOT_QA_UNASSIGNED");
const roleMatrix = [
  ["dpu.ogrenci", "dpu", "ogrenci", /Başvuruyu kaydet/],
  ["dpu.ic.egitici", "dpu", "ic-egitici", /Koordinatör incelemesine gönder/],
  ["dpu.dis.egitici", "dpu", "dis-egitici", /Koordinatör incelemesine gönder/],
  ["dpu.koordinator", "dpu", "koordinator", /Komisyona aktar/],
  ["dpu.komisyon", "dpu", "komisyon", /Gerekçeli kararı kaydet/],
  ["dpu.ogrenci.isleri", "dpu", "ogrenci-isleri", /SENTETİK belge üret/],
  ["dpu.bilgi.islem", "dpu", "bilgi-islem", /Dry-run çalıştır/],
  ["dpu.finans", "dpu", "mali-isler", /Dry-run kaydı oluştur/],
  ["dpu.sistem", "dpu", "sistem-yoneticisi", /Üyelik bağlarını doğrula/],
  ["gazi.ogrenci", "gazi", "ogrenci", /Başvuruyu kaydet/],
  ["gazi.ic.egitici", "gazi", "ic-egitici", /Koordinatör incelemesine gönder/],
  ["gazi.dis.egitici", "gazi", "dis-egitici", /Koordinatör incelemesine gönder/],
  ["gazi.koordinator", "gazi", "koordinator", /Komisyona aktar/],
  ["gazi.komisyon", "gazi", "komisyon", /Gerekçeli kararı kaydet/],
  ["gazi.ogrenci.isleri", "gazi", "ogrenci-isleri", /SENTETİK belge üret/],
  ["gazi.bilgi.islem", "gazi", "bilgi-islem", /Dry-run çalıştır/],
  ["gazi.finans", "gazi", "mali-isler", /Dry-run kaydı oluştur/],
  ["gazi.sistem", "gazi", "sistem-yoneticisi", /Üyelik bağlarını doğrula/],
];

async function ready(url) { try { const response = await fetch(url, { redirect: "manual" }); return response.status < 500; } catch { return false; } }
async function ensureServer() {
  if (suppliedBaseURL || await ready(`${baseURL}/giris`)) return null;
  const child = spawn("npm", ["start", "--", "-p", String(port)], { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += String(chunk); });
  child.stderr.on("data", (chunk) => { output += String(chunk); });
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await ready(`${baseURL}/giris`)) return child;
    if (child.exitCode !== null) throw new Error(`Next sunucusu başlatılamadı: ${output.slice(-1500)}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  child.kill("SIGTERM");
  throw new Error("Next sunucusu 30 saniyede hazır olmadı");
}

async function assertNoOverflow(page, label) {
  const overflow = await page.evaluate(() => ({ html: document.documentElement.scrollWidth - innerWidth, body: document.body.scrollWidth - innerWidth }));
  if (overflow.html > 1 || overflow.body > 1) throw new Error(`${label}: yatay taşma ${JSON.stringify(overflow)}`);
}
async function assertImages(page, label) {
  const broken = await page.locator("img").evaluateAll((images) => images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src));
  if (broken.length) throw new Error(`${label}: kırık görseller ${broken.join(",")}`);
}
async function login(page, account) {
  await page.goto(`${baseURL}/giris`, { waitUntil: "networkidle" });
  await page.getByLabel("Kullanıcı adı").fill(account.username);
  await page.getByLabel("Parola").fill(account.password);
  await Promise.all([page.waitForURL((url) => !url.pathname.startsWith("/giris"), { timeout: 30_000 }), page.getByRole("button", { name: "Giriş yap" }).click()]);
}
async function logout(page) {
  await Promise.all([page.waitForURL(/\/giris\?durum=cikis/, { timeout: 30_000 }), page.getByRole("button", { name: /^Çıkış(?: yap)?$/ }).click()]);
}

(async () => {
  const server = await ensureServer();
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  try {
    for (const viewport of [
      { name: "1440", width: 1440, height: 1000 }, { name: "1024", width: 1024, height: 900 },
      { name: "768", width: 768, height: 1024 }, { name: "390", width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
      await page.goto(`${baseURL}/giris`, { waitUntil: "networkidle" });
      if (!(await page.title()).includes("Giriş")) failures.push(`${viewport.name}: giriş metadata başlığı`);
      await page.getByRole("heading", { name: /Mikro Yeterlilik/ }).waitFor();
      await page.getByRole("button", { name: "Göster" }).click();
      if ((await page.getByLabel("Parola").getAttribute("type")) !== "text") failures.push(`${viewport.name}: parola göster/gizle`);
      await assertNoOverflow(page, `${viewport.name}/giris`);
      await assertImages(page, `${viewport.name}/giris`);
      if (viewport.name === "1440" || viewport.name === "390") await page.screenshot({ path: path.join(evidenceDir, `giris-${viewport.name}.png`), fullPage: true });
      await context.close();
      if (consoleErrors.length) failures.push(`${viewport.name}: console ${consoleErrors.join(" | ")}`);
    }

    const anonymousContext = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const anonymousPage = await anonymousContext.newPage();
    await anonymousPage.goto(`${baseURL}/u/gazi?rol=ogrenci`, { waitUntil: "networkidle" });
    await anonymousPage.waitForURL(/\/giris\?durum=oturum/);
    await anonymousPage.getByLabel("Kullanıcı adı").fill("olmayan.hesap");
    await anonymousPage.getByLabel("Parola").fill("Yanlis-Parola-123!");
    await anonymousPage.getByRole("button", { name: "Giriş yap" }).click();
    await anonymousPage.getByRole("alert").filter({ hasText: "Kullanıcı adı veya parola hatalı." }).waitFor();
    await anonymousContext.close();

    const gaziContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const gaziPage = await gaziContext.newPage();
    await gaziPage.goto(`${baseURL}/pilot.html`, { waitUntil: "networkidle" });
    const legacyStorageBefore = await gaziPage.evaluate(() => localStorage.getItem("kdpu-myys-pilot-v4"));
    await login(gaziPage, gazi);
    await gaziPage.waitForURL(/\/u\/gazi\?rol=ogrenci/);
    const sessionCookie = (await gaziContext.cookies()).find((cookie) => cookie.name === "__Host-kampusgo-session" || cookie.name === "kampusgo-session-dev");
    if (!sessionCookie?.httpOnly || sessionCookie.sameSite !== "Lax" || (suppliedBaseURL && !sessionCookie.secure)) failures.push("oturum çerezi HttpOnly/Secure/SameSite sınırı");
    await gaziPage.getByRole("heading", { name: /Kanıttan karara/ }).waitFor();
    if (!(await gaziPage.title()).includes("Gazi Üniversitesi MYYS")) failures.push("Gazi metadata ayrımı");
    if (await gaziPage.getByText(/DPÜSEM|Kütahya Dumlupınar/).count()) failures.push("Gazi arayüzünde DPÜ sızıntısı");
    await assertNoOverflow(gaziPage, "gazi/1440");
    await assertImages(gaziPage, "gazi/1440");
    await gaziPage.screenshot({ path: path.join(evidenceDir, "gazi-ogrenci-1440.png"), fullPage: true });
    await gaziPage.getByLabel("Başvuru notu").fill("Tarayıcı kabul testi için SENTETİK öğrenci başvurusu.");
    await Promise.all([gaziPage.waitForURL(/durum=basarili/, { timeout: 30_000 }), gaziPage.getByRole("button", { name: "Başvuruyu kaydet" }).click()]);
    await gaziPage.getByRole("status").filter({ hasText: "SENTETİK" }).waitFor();
    await gaziPage.goto(`${baseURL}/u/dpu?rol=ogrenci`, { waitUntil: "networkidle" });
    await gaziPage.waitForURL(/\/kurum-sec\?durum=yetkisiz/);
    if (await gaziPage.getByText("Kütahya Dumlupınar Üniversitesi").count()) failures.push("Gazi hesabına DPÜ kurum verisi gösterildi");
    await logout(gaziPage);
    await gaziPage.goBack({ waitUntil: "networkidle" });
    if (!gaziPage.url().includes("/giris")) failures.push("logout sonrası geri düğmesi korumalı içeriği açtı");
    await gaziPage.goto(`${baseURL}/pilot.html`, { waitUntil: "networkidle" });
    const legacyStorageAfter = await gaziPage.evaluate(() => localStorage.getItem("kdpu-myys-pilot-v4"));
    if (legacyStorageAfter !== legacyStorageBefore) failures.push("hesaplı alan legacy DPÜ localStorage kaydını değiştirdi");
    await gaziContext.close();

    const dpuContext = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const dpuPage = await dpuContext.newPage();
    await login(dpuPage, dpu);
    await dpuPage.waitForURL(/\/u\/dpu\?rol=ogrenci/);
    await dpuPage.getByRole("heading", { name: /Mikro Yeterlilik/ }).waitFor();
    await dpuPage.screenshot({ path: path.join(evidenceDir, "dpu-accounted-1024.png"), fullPage: true });
    await assertNoOverflow(dpuPage, "dpu/1024");
    await logout(dpuPage);
    await dpuContext.close();

    for (const account of [inactive, unassigned]) {
      const context = await browser.newContext({ viewport: { width: 768, height: 900 } });
      const page = await context.newPage();
      await login(page, account);
      await page.waitForURL(/\/kurum-sec/);
      await page.getByRole("heading", { name: "Erişim durumu" }).waitFor();
      if (await page.getByText(/Kütahya Dumlupınar Üniversitesi|Gazi Üniversitesi/).count()) failures.push(`${account.username}: erişimsiz durumda kurum verisi gösterildi`);
      await logout(page);
      await context.close();
    }

    const multiContext = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const chooser = await multiContext.newPage();
    await login(chooser, multi);
    await chooser.waitForURL(/\/kurum-sec/);
    await chooser.getByText("Gazi Üniversitesi", { exact: true }).waitFor();
    await chooser.getByText("Kütahya Dumlupınar Üniversitesi", { exact: true }).waitFor();
    if (await chooser.locator('a[href*="rol="]').count() !== 2) failures.push("çoklu kurum hesabında atanmamış roller listelendi");
    await chooser.screenshot({ path: path.join(evidenceDir, "multi-kurum-768.png"), fullPage: true });
    const dpuTab = await multiContext.newPage();
    const gaziTab = await multiContext.newPage();
    await Promise.all([
      dpuTab.goto(`${baseURL}/u/dpu?rol=koordinator`, { waitUntil: "networkidle" }),
      gaziTab.goto(`${baseURL}/u/gazi?rol=komisyon`, { waitUntil: "networkidle" }),
    ]);
    await dpuTab.getByText("Kütahya Dumlupınar Üniversitesi", { exact: true }).waitFor();
    await gaziTab.getByText("Gazi Üniversitesi", { exact: true }).waitFor();
    await dpuTab.reload({ waitUntil: "networkidle" });
    if (!dpuTab.url().includes("/u/dpu?rol=koordinator") || !gaziTab.url().includes("/u/gazi?rol=komisyon")) failures.push("iki sekme kurum bağlamı ayrılmadı");
    await logout(chooser);
    await multiContext.close();

    if (process.env.PILOT_CREDENTIALS_FILE) {
      for (const [username, institution, roleKey, actionName] of roleMatrix) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
        const page = await context.newPage();
        await login(page, credentials(username, "UNUSED"));
        await page.waitForURL(new RegExp(`/u/${institution}\\?rol=${roleKey}`));
        await page.getByRole("button", { name: actionName }).waitFor();
        for (const viewport of [
          { width: 1440, height: 950 }, { width: 1024, height: 900 },
          { width: 768, height: 1024 }, { width: 390, height: 844 },
        ]) {
          await page.setViewportSize(viewport);
          await assertNoOverflow(page, `${institution}/${roleKey}/${viewport.width}`);
          await assertImages(page, `${institution}/${roleKey}/${viewport.width}`);
        }
        await logout(page);
        await context.close();
      }
    }

    if (failures.length) throw new Error(failures.join("\n"));
    console.log(`accounted-browser-qa: PASS (${baseURL}; giriş 4 viewport, 2 kurum × 9 rol × 4 viewport, Gazi işlem/deny/logout, DPÜ, erişimsiz durumlar, legacy storage, çoklu kurum iki sekme)`);
  } finally {
    await browser.close();
    if (server) server.kill("SIGTERM");
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
