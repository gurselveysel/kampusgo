import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPilotContext, loginDestination } from "../../lib/pilot/broker";
import LoginForm from "./LoginForm";
import styles from "./giris.module.css";

export const metadata: Metadata = {
  title: "Giriş",
  description: "KampüsGO Mikro Yeterlilik Yönetim Sistemi ortak pilot hesabı girişi.",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { searchParams: Promise<{ durum?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const existing = await getPilotContext();
  if (existing.ok) redirect(loginDestination(existing.context));
  const { durum } = await searchParams;

  return (
    <main className={styles.page}>
      <section className={styles.intro} aria-labelledby="welcome-title">
        <div className={styles.brand}>
          <span className={styles.brandMark}>
            <Image src="/assets/brand/go-icon-web.png" width={52} height={52} alt="" priority />
          </span>
          <span><strong>KampüsGO</strong><small>Üniversite çalışma alanı</small></span>
        </div>
        <div className={styles.introCopy}>
          <p className={styles.eyebrow}>ORTAK PİLOT GİRİŞİ</p>
          <h1 id="welcome-title">Mikro Yeterlilik<br />Yönetim Sistemi</h1>
          <p className={styles.lead}>Başvurudan doğrulamaya, her kurumun kendi üyeliği ve karar sınırları içinde ilerleyen ortak çalışma alanı.</p>
        </div>
        <div className={styles.assurances} aria-label="Pilot özellikleri">
          <span>Doğrulanmış üyelik</span><span>Kurum-sınırlı erişim</span><span>Sentetik pilot veri</span>
        </div>
      </section>

      <section className={styles.loginPanel} aria-labelledby="login-title">
        <div className={styles.panelInner}>
          <p className={styles.step}>KampüsGO / Güvenli giriş</p>
          <h2 id="login-title">Çalışma alanınıza girin</h2>
          <p className={styles.help}>Pilot hesabınızla giriş yapın. Burada üniversitenizin mevcut kurumsal parolası istenmez.</p>
          {durum === "cikis" ? <p className={styles.notice} role="status">Oturumunuz güvenli biçimde kapatıldı.</p> : null}
          {durum === "oturum" ? <p className={styles.notice} role="status">Oturumunuz sona erdi. Yeniden giriş yapın.</p> : null}
          {durum === "guvenlik" ? <p className={styles.notice} role="alert">İstek kaynağı doğrulanamadı. Sayfayı yenileyip tekrar deneyin.</p> : null}
          <LoginForm />
          <div className={styles.boundary}>
            <strong>Kontrollü pilot</strong>
            <p>Gerçek ödeme, bildirim, imza veya kamu sistemi bağlantısı yapılmaz.</p>
          </div>
          <Link className={styles.legacyLink} href="/pilot.html">Korunan açık DPÜ v15 demosunu görüntüle <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </main>
  );
}
