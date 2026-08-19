import { initialState, lifecycle, pageMeta, roleNavigation, roles } from "./data.js";
import { createApplication, runScenarioStep, scenarioDefinitions, transitionApplication } from "./workflow.js";
import { getSupabasePublicConfig, loadPilotSnapshot } from "./supabase.js";

const STORAGE_KEY = "kdpu-myys-pilot-v3";
const root = document.querySelector("#main-content");
const sideNav = document.querySelector("#side-nav");
const roleSelect = document.querySelector("#role-select");
const personaCard = document.querySelector("#persona-card");
const modalBackdrop = document.querySelector("#modal-backdrop");
const modal = document.querySelector("#modal");
const toastRegion = document.querySelector("#toast-region");
const routeAnnouncer = document.querySelector("#route-announcer");

let state = loadState();
let lastFocused = null;
let currentCommissionTab = "summary";

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.version === initialState.version) return saved;
  } catch {
    // Corrupt local state safely falls back to the sealed synthetic seed.
  }
  return structuredClone(initialState);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}

function icon(name) {
  const safe = pageMeta[name]?.icon || name;
  return `<svg aria-hidden="true"><use href="#icon-${safe}"></use></svg>`;
}

function currentRole() {
  return roles.find((role) => role.id === state.roleId) || roles[0];
}

function initials(name) {
  return name.split(" ").filter((part) => part.length > 1).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function navigate(page, detail = "") {
  window.location.hash = `#/${page}${detail ? `/${encodeURIComponent(detail)}` : ""}`;
}

function route() {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return { page: parts[0] || "home", detail: decodeURIComponent(parts[1] || "") };
}

function isAllowed(page) {
  return ["home", "verify"].includes(page) || (roleNavigation[state.roleId] || []).includes(page);
}

function formatDate(value, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  return new Intl.DateTimeFormat("tr-TR", includeTime ? { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" } : { dateStyle: "medium", timeZone: "Europe/Istanbul" }).format(date);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(value);
}

const statusMap = {
  draft: ["Taslak", "neutral"], review: ["Ön incelemede", "warning"], commission: ["Komisyon gündeminde", "info"],
  revision: ["Revizyon bekliyor", "warning"], approved: ["Pilot onaylandı", "success"], rejected: ["Pilot reddedildi", "risk"],
  active: ["Yayında • Pilot", "success"], credentialed: ["Yeterlilik üretildi • Pilot", "success"], valid: ["Geçerli • Pilot", "success"], disconnected: ["Bağlı değil", "neutral"],
  simulated: ["Simülasyon", "info"], matched: ["Eşleştirildi • Simülasyon", "success"], pending: ["Bekliyor • Simülasyon", "warning"],
  completed: ["Tamamlandı • Simülasyon", "success"], scheduled: ["Planlandı • Simülasyon", "info"],
  failed: ["Hata senaryosu • Simülasyon", "risk"], recognized: ["Tanınan kredi • Pilot", "success"]
};

function statusBadge(status, override) {
  const [label, tone] = statusMap[status] || [override || status, "neutral"];
  return `<span class="status status--${tone}">${escapeHtml(override || label)}</span>`;
}

function pageHeader(kicker, title, subtitle, actions = "") {
  return `<header class="page-header"><div><div class="page-kicker">${escapeHtml(kicker)}</div><h1>${escapeHtml(title)}</h1><p class="page-subtitle">${escapeHtml(subtitle)}</p></div>${actions ? `<div class="page-actions">${actions}</div>` : ""}</header>`;
}

function notice(tone, title, text) {
  return `<div class="notice notice--${tone}">${icon(tone === "success" ? "shield" : "alert")}<div><strong>${escapeHtml(title)}</strong>${escapeHtml(text)}</div></div>`;
}

function toast(message, tone = "success") {
  const node = document.createElement("div");
  node.className = `toast toast--${tone}`;
  node.innerHTML = `${icon(tone === "success" ? "check" : "alert")}<div>${escapeHtml(message)}</div>`;
  toastRegion.append(node);
  setTimeout(() => node.remove(), 4300);
}

function openModal(content) {
  lastFocused = document.activeElement;
  modal.innerHTML = content;
  modalBackdrop.hidden = false;
  for (const selector of [".pilot-banner", ".site-header", ".app-shell"]) {
    const element = document.querySelector(selector);
    if (element) element.inert = true;
  }
  document.body.style.overflow = "hidden";
  setTimeout(() => modal.querySelector("button, input, select, textarea")?.focus(), 0);
}

function closeModal() {
  modalBackdrop.hidden = true;
  modal.innerHTML = "";
  for (const selector of [".pilot-banner", ".site-header", ".app-shell"]) {
    const element = document.querySelector(selector);
    if (element) element.inert = false;
  }
  document.body.style.overflow = "";
  lastFocused?.focus?.();
}

function modalTemplate(title, body, footer = "") {
  return `<header class="modal-header"><div><div class="page-kicker">Kontrollü pilot</div><h2 id="modal-title">${escapeHtml(title)}</h2></div><button class="icon-button" type="button" data-action="close-modal" aria-label="Pencereyi kapat">${icon("close")}</button></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ""}`;
}

function renderShell() {
  roleSelect.innerHTML = roles.map((role) => `<option value="${role.id}" ${role.id === state.roleId ? "selected" : ""}>${escapeHtml(role.label)}</option>`).join("");
  const role = currentRole();
  personaCard.innerHTML = `<div class="persona-top"><span class="avatar" aria-hidden="true">${initials(role.name)}</span><div><strong>${escapeHtml(role.name)}</strong><small>${escapeHtml(role.title)}</small></div></div><span class="persona-badge">${escapeHtml(role.label)}</span>`;
  const active = route().page;
  sideNav.innerHTML = `<button class="nav-link ${active === "home" ? "active" : ""}" type="button" data-nav="home" ${active === "home" ? `aria-current="page"` : ""}>${icon("home")}<span>Pilot Ana Sayfa</span></button>${(roleNavigation[state.roleId] || []).map((page) => `<button class="nav-link ${active === page ? "active" : ""}" type="button" data-nav="${page}" ${active === page ? `aria-current="page"` : ""}>${icon(pageMeta[page].icon)}<span>${escapeHtml(pageMeta[page].label)}</span></button>`).join("")}`;
  document.querySelector("#notification-count").textContent = String(state.notifications.filter((item) => !item.read).length);
  document.querySelector("#data-mode-label").textContent = state.dataMode;
}

function render() {
  renderShell();
  const { page, detail } = route();
  state.activePage = page;
  saveState();
  if (!isAllowed(page)) {
    root.innerHTML = unauthorizedPage(page);
  } else {
    const renderer = pages[page] || pages.overview;
    root.innerHTML = renderer(detail);
  }
  document.body.classList.remove("nav-open");
  document.querySelector("[data-action='toggle-nav']")?.setAttribute("aria-expanded", "false");
  document.querySelector("[data-action='toggle-nav']")?.setAttribute("aria-label", "Menüyü aç");
  const announcedTitle = page === "verify" ? "Pilot belge doğrulama" : (pageMeta[page]?.label || "Sayfa");
  routeAnnouncer.textContent = `${announcedTitle} sayfası açıldı`;
  document.title = `${announcedTitle} • KDPÜ MYYS`;
  window.scrollTo({ top: 0, behavior: "instant" });
  setTimeout(() => root.focus({ preventScroll: true }), 0);
}

function unauthorizedPage(page) {
  return `<div class="page-container">${pageHeader("Rol bazlı erişim", "Bu bölüm seçili demo rolüne açık değil", `${currentRole().label} rolü, “${pageMeta[page]?.label || page}” görünümüne erişemez. Bu kontrol yalnızca pilot yetki davranışını örnekler.`)}<div class="card empty-state"><div class="empty-icon">${icon("lock")}</div><h3>Yetkisiz pilot rota</h3><p>Önceki role ait hiçbir içerik gösterilmedi. Role uygun panele dönün veya üst bölümden başka bir demo rolü seçin.</p><button class="button" data-nav="overview">Role uygun panele dön</button></div></div>`;
}

function homePage() {
  return `<div class="page-container">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-art"><img src="assets/illustrations/myys-hero.webp" alt="Üniversite, öğrenenler, eğitici, akademik komisyon ve dijital yeterlilik arasında kurulan kontrollü ekosistem illüstrasyonu" width="1400" height="896" fetchpriority="high" /></div>
      <div class="hero-copy">
        <div class="hero-logo-row"><img src="assets/brand/kdpu-logo-web.png" alt="Kütahya Dumlupınar Üniversitesi" /><span class="line"></span><img src="assets/brand/go-icon-web.png" alt="" /></div>
        <div class="eyebrow">Mikro Yeterlilik Yönetim Sistemi • Kontrollü Pilot</div>
        <h1 id="hero-title">Kısa öğrenmeleri <span>izlenebilir akademik kazanımlara</span> dönüştüren pilot</h1>
        <p>Başvuru, kanıt, komisyon değerlendirmesi, dijital yeterlilik, entegrasyon ve mali süreçleri ortak bir denetim izi içinde örnekler.</p>
        <div class="hero-actions"><button class="button" data-action="demo-login">${icon("arrow")} Demo rolle giriş yap</button><button class="button button--secondary" data-nav="catalog">${icon("book")} Mikro yeterlilikleri incele</button><button class="button button--ghost" data-action="pilot-info">Pilot kapsamını görüntüle</button></div>
        <div class="source-strip"><span>${icon("shield")} Gerçek veri yok</span><span>${icon("check")} İnsan kararı merkezde</span><span>${icon("network")} Entegrasyonlar bağlı değil</span></div>
      </div>
    </section>
    <section class="section"><div class="section-heading"><div><div class="page-kicker">Uçtan uca izlenebilirlik</div><h2>Altı evre, tek kanıt zinciri</h2></div><p>Her evre; rol, karar sahibi, gerekçe, kanıt ve zaman damgasıyla görünür olur. Pilot analizler nihai akademik karar yerine geçmez.</p></div><div class="lifecycle-grid">${lifecycle.map((item) => `<article class="life-card"><span class="life-no">${item.no}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></article>`).join("")}</div></section>
    <section class="section grid grid-3">
      <article class="card"><div class="card-body"><div class="kpi-icon">${icon("users")}</div><h3 style="margin-top:15px">Akademik yetki korunur</h3><p class="page-subtitle">Yapay zekâ yalnız karşılaştırılabilir pilot analiz üretir; nihai karar komisyon ve yetkili kuruldadır.</p></div></article>
      <article class="card"><div class="card-body"><div class="kpi-icon">${icon("shield")}</div><h3 style="margin-top:15px">Mahremiyet sınırlandırılır</h3><p class="page-subtitle">Kamera, mikrofon, biyometri, gerçek kimlik ve ödeme verisi toplanmaz; tüm kayıtlar açıkça sentetiktir.</p></div></article>
      <article class="card"><div class="card-body"><div class="kpi-icon">${icon("network")}</div><h3 style="margin-top:15px">Entegrasyonlar aşamalıdır</h3><p class="page-subtitle">ÖBİS, YÖKSİS, e-Devlet, GİB ve MYS/MAYS kartları sadece dry-run ve audit senaryoları sunar.</p></div></article>
    </section>
  </div>`;
}

function overviewPage() {
  const role = currentRole();
  const pending = state.applications.filter((item) => ["review", "commission", "revision"].includes(item.status)).length;
  const dueSoon = state.applications.filter((item) => item.elapsedDays >= 15 && !["approved", "rejected"].includes(item.status)).length;
  const unread = state.notifications.filter((item) => !item.read).length;
  return `<div class="page-container">${pageHeader("Rol bazlı operasyon", `${role.label} genel bakışı`, `${role.name} için yalnızca kurgusal pilot veriler ve role uygun eylemler gösteriliyor.`, `<button class="button button--secondary" data-action="reset-demo">${icon("refresh")} Demo verisini sıfırla</button>`)}
    <div class="grid grid-4">
      ${kpi("Aktif başvurular", pending, "İnceleme, komisyon veya revizyon aşamasında", "file")}
      ${kpi("Yaklaşan pilot süre", dueSoon, "30 günlük gösterge kurumsal doğrulamaya açıktır", "clock")}
      ${kpi("Pilot yeterlilik", state.credentials.length, "Yalnız bu Preview ortamında doğrulanabilir", "wallet")}
      ${kpi("Okunmamış bildirim", unread, "Yalnız uygulama içi; SMS/e-posta gönderilmez", "bell")}
    </div>
    <div class="grid grid-2 section">
      <section class="card"><div class="card-header"><div><h2>Rolünüze uygun sonraki adımlar</h2><p>Görevler çalışma alanına göre önceliklendirildi.</p></div>${statusBadge("simulated")}</div><div class="card-body">${roleTasks(state.roleId)}</div></section>
      <section class="card"><div class="card-header"><div><h2>Son denetim olayları</h2><p>Her durum değişikliği gerekçe ve aktörle birlikte tutulur.</p></div><button class="button button--ghost button--sm" data-nav="audit">Tümünü gör</button></div><div class="card-body"><div class="timeline">${state.audit.slice(0,4).map(auditTimeline).join("")}</div></div></section>
    </div>
    <div class="section">${notice("warning", "Pilot kural uyarısı", "30 gün, %10 AKTS, %50 uzaktan kredi ve benzerlik bantları kaynak dosyalardaki öneri/ön kontrol değerleridir; kurumsal ve Senato doğrulaması olmadan nihai karar üretmez.")}</div>
  </div>`;
}

function scenariosPage() {
  return `<div class="page-container">${pageHeader("Çalışan pilot akışlar", "Uçtan uca demo senaryoları", "Her “sonraki adım” eylemi tarayıcıdaki izole pilot veri katmanını, rolü ve denetim izini gerçekten günceller. Yenileme sonrasında durum korunur.", `<button class="button button--secondary" data-action="reset-demo">${icon("refresh")} Tüm senaryoları sıfırla</button>`)}
    ${notice("warning", "Kontrollü yürütme", "Adımlar sentetik veriyle çalışır. Yapay zekâ hiçbir adımda karar sahibi değildir; entegrasyon kayıtlarında realDataSent=false kalır.")}
    <div class="grid grid-2 section">
      ${scenarioCard("internal", "Senaryo 1", "Üniversite içi program önerisi", "Öneri, akademik inceleme, katalog, kayıt, değerlendirme, yeterlilik ve doğrulama")}
      ${scenarioCard("recognition", "Senaryo 2", "Kurum dışı kazanımın tanınması", "Kanıt, pilot karşılaştırma, Komisyon kararı, kredi kaydı ve aktarım simülasyonu")}
    </div>
  </div>`;
}

function scenarioCard(kind, kicker, title, description) {
  const scenario = state.scenarios[kind];
  const steps = scenarioDefinitions[kind];
  const percent = Math.round((scenario.step / steps.length) * 100);
  const next = steps[scenario.step];
  return `<section class="card scenario-card"><div class="card-header"><div><span class="table-subtitle">${kicker}</span><h2>${title}</h2><p>${description}</p></div>${scenario.completed ? statusBadge("completed") : statusBadge("simulated", `${scenario.step}/${steps.length} adım`)}</div><div class="card-body"><div class="progress" role="progressbar" aria-label="${title} ilerlemesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div><ol class="scenario-steps">${steps.map(([role,label], index) => `<li class="${index < scenario.step ? "done" : index === scenario.step ? "current" : ""}"><span>${index + 1}</span><div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(roleLabel(role))}</small></div></li>`).join("")}</ol>${scenario.completed ? `<div class="notice notice--success">${icon("check")}<div><strong>Senaryo tamamlandı</strong>${kind === "internal" ? "Program, değerlendirme ve pilot yeterlilik durumu oluşturuldu." : "Tanınan kredi ile ÖBİS/YÖKSİS simülasyon kayıtları oluşturuldu."}</div></div>` : `<button class="button scenario-next" data-action="run-scenario" data-kind="${kind}">${icon("arrow")} Sonraki adım: ${escapeHtml(next[1])}</button>`}${scenario.completed ? `<button class="button button--secondary scenario-next" data-action="open-scenario-result" data-kind="${kind}">${kind === "internal" ? "Pilot yeterliliği aç" : "Aktarım loglarını aç"}</button>` : ""}</div></section>`;
}

function roleLabel(role) {
  if (role === "system") return "Karar vermeyen pilot hizmet";
  return roles.find((item) => item.id === role)?.label || role;
}

function learningPage() {
  const completedEcts = state.enrollments.filter((item) => item.status === "completed").reduce((sum,item)=>sum+Number(item.ects),0);
  const recognizedEcts = state.recognizedCredits.reduce((sum,item)=>sum+Number(item.ects),0);
  const remoteEcts = state.enrollments.reduce((sum,item)=>sum+Number(item.remoteEcts || 0),0) + state.recognizedCredits.reduce((sum,item)=>sum+Number(item.remoteEcts || 0),0);
  const total = completedEcts + recognizedEcts;
  const remoteShare = total ? Math.round(remoteEcts / total * 100) : 0;
  return `<div class="page-container">${pageHeader("Öğrenen çalışma alanı", "Eğitimlerim, değerlendirmelerim ve AKTS", "Kayıtlar yalnız seçili sentetik öğrenenin yerel pilot çalışma alanındadır; resmî transkript veya ÖBİS kaydı değildir.")}
    <div class="grid grid-4">${kpi("Tamamlanan pilot AKTS",completedEcts,"Eğitim kayıtlarından","book")}${kpi("Tanınan pilot AKTS",recognizedEcts,"Dış kazanım kayıtlarından","check")}${kpi("Toplam kullanılan",`${total}/24`,"%10 pilot ön kontrol tavanı","chart")}${kpi("Uzaktan kaynak payı",`%${remoteShare}`,"%50 pilot göstergesi; blok değildir","network")}</div>
    <div class="grid grid-2 section"><section class="card"><div class="card-header"><div><h2>Eğitimlerim</h2><p>Kayıt ve ilerleme durumu</p></div></div><div class="card-body"><div class="timeline">${state.enrollments.map((item)=>`<div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.programCode)} • ${item.ects} AKTS • %${item.progress} ilerleme</span>${statusBadge(item.status)}</div></div>`).join("") || `<p class="page-subtitle">Henüz pilot eğitim kaydı yok.</p>`}</div></div></section><section class="card"><div class="card-header"><div><h2>Değerlendirmelerim</h2><p>İnsan değerlendirici kararları</p></div></div><div class="card-body"><div class="timeline">${state.assessmentSessions.map((item)=>`<div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>${escapeHtml(item.title)}</strong><span>${item.score ?? "—"}/100 • ${escapeHtml(item.evaluatorDecision || "İnceleme bekliyor")}</span>${statusBadge(item.status)}</div></div>`).join("") || `<p class="page-subtitle">Henüz pilot değerlendirme yok.</p>`}</div></div></section></div>
    ${state.recognizedCredits.length ? `<section class="card section"><div class="card-header"><div><h2>Tanınan dış kazanımlar</h2><p>Yalnız pilot kredi defteri</p></div></div><div class="card-body">${state.recognizedCredits.map((item)=>`<div class="integration-head"><div><strong>${escapeHtml(item.title)}</strong><span class="table-subtitle">${item.ects} AKTS • ${item.remoteEcts} uzaktan kaynaklı AKTS</span></div>${statusBadge("recognized")}</div>`).join("")}</div></section>` : ""}
  </div>`;
}

