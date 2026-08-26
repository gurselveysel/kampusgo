import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "TEYS AI + Manim Motoru | MAMS",
  description:
    "Sentetik klinik senaryoları doğrulanmış Manim görselleştirmelerine dönüştüren kontrollü TEYS/MAMS motor konsolu.",
  robots: { index: false, follow: false },
};

export default function MedicalEngineLayout({ children }: { children: ReactNode }) {
  return children;
}
