import type { Metadata } from "next";
import MicroCredentialSimulation from "./MicroCredentialSimulation";

export const metadata: Metadata = {
  title: "TEYS/MAMS | Mikro-Yeterlilik Pilot Sürümü",
  description: "Akut göğüs ağrısında güvenli ilk yaklaşım için öğrenme, performans değerlendirmesi ve taşınabilir kanıt paketi sunan mikro-yeterlilik pilotu.",
  robots: { index: false, follow: false },
};

export default function MedicalMicroCredentialPage() {
  return <MicroCredentialSimulation />;
}