function kpi(label, value, note, iconName) {
  return `<article class="card kpi-card"><div class="kpi-label"><span>${escapeHtml(label)}</span><span class="kpi-icon">${icon(iconName)}</span></div><div class="kpi-value">${escapeHtml(value)}</div><div class="kpi-note">${escapeHtml(note)}</div></article>`;
}

function roleTasks(roleId) {
  const tasks = {
    learner: [["Dış kazanım için eksik kanıtı tamamla", "recognition", "1 belge bekliyor"], ["Aktif programları incele", "catalog", "3 pilot program"], ["Yeterliliğini doğrula", "wallet", "1 pilot belge"]],
    instructor: [["Program önerisini komisyon için gözden geçir", "proposal", "MY-PRG-2026-014"], ["Ölçme rubriğini aç", "assessment", "Taslak kanıt"], ["Program durumlarını izle", "applications", "3 kayıt"]],
    externalInstructor: [["Yetkinlik kanıtı yükleme alanını incele", "proposal", "Simülasyon"], ["Program önerisi oluştur", "proposal", "Yeni taslak"], ["Bildirimleri kontrol et", "notifications", "Uygulama içi"]],
    coordinator: [["Eksik belge kontrolünü tamamla", "applications", "1 başvuru"], ["Süre göstergelerini incele", "reports", "1 yaklaşan kayıt"], ["Komisyon gündemini aç", "commission", "2 kayıt"]],
    commission: [["Karşılaştırma analizini incele", "commission", "MY-PRG-2026-014"], ["Gerekçeli görüş ekle", "commission", "İnsan kararı"], ["Karar geçmişini denetle", "audit", "İzlenebilir kayıt"]],
    studentAffairs: [["AKTS ön kontrolünü incele", "applications", "%10 pilot sınırı"], ["ÖBİS dry-run kaydını aç", "integrations", "Bağlı değil"], ["Belge alanlarını karşılaştır", "wallet", "EK-1 taslağı"]],
    it: [["Entegrasyon onay kapılarını test et", "integrations", "7 bağlı olmayan servis"], ["Audit kayıtlarını incele", "audit", "Gerçek veri yok"], ["Sistem sağlığı özetini aç", "reports", "Pilot görünüm"]],
    finance: [["Tahsilat eşleşmesini incele", "finance", "2 simülasyon"], ["Hak ediş taslağını doğrula", "finance", "Mali onay gerekli"], ["Program raporunu aç", "reports", "Parametreler dinamik"]],
    admin: [["Rol ve kapsam görünümünü denetle", "overview", "9 demo rolü"], ["Entegrasyonları doğrula", "integrations", "Production kapalı"], ["Audit izini dışa aktarma simülasyonu", "audit", "Sentetik veri"]]
  }[roleId] || [];
  return `<div class="timeline">${tasks.map(([title, page, meta], index) => `<div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(meta)}</span><button class="text-button" data-nav="${page}">Aç</button></div></div>`).join("")}</div>`;
}

function catalogPage() {
  const proposalAction = ["instructor","externalInstructor"].includes(state.roleId) ? `<button class="button" data-nav="proposal">${icon("plus")} Program öner</button>` : "";
  return `<div class="page-container">${pageHeader("Öğrenme kataloğu", "Mikro yeterlilik programları", "Katalogdaki tüm programlar kurgusal pilot kayıtlardır; aktif görünen programlar gerçek kayıt veya ödeme kabul etmez.", proposalAction)}
    <div class="toolbar"><div class="search">${icon("search")}<label class="sr-only" for="catalog-search">Program, birim veya eğitici ara</label><input id="catalog-search" type="search" placeholder="Program, birim veya eğitici ara" /></div><div class="toolbar-group"><select class="select" id="catalog-level" aria-label="TYÇ düzeyi filtresi"><option value="">Tüm TYÇ düzeyleri</option><option value="6">TYÇ 6</option><option value="7">TYÇ 7</option></select><button class="button button--secondary button--sm" data-action="clear-catalog">Filtreleri temizle</button></div></div>
    <div class="grid grid-3" id="catalog-grid">${state.programs.map(programCard).join("")}</div>
  </div>`;
}

