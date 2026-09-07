import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "KampüsGO • Mikro Yeterlilik Yönetim Sistemi",
    template: "%s • KampüsGO",
  },
  description: "Üniversite üyeliği ve rolü doğrulanan hesaplar için kontrollü KampüsGO MYYS pilotu.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B1F33",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Nonce tabanlı CSP için bütün App Router sayfalarını istek bağlamında render et.
  await headers();
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
