import type { PilotWorkspace, WorkspaceRecord } from "../../../lib/pilot/types";
import styles from "./workspace.module.css";

const field = (record: WorkspaceRecord, key: string) => String(record[key] ?? "");
const date = (value: unknown) => {
  const parsed = new Date(String(value ?? ""));
  return Number.isNaN(parsed.getTime()) ? "Belirtilmedi" : new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(parsed);
};
export const statusLabels: Record<string, string> = {
  submitted: "Başvuru alındı", coordinator_review: "Koordinatör incelemesi", commission_review: "Komisyon incelemesi",
  approved: "Pilot onayı", revision: "Revizyon", rejected: "Reddedildi", credentialed: "Simülasyon belgesi üretildi",
  create_student_application: "Öğrenci başvurusu", create_program_proposal: "Program önerisi", coordinator_forward: "Komisyona sevk",
  commission_decide: "Gerekçeli komisyon kararı", student_affairs_issue: "Simülasyon belgesi",
  ogrenci: "Öğrenen", "ic-egitici": "Üniversite içi eğitici", "dis-egitici": "Kurum dışı eğitici",
  koordinator: "Koordinatörlük", komisyon: "Komisyon", "ogrenci-isleri": "Öğrenci İşleri",
};

function Section({ id, title, count, children }: { id: string; title: string; count: number; children: React.ReactNode }) {
  return <section id={id} className={styles.records} aria-labelledby={`${id}-title`}>
    <div className={styles.sectionHeading}><div><p className={styles.kicker}>SENTETİK PİLOT • YETKİLİ KAYITLAR</p><h2 id={`${id}-title`}>{title}</h2></div><span>{count} kayıt</span></div>
    {count ? children : <div className={styles.empty}><strong>Bu kapsamda görünür kayıt yok.</strong><p>Yalnız bu kurumda erişiminize açık kayıtlar burada gösterilir.</p></div>}
  </section>;
}

export function Catalog({ workspace }: { workspace: PilotWorkspace }) {
  return <Section id="katalog" title="Pilot katalog" count={workspace.catalog.length}>
    <div className={styles.catalogGrid}>{workspace.catalog.map(item => <article className={styles.detailCard} key={field(item,"id")}>
      <small>{field(item,"code")} · SENTETİK PROGRAM ÖRNEĞİ</small>
      <h3>{field(item,"title")}</h3><p>{field(item,"summary")}</p>
      <dl><dt>Pilot birim bağlamı</dt><dd>{field(item,"unit_name")}</dd><dt>Sunum biçimi</dt><dd>{field(item,"delivery_label")}</dd><dt>Örnek iş yükü</dt><dd>{field(item,"workload_label")}</dd></dl>
      <p className={styles.note}>Üniversitenin sunduğu gerçek bir eğitim veya onayladığı AKTS değeri değildir.</p>
    </article>)}</div>
  </Section>;
}

export function RecordList({ workspace }: { workspace: PilotWorkspace }) {
  return <Section id="kayitlar" title="Başvuru ve öneri takibi" count={workspace.cases.length}>
    <div className={styles.recordList}>{workspace.cases.map(item => {
      const actions = workspace.actions.filter(action => action.case_id === item.id);
      return <article className={styles.caseCard} key={field(item,"id")}>
        <div className={styles.caseHeading}><div><small>{field(item,"code")} · SENTETİK</small><h3>{field(item,"title")}</h3><p>{field(item,"summary")}</p></div><span className={styles.status}>{statusLabels[field(item,"status")] ?? field(item,"status")}</span></div>
        <details><summary>İşlem ve karar geçmişi ({actions.length})</summary>
          <ol className={styles.timeline}>{actions.map(action => <li key={field(action,"id")}>
            <strong>{statusLabels[field(action,"action_key")] ?? field(action,"action_key")}</strong>
            <small>{statusLabels[field(action,"actor_role_key")] ?? field(action,"actor_role_key")} · {date(action.created_at)}</small>
            <p>{field(action,"rationale") || "İlk pilot kaydı oluşturuldu."}</p>
            <span>{statusLabels[field(action,"to_status")] ?? field(action,"to_status")}</span>
          </li>)}</ol>
          {!actions.length ? <p>Görünür işlem geçmişi bulunmuyor.</p> : null}
        </details>
      </article>;
    })}</div>
  </Section>;
}