function programCard(program) {
  return `<article class="card program-card" data-program-level="${program.level}" data-searchable="${escapeHtml(`${program.title} ${program.unit} ${program.instructor}`.toLocaleLowerCase("tr-TR"))}"><div class="program-accent"></div><div class="card-body"><div class="program-meta"><span class="meta-pill">${program.ects} AKTS • Pilot</span><span class="meta-pill">TYÇ ${program.level} önerisi</span><span class="meta-pill">${escapeHtml(program.mode)}</span></div><h3>${escapeHtml(program.title)}</h3><p>${escapeHtml(program.summary)}</p><small class="table-subtitle">${escapeHtml(program.unit)} • ${escapeHtml(program.instructor)}</small></div><div class="card-footer">${statusBadge(program.status)}<button class="button button--secondary button--sm" data-action="open-program" data-id="${program.id}">Ayrıntıları gör ${icon("arrow")}</button></div></article>`;
}

function proposalPage() {
  return `<div class="page-container">${pageHeader("Başvuru • Evre 1", "Yeni mikro yeterlilik programı önerisi", "Zorunlu alanları tamamlayın; bu form yalnızca tarayıcınızdaki pilot veri katmanına sentetik kayıt oluşturur.")}
    <div class="form-shell"><aside class="card steps" aria-label="Form adımları"><div class="step active"><span>1</span><div><strong>Program bilgileri</strong><small>Ad, birim, hedef kitle</small></div></div><div class="step"><span>2</span><div><strong>Akademik yapı</strong><small>Çıktı, AKTS, TYÇ</small></div></div><div class="step"><span>3</span><div><strong>Değerlendirme</strong><small>Kanıt ve rubrik</small></div></div><div class="step"><span>4</span><div><strong>Önizleme</strong><small>Pilot kontrol ve gönderim</small></div></div></aside>
      <form class="card form-card" id="proposal-form">
        <section class="form-section"><h3>Program kimliği</h3><p>Başvuru, seçili demo rolü adına oluşturulur.</p><div class="form-grid"><div class="field full"><label class="required" for="proposal-title">Program adı</label><input id="proposal-title" name="title" required minlength="8" placeholder="Örn. Dijital Üretimde Veri Okuryazarlığı" /></div><div class="field"><label for="proposal-unit">Akademik birim</label><select id="proposal-unit" name="unit"><option>Mühendislik Fakültesi</option><option>Eğitim Fakültesi</option><option>Lisansüstü Eğitim Enstitüsü</option><option>Sürekli Eğitim Merkezi</option></select></div><div class="field"><label for="proposal-audience">Hedef kitle</label><input id="proposal-audience" name="audience" value="Lisans öğrencileri ve yeni mezunlar" /></div><div class="field full"><label class="required" for="proposal-summary">Program özeti</label><textarea id="proposal-summary" name="summary" required minlength="20" placeholder="Programın amacı ve kapsamı"></textarea></div></div></section>
        <section class="form-section"><h3>Akademik yapı ve pilot parametreler</h3><p>1 AKTS = 25 saat, TYÇ düzeyi ve oranlar yalnız pilot ön kontrolüdür; kurumsal doğrulama gerekir.</p><div class="form-grid"><div class="field"><label class="required" for="proposal-ects">Önerilen AKTS</label><input id="proposal-ects" name="ects" type="number" min="1" max="12" value="3" required /></div><div class="field"><label for="proposal-workload">Kavramsal iş yükü</label><input id="proposal-workload" name="workload" type="number" value="75" readonly /><small>AKTS × 25 saat pilot hesabı</small></div><div class="field"><label for="proposal-level">Önerilen TYÇ düzeyi</label><select id="proposal-level" name="level"><option value="5">5 • Önlisans</option><option value="6" selected>6 • Lisans</option><option value="7">7 • Yüksek lisans</option><option value="8">8 • Doktora</option></select></div><div class="field"><label for="proposal-remote">Uzaktan sunum oranı (%)</label><input id="proposal-remote" name="remoteRate" type="number" min="0" max="100" value="40" /></div><div class="field full"><label class="required" for="proposal-outcomes">Öğrenme çıktıları</label><textarea id="proposal-outcomes" name="outcomes" required minlength="20" placeholder="Her satıra bir ölçülebilir öğrenme çıktısı yazın"></textarea></div></div></section>
        <section class="form-section"><h3>Ölçme, kanıt ve kalite güvencesi</h3><p>Gerçek kimlik veya biyometrik veri yüklemeyin. Dosya alanı yalnız üst veri simülasyonudur.</p><div class="form-grid"><div class="field"><label for="proposal-assessment">Birincil değerlendirme</label><select id="proposal-assessment" name="assessment"><option>Proje + rubrik</option><option>Portfolyo + sözlü sunum</option><option>Uygulama + kısa sınav</option></select></div><div class="field"><label for="proposal-evidence">Pilot kanıt sayısı</label><input id="proposal-evidence" name="evidence" type="number" min="1" value="3" /></div><div class="field full"><label class="required" for="proposal-qualifications">Eğitici yeterlilikleri</label><textarea id="proposal-qualifications" name="qualifications" required minlength="15" placeholder="Alan uzmanlığı, öğretim deneyimi ve doğrulanacak kanıtlar"></textarea></div><div class="field full"><label class="required" for="proposal-quality">Kalite güvence planı</label><textarea id="proposal-quality" name="quality" required minlength="15" placeholder="Rubrik kalibrasyonu, geri bildirim ve kanıt saklama yaklaşımı"></textarea></div><div class="field"><label for="proposal-fee-mode">Program türü</label><select id="proposal-fee-mode" name="feeMode"><option>Ücretsiz</option><option>Ücretli • Pilot taslak</option></select></div><div class="field"><label for="proposal-fee">Örnek ücret (TL)</label><input id="proposal-fee" name="fee" type="number" min="0" value="0" /><small>Pilot parametre — mali birim doğrulaması gerekir</small></div><button class="dropzone full" type="button" data-action="mock-upload">${icon("upload")}<strong>Sentetik kanıt üst verisi ekle</strong><span>PDF, PNG veya JPG • Dosya içeriği aktarılmaz</span></button></div></section>
        <div class="form-actions"><button class="button button--secondary" type="button" data-action="save-draft">Taslağı kaydet</button><button class="button button--secondary" type="button" data-action="preview-proposal">Ön izle</button><button class="button" type="submit">Koordinatörlüğe ilet ${icon("arrow")}</button></div>
      </form>
    </div>
  </div>`;
}

function applicationsPage() {
  const actions = `${state.roleId === "learner" ? `<button class="button button--secondary" data-nav="recognition">${icon("upload")} Dış kazanım başvurusu</button>` : ""}${["instructor","externalInstructor"].includes(state.roleId) ? `<button class="button" data-nav="proposal">${icon("plus")} Program önerisi</button>` : ""}`;
  return `<div class="page-container">${pageHeader("Başvuru yönetimi", "Başvurular ve süre takibi", "Program önerileri ile dış kazanım tanınma talepleri aynı denetim izi içinde, farklı kontrol yollarıyla izlenir.", actions)}
    <div class="toolbar"><div class="search">${icon("search")}<label class="sr-only" for="application-search">Kod, başlık veya başvuran ara</label><input id="application-search" type="search" placeholder="Kod, başlık veya başvuran ara" /></div><div class="toolbar-group"><select id="application-status" class="select" aria-label="Durum filtresi"><option value="">Tüm durumlar</option><option value="review">Ön incelemede</option><option value="commission">Komisyon gündeminde</option><option value="revision">Revizyon bekliyor</option><option value="approved">Pilot onaylandı</option></select></div></div>
    <div class="table-wrap"><table><thead><tr><th>Başvuru</th><th>Tür / Başvuran</th><th>Durum</th><th>30 günlük gösterge</th><th>Pilot analiz</th><th></th></tr></thead><tbody id="application-rows">${state.applications.map(applicationRow).join("")}</tbody></table></div>
    <div class="section">${notice("warning", "Süre göstergesi hakkında", "30 günlük sayaç yalnızca kaynak dosyadaki pilot kuralı görselleştirir. Sürenin başlangıcı, durması ve kurumsal eskalasyon yöntemi ayrıca doğrulanmalıdır.")}</div>
  </div>`;
}

function applicationRow(item) {
  const progress = Math.min(100, Math.round(item.elapsedDays / 30 * 100));
  return `<tr data-application-status="${item.status}" data-searchable="${escapeHtml(`${item.code} ${item.title} ${item.applicant}`.toLocaleLowerCase("tr-TR"))}"><td><span class="table-title">${escapeHtml(item.title)}</span><span class="table-subtitle">${escapeHtml(item.code)} • ${formatDate(item.submittedAt)}</span></td><td>${item.kind === "external" ? "Dış kazanım" : "Program önerisi"}<span class="table-subtitle">${escapeHtml(item.applicant)}</span></td><td>${statusBadge(item.status)}</td><td><div class="progress ${progress > 65 ? "progress--warning" : ""}"><span style="width:${progress}%"></span></div><div class="progress-labels"><span>${item.elapsedDays}/30 gün</span><span>${30 - item.elapsedDays} gün</span></div></td><td><strong>%${item.similarity}</strong> benzerlik<span class="table-subtitle">TYÇ önerisi %${item.tycMatch}</span></td><td><button class="button button--secondary button--sm" data-action="open-application" data-id="${item.id}">İncele</button></td></tr>`;
}

function recognitionPage() {
  return `<div class="page-container">${pageHeader("Başvuru • Evre 1", "Kurum dışı kazanım tanınma talebi", "Dış öğrenme kanıtını ve program bilgisini sentetik verilerle girin. Doğrulama bağlantısı sunucu tarafından açılmaz; gerçek belge yüklenmez.")}
    <div class="grid grid-2"><form class="card form-card" id="recognition-form"><section class="form-section"><h3>Kazanım ve sağlayıcı</h3><div class="form-grid"><div class="field full"><label class="required" for="recognition-title">Eğitim adı</label><input id="recognition-title" name="title" required value="Veri Görselleştirme Temelleri" /></div><div class="field"><label class="required" for="recognition-provider">Sağlayıcı</label><input id="recognition-provider" name="provider" required value="Örnek Açık Öğrenme Merkezi" /></div><div class="field"><label for="recognition-url">Doğrulama bağlantısı</label><input id="recognition-url" name="url" type="url" value="https://example.invalid/pilot-belge" /></div></div></section><section class="form-section"><h3>Kredi ve karşılaştırma</h3><div class="form-grid"><div class="field"><label for="recognition-ects">Talep edilen AKTS</label><input id="recognition-ects" name="ects" type="number" min="1" max="12" value="2" /></div><div class="field"><label for="recognition-remote">Uzaktan eğitim oranı (%)</label><input id="recognition-remote" name="remoteRate" type="number" min="0" max="100" value="100" /></div><div class="field full"><label for="recognition-course">Karşılaştırılacak kurumsal ders</label><input id="recognition-course" name="comparedCourse" value="İstatistiksel Veri Analizi" /></div></div></section><section class="form-section"><h3>Kanıt üst veri simülasyonu</h3><button class="dropzone" type="button" data-action="mock-upload">${icon("upload")}<strong>Örnek sertifika ve içerik planı</strong><span>Dosya seçimi yalnız görünüm simülasyonudur; dosya içeriği aktarılmaz.</span></button></section><div class="form-actions"><button class="button button--secondary" type="button" data-action="save-draft">Taslağı kaydet</button><button class="button" type="submit">Ön incelemeye gönder ${icon("arrow")}</button></div></form>
      <aside class="grid"><div class="card"><div class="card-header"><div><h2>Pilot ön kontrol özeti</h2><p>Başvurudan sonra deterministik örnek bulgular üretilir.</p></div>${statusBadge("simulated")}</div><div class="card-body"><div class="timeline"><div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>Belge bütünlüğü</strong><span>Sağlayıcı teyidi insan incelemesine açıktır.</span></div></div><div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>İçerik karşılaştırması</strong><span>Benzerlik işareti karar değildir.</span></div></div><div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>AKTS portföy hesabı</strong><span>Toplam kredi ve uzaktan kaynak payı ayrı izlenir.</span></div></div></div></div></div>${notice("warning", "%50 ifadesi basitleştirilmez", "Kaynak, transfer edilen mikro yeterlilik kredilerinin uzaktan kaynaklı bölümüne ilişkindir. Tek eğitimin sunum oranı ile toplam portföy payı ayrı gösterilir.")}</aside>
    </div>
  </div>`;
}

