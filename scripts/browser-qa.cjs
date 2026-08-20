const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const playwrightModule = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "playwright")
  : "playwright";
const { chromium } = require(playwrightModule);

const qaPort = Number(process.env.QA_PORT || 4173);
const suppliedBaseURL = process.env.QA_BASE_URL;
const baseURL = suppliedBaseURL || `http://127.0.0.1:${qaPort}`;
const viewports = [
  { name: "desktop-1440", width: 1440, height: 1000 },
  { name: "desktop-1024", width: 1024, height: 900 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 }
];

const roleRoutes = {
  learner: ["catalog", "Mikro yeterlilik programları"],
  instructor: ["proposal", "Yeni mikro yeterlilik programı önerisi"],
  externalInstructor: ["proposal", "Yeni mikro yeterlilik programı önerisi"],
  coordinator: ["commission", "Komisyon karar masası"],
  commission: ["audit", "Pilot denetim izi"],
  studentAffairs: ["wallet", "Dijital yeterlilik cüzdanı"],
  it: ["integrations", "Entegrasyon merkezi"],
  finance: ["finance", "Finansal yönetim ve döner sermaye pilotu"],
  admin: ["reports", "Pilot performans ve risk göstergeleri"]
};

const applicationExpectations = {
  learner: ["MY-BSV-2026-0042"],
  instructor: ["MY-PRG-2026-014"],
  externalInstructor: [],
  coordinator: ["MY-PRG-2026-014", "MY-BSV-2026-0042", "MY-PRG-2026-009"],
  commission: ["MY-PRG-2026-014", "MY-BSV-2026-0042", "MY-PRG-2026-009"],
  studentAffairs: ["MY-BSV-2026-0042"],
  admin: ["MY-PRG-2026-014", "MY-BSV-2026-0042", "MY-PRG-2026-009"]
};

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function endpointReady(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (suppliedBaseURL || await endpointReady(baseURL)) return null;
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(qaPort) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += String(chunk); });
  child.stderr.on("data", (chunk) => { output += String(chunk); });
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await endpointReady(baseURL)) return child;
    if (child.exitCode !== null) throw new Error(`QA sunucusu başlatılamadı: ${output.trim()}`);
    await sleep(100);
  }
  child.kill("SIGTERM");
  throw new Error(`QA sunucusu 5 saniye içinde hazır olmadı: ${output.trim()}`);
}

async function setHash(page, route) {
  await page.evaluate((value) => { window.location.hash = `#/${value}`; }, route);
  await page.waitForFunction((value) => window.location.hash === `#/${value}`, route, { timeout: 3000 });
}

async function waitForRole(page, role) {
  await page.waitForFunction(({ id, label, name }) => {
    const select = document.querySelector("#role-select");
    // On tablet/mobile the persona card lives in the closed navigation drawer.
    // textContent verifies the rendered role contract without mistaking an
    // intentionally hidden drawer for stale role state.
    const persona = document.querySelector("#persona-card")?.textContent || "";
    const heading = document.querySelector("#main-content h1")?.textContent || "";
    return select?.value === id && persona.includes(label) && persona.includes(name) && heading.includes(`${label} genel bakışı`);
  }, role, { timeout: 3000 });
}

async function visibleNavTargets(page) {
  return page.locator("[data-nav]").evaluateAll((nodes) => nodes
    .filter((node) => {
      const style = getComputedStyle(node);
      return !node.hidden && !node.disabled && style.display !== "none" && style.visibility !== "hidden";
    })
    .map((node) => node.dataset.nav));
}

async function assertNoOverflow(page, label, errors) {
  const overflow = await page.evaluate(() => {
    const scrollingElement = document.scrollingElement;
    const originalScrollLeft = scrollingElement?.scrollLeft || 0;
    if (scrollingElement) scrollingElement.scrollLeft = 1_000_000;
    const reachablePageScroll = scrollingElement?.scrollLeft || 0;
    if (scrollingElement) scrollingElement.scrollLeft = originalScrollLeft;
    return {
      document: document.documentElement.scrollWidth - window.innerWidth,
      body: document.body.scrollWidth - window.innerWidth,
      reachablePageScroll
    };
  });
  // Wide tables and step lists intentionally scroll inside their own wrapper.
  // Only a reachable document/body scroll is a page-level mobile overflow.
  if (overflow.reachablePageScroll > 1 || overflow.body > 1) {
    errors.push(`${label}: yatay sayfa taşması scroll=${overflow.reachablePageScroll}px body=${overflow.body}px (ham document=${overflow.document}px)`);
  }
  return overflow;
}

async function assertImagesLoaded(page, label, errors) {
  const failures = await page.locator("#main-content img").evaluateAll(async (images) => {
    await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
    return images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src);
  });
  if (failures.length) errors.push(`${label}: kırık görsel: ${failures.join(",")}`);
}

function check(condition, message, errors) {
  if (!condition) errors.push(message);
}

