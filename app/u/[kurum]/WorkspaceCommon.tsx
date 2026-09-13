import Link from "next/link";
import type { PilotMembership, PilotWorkspace } from "../../../lib/pilot/types";
import RoleActionPanel from "./RoleActionPanel";
import WorkspaceHeader from "./WorkspaceHeader";
import { Catalog, RecordList, OutcomeRecords, RuleRegistry } from "./WorkspaceDetails";
import styles from "./workspace.module.css";

function RoleTabs({ membership, selectedRole }: { membership: PilotMembership; selectedRole: string }) {
  if (membership.roles.length < 2) return null;
  return <nav className={styles.roleTabs} aria-label="Atanmış roller">{membership.roles.map((role) => <Link aria-current={role.key === selectedRole ? "page" : undefined} key={role.key} href={`/u/${membership.routeSlug}?rol=${encodeURIComponent(role.key)}`}>{role.name}</Link>)}</nav>;
}

function EvidenceStrip({ workspace }: { workspace: PilotWorkspace }) {
  return <nav className={styles.evidence} aria-label="Pilot işlem sonuçları"><a href="#cuzdan"><strong>{workspace.credentials.length}</strong><span>Cüzdan simülasyonu →</span></a><a href="#mali-islemler"><strong>{workspace.financeDryRuns.length}</strong><span>Mali dry-run →</span></a><a href="#entegrasyonlar"><strong>{workspace.integrationDryRuns.length}</strong><span>Entegrasyon dry-run →</span></a><a href="#yonetim"><strong>{workspace.adminChecks.length}</strong><span>Erişim kontrolü →</span></a></nav>;
}

export function GaziWorkspace({ membership, displayName, roleKey, workspace, message }: CommonProps) {
  return (
    <div className={`${styles.workspace} ${styles.gazi}`}>
      <WorkspaceHeader membership={membership} displayName={displayName} selectedRole={roleKey} />
      <RoleTabs membership={membership} selectedRole={roleKey} />
      {message}
      <main className={styles.gaziMain}>
        <section id="genel-bakis" className={styles.gaziHero}>
          <div><p className={styles.kicker}>GAZİ ÜNİVERSİTESİ • MYYS ÇALIŞMA ALANI</p><h1>Kanıttan karara,<br />izlenebilir pilot akış.</h1><p>GAZİSEM bağlamında tasarlanan bu alan yalnız sentetik verilerle çalışır; resmî eğitim, kurul kararı veya belge iddiası taşımaz.</p></div>
          <aside><span>Kurumsal bağlam</span><strong>{membership.unitName ?? "GAZİSEM pilot bağlamı"}</strong><p>Logo ve renkler resmî kaynaklardan; süreç kuralları kurum onayı bekliyor.</p></aside>
        </section>
        <nav className={styles.process} aria-label="Çalışma alanı bölümleri"><a href="#katalog"><b>01</b>Katalog</a><a href="#islem"><b>02</b>Rolünüze ait işlem</a><a href="#kayitlar"><b>03</b>Başvuru ve karar takibi</a><a href="#kurallar"><b>04</b>Kaynak ve kurallar</a><a href="#cuzdan"><b>05</b>Belge ve tanıma durumu</a></nav>
        <div className={styles.twoColumn}>
          <div id="islem"><RoleActionPanel routeSlug="gazi" roleKey={roleKey} workspace={workspace} /></div>
          <RuleRegistry workspace={workspace} />
        </div>
        <EvidenceStrip workspace={workspace} />
        <Catalog workspace={workspace} />
        <RecordList workspace={workspace} />
        <OutcomeRecords workspace={workspace} />
      </main>
      <footer className={styles.footer}><span>Gazi Üniversitesi • KampüsGO MYYS • SENTETİK/SİMÜLASYON</span><span>Resmî belge veya kurumsal onay niteliği taşımaz.</span></footer>
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
        <nav className={styles.dpuSidebar} aria-label="DPÜ çalışma alanı bölümleri"><strong>MYYS</strong><a href="#genel-bakis">Genel Bakış</a><a href="#katalog">Katalog</a><a href="#islem">Rol işlemi</a><a href="#kayitlar">Başvuru ve inceleme</a><a href="#cuzdan">Cüzdan</a><a href="#mali-islemler">Mali işlemler</a><a href="#entegrasyonlar">Entegrasyonlar</a><a href="#yonetim">Yönetim</a><a href="#kurallar">Kural kaynakları</a><Link href="/pilot.html">Açık v15 demo ↗</Link></nav>
        <main className={styles.dpuMain}>
          <section id="genel-bakis" className={styles.dpuHero}><div><p className={styles.kicker}>DPÜ • HESAPLI ÇALIŞMA ALANI</p><h1>Mikro Yeterlilik<br />Yönetim Sistemi</h1><p>Mevcut DPÜ pilotunun kurum kimliği korunurken bu alanda üyelik ve rol sunucuda doğrulanır.</p></div><div className={styles.dpuMetric}><small>Görünen kayıt</small><strong>{workspace.cases.length}</strong><span>Rol ve kurum kapsamında</span></div></section>
          <EvidenceStrip workspace={workspace} />
          <div id="islem"><RoleActionPanel routeSlug="dpu" roleKey={roleKey} workspace={workspace} /></div>
          <Catalog workspace={workspace} />
          <RecordList workspace={workspace} />
          <OutcomeRecords workspace={workspace} />
          <RuleRegistry workspace={workspace} />
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