function commissionPage() {
  const selected = state.applications.find((item) => item.id === state.selectedApplicationId);
  const application = (selected?.status === "commission" ? selected : null) || state.applications.find((item) => item.status === "commission") || selected || state.applications[0];
  const tabs = [["summary","Özet"],["evidence","Kanıtlar"],["curriculum","Müfredat eşleme"],["history","Karar geçmişi"]];
  const decisionActions = application.status !== "commission"
    ? notice("success", "Karar kaydı kapalı", "Bu başvuru artık Komisyon gündeminde değildir. Geçmiş ve kanıtlar salt-okunur görüntülenebilir.")
    : state.roleId === "commission"
    ? `<div class="decision-buttons"><button class="button button--success" data-action="decision" data-id="${application.id}" data-status="approved">${icon("check")} Pilot onayını kaydet</button><button class="button button--secondary" data-action="decision" data-id="${application.id}" data-status="revision">Revizyon iste</button><button class="button button--secondary" data-action="decision" data-id="${application.id}" data-status="commission">Çekimser görüş ekle</button><button class="button button--danger" data-action="decision" data-id="${application.id}" data-status="rejected">Gerekçeli pilot ret</button></div>`
    : state.roleId === "coordinator"
      ? `<div class="decision-buttons"><button class="button button--secondary" data-action="decision" data-id="${application.id}" data-status="revision">Eksik kanıt için revizyon iste</button></div>${notice("warning", "Koordinatörlük yetkisi", "Koordinatörlük ön inceleme ve revizyon isteği oluşturabilir; akademik onay veya ret Komisyon demo rolüne aittir.")}`
      : notice("warning", "Salt-okunur karar görünümü", "Sistem yöneticisi akademik karar kaydedemez. Bu rol yalnız pilot yapılandırma ve denetim görünümünü inceler.");
  return `<div class="page-container">${pageHeader("Evre 2 • Akademik karar desteği", "Komisyon karar masası", "Yapay zekâ karar vermez; komisyonun karşılaştırılabilir kanıt, pilot mevzuat ön kontrolleri ve denetim izi üzerinden gerekçeli karar oluşturmasını destekler.")}
    ${notice("warning", "Karar değil, pilot analiz", "Bu çıktı komisyon incelemesini destekleyen karşılaştırılabilir bir pilot analizidir. Nihai akademik karar yetkili kurulundur.")}
    <figure class="editorial-figure editorial-figure--compact"><img src="assets/illustrations/commission-review.webp" alt="Akademik komisyonun belge, müfredat eşlemesi ve öğrenme kanıtlarını birlikte incelediği editoryal illüstrasyon" width="960" height="668" loading="lazy" /><figcaption>İnsan kararı merkezde; teknoloji yalnız karşılaştırılabilir kanıtı düzenler.</figcaption></figure>
    <div class="decision-layout section"><section class="card"><div class="card-header"><div><span class="table-subtitle">${escapeHtml(application.code)}</span><h2>${escapeHtml(application.title)}</h2><p>${escapeHtml(application.applicant)} • ${escapeHtml(application.comparedCourse)}</p></div>${statusBadge(application.status)}</div><div class="card-body"><div class="tabs" role="tablist" aria-label="Komisyon inceleme bölümleri">${tabs.map(([id,label]) => `<button id="commission-tab-${id}" class="tab ${currentCommissionTab === id ? "active" : ""}" role="tab" aria-selected="${currentCommissionTab === id}" aria-controls="commission-tab-panel" tabindex="${currentCommissionTab === id ? "0" : "-1"}" data-action="commission-tab" data-tab="${id}">${label}</button>`).join("")}</div><div id="commission-tab-panel" role="tabpanel" aria-labelledby="commission-tab-${currentCommissionTab}">${commissionTab(application, currentCommissionTab)}</div></div></section>
      <aside class="card sticky-card"><div class="card-header"><div><h2>Gerekçeli görüş</h2><p>Her izinli eylem audit izine eklenir.</p></div></div><div class="card-body">${decisionActions}<div style="margin-top:18px">${notice("warning", "Yetki sınırı", "Analiz motoru hiçbir akademik karar kaydedemez; nihai akademik yetki Komisyon ve yetkili kuruldadır.")}</div></div></aside>
    </div>
  </div>`;
}

function commissionTab(application, tab) {
  if (tab === "evidence") return `<div class="section"><div class="grid grid-2">${["Program bilgi paketi","Öğrenme çıktısı matrisi","Ölçme rubriği","Eğitici yeterlilik kanıtı","İş yükü hesabı","Kalite güvence planı"].map((title,index) => `<article class="card"><div class="card-body"><div class="integration-head"><div><strong>${escapeHtml(title)}</strong><span class="table-subtitle">Sentetik belge metadata • PDF</span></div>${index < application.evidence ? statusBadge("approved","Mevcut") : statusBadge("review","Bekliyor")}</div></div></article>`).join("")}</div></div>`;
  if (tab === "curriculum") return `<div class="section"><h3>Öğrenme çıktısı eşleme matrisi</h3><div class="matrix">${[["Veri kaynağını değerlendirir","Veri güvenilirliği ölçütlerini uygular",82],["Temel görselleştirmeyi yorumlar","Grafik ve tablo yorumlar",64],["Kanıta dayalı kısa analiz üretir","İstatistiksel çıkarım yapar",38]].map(([a,b,value]) => `<div class="matrix-row"><span>${a}<small class="table-subtitle">Önerilen program</small></span><span>${b}<small class="table-subtitle">${escapeHtml(application.comparedCourse)}</small></span><strong>%${value}</strong></div>`).join("")}</div>${notice("warning", "Yorum gerektirir", "Eşleme oranları deterministik pilot örnektir; otomatik onay veya ret üretmez.")}</div>`;
  if (tab === "history") return `<div class="section"><div class="timeline">${state.audit.filter((event) => event.entityId === application.id).map(auditTimeline).join("") || `<p class="page-subtitle">Bu başvuru için kayıtlı olay bulunamadı.</p>`}</div></div>`;
  return `<div class="analysis-band"><div class="band"><span>Pilot müfredat benzerliği</span><strong>%${application.similarity}</strong><span>Karşılaştırılabilirlik işareti</span></div><div class="band is-active"><span>TYÇ öneri uyumu</span><strong>%${application.tycMatch}</strong><span>TYÇ ${application.kind === "internal" ? 6 : 5} • Gerekçeli öneri</span></div><div class="band"><span>Pilot kanıt durumu</span><strong>${application.evidence}/${application.evidence + application.missing}</strong><span>${application.missing ? `${application.missing} eksik` : "Zorunlu metadata tam"}</span></div></div><div class="grid grid-2"><article class="card"><div class="card-body"><h3>AKTS ön kontrolü</h3><div class="progress"><span style="width:${Math.min(100, application.ects / 24 * 100)}%"></span></div><div class="progress-labels"><span>Öneri: ${application.ects} AKTS</span><span>Pilot tavan: 24 AKTS</span></div><p class="table-subtitle">240 AKTS’lik örnek lisans programının %10’u varsayılmıştır; Senato doğrulaması gerekir.</p></div></article><article class="card"><div class="card-body"><h3>Uzaktan kredi portföyü</h3><div class="progress progress--warning"><span style="width:${application.portfolioRemoteShare || 42}%"></span></div><div class="progress-labels"><span>Portföy payı: %${application.portfolioRemoteShare || 42}</span><span>Pilot gösterge: %50</span></div><p class="table-subtitle">Tek programın sunum oranından ayrıdır ve nihai bloklama yapmaz.</p></div></article></div>`;
}

function programsPage() {
  const action = ["instructor","externalInstructor"].includes(state.roleId) ? `<button class="button" data-nav="proposal">${icon("plus")} Yeni program öner</button>` : "";
  return `<div class="page-container">${pageHeader("Program yaşam döngüsü", "Mikro yeterlilik programları", "Taslak, inceleme ve pilot yayımlama durumlarını fakülte, AKTS, yöntem ve öğrenen sayısıyla birlikte izleyin.", action)}<div class="grid grid-3">${state.programs.map(programCard).join("")}</div></div>`;
}

function assessmentPage() {
  const events = [["09.02","Kimlik adımı","Örnek kimlik kontrolü tamamlandı"],["09.18","Sekme değişimi","Pilot olay kaydı • orta önem"],["09.27","Ortam sesi","Simüle ses eşiği işareti"],["09.41","Gönderim","Değerlendirme kuyruğuna alındı"]];
  const session = state.assessmentSessions.find((item)=>item.id==="ASM-DEMO-LIVE") || state.assessmentSessions[0];
  const score = session?.score ?? 84;
  return `<div class="page-container">${pageHeader("Evre 3 • Kanıt ve değerlendirme", "Eğitim ve değerlendirme pilotu", "Gerçek kamera, mikrofon, yüz tanıma veya biyometrik veri işlenmez. Olaylar yalnız senaryolaştırılmış metinsel pilot kayıtlarıdır.", `<button class="button" data-action="assessment-run">${icon("check")} Örnek sınavı başlat</button>`)}
    ${notice("risk", "Gözetim simülasyonu", "Bu ekran akademik geçerlilik veya mevzuata tam uyum iddiası taşımaz. Her işaret insan değerlendirici tarafından incelenir; teknoloji tek başına karar vermez.")}
    <div class="grid grid-3 section"><section class="card"><div class="card-header"><div><h2>Örnek değerlendirme oturumu</h2><p>Proje Temelli Öğrenme Tasarımı • Sentetik katılımcı</p></div>${statusBadge(session?.status || "scheduled")}</div><div class="card-body"><div class="grid grid-3">${kpi("Proje puanı",`${score}/100`,"Rubrik tabanlı pilot puan","check")}${kpi("Güvenilirlik","76/100","İnsan incelemesi gerekli","shield")}${kpi("İşaretli olay",session?.events ?? 2,"Karar değildir","alert")}</div><h3 class="section">Rubrik özeti</h3>${[["Problem tanımı",90],["Kanıt kullanımı",82],["Çözüm tasarımı",80]].map(([label,value]) => `<div style="margin-bottom:13px"><div class="progress-labels"><strong>${label}</strong><span>${value}/100</span></div><div class="progress" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><span style="width:${value}%"></span></div></div>`).join("")}</div></section>
      <section class="card"><div class="card-header"><div><h2>İzin ve kimlik kontrol listesi</h2><p>Tamamı senaryo verisidir.</p></div>${statusBadge("simulated")}</div><div class="card-body"><div class="timeline">${[["Örnek kimlik adımı","Sentetik kullanıcı eşleştirildi"],["Kamera izni","Kapalı — istek yapılmadı"],["Mikrofon izni","Kapalı — istek yapılmadı"],["Veri minimizasyonu","Yalnız metinsel olay etiketi"]].map(([title,body])=>`<div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>${title}</strong><span>${body}</span></div></div>`).join("")}</div></div></section>
      <section class="card"><div class="card-header"><div><h2>Simüle olay günlüğü</h2><p>Görüntü, ses veya biyometrik şablon saklanmaz.</p></div></div><div class="card-body"><div class="timeline">${events.map(([time,title,body]) => `<div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>${title}</strong><span>${time} • ${body}</span></div></div>`).join("")}</div><button class="button button--secondary" data-action="assessment-decision">İnsan değerlendirmesi kaydet</button></div></section>
    </div>
  </div>`;
}