async function verifyRoleMatrix(page, roles, roleNavigation, viewport, errors) {
  for (const role of roles) {
    // The hash deliberately remains #/overview between selections. This catches the
    // regression where a same-hash role switch updated the select but not the UI.
    await setHash(page, "overview");
    await page.selectOption("#role-select", role.id);
    try {
      await waitForRole(page, role);
    } catch {
      errors.push(`${viewport.name}/${role.id}: aynı rotada rol değişimi persona/H1 görünümünü anlık yenilemedi`);
      continue;
    }

    const actualNav = await page.locator("#side-nav [data-nav]").evaluateAll((nodes) => nodes.map((node) => node.dataset.nav));
    const expectedNav = ["home", ...roleNavigation[role.id]];
    check(JSON.stringify(actualNav) === JSON.stringify(expectedNav), `${viewport.name}/${role.id}: menü beklenen role ait değil (${actualNav.join(",")})`, errors);

    const notificationButton = page.locator('.site-header [data-nav="notifications"]');
    const notificationAllowed = roleNavigation[role.id].includes("notifications");
    const notificationVisible = await notificationButton.isVisible();
    const notificationDisabled = await notificationButton.isDisabled();
    check(notificationAllowed ? notificationVisible && !notificationDisabled : !notificationVisible && notificationDisabled,
      `${viewport.name}/${role.id}: bildirim CTA yetkisi menü matrisiyle uyuşmuyor`, errors);

    const allowedTargets = new Set(["home", "verify", ...roleNavigation[role.id]]);
    const targets = await visibleNavTargets(page);
    const unauthorizedTargets = targets.filter((target) => !allowedTargets.has(target));
    check(unauthorizedTargets.length === 0, `${viewport.name}/${role.id}: yetkisiz görünür CTA: ${unauthorizedTargets.join(",")}`, errors);
    await assertNoOverflow(page, `${viewport.name}/${role.id}/overview`, errors);

    await setHash(page, "home");
    await page.waitForSelector("#hero-title");
    const catalogCTAVisible = await page.locator('.hero-actions [data-nav="catalog"]').isVisible().catch(() => false);
    check(catalogCTAVisible === (role.id === "learner"), `${viewport.name}/${role.id}: ana sayfa katalog CTA görünürlüğü hatalı`, errors);
    const homeUnauthorizedTargets = (await visibleNavTargets(page)).filter((target) => !allowedTargets.has(target));
    check(homeUnauthorizedTargets.length === 0, `${viewport.name}/${role.id}: ana sayfada yetkisiz CTA: ${homeUnauthorizedTargets.join(",")}`, errors);

    const [route, heading] = roleRoutes[role.id];
    await setHash(page, route);
    try {
      await page.waitForFunction((expected) => document.querySelector("#main-content h1")?.textContent?.includes(expected), heading, { timeout: 3000 });
    } catch {
      errors.push(`${viewport.name}/${role.id}: ayırt edici ${route} rotası doğru içeriği açmadı`);
    }
    const routeText = await page.locator("#main-content").innerText();
    check(!routeText.includes("Bu bölüm seçili demo rolüne açık değil"), `${viewport.name}/${role.id}: izinli ${route} rotası yetkisiz göründü`, errors);
    await assertNoOverflow(page, `${viewport.name}/${role.id}/${route}`, errors);
    await assertImagesLoaded(page, `${viewport.name}/${role.id}/${route}`, errors);

    if (Object.hasOwn(applicationExpectations, role.id)) {
      await setHash(page, "applications");
      await page.waitForSelector("#main-content h1");
      const applicationText = await page.locator("#main-content").innerText();
      const expectedCodes = applicationExpectations[role.id];
      const allCodes = ["MY-PRG-2026-014", "MY-BSV-2026-0042", "MY-PRG-2026-009"];
      for (const code of allCodes) {
        check(applicationText.includes(code) === expectedCodes.includes(code), `${viewport.name}/${role.id}: ${code} kayıt görünürlüğü hatalı`, errors);
      }
      await assertNoOverflow(page, `${viewport.name}/${role.id}/applications`, errors);
    }

    if (roleNavigation[role.id].includes("assessment")) {
      await setHash(page, "assessment");
      await page.waitForSelector("#main-content h1");
      const decisionButton = page.locator('[data-action="assessment-decision"]');
      check((await decisionButton.count()) === 0, `${viewport.name}/${role.id}: tamamlanmış oturumda başarısız karar CTA'sı görünür`, errors);
      await assertNoOverflow(page, `${viewport.name}/${role.id}/assessment`, errors);
    }
  }
}

async function verifyAssessmentActions(page, errors) {
  await setHash(page, "overview");
  await page.selectOption("#role-select", "learner");
  await setHash(page, "assessment");
  check(await page.locator('[data-action="assessment-decision"]').count() === 0, "learner: tamamlanmış oturumda değerlendirme kararı görünür", errors);
  await page.locator('[data-action="assessment-run"]').click();
  check(await page.locator('[data-action="assessment-decision"]').count() === 0, "learner: etkin oturumda değerlendirici kararı görünür", errors);

  await setHash(page, "overview");
  await page.selectOption("#role-select", "instructor");
  await setHash(page, "assessment");
  check(await page.locator('[data-action="assessment-decision"]').count() === 1, "instructor: etkin oturumda değerlendirici kararı yok", errors);
  await page.locator('[data-action="assessment-decision"]').click();
  check(await page.locator('[data-action="assessment-decision"]').count() === 0, "instructor: tamamlanan karardan sonra CTA kapanmadı", errors);
  const instructorAudit = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("kdpu-myys-pilot-v3"));
    return saved.audit.find((event) => event.entityId === "ASM-DEMO-LIVE" && event.action === "İnsan değerlendirici kararı kaydedildi");
  });
  check(instructorAudit?.actorRole === "instructor", "instructor: değerlendirici kararı doğru rolle audit izine yazılmadı", errors);

  await page.locator('[data-action="assessment-run"]').click();
  await setHash(page, "overview");
  await page.selectOption("#role-select", "externalInstructor");
  await setHash(page, "assessment");
  check(await page.locator('[data-action="assessment-decision"]').count() === 1, "externalInstructor: etkin oturumda değerlendirici kararı yok", errors);

  await setHash(page, "overview");
  await page.selectOption("#role-select", "commission");
  await setHash(page, "assessment");
  check(await page.locator('[data-action="assessment-decision"]').count() === 1, "commission: etkin oturumda değerlendirici kararı yok", errors);
}

