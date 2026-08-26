"""Sequential TEYS curriculum, UÇEP portfolio guardrails and integration map."""

from __future__ import annotations

from .models import (
    CompetencyLevel,
    CurriculumModule,
    CurriculumPortfolio,
    CurriculumResponse,
    IntegrationAxis,
    ModuleState,
)


MODULE_BLUEPRINTS: tuple[dict, ...] = (
    {
        "id": 1,
        "code": "VP-01",
        "title": "Sanal Hasta",
        "summary": "İlk karşılaşma, anamnez, muayene, vital bulgular ve iletişim.",
        "minimum": 70,
        "skills": ["Anamnez", "Fizik muayene", "Vital değerlendirme", "Hasta iletişimi"],
        "scenarios": 6,
        "ucep": 9,
        "autonomy": 2,
        "horizontal": ["İletişim becerileri", "Temel klinik bilimler", "Profesyonellik"],
        "vertical": ["Klinik öncesi beceri laboratuvarı", "Dönem III hasta başı hazırlık"],
    },
    {
        "id": 2,
        "code": "CBL-02",
        "title": "Olguya Dayalı Öğrenme",
        "summary": "Klinik bilgilerin aşamalı açılması ve karar gerekçelendirme.",
        "minimum": 72,
        "skills": ["Olgu çözümleme", "Bilgi isteme", "Gerekçe kurma", "Kanıt seçme"],
        "scenarios": 8,
        "ucep": 9,
        "autonomy": 3,
        "horizontal": ["Patofizyoloji", "Farmakoloji", "Toplum sağlığı"],
        "vertical": ["Dönem II kurul olguları", "Dönem IV klinik stajları"],
    },
    {
        "id": 3,
        "code": "CR-03",
        "title": "Klinik Akıl Yürütme",
        "summary": "Problem temsili, hipotez, ayırıcı tanı, kırmızı bayrak ve belirsizlik.",
        "minimum": 75,
        "skills": ["Problem temsili", "Hipotez güncelleme", "Ayırıcı tanı", "Belirsizlik yönetimi"],
        "scenarios": 10,
        "ucep": 10,
        "autonomy": 3,
        "horizontal": ["Kanıta dayalı tıp", "Biyoistatistik", "Tanısal karar"],
        "vertical": ["Dönem III klinik akıl yürütme", "İntörnlük vaka yönetimi"],
    },
    {
        "id": 4,
        "code": "DX-04",
        "title": "Tanı ve Tetkik",
        "summary": "Tetkik gerekçesi, maliyet, zaman, tanısal değer ve gereksiz istem kontrolü.",
        "minimum": 75,
        "skills": ["Tetkik seçimi", "Sonuç yorumlama", "Kaynak kullanımı", "Maliyet farkındalığı"],
        "scenarios": 9,
        "ucep": 9,
        "autonomy": 4,
        "horizontal": ["Laboratuvar tıbbı", "Radyoloji", "Mikrobiyoloji"],
        "vertical": ["Temel bilim sonuç yorumu", "Klinik staj tanısal süreçleri"],
    },
    {
        "id": 5,
        "code": "TX-05",
        "title": "Tedavi ve Müdahale",
        "summary": "İlaç, doz, uygulama yolu, sıvı, oksijen, prosedür ve izlem kararları.",
        "minimum": 75,
        "skills": ["Tedavi planı", "Doz ve yol", "Prosedür seçimi", "Yeniden değerlendirme"],
        "scenarios": 10,
        "ucep": 10,
        "autonomy": 4,
        "horizontal": ["Farmakoloji", "Hasta güvenliği", "Etik"],
        "vertical": ["Reçete becerisi", "Klinik staj tedavi planı", "İntörn uygulaması"],
    },
    {
        "id": 6,
        "code": "ER-06",
        "title": "Acil Durum Simülasyonları",
        "summary": "ABCDE, resüsitasyon, şok, anafilaksi, travma ve zaman kritik kararlar.",
        "minimum": 78,
        "skills": ["ABCDE", "Zaman kritik müdahale", "Monitörizasyon", "Resüsitasyon"],
        "scenarios": 12,
        "ucep": 9,
        "autonomy": 4,
        "horizontal": ["Acil tıp", "Anesteziyoloji", "Kardiyoloji", "Farmakoloji"],
        "vertical": ["Temel yaşam desteği", "İleri yaşam desteği", "İntörn acil nöbeti"],
    },
    {
        "id": 7,
        "code": "TEAM-07",
        "title": "Ekip Yönetimi & Klinik Liderlik",
        "summary": "Görev dağılımı, kapalı döngü iletişim, SBAR ve kriz kaynak yönetimi.",
        "minimum": 80,
        "skills": ["Görev dağıtımı", "SBAR", "Kapalı döngü iletişim", "Klinik liderlik"],
        "scenarios": 8,
        "ucep": 7,
        "autonomy": 5,
        "horizontal": ["Hemşirelik iş birliği", "Hasta güvenliği", "Sağlık yönetimi"],
        "vertical": ["Erken ekip teması", "Staj ekip çalışması", "İntörn liderliği"],
    },
    {
        "id": 8,
        "code": "INT-08",
        "title": "Entegre Klinik Simülasyon",
        "summary": "Önceki yedi modülün az yönlendirmeli, bütünleşik final senaryosu.",
        "minimum": 82,
        "skills": ["Bütüncül vaka yönetimi", "Bağımsız karar", "Ekip liderliği", "Sonuç değerlendirme"],
        "scenarios": 6,
        "ucep": 7,
        "autonomy": 5,
        "horizontal": ["Tüm klinik disiplinler", "Etik", "Kalite ve güvenlik"],
        "vertical": ["Program çıktıları", "İntörnlük", "Mezuniyete geçiş"],
    },
)


