import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "../actions";
import styles from "../kurum-sec/secim.module.css";

export const metadata: Metadata = { title: "Oturum servisi durumu" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SessionStatusPage({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  const { durum } = await searchParams;
  const logoutFailed = durum === "cikis";
  return <main className={styles.page}>
    <header className={styles.topbar}><Link href="/giris" className={styles.wordmark}>Kampüs<span>GO</span></Link></header>
    <section className={styles.content}>
      <p className={styles.eyebrow}>PİLOT OTURUM SERVİSİ</p>
      <h1>{logoutFailed ? "Çıkış doğrulanamadı" : "Servise ulaşılamıyor"}</h1>
      <p className={styles.alert} role="alert">{logoutFailed
        ? "Sunucudaki oturum iptali doğrulanamadı. Oturumunuz hâlâ açık olabilir. Çıkışı yeniden deneyin."
        : "Güncel erişiminiz doğrulanamadığı için kurum kayıtları gösterilmiyor. Bağlantı düzeldiğinde yeniden deneyin."}</p>
      <form action={logoutAction}><button className={styles.logout} type="submit">Çıkışı yeniden dene</button></form>
      <div className={styles.roles}><Link href="/kurum-sec">Erişim durumunu yeniden kontrol et →</Link></div>
    </section>
  </main>;
}
