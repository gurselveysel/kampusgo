import Image from "next/image";
import Link from "next/link";
import { logoutAction } from "../../actions";
import type { PilotMembership } from "../../../lib/pilot/types";
import styles from "./workspace.module.css";

export default function WorkspaceHeader({ membership, displayName, selectedRole }: {
  membership: PilotMembership;
  displayName: string;
  selectedRole: string;
}) {
  const role = membership.roles.find((item) => item.key === selectedRole);
  return (
    <header className={styles.header}>
      <div className={styles.institution}>
        <span className={styles.logo}><Image src={membership.logoPath} width={64} height={64} alt={`${membership.organizationName} logosu`} unoptimized priority /></span>
        <span><small>KampüsGO • HESAPLI PİLOT</small><strong>{membership.organizationName}</strong></span>
      </div>
      <nav className={styles.accountNav} aria-label="Hesap ve kurum işlemleri">
        <span className={styles.user}><small>{displayName}</small><strong>{role?.name}</strong></span>
        <Link href="/kurum-sec">Kurum / rol değiştir</Link>
        <form action={logoutAction}><button type="submit">Çıkış</button></form>
      </nav>
    </header>
  );
}
