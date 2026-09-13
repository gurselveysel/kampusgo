const ENGINE_VERSION = "teys-deterministic-physiology/4.0.0";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function seededUnit(seed, step) {
  let value = (seed ^ Math.imul(step + 1, 0x9e3779b1)) >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 4294967295;
}

function deriveVitals(snapshot) {
  const { latent, treatment, phase } = snapshot;
  if (latent.rhythm === "vf" || phase === "vf") {
    return {
      heartRate: 0,
      systolic: 0,
      diastolic: 0,
      spo2: Math.max(55, Math.round(79 - latent.arrestSeconds / 40)),
      respiratoryRate: 0,
      temperature: 36.6,
      etco2: treatment.cprActive ? Math.round(17 + latent.cprQuality * 15) : 5,
      rhythm: "vf",
    };
  }

  const recovery = latent.rhythm === "rosc" || latent.reperfused ? 1 : 0;
  const heartRate = clamp(86 + latent.ischemiaBurden * 38 + latent.catecholamine * 12 - recovery * 14, 42, 176);
  const systolic = clamp(132 * latent.perfusion - latent.ischemiaBurden * 24 - latent.vasodilationInjury * 52 + recovery * 10, 45, 190);
  const respiratoryRate = clamp(13 + latent.ischemiaBurden * 11 + latent.catecholamine * 3 - recovery * 4, 8, 38);
  const spo2 = clamp(97 - (1 - latent.oxygenReserve) * 19 + (treatment.titratedOxygen ? 2 : 0), 70, 100);

  return {
    heartRate: Math.round(heartRate),
    systolic: Math.round(systolic),
    diastolic: Math.round(systolic * 0.62),
    spo2: Math.round(spo2),
    respiratoryRate: Math.round(respiratoryRate),
    temperature: 36.6,
    etco2: recovery ? 34 : null,
    rhythm: latent.rhythm === "rosc" ? "rosc" : phase === "stemi" || phase === "treatment" ? "stemi" : "sinus",
  };
}