function walletPage() {
  return `<div class="page-container">${pageHeader("Evre 4 • Yapılandırılmış belge", "Dijital yeterlilik cüzdanı", "Pilot belgeler yalnız bu Preview ortamında doğrulanır; gerçek W3C/Open Badges uygunluk testi, kurumsal imza veya dış cüzdan yayını yapılmaz.", `<button class="button button--secondary" data-action="verify-code">${icon("search")} Kodla doğrula</button>`)}
    <figure class="editorial-figure editorial-figure--wide"><img src="assets/illustrations/digital-wallet.webp" alt="Üniversite kaydı, öğrenen dijital cüzdanı ve doğrulayıcı kurum arasındaki güven zinciri illüstrasyonu" width="960" height="668" loading="lazy" /><figcaption>Taşınabilirlik hedefi, iptal farkındalığı ve Preview içi doğrulama birlikte görünür.</figcaption></figure>
    <div class="grid grid-2">${state.credentials.map(credentialCard).join("")}<section class="card"><div class="card-header"><div><h2>Kontrollü paylaşım</h2><p>QR yalnız pilot doğrulama rotasına gider.</p></div></div><div class="card-body donut-row">${qrMarkup()}<div><h3>Doğrulanabilir görünüm</h3><p class="page-subtitle">Belge kodu, sağlayan kurum, öğrenme çıktıları, AKTS, TYÇ önerisi, düzenlenme tarihi ve pilot durumu gösterilir.</p><button class="button button--secondary button--sm" data-action="open-credential" data-code="${state.credentials[0]?.code || ""}">Doğrulama sayfasını aç</button></div></div></section></div>
    <div class="section">${notice("warning", "EK-1 alanları kurumsal teyide açık", "Kaynaklar asgari alan yapısından söz eder ancak tüm alanları tek tek doğrulamamaktadır. Bu pilot şema resmî alan seti olarak sunulmaz.")}</div>
  </div>`;
}

function credentialCard(item) {
  return `<article class="credential"><div class="credential-top"><img src="assets/brand/kdpu-logo-web.png" alt="Kütahya Dumlupınar Üniversitesi" />${statusBadge(item.status)}</div><h3>${escapeHtml(item.title)}</h3><span class="credential-code">${escapeHtml(item.code)}</span><div class="credential-grid"><div class="credential-field"><span>Öğrenen</span><strong>${escapeHtml(item.owner)}</strong></div><div class="credential-field"><span>Pilot AKTS</span><strong>${item.ects}</strong></div><div class="credential-field"><span>TYÇ önerisi</span><strong>Düzey ${item.level}</strong></div><div class="credential-field"><span>Düzenleme</span><strong>${formatDate(item.issuedAt)}</strong></div><div class="credential-field"><span>İmzalama</span><strong>Simülasyon</strong></div><div class="credential-field"><span>Doğrulama</span><strong>Preview içi</strong></div></div></article>`;
}

function qrMarkup() {
  const pattern = "111111101010101111111100000101110101000001101110101010101011101101110101110101011101101110101010101011101100000101010101000001111111101010101111111";
  return `<div class="qr" role="img" aria-label="Pilot doğrulama kodunu temsil eden dekoratif QR simülasyonu">${[...pattern].slice(0,81).map((value) => `<i class="${value === "1" ? "on" : ""}"></i>`).join("")}</div>`;
}

function integrationsPage() {
  return `<div class="page-container">${pageHeader("Evre 5 • Kontrollü servis katmanı", "Entegrasyon merkezi", "Bütün bağlantılar simülasyon veya bağlı değil durumundadır. Dry-run, onay kapısı, hata, yeniden deneme ve mutabakat kayıtları gerçek API çağrısı olmadan örneklenir.", `<button class="button button--secondary" data-action="integration-dryrun">${icon("refresh")} Toplu dry-run</button>`)}
    ${notice("success", "Canlı servis çağrısı kapalı", "Tarayıcı izin politikası kamera, mikrofon, konum ve ödeme özelliklerini devre dışı bırakır; bu pilot gerçek kurumsal uç noktalara istek göndermez.")}
    <figure class="editorial-figure editorial-figure--wide"><img src="assets/illustrations/integration-gates.webp" alt="Akademik kaydı doğrudan veri tabanı erişiminden koruyan rol, onay ve servis kapıları illüstrasyonu" width="1400" height="788" loading="lazy" /><figcaption>Servisler aşamalı ve bağlı değil; her geçiş rol, onay, audit ve geri alma kontrolüne tabidir.</figcaption></figure>
    <div class="grid grid-3 section">${state.integrations.map(integrationCard).join("")}</div>
    ${state.integrationJobs.length ? `<section class="card section"><div class="card-header"><div><h2>Simülasyon iş günlüğü</h2><p>Başarı ve hata senaryoları; tüm kayıtlarda gerçek veri aktarımı kapalıdır.</p></div></div><div class="table-wrap"><table><caption class="sr-only">Entegrasyon simülasyon iş kayıtları</caption><thead><tr><th scope="col">Hedef</th><th scope="col">Durum</th><th scope="col">Başvuru</th><th scope="col">Gerçek veri</th><th scope="col">Zaman</th></tr></thead><tbody>${state.integrationJobs.map((job)=>`<tr><td>${escapeHtml(job.target)}</td><td>${statusBadge(job.status === "simulation_failed" ? "failed" : "simulated", job.status === "simulation_failed" ? "Simüle hata" : "Simüle başarı")}</td><td>${escapeHtml(job.applicationId || "—")}</td><td><strong>Gönderilmedi</strong><span class="table-subtitle">realDataSent=false</span></td><td>${formatDate(job.at,true)}</td></tr>`).join("")}</tbody></table></div></section>` : ""}
  </div>`;
}

function integrationCard(item) {
  return `<article class="card integration-card"><div class="card-body"><div class="integration-head"><span class="integration-mark">${escapeHtml(item.name.split(" ")[0].slice(0,5))}</span>${statusBadge(item.status)}</div><h3 style="margin:15px 0 2px">${escapeHtml(item.name)}</h3><span class="table-subtitle">Gerçek veri gönderilmez</span><dl><dt>Sahip</dt><dd>${escapeHtml(item.owner)}</dd><dt>Aşama</dt><dd>${item.stage}/5 kontrollü kapı</dd><dt>Deneme</dt><dd>${item.attempts || 0}</dd><dt>Son test</dt><dd>${escapeHtml(item.lastTest)}</dd></dl></div><div class="card-footer"><span class="status status--neutral">Simülasyon</span><button class="button button--secondary button--sm" data-action="open-integration" data-id="${item.id}">Ayrıntı</button></div></article>`;
}

function financePage() {
  const gross = state.finance.entitlements[0].gross;
  const withholding = gross * state.finance.parameters.withholding / 100;
  return `<div class="page-container">${pageHeader("Evre 6 • Mali izlenebilirlik", "Finansal yönetim ve döner sermaye pilotu", "Tahsilat, fatura ve eğitici hak edişleri yalnız sentetik kayıtlarla örneklenir. Oranlar yapılandırılabilir pilot parametreleridir.", `<button class="button" data-action="finance-simulate">${icon("coins")} Tahsilatı simüle et</button>`)}
    ${notice("warning", "Pilot parametre — mali birim doğrulaması gerekir", "Vergi, kesinti ve ödeme kuralları kesin mevzuat veya canlı hesaplama olarak kodlanmamıştır; aşağıdaki değerler yalnız ekran davranışını örnekler.")}
    <div class="grid grid-4 section">${kpi("Simüle brüt tahsilat", formatCurrency(state.finance.transactions.reduce((sum,item)=>sum+item.gross,0)), "Gerçek ödeme alınmadı", "coins")}${kpi("Eşleşen kayıt", state.finance.transactions.filter((item)=>item.status==="matched").length, "Pilot mutabakat", "check")}${kpi("Hak ediş taslağı", formatCurrency(gross), "Mali onay gerekli", "file")}${kpi("Örnek kesinti", formatCurrency(withholding), `%${state.finance.parameters.withholding} pilot parametre`, "chart")}</div>
    <div class="grid grid-2 section"><section><div class="section-heading"><div><h2>Tahsilat simülasyonları</h2></div></div><div class="table-wrap"><table><caption class="sr-only">Sentetik tahsilat kayıtları</caption><thead><tr><th scope="col">Kayıt</th><th scope="col">Program</th><th scope="col">Tutar</th><th scope="col">Kanal</th><th scope="col">Durum</th></tr></thead><tbody>${state.finance.transactions.map((item)=>`<tr><td><span class="table-title">${item.id}</span><span class="table-subtitle">${escapeHtml(item.learner)}</span></td><td>${escapeHtml(item.program)}</td><td>${formatCurrency(item.gross)}</td><td>${escapeHtml(item.channel)}</td><td>${statusBadge(item.status)}</td></tr>`).join("")}</tbody></table></div></section><section class="card"><div class="card-header"><div><h2>Hak ediş taslağı</h2><p>${escapeHtml(state.finance.entitlements[0].instructor)}</p></div>${statusBadge("draft")}</div><div class="card-body"><dl class="integration-card" style="min-height:0"><div class="integration-head"><dt>Ders kanıtı</dt><dd>${state.finance.entitlements[0].evidence}</dd></div><div class="integration-head"><dt>Brüt taslak</dt><dd>${formatCurrency(gross)}</dd></div><div class="integration-head"><dt>Örnek kesinti</dt><dd>−${formatCurrency(withholding)}</dd></div><div class="integration-head"><dt>Net ön izleme</dt><dd><strong>${formatCurrency(gross-withholding)}</strong></dd></div></dl><button class="button button--secondary" data-action="finance-draft">Fatura / bordro taslağı oluştur</button><p class="table-subtitle">${state.finance.invoiceDrafts?.length || 0} sentetik taslak kayıtlı</p></div></section></div>
    <section class="card section"><div class="card-header"><div><h2>Yapılandırılabilir mali pilot parametreleri</h2><p>Değişiklikler yalnız yerel demo durumunu etkiler; mali onay değildir.</p></div></div><form class="card-body form-grid" id="finance-parameters"><div class="field"><label for="finance-withholding">Örnek kesinti (%)</label><input id="finance-withholding" name="withholding" type="number" min="0" max="100" step="0.01" value="${state.finance.parameters.withholding}" /></div><div class="field"><label for="finance-vat">Örnek KDV alanı (%)</label><input id="finance-vat" name="vat" type="number" min="0" max="100" step="0.01" value="${state.finance.parameters.vat}" /></div><div class="field"><label for="finance-stamp">Örnek damga alanı (%)</label><input id="finance-stamp" name="stamp" type="number" min="0" max="100" step="0.001" value="${state.finance.parameters.stamp}" /></div><div class="field"><span class="table-subtitle">Pilot parametre — mali birim doğrulaması gerekir</span><button class="button" type="submit">Parametre taslağını kaydet</button></div></form></section>
  </div>`;
}