async function verifyExternalInstructorProposal(page, errors) {
  const title = "Kurum Dışı Eğitici Tarayıcı Test Programı";
  await setHash(page, "overview");
  await page.selectOption("#role-select", "externalInstructor");
  await setHash(page, "proposal");
  await page.fill("#proposal-title", title);
  await page.fill("#proposal-summary", "Kurum dışı eğitici sahipliği ve pilot audit zinciri için sentetik program özeti.");
  await page.fill("#proposal-outcomes", "Kanıt zincirini yapılandırır\nPilot rubrik sonuçlarını yorumlar");
  await page.fill("#proposal-qualifications", "Sentetik alan uzmanlığı ve öğretim deneyimi kanıtları");
  await page.fill("#proposal-quality", "Rubrik kalibrasyonu ve insan geri bildirimi pilot planı");
  await page.locator('#proposal-form button[type="submit"]').click();
  await page.waitForFunction((expected) => document.querySelector("#main-content")?.innerText.includes(expected), title, { timeout: 3000 });
  const ownership = await page.evaluate((expected) => {
    const saved = JSON.parse(localStorage.getItem("kdpu-myys-pilot-v3"));
    const application = saved.applications.find((item) => item.title === expected);
    const audit = saved.audit.find((event) => event.entityId === application?.id);
    return { ownerRole: application?.ownerRole, applicant: application?.applicant, auditRole: audit?.actorRole };
  }, title);
  check(ownership.ownerRole === "externalInstructor", "externalInstructor: UI gönderimi ownerRole kimliğini kaybetti", errors);
  check(ownership.applicant === "Uzman Eğitici Selin Ada", "externalInstructor: UI gönderimi demo persona adını kaybetti", errors);
  check(ownership.auditRole === "externalInstructor", "externalInstructor: UI gönderimi audit rolünü kaybetti", errors);

  await setHash(page, "overview");
  await page.locator('[data-action="reset-demo"]').click();
}

async function verifyScenarioActions(page, scenarioDefinitions, errors) {
  await setHash(page, "scenarios");
  await page.locator('[data-action="reset-demo"]').click();
  for (const [kind, steps] of Object.entries(scenarioDefinitions)) {
    for (let index = 0; index < steps.length; index += 1) {
      await page.locator(`[data-action="run-scenario"][data-kind="${kind}"]`).click();
      await page.waitForFunction(({ scenarioKind, expectedStep }) => {
        const saved = JSON.parse(localStorage.getItem("kdpu-myys-pilot-v3"));
        return saved.scenarios?.[scenarioKind]?.step === expectedStep;
      }, { scenarioKind: kind, expectedStep: index + 1 }, { timeout: 3000 });
    }
    check(await page.locator(`[data-action="run-scenario"][data-kind="${kind}"]`).count() === 0, `${kind}: tamamlanan senaryoda sonraki-adım CTA kaldı`, errors);
  }
  const scenarioState = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("kdpu-myys-pilot-v3"));
    return {
      internal: saved.scenarios.internal.completed,
      recognition: saved.scenarios.recognition.completed,
      credentials: saved.credentials.filter((item) => item.code.startsWith("MY-BEL-SCN-")).length,
      safeTransfers: saved.integrationJobs.filter((item) => ["ÖBİS", "YÖKSİS"].includes(item.target) && item.realDataSent === false).length
    };
  });
  check(scenarioState.internal && scenarioState.recognition, "iki uçtan uca senaryo tarayıcı veri katmanında tamamlanmadı", errors);
  check(scenarioState.credentials >= 1, "senaryo 1 tarayıcıda pilot yeterlilik üretmedi", errors);
  check(scenarioState.safeTransfers >= 2, "senaryo 2 güvenli aktarım loglarını üretmedi", errors);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('#role-select option[value="admin"]', { state: "attached" });
  check(await page.locator('[data-action="run-scenario"]').count() === 0, "yenileme sonrası senaryo tamamlanma durumu korunmadı", errors);
}

async function verifyDecisionActions(page, errors) {
  await setHash(page, "overview");
  await page.selectOption("#role-select", "coordinator");
  await setHash(page, "commission");
  check(await page.locator('[data-action="decision"][data-status="revision"]').count() === 1, "coordinator: revizyon eylemi yok", errors);
  check(await page.locator('[data-action="decision"][data-status="approved"], [data-action="decision"][data-status="rejected"]').count() === 0, "coordinator: onay/ret eylemi görünür", errors);

  await setHash(page, "overview");
  await page.selectOption("#role-select", "commission");
  await setHash(page, "commission");
  check(await page.locator('[data-action="decision"]').count() === 4, "commission: dört gerekçeli karar eylemi görünmüyor", errors);
  await page.locator('[data-action="decision"][data-status="approved"]').click();
  check(await page.locator("#decision-form").count() === 1, "commission: karar modalı açılmadı", errors);
  await page.locator('[data-action="close-modal"]').first().click();

  await setHash(page, "overview");
  await page.selectOption("#role-select", "admin");
  await setHash(page, "commission");
  check(await page.locator('[data-action="decision"]').count() === 0, "admin: akademik karar eylemi görünür", errors);
  check((await page.locator("#main-content").innerText()).includes("Salt-okunur"), "admin: salt-okunur karar açıklaması yok", errors);
}

