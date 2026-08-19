const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "playwright"));

const baseURL = process.env.QA_BASE_URL || "http://127.0.0.1:4173";
const viewports = [
  { name: "desktop-1440", width: 1440, height: 1000 },
  { name: "desktop-1024", width: 1024, height: 900 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 }
];

(async () => {
  fs.mkdirSync("test-results", { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: "reduce" });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
      page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
      await page.goto(baseURL, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("#hero-title", { timeout: 8000 });
      await page.waitForTimeout(500);
      const homeContent = await page.locator("body").innerText();
      if (!homeContent.includes("Kısa öğrenmeleri")) throw new Error(`${viewport.name}: hero metni yok`);
      const imageFailures = await page.evaluate(() => [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src));
      if (imageFailures.length) errors.push(`broken-images: ${imageFailures.join(",")}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) errors.push(`horizontal-overflow:${overflow}px`);
      await page.screenshot({ path: `test-results/${viewport.name}-home.png`, fullPage: true });

      await page.selectOption("#role-select", "commission");
      await page.waitForURL(/#\/overview/);
      await page.locator('[data-nav="commission"]').click();
      await page.waitForURL(/#\/commission/);
      await page.waitForSelector("text=Karar değil, pilot analiz");
      await page.screenshot({ path: `test-results/${viewport.name}-commission.png`, fullPage: true });
      const panelOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (panelOverflow > 1) errors.push(`commission-overflow:${panelOverflow}px`);

      if (viewport.width >= 768) {
        await page.locator('[data-action="decision"][data-status="revision"]').click();
        await page.fill("#decision-reason", "Öğrenme çıktısı ve rubrik eşlemesinin pilot revizyonu gereklidir.");
        await page.check('#decision-form input[name="confirm"]');
        await page.locator('[data-action="submit-decision"]').click();
        await page.waitForSelector("text=Gerekçeli komisyon pilot kaydı", { timeout: 4000 }).catch(() => {});
      }

      results.push({ viewport: viewport.name, overflow, errors });
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const failed = results.filter((result) => result.errors.length);
  console.log(JSON.stringify(results, null, 2));
  if (failed.length) process.exitCode = 1;
})();
