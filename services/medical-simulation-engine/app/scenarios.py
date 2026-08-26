"""Synthetic clinical scenarios used by the controlled pilot."""

from __future__ import annotations

from copy import deepcopy

from .models import ActionDefinition, PatientPresentation, PatientVitals, ScenarioSummary


ACTIONS: tuple[ActionDefinition, ...] = (
    ActionDefinition(
        id="assess_abcde",
        label="ABCDE değerlendirmesi yap",
        category="Değerlendirme",
        duration_seconds=30,
        risk="low",
        visible_in_modules=[1, 2, 3, 6, 8],
    ),
    ActionDefinition(
        id="call_team",
        label="Acil ekibi çağır ve görev dağıt",
        category="Ekip",
        duration_seconds=20,
        risk="low",
        visible_in_modules=[6, 7, 8],
    ),
    ActionDefinition(
        id="attach_monitor",
        label="Monitörizasyon başlat",
        category="Monitörizasyon",
        duration_seconds=15,
        risk="low",
        visible_in_modules=[1, 5, 6, 8],
    ),
    ActionDefinition(
        id="oxygen_high_flow",
        label="Rezervuarlı maske ile yüksek akım oksijen",
        category="Tedavi",
        duration_seconds=20,
        risk="low",
        visible_in_modules=[5, 6, 8],
    ),
    ActionDefinition(
        id="epinephrine_im_05",
        label="Adrenalin 0,5 mg IM uygula",
        category="Kritik müdahale",
        duration_seconds=25,
        risk="moderate",
        visible_in_modules=[5, 6, 8],
    ),
    ActionDefinition(
        id="crystalloid_bolus",
        label="Hızlı kristalloid bolus başlat",
        category="Tedavi",
        duration_seconds=60,
        risk="low",
        visible_in_modules=[5, 6, 8],
    ),
    ActionDefinition(
        id="nebulized_beta_agonist",
        label="Bronkospazm için nebül beta-agonist",
        category="Tedavi",
        duration_seconds=35,
        risk="moderate",
        visible_in_modules=[5, 6, 8],
    ),
    ActionDefinition(
        id="antihistamine_first",
        label="Önce IV antihistaminik ver",
        category="İkincil tedavi",
        duration_seconds=45,
        risk="high",
        visible_in_modules=[5, 6, 8],
    ),
    ActionDefinition(
        id="iv_epinephrine_bolus",
        label="IV adrenalin bolusu uygula",
        category="Yüksek riskli müdahale",
        duration_seconds=15,
        risk="critical",
        visible_in_modules=[6, 8],
    ),
    ActionDefinition(
        id="ct_chest",
        label="Toraks BT iste",
        category="Tetkik",
        duration_seconds=300,
        risk="high",
        visible_in_modules=[4, 6, 8],
    ),
    ActionDefinition(
        id="sbar_handoff",
        label="SBAR ile konsültan bilgilendir",
        category="Ekip",
        duration_seconds=45,
        risk="low",
        visible_in_modules=[7, 8],
    ),
    ActionDefinition(
        id="reassess",
        label="Tedavi sonrası yeniden değerlendir",
        category="Değerlendirme",
        duration_seconds=30,
        risk="low",
        visible_in_modules=[5, 6, 8],
    ),
    ActionDefinition(
        id="wait_90",
        label="90 saniye bekle",
        category="Zaman",
        duration_seconds=90,
        risk="critical",
        visible_in_modules=[6, 8],
    ),
)


SCENARIOS: dict[str, dict] = {
    "emergency-anaphylaxis-001": {
        "summary": ScenarioSummary(
            id="emergency-anaphylaxis-001",
            title="Antibiyotik Sonrası Anafilaktik Şok",
            module_id=6,
            difficulty="İleri",
            duration_minutes=12,
            ucep_tags=[
                "Acil hastaya yaklaşım",
                "Anafilaksi",
                "Şok",
                "Akılcı ilaç kullanımı",
                "Hasta güvenliği",
            ],
            horizontal_integrations=[
                "Acil Tıp",
                "Farmakoloji",
                "İmmünoloji",
                "Anesteziyoloji",
            ],
            vertical_integrations=[
                "Temel yaşam desteği",
                "Klinik staj acilleri",
                "İntörn acil nöbeti",
            ],
            minimum_success=78,
            available_actions=list(ACTIONS),
        ),
        "patient": PatientPresentation(
            display_name="Sentetik Hasta 01",
            age=32,
            sex="Kadın",
            chief_complaint="Antibiyotik infüzyonundan dakikalar sonra nefes darlığı ve yaygın kaşıntı",
            appearance="Ajite, soluk ve belirgin sıkıntılı",
            speech="Tek kelimelik cümleler",
            breathing="Yardımcı solunum kasları aktif, yaygın wheezing",
            skin="Yaygın ürtiker ve dudaklarda ödem",
            consciousness="Konfüzyona eğilimli, GKS 14",
        ),
        "initial_vitals": PatientVitals(
            heart_rate=128,
            systolic_bp=78,
            diastolic_bp=44,
            spo2=86,
            respiratory_rate=32,
            temperature_c=36.8,
            gcs=14,
            pain_score=2,
            rhythm="Sinüs taşikardisi",
        ),
        "clues": [
            "Yeni antibiyotik maruziyeti",
            "Yaygın ürtiker ve mukozal ödem",
            "Hipotansiyon",
            "Bronkospazm ve hipoksemi",
            "Hızlı başlangıç",
        ],
        "objectives": [
            "Anafilaksiyi ilk iki dakika içinde tanı",
            "Adrenalini gecikmeden uygun doz ve yoldan uygula",
            "Oksijen ve dolaşım desteğini başlat",
            "Ekip görevlerini açık ve kapalı döngü iletişimle dağıt",
            "Tedavi yanıtını yeniden değerlendir",
        ],
    }
}


def list_scenarios() -> list[ScenarioSummary]:
    return [deepcopy(value["summary"]) for value in SCENARIOS.values()]


def get_scenario(scenario_id: str) -> dict:
    try:
        return deepcopy(SCENARIOS[scenario_id])
    except KeyError as exc:
        raise KeyError(f"Unknown scenario: {scenario_id}") from exc