async function verifyPaymentDemoFlow(page, errors) {
  await page.evaluate(() => {
    const key = "kdpu-myys-pilot-v3";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.finance.paymentRequests = [];
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('#role-select option[value="finance"]', { state: "attached" });
  await setHash(page, "overview");
  await page.selectOption("#role-select", "learner");
  await setHash(page, "catalog");
  await page.locator('[data-action="open-program"][data-id="program-green-skills"]').click();
  await page.waitForSelector('[data-action="apply-program"][data-id="program-green-skills"]', { state: "visible" });
  await page.locator('[data-action="apply-program"][data-id="program-green-skills"]').click();
  await page.waitForSelector("#payment-request-form", { state: "visible" });
  check((await page.locator("#payment-request-form").count()) === 1, "learner: ücretli program ödeme demo formuna yönlenmedi", errors);
  await page.selectOption("#payment-channel", "Havale/EFT simülasyonu");
  await page.check('#payment-request-form input[name="confirm"]');
  const paymentFormValid = await page.locator("#payment-request-form").evaluate((form) => form.checkValidity());
  check(paymentFormValid, "learner: doldurulan ödeme demo formu tarayıcı doğrulamasını geçmedi", errors);
  await page.locator('[data-action="submit-payment-request"]').click();
  try {
    await page.waitForFunction(() => {
      const saved = JSON.parse(localStorage.getItem("kdpu-myys-pilot-v3"));
      return saved.finance?.paymentRequests?.some((item) => item.programId === "program-green-skills" && item.status === "pending_finance");
    }, undefined, { timeout: 3000 });
  } catch (error) {
    const diagnostics = await page.evaluate(() => {
      const form = document.querySelector("#payment-request-form");
      return {
        request: JSON.parse(localStorage.getItem("kdpu-myys-pilot-v3"))?.finance?.paymentRequests?.find((item) => item.programId === "program-green-skills"),
        channel: document.querySelector("#payment-channel")?.value || null,
        confirmed: document.querySelector('#payment-request-form input[name="confirm"]')?.checked ?? null,
        formValid: form?.checkValidity() ?? null,
        invalidFields: form ? [...form.querySelectorAll(":invalid")].map((field) => field.name || field.id || field.tagName) : [],
        toast: document.querySelector("#toast-region")?.textContent?.trim() || null
      };
    });
    throw new Error(`Ödeme demo kaydı pending_finance durumuna geçmedi: ${JSON.stringify(diagnostics)}; ${error.message}`);
  }
  await page.waitForSelector('[data-action="handoff-finance"]', { state: "visible" });
  check((await page.locator('[data-action="handoff-finance"]').count()) === 1, "learner: mali işlere gönderim sonrası Finans rolü devir CTA'sı yok", errors);
  await page.locator('[data-action="handoff-finance"]').click();
  await page.waitForFunction(() => document.querySelector("#role-select")?.value === "finance"
    && window.location.hash === "#/finance"
    && document.querySelector("#main-content h1")?.textContent?.includes("Finansal yönetim ve döner sermaye pilotu"));
  check(await page.locator("#role-select").inputValue() === "finance", "ödeme demo devir eylemi Finans rolünü açmadı", errors);

  const requestRow = page.locator('tr:has-text("Yeşil Dönüşüm İçin Temel Yetkinlikler")').filter({ has: page.locator('[data-action="payment-review"][data-status="approved"]') }).first();
  await requestRow.locator('[data-action="payment-review"][data-status="approved"]').click();
  await page.check('#payment-review-form input[name="confirm"]');
  await page.locator('[data-action="submit-payment-review"]').click();
  await page.waitForFunction(() => {
    const saved = JSON.parse(localStorage.getItem("kdpu-myys-pilot-v3"));
    return saved.finance?.paymentRequests?.some((item) => item.programId === "program-green-skills" && item.status === "approved");
  }, undefined, { timeout: 3000 });
  const approvedRow = page.locator('tr:has-text("Yeşil Dönüşüm İçin Temel Yetkinlikler")').filter({ has: page.locator('[data-action="payment-review"][data-status="reconciled"]') }).first();
  await approvedRow.locator('[data-action="payment-review"][data-status="reconciled"]').click();
  await page.check('#payment-review-form input[name="confirm"]');
  await page.locator('[data-action="submit-payment-review"]').click();
  await page.waitForFunction(() => {
    const saved = JSON.parse(localStorage.getItem("kdpu-myys-pilot-v3"));
    return saved.finance?.paymentRequests?.some((item) => item.programId === "program-green-skills" && item.status === "reconciled");
  }, undefined, { timeout: 3000 });

  const paymentState = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("kdpu-myys-pilot-v3"));
    const request = saved.finance.paymentRequests.find((item) => item.programId === "program-green-skills");
    return {
      status: request?.status,
      realPayment: request?.realPayment,
      enrollment: saved.enrollments.some((item) => item.programCode === "MY-PRG-2026-011"),
      audit: saved.audit.some((item) => item.entityId === request?.id && item.to === "reconciled" && item.actorRole === "finance")
    };
  });
  check(paymentState.status === "reconciled", "finance: ödeme demo mutabakat durumu kaydedilmedi", errors);
  check(paymentState.realPayment === false, "ödeme demo kaydında realPayment=false korunmadı", errors);
  check(paymentState.enrollment, "mutabakat sonrası pilot eğitim kaydı oluşturulmadı", errors);
  check(paymentState.audit, "mali mutabakat denetim izine yazılmadı", errors);
  await setHash(page, "overview");
  await page.locator('[data-action="reset-demo"]').click();
}

