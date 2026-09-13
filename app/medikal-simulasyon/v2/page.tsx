import type { Metadata } from "next";
import MedicalSimulationV2 from "./MedicalSimulationV2";

export const metadata: Metadata = {
  title: "TEYS/MAMS | Etkileşimli Klinik Simülasyon",
  description: "Olgu kütüphanesi, hasta görüşmesi, muayene, tetkik, tedavi, ekip çalışması ve altı yıllık program bağlamını birleştiren sentetik klinik eğitim ortamı.",
  robots: { index: false, follow: false },
};

export default function MedicalSimulationV2Page() {
  return <MedicalSimulationV2 />;
}