def competency_level(score: int) -> CompetencyLevel:
    if score >= 90:
        return CompetencyLevel.ADVANCED
    if score >= 75:
        return CompetencyLevel.COMPETENT
    if score >= 50:
        return CompetencyLevel.DEVELOPING
    return CompetencyLevel.NOVICE


def validate_curriculum_portfolio() -> CurriculumPortfolio:
    ucep = sum(int(module["ucep"]) for module in MODULE_BLUEPRINTS)
    autonomy = sum(int(module["autonomy"]) for module in MODULE_BLUEPRINTS)
    total = ucep + autonomy
    valid = ucep >= 70 and autonomy <= 30 and total == 100
    return CurriculumPortfolio(
        ucep_percent=ucep,
        autonomy_percent=autonomy,
        total_percent=total,
        policy="Program portföyü en az %70 UÇEP çekirdeği ve en fazla %30 kurumsal özerklik içerir.",
        valid=valid,
    )


def build_curriculum(
    completed_modules: list[int] | None = None,
    competency_scores: dict[int, int] | None = None,
    active_module_id: int | None = None,
) -> CurriculumResponse:
    completed = set(completed_modules or [])
    scores = competency_scores or {}
    modules: list[CurriculumModule] = []

    for blueprint in MODULE_BLUEPRINTS:
        module_id = int(blueprint["id"])
        prerequisites = list(range(1, module_id))
        prerequisite_failures = [
            prerequisite
            for prerequisite in prerequisites
            if prerequisite not in completed
            or scores.get(prerequisite, 0)
            < int(MODULE_BLUEPRINTS[prerequisite - 1]["minimum"])
        ]
        score = max(0, min(100, int(scores.get(module_id, 0))))
        minimum = int(blueprint["minimum"])

        if module_id in completed and score >= minimum:
            state = ModuleState.COMPLETED
            completion = 100
        elif prerequisite_failures:
            state = ModuleState.LOCKED
            completion = 0
        elif active_module_id == module_id:
            state = ModuleState.IN_PROGRESS
            completion = max(8, min(94, score))
        else:
            state = ModuleState.AVAILABLE
            completion = max(0, min(70, score))

        lock_reason = None
        if prerequisite_failures:
            first = prerequisite_failures[0]
            prerequisite_title = str(MODULE_BLUEPRINTS[first - 1]["title"])
            prerequisite_minimum = int(MODULE_BLUEPRINTS[first - 1]["minimum"])
            lock_reason = (
                f"Önce {first:02d} — {prerequisite_title} modülünde "
                f"en az %{prerequisite_minimum} yeterlilik tamamlanmalıdır."
            )

        scenarios_total = int(blueprint["scenarios"])
        scenarios_completed = scenarios_total if state == ModuleState.COMPLETED else min(
            scenarios_total - 1,
            max(0, round((completion / 100) * scenarios_total)),
        )
        next_target = (
            "Bir sonraki modüle geçiş yeterliliği kazanıldı."
            if state == ModuleState.COMPLETED
            else lock_reason
            or f"En az %{minimum} başarı ve kritik güvenlik hatası olmadan senaryoyu tamamla."
        )

        modules.append(
            CurriculumModule(
                id=module_id,
                code=str(blueprint["code"]),
                title=str(blueprint["title"]),
                summary=str(blueprint["summary"]),
                state=state,
                completion_percent=completion,
                competency_score=score,
                competency_level=competency_level(score),
                minimum_success=minimum,
                skills=list(blueprint["skills"]),
                scenarios_completed=scenarios_completed,
                scenarios_total=scenarios_total,
                next_target=next_target,
                prerequisites=prerequisites,
                lock_reason=lock_reason,
                ucep_weight=int(blueprint["ucep"]),
                autonomy_weight=int(blueprint["autonomy"]),
                integration=IntegrationAxis(
                    horizontal=list(blueprint["horizontal"]),
                    vertical=list(blueprint["vertical"]),
                ),
            )
        )

    portfolio = validate_curriculum_portfolio()
    if not portfolio.valid:
        raise RuntimeError("TEYS curriculum violates the 70/30 portfolio policy")

    return CurriculumResponse(
        programme="Medical Education Management System (MAMS) / Tıp Eğitimi Yönetim Sistemi (TEYS)",
        loop="GÖZLEMLE → DÜŞÜN → KARAR VER → UYGULA → SONUCU GÖR → DEĞERLENDİR → YENİDEN DENE",
        modules=modules,
        portfolio=portfolio,
        active_module_id=active_module_id,
    )


def module_access_allowed(
    module_id: int,
    completed_modules: list[int],
    competency_scores: dict[int, int],
) -> tuple[bool, str | None]:
    curriculum = build_curriculum(
        completed_modules=completed_modules,
        competency_scores=competency_scores,
        active_module_id=module_id,
    )
    module = curriculum.modules[module_id - 1]
    return module.state != ModuleState.LOCKED, module.lock_reason
