import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "TEYS Medikal Simülasyon — Kontrollü Pilot",
  description:
    "Ön koşullu ilerleme, dinamik sanal hasta, klinik karar verme ve ayrıntılı debriefing içeren sentetik tıp eğitimi simülasyonu.",
  robots: { index: false, follow: false },
};

export default function MedicalSimulationLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
