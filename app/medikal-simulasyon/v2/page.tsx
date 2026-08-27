import type { Metadata } from "next";
import MedicalSimulationV2 from "./MedicalSimulationV2";

export const metadata: Metadata = {
  title: "TEYS/MAMS V2 | Kanıt Kapılı Klinik Simülasyon",
  description: "Olgu kataloğu, klinik akıl yürütme, XState ve dallanan fizyoloji motoruna bağlı sentetik STEMI–VF–ROSC ürün çekirdeği.",
  robots: { index: false, follow: false },
};

export default function MedicalSimulationV2Page() {
  return <MedicalSimulationV2 />;
}
