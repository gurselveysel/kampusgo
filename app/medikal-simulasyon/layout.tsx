import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "TEYS Medikal Simülasyon | MAMS",
  description:
    "Ön koşullu ilerleme, dinamik sanal hasta, klinik karar, ekip liderliği ve debriefing içeren kontrollü tıp eğitimi simülasyon prototipi.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MedicalSimulationLayout({ children }: { children: ReactNode }) {
  return children;
}
