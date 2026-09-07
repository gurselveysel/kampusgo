import Link from "next/link";
import type { PilotMembership, PilotWorkspace, WorkspaceRecord } from "../../../lib/pilot/types";
import RoleActionPanel from "./RoleActionPanel";
import WorkspaceHeader from "./WorkspaceHeader";
import styles from "./workspace.module.css";

const field = (record: WorkspaceRecord, key: string) => String(record[key] ?? "");
const statusLabels: Record<string, string> = {
  submitted: "Başvuru alındı", coordinator_review: "Koordinatör incelemesi", commission_review: "Komisyon incelemesi",
  approved: "Pilot onayı", revision: "Revizyon", rejected: "Reddedildi", credentialed: "Simülasyon belgesi üretildi",
};

function RoleTabs({ membership, selectedRole }: { membership: PilotMembership; selectedRole: string }) {
  if (membership.roles.length < 2) return null;
  return <nav className={styles.roleTabs} aria-label="Atanmış roller">{membership.roles.map((role) => <Link aria-current={role.key === selectedRole ? "page" : undefined} key={role.key} href={`/u/${membership.routeSlug}?rol=${encodeURIComponent(role.key)}`}>{role.name}</Link>)}</nav>;
}

function RecordList({ workspace }: { workspace: PilotWorkspace }) {
  return (
    <section className={styles.records} aria-labelledby="records-title">
      <div className={styles.sectionHeading}><div><p className={styles.kicker}>YETKİLİ GÖRÜNÜM</p><h2 id="records-title">Başvuru ve öneriler</h2></div><span>{workspace.cases.length} kayıt</span></div>
      {workspace.cases.length ? <div className={styles.recordList}>{workspace.cases.map((item) => <article key={field(item,"id")}><div><small>{field(item,"code")} · SENTETİK</small><h3>{field(item,"title")}</h3><p>{field(item,"summary")}</p></div><span className={styles.status}>{statusLabels[field(item,"status")] ?? field(item,"status")}</span></article>)}</div> : <div className={styles.empty}><strong>Bu rol için görünür kayıt yok.</strong><p>Başka kurumdan veriyle doldurulmaz; ilk yetkili işlemden sonra burada görünür.</p></div>}
    </section>
  );
}

function EvidenceStrip({ workspace }: { workspace: PilotWorkspace }) {
  return <section className={styles.evidence} aria-label="Pilot ayrımları"><div><strong>{workspace.credentials.length}</strong><span>Cüzdan simülasyonu</span></div><div><strong>{workspace.financeDryRuns.length}</strong><span>Mali dry-run</span></div><div><strong>{workspace.integrationDryRuns.length}</strong><span>Entegrasyon dry-run</span></div><div><strong>{workspace.adminChecks.length}</strong><span>Erişim kontrolü</span></div></section>;
}

export function GaziWorkspace({ membership, displayName, roleKey, workspace, message }: CommonProps) {
  return (
    <div className={`${styles.workspace} ${styles.gazi}`}>
      <WorkspaceHeader membership={membership} displayName={displayName} selectedRole={roleKey} />
      <RoleTabs membership={membership} selectedRole={roleKey} />
      {message}
      <main className={styles.gaziMain}>
        <section className={styles.gaziHero}>
          <div><p className={styles.kicker}>GAZİ ÜNİVERSİTESİ • MYYS ÇALIŞMA ALANI</p><h1>Kanıttan karara,<br />izlenebilir pilot akış.</h1><p>GAZİSEM bağlamında tasarlanan bu alan yalnız sentetik verilerle çalışır; resmî eğitim, kurul kararı veya belge iddiası taşımaz.</p></div>
          <aside><span>Kurumsal bağlam</span><strong>{membership.unitName ?? "GAZİSEM pilot bağlamı"}</strong><p>Logo ve renkler resmî kaynaklardan; süreç kuralları kurum onayı bekliyor.</p></aside>
        </section>
        <section className={styles.process} aria-label="Pilot süreç adımları"><span><b>01</b>Katalog</span><span><b>02</b>Başvuru / öneri</span><span><b>03</b>Koordinatör incelemesi</span><span><b>04</b>Gerekçeli insan kararı</span><span><b>05</b>Ayrı belge / tanıma durumu</span></section>
        <div className={styles.twoColumn}>
          <RoleActionPanel routeSlug="gazi" roleKey={roleKey} workspace={workspace} />
          <section className={styles.rules} aria-labelledby="rules-title"><p className={styles.kicker}>KURAL KAYDI</p><h2 id="rules-title">Kaynak ve statü</h2>{workspace.rules.slice(0,5).map((rule) => <article key={field(rule,"id")}><span className={field(rule,"status") === "verified_reference" ? styles.verified : styles.pending}>{field(rule,"status") === "verified_reference" ? "Doğrulanmış kaynak" : "Kurumsal doğrulama gerekir"}</span><strong>{field(rule,"value_text")}</strong><small>{field(rule,"source_title")}</small></article>)}</section>
        </div>
        <EvidenceStrip workspace={workspace} />
        <RecordList workspace={workspace} />
      </main>
      <footer className={styles.footer}><span>Gazi Üniversitesi • KampüsGO MYYS • SENTETİK/SİMÜLASYON</span><span>Belge/rapor üstbilgisi • accounted-pilot-1</span></footer>
    </div>
  );
}

export function DpuWorkspace({ membership, displayName, roleKey, workspace, message }: CommonProps) {
  return (
    <div className={`${styles.workspace} ${styles.dpu}`}>
      <WorkspaceHeader membership={membership} displayName={displayName} selectedRole={roleKey} />
      <RoleTabs membership={membership} selectedRole={roleKey} />
      {message}
      <div className={styles.dpuFrame}>
        <aside className={styles.dpuSidebar}><strong>MYYS</strong><span>Genel Bakış</span><span>Katalog</span><span>Başvurular</span><span>İnceleme</span><span>Cüzdan</span><span>Entegrasyonlar</span><span>Yönetim</span><Link href="/pilot.html">Açık v15 demo ↗</Link></aside>
        <main className={styles.dpuMain}>
          <section className={styles.dpuHero}><div><p className={styles.kicker}>DPÜ • HESAPLI ÇALIŞMA ALANI</p><h1>Mikro Yeterlilik<br />Yönetim Sistemi</h1><p>Mevcut DPÜ pilotunun kurum kimliği korunurken bu alanda üyelik ve rol sunucuda doğrulanır.</p></div><div className={styles.dpuMetric}><small>Görünen kayıt</small><strong>{workspace.cases.length}</strong><span>Rol ve kurum kapsamında</span></div></section>
          <EvidenceStrip workspace={workspace} />
          <RoleActionPanel routeSlug="dpu" roleKey={roleKey} workspace={workspace} />
          <RecordList workspace={workspace} />
        </main>
      </div>
      <footer className={styles.footer}><span>Kütahya Dumlupınar Üniversitesi • KampüsGO MYYS • SENTETİK/SİMÜLASYON</span><span>Eski açık DPÜ v15 demosu ayrı ve değişmeden korunur</span></footer>
    </div>
  );
}

type CommonProps = {
  membership: PilotMembership;
  displayName: string;
  roleKey: string;
  workspace: PilotWorkspace;
  message: React.ReactNode;
};