async function verifyQualificationMatrixFlow(page, errors) {
  const programTitle = "Tarayıcı QA TYÇ Matris Programı";
  const outcome = "İleri kuramsal bilgiyi karmaşık bir öğrenme probleminde eleştirel olarak uygular.";
  await setHash(page, "overview");
  await page.selectOption("#role-select", "instructor");
  await setHash(page, "frameworks");
  await page.waitForFunction(() => document.querySelector("#main-content h1")?.textContent?.includes("TYÇ ve AYÇ yeterlilik eşleme matrisleri"));
  check(await page.locator('.framework-tabs [data-action="framework-tab"]').count() === 2, "frameworks: TYÇ ve AYÇ sekmeleri birlikte görünmüyor", errors);
  check(await page.locator("#framework-level option").count() === 8, "frameworks: TYÇ 1–8 seviye seçenekleri eksik", errors);

  await page.locator('[data-action="framework-tab"][data-framework="eqf"]').click();
  check(await page.locator("#framework-level option").count() === 8, "frameworks: AYÇ/EQF 1–8 seviye seçenekleri eksik", errors);
  check((await page.locator(".framework-source-card").innerText()).includes("Avrupa Yeterlilikler Çerçevesi"), "frameworks: AYÇ/EQF resmî referansı yüklenmedi", errors);
  await page.locator('[data-action="framework-tab"][data-framework="tyc"]').click();
  await page.selectOption("#framework-level", "6");
  await page.locator('[data-action="load-framework-level"]').click();

  check((await page.locator('#qualification-matrix-form button[type="submit"]').count()) === 1, "instructor: matris kaydetme CTA'sı yok", errors);
  check(await page.locator("#matrix-program-title").isEditable(), "instructor: program adı alanı düzenlenebilir değil", errors);
  check(await page.locator("#matrix-knowledge-outcome").isEditable(), "instructor: matris çıktı alanı düzenlenebilir değil", errors);
  await page.fill("#matrix-program-title", programTitle);
  await page.fill("#matrix-knowledge-outcome", outcome);
  await page.locator('#qualification-matrix-form button[type="submit"]').click();
  await page.waitForFunction((title) => {
    const saved = JSON.parse(localStorage.getItem("kdpu-myys-pilot-v3"));
    return saved.qualificationDrafts?.some((item) => item.frameworkId === "tyc" && item.level === 6 && item.programTitle === title && item.ownerRole === "instructor");
  }, programTitle, { timeout: 3000 });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('#role-select option[value="coordinator"]', { state: "attached" });
  await setHash(page, "frameworks");
  check(await page.locator("#matrix-program-title").inputValue() === programTitle, "instructor: matris taslağı reload sonrasında korunmadı", errors);
  check(await page.locator("#matrix-knowledge-outcome").inputValue() === outcome, "instructor: matris satırı reload sonrasında korunmadı", errors);
  check((await page.locator("#main-content").innerText()).includes("Kayıtlı pilot matris taslağı"), "instructor: reload sonrası kayıtlı taslak bildirimi yok", errors);

  await page.selectOption("#role-select", "coordinator");
  await setHash(page, "frameworks");
  const editableFields = page.locator('#qualification-matrix-form input:not([type="hidden"]), #qualification-matrix-form textarea');
  const readonlyFlags = await editableFields.evaluateAll((nodes) => nodes.map((node) => node.readOnly));
  check(readonlyFlags.length > 0 && readonlyFlags.every(Boolean), "coordinator: matris alanlarının tamamı salt-okunur değil", errors);
  check((await page.locator('#qualification-matrix-form button[type="submit"]').count()) === 0, "coordinator: matris kaydetme CTA'sı görünür", errors);
  check((await page.locator("#main-content").innerText()).includes("Salt-okunur inceleme"), "coordinator: salt-okunur açıklaması yok", errors);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("kdpu-myys-pilot-v3")).qualificationDrafts.length);
  await page.locator("#qualification-matrix-form").evaluate((form) => form.requestSubmit());
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("kdpu-myys-pilot-v3")).qualificationDrafts.length);
  check(after === before, "coordinator: doğrudan submit denemesi matris taslağını değiştirdi", errors);
  const coordinatorMutation = await page.evaluate(() => JSON.parse(localStorage.getItem("kdpu-myys-pilot-v3")).audit.some((item) => item.actorRole === "coordinator" && item.action === "TYÇ / AYÇ pilot matris taslağı kaydedildi"));
  check(!coordinatorMutation, "coordinator: yetkisiz matris kaydı audit izine yazıldı", errors);
  await setHash(page, "overview");
  await page.locator('[data-action="reset-demo"]').click();
}