function reportsPage() {
  const counts = ["review","commission","revision","approved"].map((status)=>state.applications.filter((item)=>item.status===status).length);
  const activePercent = state.applications.length ? Math.round((counts[0] + counts[1]) / state.applications.length * 100) : 0;
  const units = [...new Set(state.programs.map((item)=>item.unit))].map((unit)=>[unit.replace(" Fakültesi", "").replace("Lisansüstü Eğitim Enstitüsü", "Enstitü"), state.programs.filter((item)=>item.unit===unit).length]);
  const maxUnit = Math.max(1, ...units.map(([,value])=>value));
  return `<div class="page-container">${pageHeader("Yönetim görünümü", "Pilot performans ve risk göstergeleri", "Grafikler gerçek HTML/CSS bileşenleridir; hedef, varsayım ve ölçümler üretim KPI’ı veya hukuki uyum kanıtı değildir.", `<button class="button button--secondary" data-action="export-report">${icon("file")} Pilot rapor özeti</button>`)}
    <div class="grid grid-4">${kpi("Toplam başvuru",state.applications.length,"Sentetik pilot kayıt","file")}${kpi("Ort. geçen süre","12 gün","30 günlük pilot gösterge","clock")}${kpi("Aktif program",state.programs.filter((item)=>item.status==="active").length,"Katalog simülasyonu","book")}${kpi("Bağlı canlı servis","0","Tüm entegrasyonlar kapalı","network")}</div>
    <div class="grid grid-2 section"><section class="card chart-wrap"><div class="card-header"><div><h2>Başvuru durumu</h2><p>Durum dağılımının erişilebilir metin özeti</p></div></div><div class="card-body donut-row"><div class="donut" role="img" aria-label="Başvuruların yüzde ${activePercent} kadarı aktif incelemede" style="--value:${activePercent}"><strong>%${activePercent}</strong></div><div class="chart-legend">${[["Aktif inceleme",counts[0]+counts[1],"#352b82"],["Revizyon",counts[2],"#b58a43"],["Pilot onay",counts[3],"#167a5b"]].map(([label,value,color])=>`<div class="legend-item"><span><i style="background:${color}"></i>${label}</span><strong>${value}</strong></div>`).join("")}</div></div></section><section class="card chart-wrap"><div class="card-header"><div><h2>Birim bazlı örnek programlar</h2><p>Toplam ${state.programs.length} sentetik program</p></div></div><div class="card-body"><div class="bar-chart" role="img" aria-label="Birim bazlı program sayıları">${units.map(([label,value])=>`<div class="bar" style="--h:${Math.max(22,Math.round(value/maxUnit*88))}%"><strong>${value}</strong><span>${escapeHtml(label)}</span></div>`).join("")}</div></div></section></div>
    <div class="grid grid-2 section"><section class="card"><div class="card-header"><div><h2>Kritik başarı ölçütleri</h2><p>Teknolojiden önce kurumsal karar netliği</p></div></div><div class="card-body"><div class="timeline">${[["Akademik yetki eşlemesi","Rol ve onay sahibi görünür"],["Mahremiyet sınırı","Gerçek kişisel veri yok"],["Entegrasyon hatası","Kontrollü dry-run ve mutabakat"],["Sürdürülebilirlik","Pilot sonrası kaynak kararı"]].map(([a,b])=>`<div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>${a}</strong><span>${b}</span></div></div>`).join("")}</div></div></section><section class="card"><div class="card-header"><div><h2>Pilot kapsamı</h2><p>Önerilen sınırlı doğrulama çerçevesi</p></div></div><div class="card-body"><ul class="page-subtitle"><li>1–2 örnek program ve sınırlı sentetik öğrenen</li><li>Başvuru, karar, belge ve aktarım simülasyonu</li><li>Gerçek ödeme, kimlik, biyometri veya dış servis yok</li><li>Komisyon kararı ve kullanıcı geri bildirimiyle değerlendirme</li></ul></div></section></div>
  </div>`;
}

function auditPage() {
  return `<div class="page-container">${pageHeader("İzlenebilirlik", "Pilot denetim izi", "Her kayıt için aktör, rol, önceki/sonraki durum, gerekçe ve zaman damgası tutulur. Bu görünüm 5651 nitelikli değiştirilemez log iddiası taşımaz.", `<button class="button button--secondary" data-action="export-audit">${icon("file")} Sentetik kayıt özeti</button>`)}<div class="table-wrap"><table><thead><tr><th>Zaman</th><th>Varlık</th><th>Aktör / Rol</th><th>Olay</th><th>Durum geçişi</th><th>Gerekçe</th></tr></thead><tbody>${state.audit.map((event)=>`<tr><td>${formatDate(event.at,true)}</td><td><span class="table-title">${escapeHtml(event.entityId)}</span><span class="table-subtitle">${escapeHtml(event.id)}</span></td><td>${escapeHtml(event.actor)}<span class="table-subtitle">${escapeHtml(event.actorRole)}</span></td><td>${escapeHtml(event.action)}</td><td>${escapeHtml(event.from)} → ${escapeHtml(event.to)}</td><td>${escapeHtml(event.reason)}</td></tr>`).join("")}</tbody></table></div></div>`;
}

function notificationsPage() {
  return `<div class="page-container">${pageHeader("Uygulama içi iletişim", "Bildirimler", "Gerçek SMS veya e-posta gönderilmez. Bütün bildirimler tarayıcıdaki sentetik pilot veri katmanında tutulur.", `<button class="button button--secondary" data-action="mark-notifications">Tümünü okundu işaretle</button>`)}<div class="grid">${state.notifications.map((item)=>`<article class="card"><div class="card-body"><div class="integration-head"><div><h3>${escapeHtml(item.title)}</h3><p class="page-subtitle">${escapeHtml(item.body)}</p><span class="table-subtitle">${escapeHtml(item.time)}</span></div>${item.read ? statusBadge("neutral","Okundu") : statusBadge("review","Yeni")}</div></div></article>`).join("")}</div></div>`;
}

function verifyPage(code) {
  const credential = state.credentials.find((item)=>item.code===code);
  if (!credential) return `<div class="page-container">${pageHeader("Pilot doğrulama", "Doğrulama kaydı bulunamadı", "Bu kodla eşleşen sentetik pilot yeterlilik yoktur.")}<div class="card empty-state"><div class="empty-icon">${icon("search")}</div><h3>Kod eşleşmedi</h3><p>Kodu yeniden girin veya dijital yeterlilik cüzdanına dönün.</p><button class="button" data-action="verify-code">Kodu yeniden gir</button></div></div>`;
  return `<div class="page-container">${pageHeader("Pilot doğrulama", "Dijital yeterlilik doğrulandı", "Bu sonuç yalnızca kontrollü Preview ortamındaki sentetik kayda dayanır; üretim imzası veya dış cüzdan uygunluğu değildir.", `<button class="button button--secondary" data-nav="wallet">Cüzdana dön</button>`)}${notice("success","Pilot kayıt eşleşti",`${credential.code} kodlu sentetik yeterlilik bu pilot veri katmanında geçerli görünüyor.`)}<div class="grid grid-2 section">${credentialCard(credential)}<section class="card"><div class="card-header"><div><h2>Yapılandırılmış alanlar</h2><p>Kurumsal doğrulamaya açık pilot görünüm</p></div>${statusBadge("valid")}</div><div class="card-body"><dl class="integration-card" style="min-height:0"><div class="integration-head"><dt>Sağlayan kurum</dt><dd>${escapeHtml(credential.issuer)}</dd></div><div class="integration-head"><dt>Öğrenen</dt><dd>${escapeHtml(credential.owner)}</dd></div><div class="integration-head"><dt>Pilot AKTS</dt><dd>${credential.ects}</dd></div><div class="integration-head"><dt>TYÇ düzeyi</dt><dd>${credential.level} • Öneri</dd></div><div class="integration-head"><dt>İmzalama modu</dt><dd>Simülasyon</dd></div><div class="integration-head"><dt>Dış paylaşım</dt><dd>Kapalı</dd></div></dl><h3>Öğrenme çıktıları</h3><ul class="page-subtitle">${credential.outcomes.map((outcome)=>`<li>${escapeHtml(outcome)}</li>`).join("")}</ul></div></section></div></div>`;
}

function auditTimeline(event) {
  return `<div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>${escapeHtml(event.action)}</strong><span>${formatDate(event.at,true)} • ${escapeHtml(event.actor)} • ${escapeHtml(event.reason)}</span></div></div>`;
}

const pages = {
  home: homePage,
  overview: overviewPage,
  scenarios: scenariosPage,
  catalog: catalogPage,
  learning: learningPage,
  proposal: proposalPage,
  applications: applicationsPage,
  recognition: recognitionPage,
  commission: commissionPage,
  programs: programsPage,
  assessment: assessmentPage,
  wallet: walletPage,
  integrations: integrationsPage,
  finance: financePage,
  reports: reportsPage,
  audit: auditPage,
  notifications: notificationsPage,
  verify: verifyPage
};

function showPilotInfo() {
  openModal(modalTemplate("Kontrollü pilot kapsamı", `<div class="notice notice--success">${icon("shield")}<div><strong>Production NO-GO</strong>Bu ortam gerçek kurumsal sistemlere veya kişisel verilere bağlı değildir.</div></div><div class="grid grid-2 section"><div><h3>Kapsam içinde</h3><ul class="page-subtitle"><li>Sentetik başvuru ve komisyon akışı</li><li>Pilot karşılaştırma analizleri</li><li>Yerel kalıcı durum ve Supabase salt-okunur seed</li><li>Belge ve entegrasyon simülasyonları</li></ul></div><div><h3>Kapsam dışında</h3><ul class="page-subtitle"><li>ÖBİS, YÖKSİS, e-Devlet, GİB, MYS/MAYS</li><li>Gerçek kimlik, ödeme, kamera ve mikrofon</li><li>Kurumsal imza ve dış cüzdan yayını</li><li>Production domain veya production branch</li></ul></div></div><p class="page-subtitle">Kaynak dosyalardaki kesin uyum, risk sıfırlama ve otomatik karar iddiaları arayüze taşınmamıştır; bütün oranlar ve eşikler kurumsal doğrulamaya açık pilot parametreleridir.</p>`, `<button class="button" data-action="close-modal">Anladım</button>`));
}

function showDataMode() {
  const config = getSupabasePublicConfig();
  const snapshot = state.remoteSnapshot;
  openModal(modalTemplate("Pilot veri katmanı", `<div class="grid grid-2"><article class="card"><div class="card-body"><h3>Etkin çalışma modu</h3><p class="page-subtitle">${escapeHtml(state.dataMode)}</p><span class="status status--success">Yerel mutasyonlar çalışıyor</span></div></article><article class="card"><div class="card-body"><h3>Supabase başlangıç görünümü</h3><p class="page-subtitle">Proje: ${config.projectRef}<br />${config.mode}${snapshot ? `<br />Doğrulanan: ${snapshot.programs} program, ${snapshot.applications} başvuru, ${snapshot.credentials} belge, ${snapshot.integrations} entegrasyon` : "<br />Son bağlantı doğrulanamadı"}</p><span class="status status--neutral">Gizli anahtar kullanılmıyor</span></div></article></div><div class="section">${notice("success","Katmanların sınırı açık","Supabase yalnız sentetik başlangıç satırlarını salt-okunur doğrular. Formlar ve iki demo iş akışındaki değişiklikler tarayıcıdaki sürümlü, izole çalışma alanında kalır.")}</div>`, `<button class="button button--secondary" data-action="refresh-data">Bağlantıyı yeniden dene</button><button class="button" data-action="close-modal">Kapat</button>`));
}

function openProgram(id) {
  const program = state.programs.find((item)=>item.id===id);
  if (!program) return;
  const applyAction = state.roleId === "learner" ? `<button class="button" data-action="apply-program" data-id="${program.id}">Programa pilot kayıt oluştur</button>` : "";
  openModal(modalTemplate(program.title, `<div class="program-meta"><span class="meta-pill">${program.code}</span><span class="meta-pill">${program.ects} AKTS</span><span class="meta-pill">${program.workload} saat</span><span class="meta-pill">TYÇ ${program.level} önerisi</span></div><p class="page-subtitle">${escapeHtml(program.summary)}</p><div class="section"><h3>Öğrenme çıktıları</h3><ul class="page-subtitle">${program.outcomes.map((item)=>`<li>${escapeHtml(item)}</li>`).join("")}</ul></div>${notice("warning","Pilot program", "Bu program gerçek kayıt veya ödeme kabul etmez; durum yalnızca demo akışını örnekler.")}`, `<button class="button button--secondary" data-action="close-modal">Kapat</button>${applyAction}`));
}

