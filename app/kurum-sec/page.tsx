import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "../actions";
import { getPilotContext } from "../../lib/pilot/broker";
import styles from "./secim.module.css";

export const metadata: Metadata = { title: "Kurum ve rol seçimi" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { searchParams: Promise<{ durum?: string }> };

export default async function InstitutionChoicePage({ searchParams }: Props) {
  const result = await getPilotContext();
  if (!result.ok) redirect("/giris?durum=oturum");
  const context = result.context;
  const { durum } = await searchParams;
  const hasAccess = context.accessState === "active" && context.memberships.length > 0;

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/kurum-sec" className={styles.wordmark}>Kampüs<span>GO</span></Link>
        <form action={logoutAction}><button type="submit" className={styles.logout}>Çıkış yap</button></form>
      </header>
      <section className={styles.content}>
        <p className={styles.eyebrow}>DOĞRULANMIŞ PİLOT OTURUMU</p>
        <h1>{hasAccess ? "Çalışma alanınızı seçin" : "Erişim durumu"}</h1>
        <p className={styles.lead}>
          {hasAccess
            ? `${context.displayName}, yalnız güncel ve aktif üyelikleriniz listeleniyor. Kurum ve rol seçimi her istekte yeniden doğrulanır.`
            : "Bu pilot hesabı için kullanılabilir bir kurum ve rol ataması bulunmuyor. Hiçbir kurum verisi gösterilmedi."}
        </p>

        {durum === "yetkisiz" ? <p className={styles.alert} role="alert">Bu kurum veya rol için güncel yetkiniz yok. Atanmış erişimleriniz aşağıdadır.</p> : null}
        {context.accessState === "inactive" ? <p className={styles.blocked} role="status"><strong>Hesap pasif.</strong> Pilot yöneticinizle iletişime geçin.</p> : null}
        {context.accessState === "unassigned" ? <p className={styles.blocked} role="status"><strong>Kurum ataması yok.</strong> Erişim verilene kadar çalışma alanı kullanılamaz.</p> : null}

        {hasAccess ? (
          <div className={styles.grid}>
            {context.memberships.map((membership) => (
              <article className={`${styles.card} ${membership.routeSlug === "gazi" ? styles.gazi : styles.dpu}`} key={membership.organizationId}>
                <div className={styles.identity}>
                  <span className={styles.logo}><Image src={membership.logoPath} alt={`${membership.organizationName} logosu`} width={88} height={88} unoptimized /></span>
                  <span><small>{membership.shortName} ÇALIŞMA ALANI</small><strong>{membership.organizationName}</strong><em>{membership.unitName ?? "Pilot kurum kapsamı"}</em></span>
                </div>
                <div className={styles.roles} aria-label={`${membership.organizationName} rolleri`}>
                  {membership.roles.length ? membership.roles.map((role) => (
                    <Link key={role.key} href={`/u/${membership.routeSlug}?rol=${encodeURIComponent(role.key)}`}>
                      <span>{role.name}</span><span aria-hidden="true">→</span>
                    </Link>
                  )) : <p>Bu üyelikte atanmış rol bulunmuyor.</p>}
                </div>
                <p className={styles.contextNote}>Seçim yalnız bu sekmede kullanılan URL bağlamıdır; başka sekmenin kurumunu değiştirmez.</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
