import { workspaceCommandAction } from "../../actions";
import type { PilotWorkspace, WorkspaceRecord } from "../../../lib/pilot/types";
import SubmitButton from "./SubmitButton";
import styles from "./workspace.module.css";

const field = (record: WorkspaceRecord, key: string) => String(record[key] ?? "");

function HiddenFields({ command }: { command: string }) {
  return <><input type="hidden" name="command" value={command} /><input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} /></>;
}

function CaseOptions({ cases, statuses }: { cases: WorkspaceRecord[]; statuses: string[] }) {
  const eligible = cases.filter((item) => statuses.includes(field(item, "status")));
  return eligible.length ? eligible.map((item) => (
    <option key={field(item, "id")} value={field(item, "id")}>{field(item, "code")} · {field(item, "title")}</option>
  )) : <option value="">Uygun kayıt yok</option>;
}

export default function RoleActionPanel({ routeSlug, roleKey, workspace }: {
  routeSlug: string;
  roleKey: string;
  workspace: PilotWorkspace;
}) {
  const action = workspaceCommandAction.bind(null, routeSlug, roleKey);
  const catalog = workspace.catalog;
  const cases = workspace.cases;

  if (roleKey === "ogrenci") return (
    <section className={styles.actionPanel} aria-labelledby="action-title">
      <div><p className={styles.kicker}>TEMEL İŞLEM</p><h2 id="action-title">Katalogdan sentetik başvuru</h2><p>Seçiminiz sunucuda hesabınız ve kurumunuzla ilişkilendirilir.</p></div>
      <form action={action}><HiddenFields command="create_student_application" /><label htmlFor="catalogItemId">Pilot program</label><select id="catalogItemId" name="catalogItemId" required>{catalog.map((item) => <option key={field(item,"id")} value={field(item,"id")}>{field(item,"title")}</option>)}</select><label htmlFor="summary">Başvuru notu</label><textarea id="summary" name="summary" minLength={10} maxLength={500} required defaultValue="SENTETİK pilot katalog başvurusu." /><SubmitButton>Başvuruyu kaydet</SubmitButton></form>
    </section>
  );

  if (roleKey === "ic-egitici" || roleKey === "dis-egitici") return (
    <section className={styles.actionPanel} aria-labelledby="action-title">
      <div><p className={styles.kicker}>PROGRAM GELİŞTİRME</p><h2 id="action-title">Sentetik program önerisi</h2><p>{roleKey === "dis-egitici" ? "Kurum dışı eğitici" : "Üniversite içi eğitici"} kapsamı kayıtla birlikte korunur.</p></div>
      <form action={action}><HiddenFields command="create_program_proposal" /><label htmlFor="title">Öneri başlığı</label><input id="title" name="title" minLength={5} maxLength={180} required defaultValue="Kanıta Dayalı Öğrenme Tasarımı — SENTETİK" /><label htmlFor="summary">Amaç ve öğrenme kanıtı</label><textarea id="summary" name="summary" minLength={10} maxLength={1200} required defaultValue="Yalnız pilot iş akışını sınamak için hazırlanmış sentetik program önerisi." /><SubmitButton>Koordinatör incelemesine gönder</SubmitButton></form>
    </section>
  );

  if (roleKey === "koordinator") return (
    <section className={styles.actionPanel} aria-labelledby="action-title">
      <div><p className={styles.kicker}>ÖN İNCELEME</p><h2 id="action-title">Komisyon gündemine aktar</h2><p>Eksiksizlik kontrolü akademik karar yerine geçmez.</p></div>
      <form action={action}><HiddenFields command="coordinator_forward" /><label htmlFor="caseId">Koordinatör incelemesindeki öneri</label><select id="caseId" name="caseId" required><CaseOptions cases={cases} statuses={["coordinator_review"]} /></select><label htmlFor="rationale">İnceleme gerekçesi</label><textarea id="rationale" name="rationale" minLength={8} maxLength={1200} required defaultValue="Pilot kapsam ve zorunlu alan kontrolü tamamlandı." /><SubmitButton>Komisyona aktar</SubmitButton></form>
    </section>
  );

  if (roleKey === "komisyon" || roleKey === "komisyon-baskani") return (
    <section className={styles.actionPanel} aria-labelledby="action-title">
      <div><p className={styles.kicker}>AYRI İNSAN KARARI</p><h2 id="action-title">Gerekçeli pilot kararı</h2><p>TYÇ/TYYÇ/AYÇ önerileri karar üretmez; bu işlem yalnız pilot kaydıdır.</p></div>
      <form action={action}><HiddenFields command="commission_decide" /><label htmlFor="caseId">Komisyon incelemesindeki öneri</label><select id="caseId" name="caseId" required><CaseOptions cases={cases} statuses={["commission_review"]} /></select><label htmlFor="decision">Karar</label><select id="decision" name="decision" required><option value="approved">Pilot onayı</option><option value="revision">Revizyon</option><option value="rejected">Ret</option></select><label htmlFor="rationale">Gerekçe</label><textarea id="rationale" name="rationale" minLength={12} maxLength={1200} required defaultValue="Kanıtlar pilot kapsamı için insan değerlendirmesiyle uygun bulundu." /><SubmitButton>Gerekçeli kararı kaydet</SubmitButton></form>
    </section>
  );

  if (roleKey === "ogrenci-isleri") return (
    <section className={styles.actionPanel} aria-labelledby="action-title">
      <div><p className={styles.kicker}>BELGE SİMÜLASYONU</p><h2 id="action-title">Pilot cüzdan kaydı üret</h2><p>Doğrulama, AKTS tanıma ve ders yerine sayma durumları ayrı tutulur.</p></div>
      <form action={action}><HiddenFields command="student_affairs_issue" /><label htmlFor="caseId">Onaylı kayıt</label><select id="caseId" name="caseId" required><CaseOptions cases={cases} statuses={["approved"]} /></select><SubmitButton>SENTETİK belge üret</SubmitButton></form>
    </section>
  );

  if (roleKey === "bilgi-islem") return (
    <section className={styles.actionPanel} aria-labelledby="action-title">
      <div><p className={styles.kicker}>ENTEGRASYON KAPISI</p><h2 id="action-title">Bağlantısız dry-run</h2><p>Gerçek sisteme bağlanmaz, veri göndermez ve erişim sırrı kullanmaz.</p></div>
      <form action={action}><HiddenFields command="integration_dry_run" /><label htmlFor="integrationKey">Simüle edilecek kapı</label><select id="integrationKey" name="integrationKey"><option value="obs">OBS</option><option value="oys">ÖYS</option><option value="yoksis">YÖKSİS</option><option value="edevlet">e-Devlet</option><option value="ebys">EBYS</option></select><SubmitButton>Dry-run çalıştır</SubmitButton></form>
    </section>
  );

  if (roleKey === "mali-isler") return (
    <section className={styles.actionPanel} aria-labelledby="action-title">
      <div><p className={styles.kicker}>MALİ SİMÜLASYON</p><h2 id="action-title">Tahsilatsız işlem ön izlemesi</h2><p>GİB, MYS, MAYS veya ödeme ağına gerçek çağrı yapılmaz.</p></div>
      <form action={action}><HiddenFields command="finance_dry_run" /><label htmlFor="caseId">Onaylı sentetik kayıt</label><select id="caseId" name="caseId" required><CaseOptions cases={cases} statuses={["approved","credentialed"]} /></select><label htmlFor="amount">Simülasyon tutarı (TRY)</label><input id="amount" name="amount" type="number" min="0" max="1000000" step="0.01" defaultValue="1250" required /><SubmitButton>Dry-run kaydı oluştur</SubmitButton></form>
    </section>
  );

  return (
    <section className={styles.actionPanel} aria-labelledby="action-title">
      <div><p className={styles.kicker}>ERİŞİM YÖNETİMİ</p><h2 id="action-title">Kurum içi bağ kontrolü</h2><p>Sistem yöneticisi bu işlemle akademik veya mali karar veremez.</p></div>
      <form action={action}><HiddenFields command="admin_access_check" /><SubmitButton>Üyelik bağlarını doğrula</SubmitButton></form>
    </section>
  );
}