function openApplication(id) {
  const item = state.applications.find((application)=>application.id===id);
  if (!item) return;
  state.selectedApplicationId = item.id;
  saveState();
  openModal(modalTemplate(`${item.code} • Başvuru ayrıntısı`, `<div class="grid grid-2"><article class="card"><div class="card-body"><span class="table-subtitle">Başvuru</span><h3>${escapeHtml(item.title)}</h3><p class="page-subtitle">${escapeHtml(item.applicant)} • ${item.kind === "external" ? "Dış kazanım" : "Program önerisi"}</p>${statusBadge(item.status)}</div></article><article class="card"><div class="card-body"><span class="table-subtitle">30 günlük pilot gösterge</span><h3>${item.elapsedDays}/30 gün</h3><div class="progress"><span style="width:${Math.round(item.elapsedDays/30*100)}%"></span></div><span class="table-subtitle">Hedef: ${formatDate(item.targetAt)}</span></div></article></div><div class="analysis-band"><div class="band"><span>Müfredat benzerliği</span><strong>%${item.similarity}</strong><span>Karar değildir</span></div><div class="band"><span>TYÇ önerisi</span><strong>%${item.tycMatch}</strong><span>Gerekçeli pilot skor</span></div><div class="band"><span>Kanıt</span><strong>${item.evidence}</strong><span>${item.missing} eksik</span></div></div>${notice("warning","İnsan incelemesi gerekir",item.notes)}`, `<button class="button button--secondary" data-action="close-modal">Kapat</button>${["coordinator","commission","admin"].includes(state.roleId) ? `<button class="button" data-action="go-commission">Karar masasında aç</button>` : ""}`));
}

function decisionModal(id, nextStatus) {
  const item = state.applications.find((application)=>application.id===id);
  const labels = { approved: "Pilot onayı", revision: "Revizyon isteği", rejected: "Pilot ret", commission: "Çekimser görüş" };
  openModal(modalTemplate(`${labels[nextStatus]} kaydı`, `<form id="decision-form"><input type="hidden" name="id" value="${item.id}" /><input type="hidden" name="status" value="${nextStatus}" /><div class="field"><label class="required" for="decision-reason">Gerekçe</label><textarea id="decision-reason" name="reason" required minlength="12" placeholder="Kanıtları, akademik değerlendirmeyi ve karar gerekçesini yazın"></textarea><small>Gerekçe audit izine eklenir ve sonradan görünür kalır.</small></div><div class="field" style="margin-top:14px"><label><input type="checkbox" name="confirm" required /> Bu kaydın yalnız kontrollü pilot kararı olduğunu onaylıyorum.</label></div></form>`, `<button class="button button--secondary" data-action="close-modal">Vazgeç</button><button class="button ${nextStatus === "rejected" ? "button--danger" : nextStatus === "approved" ? "button--success" : ""}" data-action="submit-decision">Gerekçeli kaydı oluştur</button>`));
}

function openIntegration(id) {
  const item = state.integrations.find((integration)=>integration.id===id);
  const lastResult = item.status === "failed" ? `,\n  "error": "SIMULATED_TIMEOUT",\n  "retryAvailable": true` : "";
  openModal(modalTemplate(`${item.name} • Entegrasyon taslağı`, `${notice("warning","Bağlı değil — gerçek veri gönderilmez","Aşağıdaki istek ve yanıt yalnız redakte edilmiş sentetik veri paketi simülasyonudur.")}<div class="grid grid-2 section"><article class="card"><div class="card-body"><h3>Onay kapısı</h3><ul class="page-subtitle"><li>Yetkili rol kontrolü</li><li>Kurumsal servis erişimi</li><li>Redakte veri paketi doğrulaması</li><li>Denetim izi ve geri alma/mutabakat planı</li></ul></div></article><article class="card"><div class="card-body"><h3>Örnek deneme sonucu</h3><pre style="white-space:pre-wrap;font-size:10px;color:#3a4658">{\n  "mode": "simulation",\n  "target": "${item.id}",\n  "attempt": ${item.attempts || 0},\n  "realDataSent": false${lastResult}\n}</pre></div></article></div>`, `<button class="button button--secondary" data-action="close-modal">Kapat</button><button class="button" data-action="simulate-integration" data-id="${item.id}">${item.status === "failed" ? "Yeniden dene" : "Deneme çalıştırması"}</button>`));
}

function verifyCodeModal() {
  openModal(modalTemplate("Pilot belge koduyla doğrula", `<form id="verify-form"><div class="field"><label for="verify-input">Pilot yeterlilik kodu</label><input id="verify-input" name="code" value="MY-BEL-2026-0007" required /></div></form>`, `<button class="button button--secondary" data-action="close-modal">Vazgeç</button><button class="button" data-action="submit-verify">Doğrula</button>`));
}

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-nav]");
  if (nav) { navigate(nav.dataset.nav); return; }
  const trigger = event.target.closest("[data-action]");
  if (!trigger) return;
  const { action } = trigger.dataset;
  if (action === "toggle-nav") { const open = document.body.classList.toggle("nav-open"); trigger.setAttribute("aria-expanded", String(open)); trigger.setAttribute("aria-label", open ? "Menüyü kapat" : "Menüyü aç"); }
  if (action === "close-nav") { document.body.classList.remove("nav-open"); document.querySelector("[data-action='toggle-nav']")?.setAttribute("aria-expanded", "false"); }
  if (action === "close-modal") closeModal();
  if (action === "pilot-info") showPilotInfo();
  if (action === "data-mode") showDataMode();
  if (action === "demo-login") { state.roleId = "learner"; saveState(); navigate("overview"); toast("Öğrenen demo rolüyle giriş yapıldı."); }
  if (action === "reset-demo") { state = structuredClone(initialState); saveState(); render(); toast("Sentetik pilot verisi başlangıç durumuna döndürüldü."); }
  if (action === "run-scenario") runNextScenario(trigger.dataset.kind);
  if (action === "open-scenario-result") {
    state.roleId = trigger.dataset.kind === "internal" ? "learner" : "it";
    saveState();
    navigate(trigger.dataset.kind === "internal" ? "wallet" : "integrations");
  }
  if (action === "open-program") openProgram(trigger.dataset.id);
  if (action === "open-application") openApplication(trigger.dataset.id);
  if (action === "go-commission") { closeModal(); navigate("commission"); }
  if (action === "decision") decisionModal(trigger.dataset.id, trigger.dataset.status);
  if (action === "commission-tab") { currentCommissionTab = trigger.dataset.tab; render(); setTimeout(()=>document.querySelector(`#commission-tab-${currentCommissionTab}`)?.focus(),0); }
  if (action === "submit-decision") document.querySelector("#decision-form")?.requestSubmit();
  if (action === "save-draft") {
    const form = trigger.closest("form");
    if (form?.id === "proposal-form") saveProposalDraft(form);
    if (form?.id === "recognition-form") saveRecognitionDraft(form);
  }
  if (action === "preview-proposal") previewProposal(trigger.closest("form"));
  if (action === "mock-upload") toast("Sentetik dosya üst verisi eklendi; dosya içeriği aktarılmadı.");
  if (action === "open-integration") openIntegration(trigger.dataset.id);
  if (action === "simulate-integration") simulateIntegration(trigger.dataset.id);
  if (action === "integration-dryrun") simulateAllIntegrations();
  if (action === "finance-simulate") simulateFinance();
  if (action === "finance-draft") createFinanceDraft();
  if (action === "assessment-run") runAssessment();
  if (action === "assessment-decision") decideAssessment();
  if (action === "verify-code") verifyCodeModal();
  if (action === "open-credential") navigate("verify", trigger.dataset.code);
  if (action === "submit-verify") submitVerify();
  if (action === "mark-notifications") { state.notifications.forEach((item)=>item.read=true); saveState(); render(); toast("Tüm uygulama içi bildirimler okundu."); }
  if (["export-report","export-audit"].includes(action)) toast("Sentetik pilot rapor özeti hazırlandı; bu demo gerçek veri dışa aktarmaz.");
  if (action === "apply-program") enrollProgram(trigger.dataset.id);
  if (action === "refresh-data") refreshRemote(true);
  if (action === "clear-catalog") { document.querySelector("#catalog-search").value=""; document.querySelector("#catalog-level").value=""; filterCatalog(); }
});

document.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.target.id === "proposal-form") submitProposal(event.target);
  if (event.target.id === "recognition-form") submitRecognition(event.target);
  if (event.target.id === "decision-form") submitDecision(event.target);
  if (event.target.id === "verify-form") submitVerify();
  if (event.target.id === "finance-parameters") saveFinanceParameters(event.target);
});

document.addEventListener("input", (event) => {
  if (event.target.id === "proposal-ects") document.querySelector("#proposal-workload").value = Number(event.target.value || 0) * 25;
  if (["catalog-search","catalog-level"].includes(event.target.id)) filterCatalog();
  if (["application-search","application-status"].includes(event.target.id)) filterApplications();
});

roleSelect.addEventListener("change", () => {
  state.roleId = roleSelect.value;
  saveState();
  navigate("overview");
  toast(`${currentRole().label} demo görünümüne geçildi.`);
});