async function verifyIntegrationCatalog(page, integrations, errors) {
  const requiredURLs = [
    "https://dpusem.dpu.edu.tr/",
    "https://oys.dpu.edu.tr/almsp",
    "https://obs.dpu.edu.tr/oibs/bologna/index.aspx",
    "https://obs.dpu.edu.tr/",
    "https://dilmer.dpu.edu.tr/",
    "https://tomer.dpu.edu.tr/",
    "https://ydyo.dpu.edu.tr/tr/index/duyuru/21623/01-temmuz-2025-ydys-1-asama-sinav-sonuclari-2024-2025"
  ];
  await setHash(page, "overview");
  await page.selectOption("#role-select", "it");
  await setHash(page, "integrations");
  await page.waitForSelector("#integration-catalog .integration-card");

  const cards = await page.locator("#integration-catalog .integration-card").evaluateAll((nodes) => nodes.map((node) => ({
    id: node.dataset.systemId,
    tier: node.dataset.integrationTier,
    relevance: node.dataset.myysRelevance,
    consultationOnly: node.dataset.consultationOnly,
    publicURL: node.dataset.publicUrl,
    sourceURL: node.dataset.sourceUrl
  })));
  check(cards.length === integrations.length, `integrations: UI ${cards.length} kart ile canonical ${integrations.length} kaydı eşleşmiyor`, errors);
  check(JSON.stringify(cards.map((item) => item.id).sort()) === JSON.stringify(integrations.map((item) => item.id).sort()), "integrations: canonical sistem kimlikleriyle kart kimlikleri farklı", errors);
  for (const card of cards) {
    const expected = integrations.find((item) => item.id === card.id);
    check(card.tier === expected?.integrationTier, `${card.id}: Tier etiketi canonical kayıtla farklı`, errors);
    check(card.relevance === expected?.myysRelevance, `${card.id}: MYYS relevance etiketi canonical kayıtla farklı`, errors);
    check(card.consultationOnly === String(expected?.consultationOnly), `${card.id}: consultationOnly kart sözleşmesi farklı`, errors);
    check(card.publicURL === expected?.publicUrl, `${card.id}: kamu erişim adresi canonical kayıtla farklı`, errors);
  }

  const integrationText = await page.locator("#main-content").innerText();
  check(integrationText.includes("Tier 1") && integrationText.includes("Kamu salt-okunur referans"), "integrations: Tier 1 legend eksik", errors);
  check(integrationText.includes("Tier 2") && integrationText.includes("Kontrollü servis / veri durumu"), "integrations: Tier 2 legend eksik", errors);
  check(integrationText.includes("Tier 3") && integrationText.includes("İşlem, belge veya mali handoff"), "integrations: Tier 3 legend eksik", errors);
  check(integrationText.includes("hazır, bağlı veya onaylanmış olduğunu göstermez"), "integrations: Tier hazırlık uyarısı eksik", errors);
  check(integrationText.includes("kalite MYS") && integrationText.includes("mali MYS/MAYS"), "integrations: BKYS kalite MYS ile mali MYS/MAYS ayrımı eksik", errors);
  const masterOwnerPriority = await page.locator('.master-data-card [data-owner-system-id]').evaluateAll((nodes) => nodes.slice(0, 7).map((node) => node.dataset.ownerSystemId));
  check(JSON.stringify(masterOwnerPriority) === JSON.stringify([
    "dpu-central-identity", "dpu-obs", "dpu-bologna", "dpu-oys", "dpu-bkys", "dpu-ebys", "dpu-doner-sermaye"
  ]), "integrations: canonical ana-veri sahipliği öncelik sırası hatalı", errors);
  for (const url of requiredURLs) {
    const matching = page.locator(`#integration-catalog .integration-card[data-public-url="${url}"] a.integration-public[href="${url}"]`);
    check(await matching.count() === 1, `integrations: verilen resmî erişim linki kartta yok: ${url}`, errors);
  }

  const searchTarget = integrations.find((item) => item.id === "dpu-bologna") || integrations[0];
  await page.fill("#integration-search", searchTarget.name);
  const visibleAfterSearch = await page.locator("#integration-catalog .integration-card").evaluateAll((nodes) => nodes.filter((node) => !node.hidden).map((node) => node.dataset.systemId));
  check(visibleAfterSearch.includes(searchTarget.id) && visibleAfterSearch.length >= 1 && visibleAfterSearch.length < integrations.length, "integrations: arama filtresi kataloğu daraltmadı", errors);

  await page.fill("#integration-search", "");
  await page.selectOption("#integration-category", searchTarget.category);
  await page.selectOption("#integration-tier", searchTarget.integrationTier);
  await page.locator('[data-action="integration-category"]').click();
  await page.waitForSelector("#integration-catalog .integration-card");
  const expectedFiltered = integrations.filter((item) => item.category === searchTarget.category && item.integrationTier === searchTarget.integrationTier);
  const filteredCards = await page.locator("#integration-catalog .integration-card").evaluateAll((nodes) => nodes.map((node) => ({ id: node.dataset.systemId, tier: node.dataset.integrationTier })));
  check(filteredCards.length === expectedFiltered.length, "integrations: kategori+Tier birleşik filtre sonucu hatalı", errors);
  check(filteredCards.every((item) => item.tier === searchTarget.integrationTier), "integrations: Tier filtresi farklı Tier kartı gösterdi", errors);

  await page.selectOption("#integration-category", "all");
  await page.selectOption("#integration-tier", "all");
  await page.locator('[data-action="integration-category"]').click();

  const consultation = integrations.find((item) => item.consultationOnly);
  check(Boolean(consultation), "integrations: consultation-only test kaydı yok", errors);
  if (consultation) {
    const consultationCard = page.locator(`.integration-card[data-system-id="${consultation.id}"]`);
    check((await consultationCard.innerText()).includes("Referans ayrıntısı"), `${consultation.id}: consultation-only CTA referans ayrıntısı değil`, errors);
    await consultationCard.locator('[data-action="open-integration"]').click();
    check((await page.locator("#modal").innerText()).includes("Aktarıma yönelik dry-run kapalı"), `${consultation.id}: consultation-only modal sınırı eksik`, errors);
    check(await page.locator('#modal [data-action="simulate-integration"]').count() === 0, `${consultation.id}: consultation-only aktarım dry-run CTA'sı görünür`, errors);
    await page.locator('#modal [data-action="close-modal"]').first().click();
  }

  const operable = integrations.find((item) => !item.consultationOnly && item.operatorRoles.includes("it"));
  check(Boolean(operable), "integrations: dry-run için Bilgi İşlem operable kaydı yok", errors);
  if (operable) {
    await page.locator(`.integration-card[data-system-id="${operable.id}"] [data-action="open-integration"]`).click();
    check(await page.locator('#modal [data-action="simulate-integration"]').count() === 1, `${operable.id}: Bilgi İşlem dry-run CTA'sı yok`, errors);
    await page.locator('#modal [data-action="simulate-integration"]').click();
    const first = await page.evaluate((systemId) => {
      const saved = JSON.parse(localStorage.getItem("kdpu-myys-pilot-v3"));
      const integration = saved.integrations.find((item) => item.id === systemId);
      const job = saved.integrationJobs.find((item) => item.targetId === systemId);
      return { status: integration?.status, job };
    }, operable.id);
    check(first.status === "failed" && first.job?.status === "simulation_failed", `${operable.id}: ilk dry-run simüle hata üretmedi`, errors);
    check(first.job?.realDataSent === false && first.job?.retryAvailable === true, `${operable.id}: ilk dry-run güvenlik/retry bayrakları hatalı`, errors);

    await page.locator(`.integration-card[data-system-id="${operable.id}"] [data-action="open-integration"]`).click();
    check((await page.locator('#modal [data-action="simulate-integration"]').innerText()).includes("Yeniden dene"), `${operable.id}: retry CTA metni yok`, errors);
    await page.locator('#modal [data-action="simulate-integration"]').click();
    const second = await page.evaluate((systemId) => {
      const saved = JSON.parse(localStorage.getItem("kdpu-myys-pilot-v3"));
      const integration = saved.integrations.find((item) => item.id === systemId);
      const jobs = saved.integrationJobs.filter((item) => item.targetId === systemId);
      return { status: integration?.status, jobs, unsafe: saved.integrationJobs.some((item) => item.realDataSent !== false) };
    }, operable.id);
    check(second.status === "simulated" && second.jobs[0]?.status === "simulation_succeeded", `${operable.id}: retry simüle başarı üretmedi`, errors);
    check(second.jobs.length === 2 && second.unsafe === false, `${operable.id}: dry-run audit zinciri veya realDataSent=false koruması hatalı`, errors);
  }

  await setHash(page, "overview");
  await page.selectOption("#role-select", "finance");
  await setHash(page, "integrations");
  const financeAllowed = integrations.find((item) => !item.consultationOnly && item.operatorRoles.includes("finance"));
  const financeDenied = integrations.find((item) => !item.consultationOnly && !item.operatorRoles.includes("finance"));
  if (financeAllowed) {
    await page.locator(`.integration-card[data-system-id="${financeAllowed.id}"] [data-action="open-integration"]`).click();
    check(await page.locator('#modal [data-action="simulate-integration"]').count() === 1, `finance/${financeAllowed.id}: izinli dry-run CTA yok`, errors);
    await page.locator('#modal [data-action="close-modal"]').click();
  }
  if (financeDenied) {
    await page.locator(`.integration-card[data-system-id="${financeDenied.id}"] [data-action="open-integration"]`).click();
    check(await page.locator('#modal [data-action="simulate-integration"]').count() === 0, `finance/${financeDenied.id}: yetkisiz dry-run CTA görünür`, errors);
    await page.locator('#modal [data-action="close-modal"]').click();
  }
  await setHash(page, "overview");
  await page.locator('[data-action="reset-demo"]').click();
}

