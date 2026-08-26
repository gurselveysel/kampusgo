import type { Metadata } from "next";
import MedicalSimulationV2 from "./MedicalSimulationV2";

export const metadata: Metadata = {
  title: "TEYS/MAMS V2 | Kanıt Kapılı Klinik Simülasyon",
  description: "XState ve dallanan fizyoloji motoruna bağlı sentetik STEMI–VF–ROSC dikey dilimi.",
  robots: { index: false, follow: false },
};

export default function MedicalSimulationV2Page() {
  return <MedicalSimulationV2 />;
}