modalBackdrop.addEventListener("click", (event) => { if (event.target === modalBackdrop) closeModal(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalBackdrop.hidden) { closeModal(); return; }
  if (event.key === "Tab" && !modalBackdrop.hidden) {
    const focusable = [...modal.querySelectorAll("button, input, select, textarea, a[href], [tabindex]:not([tabindex='-1'])")].filter((element)=>!element.disabled);
    if (!focusable.length) return;
    const first = focusable[0]; const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
window.addEventListener("hashchange", render);

function runNextScenario(kind) {
  try {
    const result = runScenarioStep(state, kind);
    if (result.role !== "system") state.roleId = result.role;
    saveState();
    render();
    toast(result.completed ? "Uçtan uca pilot senaryo tamamlandı." : `${result.label} — pilot durumu güncellendi.`);
  } catch (error) {
    toast(error.message, "error");
  }
}

function previewProposal(form) {
  if (!form) return;
  const data = new FormData(form);
  openModal(modalTemplate("Program önerisi ön izlemesi", `<div class="program-meta"><span class="meta-pill">${escapeHtml(data.get("ects") || "—")} AKTS • Pilot</span><span class="meta-pill">TYÇ ${escapeHtml(data.get("level") || "—")} önerisi</span><span class="meta-pill">%${escapeHtml(data.get("remoteRate") || "0")} uzaktan sunum</span></div><h3>${escapeHtml(data.get("title") || "Başlıksız taslak")}</h3><p class="page-subtitle">${escapeHtml(data.get("summary") || "Program özeti henüz girilmedi.")}</p><div class="grid grid-2 section"><div><strong>Hedef kitle</strong><p class="page-subtitle">${escapeHtml(data.get("audience") || "—")}</p></div><div><strong>Eğitici yeterliliği</strong><p class="page-subtitle">${escapeHtml(data.get("qualifications") || "—")}</p></div><div><strong>Kalite güvence kanıtı</strong><p class="page-subtitle">${escapeHtml(data.get("quality") || "—")}</p></div><div><strong>Ücret modu</strong><p class="page-subtitle">${escapeHtml(data.get("feeMode") || "Ücretsiz")} • ${escapeHtml(data.get("fee") || "0")} TL pilot taslak</p></div></div>${notice("warning","Ön izleme — karar değildir","Bu görünüm yalnız form alanlarını denetlemek içindir; Komisyona gönderim veya kurumsal onay oluşturmaz.")}`, `<button class="button" data-action="close-modal">Düzenlemeye dön</button>`));
}

function saveProposalDraft(form) {
  if (!form) return;
  const data = new FormData(form);
  const title = String(data.get("title") || "Başlıksız program taslağı");
  const application = createApplication(state, { kind: "internal", status: "draft", title, applicant: currentRole().name, ects: data.get("ects") || 1, remoteRate: data.get("remoteRate") || 0, evidence: data.get("evidence") || 0, comparedCourse: "Kurumsal Bologna kataloğu" });
  application.formData = Object.fromEntries(data.entries());
  saveState();
  toast(`${application.code} taslağı tarayıcıdaki izole pilot çalışma alanına kaydedildi.`);
}

function saveRecognitionDraft(form) {
  if (!form) return;
  const data = new FormData(form);
  const application = createApplication(state, { kind: "external", status: "draft", title: data.get("title") || "Başlıksız dış kazanım taslağı", applicant: currentRole().name, provider: data.get("provider"), ects: data.get("ects") || 1, remoteRate: data.get("remoteRate") || 0, evidence: 1, comparedCourse: data.get("comparedCourse") });
  saveState();
  toast(`${application.code} dış kazanım taslağı kaydedildi.`);
}

function enrollProgram(id) {
  const program = state.programs.find((item)=>item.id===id);
  if (!program) return;
  const enrollmentId = `ENR-${program.code}`;
  if (!state.enrollments.some((item)=>item.id===enrollmentId)) {
    state.enrollments.unshift({ id:enrollmentId, programCode:program.code, title:program.title, learner:"Derya Örnek", status:"active", progress:10, ects:program.ects, remoteEcts:Number((program.ects * program.remoteRate / 100).toFixed(1)) });
    state.audit.unshift({ id:`AUD-${Date.now()}`, entityId:enrollmentId, at:new Date().toISOString(), actor:"Derya Örnek", actorRole:"learner", action:"Programa pilot kayıt oluşturuldu", from:"applied", to:"active", reason:"Gerçek kayıt veya ödeme oluşturulmadı" });
  }
  saveState(); closeModal(); navigate("learning"); toast(`${program.title} için pilot kayıt oluşturuldu.`);
}

function runAssessment() {
  const existing = state.assessmentSessions.find((item)=>item.id==="ASM-DEMO-LIVE");
  if (existing && existing.status === "active") { toast("Örnek değerlendirme zaten devam ediyor.", "error"); return; }
  const session = existing || { id:"ASM-DEMO-LIVE", enrollmentId:state.enrollments[0]?.id || "ENR-DEMO", title:"Kimlik ve değerlendirme oturumu", status:"active", score:null, evaluatorDecision:null, events:2 };
  if (!existing) state.assessmentSessions.unshift(session); else Object.assign(existing, session, { status:"active", score:null, evaluatorDecision:null });
  state.audit.unshift({ id:`AUD-${Date.now()}`, entityId:session.id, at:new Date().toISOString(), actor:currentRole().name, actorRole:state.roleId, action:"Örnek değerlendirme başlatıldı", from:"scheduled", to:"active", reason:"Kamera ve mikrofon izinleri kapalı; olaylar yalnız metinsel simülasyon" });
  saveState(); render(); toast("Örnek değerlendirme başlatıldı; kamera ve mikrofon erişimi kapalıdır.");
}

function decideAssessment() {
  const session = state.assessmentSessions.find((item)=>item.id==="ASM-DEMO-LIVE") || state.assessmentSessions[0];
  if (!session) { toast("İncelenecek pilot değerlendirme bulunamadı.", "error"); return; }
  session.status = "completed"; session.score = session.score || 82; session.evaluatorDecision = "Başarılı • İnsan değerlendirici";
  state.audit.unshift({ id:`AUD-${Date.now()}`, entityId:session.id, at:new Date().toISOString(), actor:currentRole().name, actorRole:state.roleId, action:"İnsan değerlendirici kararı kaydedildi", from:"under_review", to:"completed", reason:"Simüle olaylar tek başına karar olarak kullanılmadı" });
  saveState(); render(); toast("İnsan değerlendirici kararı pilot denetim izine kaydedildi.");
}

function submitProposal(form) {
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const application = createApplication(state, { kind: "internal", title: data.get("title"), applicant: currentRole().name, ects: data.get("ects"), remoteRate: data.get("remoteRate"), evidence: data.get("evidence"), comparedCourse: "Kurumsal Bologna kataloğu" });
  application.formData = { audience:data.get("audience"), assessment:data.get("assessment"), qualifications:data.get("qualifications"), quality:data.get("quality"), feeMode:data.get("feeMode"), fee:Number(data.get("fee") || 0) };
  state.programs.unshift({ id:`program-${Date.now()}`, code:application.code, title:data.get("title"), unit:data.get("unit"), instructor:currentRole().name, ects:Number(data.get("ects")), workload:Number(data.get("workload")), level:Number(data.get("level")), mode:Number(data.get("remoteRate")) ? "Karma" : "Yüz yüze", remoteRate:Number(data.get("remoteRate")), status:"review", learners:0, price:Number(data.get("fee") || 0), summary:data.get("summary"), outcomes:String(data.get("outcomes")).split("\n").filter(Boolean) });
  saveState();
  toast(`${application.code} pilot veri katmanına kaydedildi.`);
  navigate("applications");
}

function submitRecognition(form) {
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const application = createApplication(state, { kind: "external", title:data.get("title"), applicant:currentRole().name, provider:data.get("provider"), ects:data.get("ects"), remoteRate:data.get("remoteRate"), evidence:2, comparedCourse:data.get("comparedCourse") });
  saveState();
  toast(`${application.code} dış kazanım başvurusu ön incelemeye gönderildi.`);
  navigate("applications");
}

function submitDecision(form) {
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  try {
    const nextStatus = data.get("status");
    const roleCanDecide = state.roleId === "commission" || (state.roleId === "coordinator" && nextStatus === "revision");
    if (!roleCanDecide) throw new Error("Seçili demo rolü bu akademik kararı kaydedemez");
    const updated = transitionApplication(state, data.get("id"), nextStatus, state.roleId, data.get("reason"));
    if (nextStatus === "approved") {
      const program = state.programs.find((item)=>item.code===updated.code);
      if (program) program.status = "active";
    }
    saveState(); closeModal(); render(); toast("Gerekçeli komisyon pilot kaydı audit izine eklendi.");
  } catch (error) { toast(error.message, "error"); }
}

function submitVerify() {
  const code = document.querySelector("#verify-input")?.value.trim();
  if (!code) return;
  closeModal(); navigate("verify", code);
}

function filterCatalog() {
  const query = document.querySelector("#catalog-search")?.value.toLocaleLowerCase("tr-TR") || "";
  const level = document.querySelector("#catalog-level")?.value || "";
  document.querySelectorAll("#catalog-grid .program-card").forEach((card)=>{ card.hidden = Boolean((query && !card.dataset.searchable.includes(query)) || (level && card.dataset.programLevel !== level)); });
}

function filterApplications() {
  const query = document.querySelector("#application-search")?.value.toLocaleLowerCase("tr-TR") || "";
  const status = document.querySelector("#application-status")?.value || "";
  document.querySelectorAll("#application-rows tr").forEach((row)=>{ row.hidden = Boolean((query && !row.dataset.searchable.includes(query)) || (status && row.dataset.applicationStatus !== status)); });
}

function simulateIntegration(id) {
  const item = state.integrations.find((integration)=>integration.id===id);
  item.attempts = (item.attempts || 0) + 1;
  const previous = item.status;
  const shouldFail = item.attempts === 1;
  item.status = shouldFail ? "failed" : "simulated";
  item.lastTest = `${shouldFail ? "Simüle zaman aşımı" : "Yeniden deneme başarılı"}: ${formatDate(new Date().toISOString(), true)}`;
  state.integrationJobs.unshift({ id:`JOB-${id}-${Date.now()}`, target:item.name, status:shouldFail ? "simulation_failed" : "simulation_succeeded", realDataSent:false, at:new Date().toISOString() });
  state.audit.unshift({ id:`AUD-${Date.now()}`, entityId:`INT-${id}`, at:new Date().toISOString(), actor:currentRole().name, actorRole:state.roleId, action:shouldFail ? "Entegrasyon hata senaryosu üretildi" : "Entegrasyon yeniden denemesi tamamlandı", from:previous, to:item.status, reason:"Redakte veri paketi; realDataSent=false; geri alma/mutabakat kaydı hazır" });
  saveState(); closeModal(); render(); toast(shouldFail ? `${item.name} için simüle zaman aşımı üretildi; yeniden deneme kullanılabilir.` : `${item.name} yeniden denemesi tamamlandı; gerçek veri gönderilmedi.`, shouldFail ? "error" : "success");
}

function simulateAllIntegrations() {
  state.integrations.forEach((item)=>{ item.status="simulated"; item.attempts=(item.attempts || 0)+1; item.lastTest="Toplu deneme çalıştırması başarılı"; state.integrationJobs.unshift({ id:`JOB-${item.id}-${Date.now()}`, target:item.name, status:"simulation_succeeded", realDataSent:false, at:new Date().toISOString() }); });
  saveState(); render(); toast("7 entegrasyon için yalnız simülasyon logu üretildi.");
}

function simulateFinance() {
  const id = `TX-${String(Date.now()).slice(-4)}`;
  state.finance.transactions.unshift({ id, program:"Dijital Üretimde Veri Okuryazarlığı", learner:"Pilot Katılımcı 030", gross:1500, channel:"Sanal POS simülasyonu", status:"matched" });
  state.audit.unshift({ id:`AUD-${Date.now()}`, entityId:id, at:new Date().toISOString(), actor:currentRole().name, actorRole:state.roleId, action:"Tahsilat simülasyonu eşleştirildi", from:"pending", to:"matched", reason:"Gerçek ödeme veya kart verisi işlenmedi" });
  saveState(); render(); toast("Tahsilat simülasyonu oluşturuldu; gerçek ödeme alınmadı.");
}

function createFinanceDraft() {
  state.finance.invoiceDrafts ||= [];
  const draft = { id:`INV-DRAFT-${String(Date.now()).slice(-5)}`, entitlementId:state.finance.entitlements[0].id, status:"draft", realDocument:false, createdAt:new Date().toISOString() };
  state.finance.invoiceDrafts.unshift(draft);
  state.audit.unshift({ id:`AUD-${Date.now()}`, entityId:draft.id, at:draft.createdAt, actor:currentRole().name, actorRole:state.roleId, action:"Fatura / hak ediş taslağı oluşturuldu", from:"none", to:"draft", reason:"Gerçek mali belge üretilmedi; mali birim doğrulaması gerekir" });
  saveState(); render(); toast("Fatura / hak ediş taslağı kaydedildi. Gerçek mali belge üretilmedi.");
}

function saveFinanceParameters(form) {
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  state.finance.parameters = { withholding:Number(data.get("withholding")), vat:Number(data.get("vat")), stamp:Number(data.get("stamp")) };
  state.audit.unshift({ id:`AUD-${Date.now()}`, entityId:"FIN-PARAM", at:new Date().toISOString(), actor:currentRole().name, actorRole:state.roleId, action:"Mali pilot parametre taslağı güncellendi", from:"draft", to:"draft", reason:"Mali birim doğrulaması gerekir" });
  saveState(); render(); toast("Yapılandırılabilir mali pilot parametreleri kaydedildi.");
}

async function refreshRemote(fromModal = false) {
  const snapshot = await loadPilotSnapshot();
  state.remoteSnapshot = snapshot.ok ? { programs:snapshot.programs.length, applications:snapshot.applications.length, credentials:snapshot.credentials.length, integrations:snapshot.integrations.length, checkedAt:new Date().toISOString() } : null;
  state.dataMode = snapshot.ok ? `Yerel çalışma alanı • Supabase seed doğrulandı (${snapshot.programs.length} program)` : snapshot.mode;
  saveState();
  if (fromModal) closeModal();
  render();
  toast(snapshot.ok ? "Supabase salt-okunur pilot görünümü doğrulandı." : "Supabase erişilemedi; güvenli yerel pilot verisi kullanılmaya devam ediyor.", snapshot.ok ? "success" : "error");
}

render();
refreshRemote();