async function verifyPersistenceAndStateGuard(page, roles, integrations, errors) {
  const external = roles.find((role) => role.id === "externalInstructor");
  await setHash(page, "overview");
  await page.selectOption("#role-select", external.id);
  await waitForRole(page, external);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('#role-select option[value="admin"]', { state: "attached" });
  try {
    await waitForRole(page, external);
  } catch {
    errors.push("reload: seçilen externalInstructor rolü/paneli localStorage üzerinden korunmadı");
  }

  await page.evaluate(() => {
    const key = "kdpu-myys-pilot-v3";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.roleId = "intruder-role";
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('#role-select option[value="admin"]', { state: "attached" });
  check(await page.locator("#role-select").inputValue() === "learner", "bozuk/kayıtsız rol kimliği güvenli varsayılana dönmedi", errors);

  await page.evaluate(() => {
    const key = "kdpu-myys-pilot-v3";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.integrations = saved.integrations.slice(0, -1);
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('#role-select option[value="it"]', { state: "attached" });
  await page.selectOption("#role-select", "it");
  await setHash(page, "integrations");
  check(await page.locator("#integration-catalog .integration-card").count() === integrations.length, "eksik/eski entegrasyon localStorage kataloğu canonical seed ile yenilenmedi", errors);
}

async function verifyUnauthorizedRoute(page, errors) {
  await setHash(page, "overview");
  await page.selectOption("#role-select", "learner");
  await setHash(page, "finance");
  const text = await page.locator("#main-content").innerText();
  check(text.includes("Bu bölüm seçili demo rolüne açık değil"), "learner: finance doğrudan rotası engellenmedi", errors);
  check(!text.includes("Tahsilatı simüle et"), "learner: yetkisiz finans eylemi sızdı", errors);
}

(async () => {
  fs.mkdirSync("test-results", { recursive: true });
  const { initialState, roles, roleNavigation } = await import(path.join(process.cwd(), "src/data.js"));
  const { scenarioDefinitions } = await import(path.join(process.cwd(), "src/workflow.js"));
  let server = null;
  let browser = null;
  const results = [];
  try {
    server = await ensureServer();
    browser = await chromium.launch({ headless: true });
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: "reduce"
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
      page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
      try {
        const response = await page.goto(baseURL, { waitUntil: "load" });
        check(Boolean(response?.ok()), `${viewport.name}: HTTP yükleme başarısız (${response?.status() ?? "yanıt yok"})`, errors);
        // Native <option> elements are intentionally not rendered as visible
        // boxes by Chromium. Waiting for `visible` therefore times out even
        // though the role selector is fully initialized and operable.
        await page.waitForSelector('#role-select option[value="admin"]', { state: "attached", timeout: 10000 });
        const homeContent = await page.locator("body").innerText();
        check(homeContent.includes("Kısa öğrenmeleri"), `${viewport.name}: hero metni yok`, errors);
        check(homeContent.includes("KONTROLLÜ PİLOT"), `${viewport.name}: pilot uyarısı yok`, errors);
        if (suppliedBaseURL) {
          const finalURL = new URL(page.url());
          check(finalURL.pathname === "/pilot.html", `${viewport.name}: Preview kökü /pilot.html uygulamasına ulaşmadı (${finalURL.pathname})`, errors);
          check(!/vercel\.com\/login|vercel\.com\/sso-api/.test(page.url()), `${viewport.name}: Preview Vercel giriş duvarına yönlendi`, errors);
          check(!homeContent.includes("Vercel'e giriş yapın"), `${viewport.name}: paylaşılabilir Preview yerine Vercel giriş ekranı açıldı`, errors);
        }
        const imageFailures = await page.evaluate(() => [...document.images]
          .filter((image) => !image.complete || image.naturalWidth === 0)
          .map((image) => image.src));
        if (imageFailures.length) errors.push(`${viewport.name}: kırık görsel: ${imageFailures.join(",")}`);

        await verifyRoleMatrix(page, roles, roleNavigation, viewport, errors);
        if (viewport.width === 1440) {
          await verifyExternalInstructorProposal(page, errors);
          await verifyAssessmentActions(page, errors);
          await verifyDecisionActions(page, errors);
          await verifyPaymentDemoFlow(page, errors);
          await verifyQualificationMatrixFlow(page, errors);
          await verifyIntegrationCatalog(page, initialState.integrations, errors);
          await verifyPersistenceAndStateGuard(page, roles, initialState.integrations, errors);
          await verifyUnauthorizedRoute(page, errors);
          await verifyScenarioActions(page, scenarioDefinitions, errors);
        }
        if (viewport.width === 390) {
          await setHash(page, "overview");
          await page.locator('[data-action="toggle-nav"]').click();
          check(await page.locator("body").evaluate((body) => body.classList.contains("nav-open")), "mobile: menü açılmadı", errors);
          // The backdrop spans the full viewport, including the area underneath
          // the higher-z-index sidebar. Click its exposed right edge, matching
          // an actual mobile user tap outside the drawer.
          await page.locator('[data-action="close-nav"]').click({ position: { x: viewport.width - 8, y: 40 } });
          check(!await page.locator("body").evaluate((body) => body.classList.contains("nav-open")), "mobile: menü kapanmadı", errors);
        }
        await page.screenshot({ path: `test-results/${viewport.name}-nine-role-qa.png`, fullPage: true });
      } catch (error) {
        errors.push(`${viewport.name}: kritik QA hatası: ${error.stack || error.message}`);
      }
      results.push({ viewport: viewport.name, rolesChecked: roles.length, errors });
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    if (server) server.kill("SIGTERM");
  }

  const failed = results.filter((result) => result.errors.length);
  const report = { checkedAt: new Date().toISOString(), baseURL, results };
  fs.writeFileSync("test-results/nine-role-qa.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (failed.length) {
    console.error(`Dokuz rol tarayıcı QA başarısız: ${failed.reduce((sum, result) => sum + result.errors.length, 0)} bulgu.`);
    process.exitCode = 1;
  } else {
    console.log("Dokuz rol tarayıcı QA başarılı: 9/9 rol, dört viewport, erişim, sahiplik, kalıcılık ve CTA kontrolleri geçti.");
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