export class DeterministicPhysiologyEngine {
  #snapshot = null;
  #explanation = {
    summary: "Motor henüz başlatılmadı.",
    changed: [],
    validation: "DOĞRULANMADI",
  };

  initialize(patient, scenario, seed) {
    const profile = scenario.physiology ?? {};
    const difficulty = scenario.difficulty ?? {};
    this.#snapshot = {
      engineVersion: ENGINE_VERSION,
      validationStatus: "DOĞRULANMADI",
      patientId: patient.id,
      scenarioId: scenario.id,
      seed,
      elapsedSeconds: 0,
      phase: "assessment",
      configuration: {
        progressionRate: Number(difficulty.progressionRate ?? 1),
        deteriorationAtSeconds: Math.max(120, Number(difficulty.deteriorationAtSeconds ?? 600) + Number(profile.deteriorationOffsetSeconds ?? 0)),
      },
      latent: {
        coronaryOcclusion: Number(profile.coronaryOcclusion ?? 0.94),
        ischemiaBurden: Number(profile.ischemiaBurden ?? 0.61),
        electricalInstability: Number(profile.electricalInstability ?? 0.24),
        perfusion: Number(profile.perfusion ?? 0.83),
        oxygenReserve: Number(profile.oxygenReserve ?? 0.84),
        catecholamine: Number(profile.catecholamine ?? 0.46),
        vasodilationInjury: 0,
        reperfused: false,
        rhythm: "sinus",
        arrestSeconds: 0,
        cprQuality: 0,
        shockCount: 0,
      },
      treatment: {
        aspirin: false,
        anticoagulant: false,
        titratedOxygen: false,
        cprActive: false,
        shockDelivered: false,
      },
      vitals: null,
    };
    this.#snapshot.vitals = deriveVitals(this.#snapshot);
    this.#explanation = {
      summary: "Sentetik koroner oklüzyon; iskemi, perfüzyon ve elektriksel instabiliteyi birlikte etkiliyor.",
      changed: ["initial-state"],
      validation: "DOĞRULANMADI",
    };
    return this.snapshot();
  }

  applyClinicalEvent(event) {
    if (!this.#snapshot) throw new Error("PhysiologyEngine.initialize çağrılmalıdır.");
    const before = this.snapshot();
    const latent = this.#snapshot.latent;
    const treatment = this.#snapshot.treatment;
    const changed = [];

    if (event.actionId === "aspirin") {
      treatment.aspirin = true;
      changed.push("platelet-protection");
    }
    if (event.actionId === "heparin") {
      treatment.anticoagulant = true;
      changed.push("anticoagulant-context");
    }
    if (event.actionId === "nitroglycerin" && event.contraindicated) {
      latent.vasodilationInjury = clamp(latent.vasodilationInjury + 0.74);
      latent.perfusion = clamp(latent.perfusion - 0.26, 0.25, 1);
      changed.push("vasodilation-injury", "perfusion");
    }
    if (event.actionId === "titrated_oxygen") {
      treatment.titratedOxygen = true;
      latent.oxygenReserve = clamp(latent.oxygenReserve + 0.07);
      changed.push("oxygen-reserve");
    }
    if (event.actionId === "transfer_cath") {
      latent.reperfused = true;
      latent.coronaryOcclusion = 0.08;
      latent.electricalInstability = clamp(latent.electricalInstability - 0.2);
      latent.perfusion = clamp(latent.perfusion + 0.13);
      changed.push("coronary-occlusion", "perfusion", "electrical-instability");
    }
    if (event.actionId === "start_cpr") {
      treatment.cprActive = true;
      latent.cprQuality = 0.68;
      changed.push("cpr-quality");
    }
    if (event.actionId === "defibrillate") {
      treatment.shockDelivered = true;
      treatment.cprActive = false;
      latent.shockCount += 1;
      changed.push("shock-count");
    }
    if (event.actionId === "resume_cpr") {
      treatment.cprActive = true;
      latent.cprQuality = clamp(latent.cprQuality + 0.2);
      changed.push("cpr-quality");
    }
    if (event.actionId === "achieve_rosc") {
      treatment.cprActive = false;
      latent.rhythm = "rosc";
      latent.reperfused = true;
      latent.coronaryOcclusion = 0.1;
      latent.perfusion = 0.79;
      latent.oxygenReserve = 0.87;
      latent.electricalInstability = 0.18;
      changed.push("rhythm", "perfusion", "oxygen-reserve", "electrical-instability");
    }

    this.#snapshot.vitals = deriveVitals(this.#snapshot);
    this.#explanation = {
      summary: changed.length
        ? `Klinik olay latent fizyolojide ${changed.join(", ")} alanlarını değiştirdi.`
        : "Klinik olay doğrudan vital yazmadı; zaman, bilgi veya ekip durumuyla işlendi.",
      changed,
      before: before.vitals,
      after: clone(this.#snapshot.vitals),
      validation: "DOĞRULANMADI",
    };
    return { snapshot: this.snapshot(), explanation: this.explainTransition() };
  }

  advanceTime(delta) {
    if (!this.#snapshot) throw new Error("PhysiologyEngine.initialize çağrılmalıdır.");
    const seconds = Math.max(0, Math.round(Number(delta)));
    const before = this.snapshot();
    let remaining = seconds;
    while (remaining > 0) {
      const step = Math.min(15, remaining);
      const minutes = step / 60;
      const latent = this.#snapshot.latent;
      const treatment = this.#snapshot.treatment;
      const progressionRate = this.#snapshot.configuration.progressionRate;
      this.#snapshot.elapsedSeconds += step;

      if (latent.rhythm === "vf" || this.#snapshot.phase === "vf") {
        latent.rhythm = "vf";
        latent.arrestSeconds += step;
        if (treatment.cprActive) {
          latent.cprQuality = clamp(latent.cprQuality + minutes * 0.06);
          latent.perfusion = clamp(latent.perfusion + minutes * 0.01, 0.15, 0.55);
          latent.oxygenReserve = clamp(latent.oxygenReserve - minutes * 0.014);
        } else {
          latent.perfusion = clamp(latent.perfusion - minutes * 0.045, 0.05, 1);
          latent.oxygenReserve = clamp(latent.oxygenReserve - minutes * 0.07);
        }
        remaining -= step;
        continue;
      }

      const occlusionLoad = latent.reperfused ? 0.06 : latent.coronaryOcclusion;
      const plateletFactor = treatment.aspirin ? 0.72 : 1;
      latent.ischemiaBurden = clamp(latent.ischemiaBurden + minutes * 0.014 * occlusionLoad * plateletFactor * progressionRate);
      latent.electricalInstability = clamp(
        latent.electricalInstability + minutes * (0.011 + Math.max(0, latent.ischemiaBurden - 0.58) * 0.045) * progressionRate,
      );
      latent.oxygenReserve = clamp(latent.oxygenReserve - minutes * (treatment.titratedOxygen ? 0.001 : 0.006) * progressionRate);
      latent.catecholamine = clamp(latent.catecholamine + minutes * 0.006 * progressionRate - (latent.reperfused ? minutes * 0.02 : 0));
      latent.vasodilationInjury = clamp(latent.vasodilationInjury - minutes * 0.022);
      latent.perfusion = clamp(
        latent.perfusion - minutes * (0.0022 + latent.ischemiaBurden * 0.0028) * progressionRate - latent.vasodilationInjury * minutes * 0.014 + (latent.reperfused ? minutes * 0.018 : 0),
        0.25,
        1,
      );

      const vfThreshold = 0.36 + seededUnit(this.#snapshot.seed, Math.floor(this.#snapshot.elapsedSeconds / 30)) * 0.045;
      if (
        !latent.reperfused
        && this.#snapshot.elapsedSeconds >= this.#snapshot.configuration.deteriorationAtSeconds
        && latent.electricalInstability >= vfThreshold
        && ["stemi", "treatment"].includes(this.#snapshot.phase)
      ) {
        latent.rhythm = "vf";
        latent.arrestSeconds = 0;
        this.#snapshot.phase = "vf";
        remaining = 0;
      } else {
        remaining -= step;
      }
    }

    this.#snapshot.vitals = deriveVitals(this.#snapshot);
    this.#explanation = {
      summary: this.#snapshot.latent.rhythm === "vf"
        ? "Tedavi edilmemiş iskemi, seed'e bağlı elektriksel instabilite eşiğini aşarak VF oluşturdu."
        : "Zaman adımı iskemi, perfüzyon, oksijen rezervi ve elektriksel instabiliteyi birlikte yeniden hesapladı.",
      changed: ["time", "ischemia-burden", "perfusion", "oxygen-reserve", "electrical-instability"],
      before: before.vitals,
      after: clone(this.#snapshot.vitals),
      validation: "DOĞRULANMADI",
    };
    return { snapshot: this.snapshot(), explanation: this.explainTransition() };
  }

  observe(channels = ["vitals"]) {
    if (!this.#snapshot) throw new Error("PhysiologyEngine.initialize çağrılmalıdır.");
    const observation = {};
    if (channels.includes("vitals")) observation.vitals = clone(this.#snapshot.vitals);
    if (channels.includes("latent")) observation.latent = clone(this.#snapshot.latent);
    if (channels.includes("treatment")) observation.treatment = clone(this.#snapshot.treatment);
    return observation;
  }

  snapshot() {
    if (!this.#snapshot) throw new Error("PhysiologyEngine.initialize çağrılmalıdır.");
    const snapshot = clone(this.#snapshot);
    snapshot.rhythm = snapshot.latent.rhythm;
    return snapshot;
  }

  restore(snapshot) {
    if (!snapshot || snapshot.engineVersion !== ENGINE_VERSION) throw new Error("Uyumsuz fizyoloji snapshot'ı.");
    this.#snapshot = clone(snapshot);
    this.#snapshot.vitals = deriveVitals(this.#snapshot);
  }

  setPhase(phase) {
    if (!this.#snapshot) throw new Error("PhysiologyEngine.initialize çağrılmalıdır.");
    this.#snapshot.phase = phase;
    if (phase === "vf") this.#snapshot.latent.rhythm = "vf";
    this.#snapshot.vitals = deriveVitals(this.#snapshot);
  }

  explainTransition() {
    return clone(this.#explanation);
  }
}

export { ENGINE_VERSION as PHYSIOLOGY_ENGINE_VERSION };
