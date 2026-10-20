import type { ModuleId } from "./simulation-data";

export type MedicalSceneClip = {
  moduleId: ModuleId;
  code: string;
  title: string;
  focus: string;
  description: string;
  video: string;
  scenarioId: string;
};

export const medicalSceneLibrary: MedicalSceneClip[] = [
  {
    moduleId: 1,
    code: "01",
    title: "Sanal hasta ilk değerlendirme",
    focus: "Hasta yanıtı + vital monitör",
    description: "İlk bakı, monitörizasyon ve görünür risk sinyallerinin sentetik hasta üzerindeki karşılığı.",
    video: "/medical-simulation/manim/module-01-virtual-patient.mp4",
    scenarioId: "scn_module_01_assessment",
  },
  {
    moduleId: 2,
    code: "02",
    title: "Aşamalı olgu açılımı",
    focus: "Olgu verisi + EKG",
    description: "Yeni klinik bilginin açılmasıyla karar bağlamının ve monitör ritminin güncellenmesi.",
    video: "/medical-simulation/manim/module-02-case-learning.mp4",
    scenarioId: "scn_module_02_case_reveal",
  },
  {
    moduleId: 3,
    code: "03",
    title: "Klinik akıl yürütme",
    focus: "Problem temsili + risk",
    description: "Ayırt edici bulguların problem temsiline ve zaman kritik önceliğe dönüşmesi.",
    video: "/medical-simulation/manim/module-03-clinical-reasoning.mp4",
    scenarioId: "scn_module_03_reasoning",
  },
  {
    moduleId: 4,
    code: "04",
    title: "Tanı ve tetkik seçimi",
    focus: "Tetkik değeri + zaman",
    description: "Yüksek değerli tetkikin karar yolunu açması ve gecikme riskinin görünür hâle gelmesi.",
    video: "/medical-simulation/manim/module-04-diagnostics.mp4",
    scenarioId: "scn_module_04_diagnostics",
  },
  {
    moduleId: 5,
    code: "05",
    title: "Tedavi sonrası hasta yanıtı",
    focus: "Müdahale + yeniden değerlendirme",
    description: "Sentetik müdahale sonrasında oksijenasyon ve solunum yanıtının monitöre yansıması.",
    video: "/medical-simulation/manim/module-05-treatment.mp4",
    scenarioId: "scn_module_05_treatment",
  },
  {
    moduleId: 6,
    code: "06",
    title: "VF arrest ve ROSC",
    focus: "CPR + defibrilasyon",
    description: "Şoklanabilir ritimden organize ritme geçiş ve post-ROSC yeniden değerlendirme.",
    video: "/medical-simulation/manim/module-06-emergency.mp4",
    scenarioId: "scn_module_06_vf_rosc",
  },
  {
    moduleId: 7,
    code: "07",
    title: "Ekip liderliği",
    focus: "Rol dağılımı + kapalı döngü",
    description: "Kritik görevlerin adlandırılması, geri okunması ve ekip durumunun görünür güncellenmesi.",
    video: "/medical-simulation/manim/module-07-team-leadership.mp4",
    scenarioId: "scn_module_07_team",
  },
  {
    moduleId: 8,
    code: "08",
    title: "Entegre klinik akış",
    focus: "Dinamik kötüleşme + resüsitasyon",
    description: "İlk değerlendirmeden VF, defibrilasyon ve güvenli devir teslime uzanan bütünleşik sahne.",
    video: "/medical-simulation/manim/module-08-integrated.mp4",
    scenarioId: "scn_module_08_integrated",
  },
];

export function medicalSceneForModule(moduleId: number): MedicalSceneClip {
  return medicalSceneLibrary.find((scene) => scene.moduleId === moduleId) ?? medicalSceneLibrary[0];
}