export function RuleRegistry({ workspace }: { workspace: PilotWorkspace }) {
  return <section id="kurallar" className={styles.rules} aria-labelledby="rules-title">
    <p className={styles.kicker}>KURAL KAYDI</p><h2 id="rules-title">Kaynak, sürüm ve karar sınırı</h2>
    {workspace.rules.map(rule => <article key={field(rule,"id")}>
      <span className={field(rule,"status") === "verified_reference" ? styles.verified : styles.pending}>{field(rule,"status") === "verified_reference" ? "Doğrulanmış kaynak" : "Kurumsal doğrulama gerekir"}</span>
      <strong>{field(rule,"value_text")}</strong>
      <details><summary>Kaydı incele</summary><dl>
        <dt>Sürüm</dt><dd>{field(rule,"version_label")}</dd>
        <dt>Kaynak</dt><dd>{field(rule,"source_url").startsWith("https://") ? <a href={field(rule,"source_url")} target="_blank" rel="noreferrer">{field(rule,"source_title") || "Kaynağı aç"}</a> : field(rule,"source_title") || "Kurumsal kaynak bekleniyor"}</dd>
        <dt>Karar sahibi</dt><dd>{field(rule,"decision_owner") || "Kurum tarafından doğrulanmalı"}</dd>
        <dt>Yürürlük başlangıcı / sonu</dt><dd>{rule.effective_from ? date(rule.effective_from) : "Belirlenmedi"} / {rule.effective_until ? date(rule.effective_until) : "Belirlenmedi"}</dd>
        <dt>Hesaplama temeli</dt><dd>{field(rule,"calculation_basis") || "Doğrulanmış hesaplama temeli yok"}</dd>
      </dl></details>
    </article>)}
  </section>;
}

export function OutcomeRecords({ workspace }: { workspace: PilotWorkspace }) {
  const caseLabel = (item: WorkspaceRecord) => {
    const related = workspace.cases.find(record => record.id === item.case_id);
    return related ? `${field(related,"code")} · ${field(related,"title")}` : "Yetki kapsamındaki pilot kayıt";
  };
  return <>
    <Section id="cuzdan" title="Cüzdan ve doğrulama simülasyonu" count={workspace.credentials.length}>
      <div className={styles.catalogGrid}>{workspace.credentials.map(item => <article className={styles.detailCard} key={field(item,"id")}>
        <small>{workspace.workspace.display_name} • SİMÜLASYON BELGESİ</small><h3>{field(item,"title")}</h3><p>{field(item,"code")}</p>
        <dl><dt>Belge durumu</dt><dd>{item.issue_status === "simulation_issued" ? "Simülasyon belgesi üretildi" : "Simülasyon belgesi iptal edildi"}</dd>
          <dt>Belge doğrulama</dt><dd>{item.verification_status === "pilot_verified" ? "Yalnız pilot kayıt eşleşmesi doğrulandı" : "Pilot doğrulaması iptal edildi"}</dd>
          <dt>AKTS tanıma</dt><dd>{item.ects_recognition_status === "not_evaluated" ? "Değerlendirilmedi" : "Ayrı insan incelemesi gerekir"}</dd>
          <dt>Ders yerine sayma</dt><dd>{item.course_substitution_status === "not_requested" ? "Talep edilmedi" : "Ayrı insan incelemesi gerekir"}</dd>
          <dt>Üretim zamanı</dt><dd>{date(item.issued_at)}</dd></dl>
        <p className={styles.note}>Resmî belge, elektronik imza ve dış cüzdan yayını içermez.</p>
      </article>)}</div>
    </Section>
    <Section id="mali-islemler" title="Mali dry-run kayıtları" count={workspace.financeDryRuns.length}>
      <div className={styles.catalogGrid}>{workspace.financeDryRuns.map(item => <article className={styles.detailCard} key={field(item,"id")}>
        <small>SİMÜLASYON • {date(item.created_at)}</small><h3>{caseLabel(item)}</h3>
        <p>{new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY"}).format(Number(item.amount))}</p>
        <p>Dry-run kaydı tamamlandı. Gerçek tahsilat yapılmadı.</p>
      </article>)}</div>
    </Section>
    <Section id="entegrasyonlar" title="Entegrasyon dry-run sonuçları" count={workspace.integrationDryRuns.length}>
      <div className={styles.catalogGrid}>{workspace.integrationDryRuns.map(item => <article className={styles.detailCard} key={field(item,"id")}>
        <small>SİMÜLASYON • {date(item.created_at)}</small><h3>{field(item,"integration_key").toUpperCase()}</h3>
        <p>{field(item,"detail")}</p><p>Dış sisteme veri gönderilmedi.</p>
      </article>)}</div>
    </Section>
    <Section id="yonetim" title="Yönetim erişim kontrolleri" count={workspace.adminChecks.length}>
      <div className={styles.catalogGrid}>{workspace.adminChecks.map(item => <article className={styles.detailCard} key={field(item,"id")}>
        <small>SİMÜLASYON • {date(item.created_at)}</small><h3>Üyelik bağı kontrolü</h3><p>{field(item,"detail")}</p>
        <p>Bu işlem akademik veya mali karar oluşturmaz.</p>
      </article>)}</div>
    </Section>
  </>;
}
