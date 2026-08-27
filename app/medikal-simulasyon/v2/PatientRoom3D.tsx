"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import Image from "next/image";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { Group, Mesh } from "three";
import type { ClinicalState } from "../../../services/medical-simulation-v2/engine.js";
import styles from "./simulation-v2.module.css";

export type ExamRegion = "head" | "chest" | "arm";

type ModelProps = {
  state: ClinicalState;
  selectedRegion: ExamRegion;
  onRegionSelect: (region: ExamRegion) => void;
};

function RegionMaterial({ active, color, emissive = "#54ddd5" }: { active: boolean; color: string; emissive?: string }) {
  return <meshStandardMaterial color={color} roughness={0.68} emissive={active ? emissive : "#000000"} emissiveIntensity={active ? 0.42 : 0} />;
}

function Face({ state, skinColor, selectedRegion, onRegionSelect }: ModelProps & { skinColor: string }) {
  const unconscious = state.phase === "vf";
  const distressed = ["assessment", "stemi", "treatment"].includes(state.phase);
  return (
    <group position={[0, 1.35, 0.08]} onClick={() => onRegionSelect("head")} userData={{ role: "exam-hotspot", region: "head" }}>
      <mesh scale={[0.86, 1.02, 0.82]}><sphereGeometry args={[0.37, 48, 48]} /><RegionMaterial active={selectedRegion === "head"} color={skinColor} /></mesh>
      <mesh position={[0, 0.28, -0.1]} scale={[0.9, 0.38, 0.68]}><sphereGeometry args={[0.39, 36, 24]} /><meshStandardMaterial color="#202c32" roughness={0.96} /></mesh>
      <mesh position={[-0.13, 0.07, 0.31]} scale={[1, unconscious ? 0.14 : 1, 1]}><sphereGeometry args={[0.034, 20, 20]} /><meshStandardMaterial color="#111a20" roughness={0.4} /></mesh>
      <mesh position={[0.13, 0.07, 0.31]} scale={[1, unconscious ? 0.14 : 1, 1]}><sphereGeometry args={[0.034, 20, 20]} /><meshStandardMaterial color="#111a20" roughness={0.4} /></mesh>
      <mesh position={[-0.13, 0.14, 0.315]} rotation={[0, 0, distressed ? 0.16 : 0]}><boxGeometry args={[0.13, 0.018, 0.018]} /><meshStandardMaterial color="#382b27" /></mesh>
      <mesh position={[0.13, 0.14, 0.315]} rotation={[0, 0, distressed ? -0.16 : 0]}><boxGeometry args={[0.13, 0.018, 0.018]} /><meshStandardMaterial color="#382b27" /></mesh>
      <mesh position={[0, -0.025, 0.365]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.055, 0.15, 18]} /><meshStandardMaterial color={skinColor} roughness={0.75} /></mesh>
      <mesh position={[0, -0.17, 0.315]} scale={[distressed ? 1.2 : 0.9, unconscious ? 0.5 : 1, 1]}><capsuleGeometry args={[0.022, 0.14, 8, 18]} /><meshStandardMaterial color={unconscious ? "#6f4550" : "#7d3f43"} roughness={0.75} /></mesh>
      {distressed ? <>
        <mesh position={[-0.23, 0.19, 0.3]}><sphereGeometry args={[0.018, 12, 12]} /><meshPhysicalMaterial color="#b9f5f4" transmission={0.5} transparent opacity={0.78} /></mesh>
        <mesh position={[0.22, 0.23, 0.29]}><sphereGeometry args={[0.014, 12, 12]} /><meshPhysicalMaterial color="#b9f5f4" transmission={0.5} transparent opacity={0.72} /></mesh>
      </> : null}
    </group>
  );
}

function Electrode({ position, color = "#dceceb" }: { position: [number, number, number]; color?: string }) {
  return <group position={position} rotation={[Math.PI / 2, 0, 0]}>
    <mesh><cylinderGeometry args={[0.055, 0.055, 0.018, 20]} /><meshStandardMaterial color={color} roughness={0.45} /></mesh>
    <mesh position={[0, 0.018, 0]}><cylinderGeometry args={[0.018, 0.018, 0.025, 12]} /><meshStandardMaterial color="#516972" metalness={0.5} /></mesh>
  </group>;
}

function PatientModel({ state, selectedRegion, onRegionSelect }: ModelProps) {
  const group = useRef<Group>(null);
  const chest = useRef<Mesh>(null);
  const cprHands = useRef<Group>(null);
  const critical = state.phase === "vf" || state.vitals.systolic < 80;
  const skinColor = state.phase === "rosc" ? "#c98f70" : critical ? "#8c9aaa" : "#b97859";
  const respiration = Math.max(0, state.vitals.respiratoryRate);
  const breathSpeed = Math.max(0.7, Math.min(2.7, respiration / 12));
  const cprActive = Boolean(state.flags.cprActive) && !state.flags.shockDelivered;

  useFrame(({ clock }) => {
    if (!group.current || !chest.current) return;
    const time = clock.getElapsedTime();
    const breath = state.phase === "vf" ? 0 : Math.sin(time * Math.PI * breathSpeed) * 0.025;
    const compression = cprActive ? Math.max(0, Math.sin(time * Math.PI * 3.6)) * 0.085 : 0;
    chest.current.scale.y = 1 + breath - compression;
    group.current.rotation.z = state.phase === "vf" && !cprActive ? Math.sin(time * 17) * 0.012 : 0;
    if (cprHands.current) cprHands.current.position.y = 0.76 - compression * 3.4;
  });

  return <group ref={group} position={[0, -0.28, 0.1]} rotation={[-0.08, 0, 0]}>
    <Face state={state} skinColor={skinColor} selectedRegion={selectedRegion} onRegionSelect={onRegionSelect} />
    <mesh position={[0, 1.03, 0]} scale={[0.88, 1, 0.82]}><capsuleGeometry args={[0.16, 0.18, 12, 24]} /><meshStandardMaterial color={skinColor} roughness={0.72} /></mesh>
    <mesh ref={chest} position={[0, 0.45, 0]} onClick={() => onRegionSelect("chest")} userData={{ role: "exam-hotspot", region: "chest" }}><capsuleGeometry args={[0.48, 0.72, 14, 32]} /><RegionMaterial active={selectedRegion === "chest"} color="#25758a" /></mesh>
    <mesh position={[0, 0.78, 0.42]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.11, 0.024, 12, 36]} /><meshStandardMaterial color="#c5ecee" roughness={0.55} /></mesh>
    <Electrode position={[-0.24, 0.66, 0.43]} color="#f2cd64" />
    <Electrode position={[0.24, 0.66, 0.43]} color="#72d5bd" />
    <Electrode position={[-0.18, 0.31, 0.45]} color="#f07f77" />
    <Electrode position={[0.18, 0.31, 0.45]} color="#e9eff0" />
    <group position={[-0.62, 0.48, 0.02]} rotation={[0, 0, 0.2]} onClick={() => onRegionSelect("arm")} userData={{ role: "exam-hotspot", region: "arm" }}>
      <mesh><capsuleGeometry args={[0.14, 0.56, 10, 24]} /><RegionMaterial active={selectedRegion === "arm"} color={skinColor} /></mesh>
      <mesh position={[-0.08, -0.44, 0.02]} rotation={[0, 0, 0.18]}><capsuleGeometry args={[0.115, 0.42, 10, 22]} /><RegionMaterial active={selectedRegion === "arm"} color={skinColor} /></mesh>
      <mesh position={[-0.13, -0.73, 0.03]} scale={[0.92, 1.08, 0.7]}><sphereGeometry args={[0.15, 24, 24]} /><RegionMaterial active={selectedRegion === "arm"} color={skinColor} /></mesh>
      <mesh position={[-0.01, -0.22, 0.15]} visible={state.flags.monitorIv}><torusGeometry args={[0.145, 0.025, 10, 28]} /><meshStandardMaterial color="#62a6db" /></mesh>
    </group>
    <group position={[0.62, 0.48, 0.02]} rotation={[0, 0, -0.2]} onClick={() => onRegionSelect("arm")} userData={{ role: "exam-hotspot", region: "arm" }}>
      <mesh><capsuleGeometry args={[0.14, 0.56, 10, 24]} /><RegionMaterial active={selectedRegion === "arm"} color={skinColor} /></mesh>
      <mesh position={[0.08, -0.44, 0.02]} rotation={[0, 0, -0.18]}><capsuleGeometry args={[0.115, 0.42, 10, 22]} /><RegionMaterial active={selectedRegion === "arm"} color={skinColor} /></mesh>
      <mesh position={[0.13, -0.73, 0.03]} scale={[0.92, 1.08, 0.7]}><sphereGeometry args={[0.15, 24, 24]} /><RegionMaterial active={selectedRegion === "arm"} color={skinColor} /></mesh>
    </group>
    <mesh position={[0, -0.34, 0.06]} scale={[1.35, 0.85, 0.66]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#d6ebed" roughness={0.92} /></mesh>
    <mesh position={[0, -0.33, 0.4]} scale={[1.18, 0.72, 0.08]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#bcd9dd" roughness={0.88} /></mesh>
    <group ref={cprHands} position={[0, 0.76, 0.58]} visible={cprActive}>
      <mesh rotation={[0.08, 0, 0.08]} scale={[1.35, 0.52, 0.7]}><sphereGeometry args={[0.18, 24, 24]} /><meshStandardMaterial color="#e4b08d" roughness={0.72} /></mesh>
      <mesh position={[0.02, 0.11, 0.01]} rotation={[0.08, 0, -0.08]} scale={[1.35, 0.52, 0.7]}><sphereGeometry args={[0.18, 24, 24]} /><meshStandardMaterial color="#dca57f" roughness={0.72} /></mesh>
    </group>
    <group position={[0, 0.92, 0.48]} visible={state.flags.titratedOxygen}>
      <mesh scale={[1, 0.68, 0.42]}><sphereGeometry args={[0.21, 26, 26]} /><meshPhysicalMaterial color="#8de8df" transmission={0.45} transparent opacity={0.52} roughness={0.25} /></mesh>
      <mesh position={[0, -0.14, 0.01]}><torusGeometry args={[0.19, 0.012, 8, 32]} /><meshStandardMaterial color="#d6f8f3" /></mesh>
    </group>
  </group>;
}

function ClinicalEquipment({ state }: { state: ClinicalState }) {
  const resuscitationActive = state.phase === "vf" || state.flags.shockDelivered;
  return <>
    <group position={[-1.7, 0.05, 0.25]} visible={state.flags.monitorIv}>
      <mesh position={[0, 0.08, 0]}><cylinderGeometry args={[0.025, 0.025, 2.65, 12]} /><meshStandardMaterial color="#b9c9cc" metalness={0.8} roughness={0.25} /></mesh>
      <mesh position={[0, 1.36, 0]}><boxGeometry args={[0.38, 0.5, 0.07]} /><meshPhysicalMaterial color="#9be8dc" transparent opacity={0.58} transmission={0.28} /></mesh>
      <mesh position={[0, -1.22, 0]}><cylinderGeometry args={[0.38, 0.38, 0.06, 20]} /><meshStandardMaterial color="#344d58" metalness={0.6} /></mesh>
    </group>
    <group position={[1.65, -0.5, 0.32]} visible={state.flags.titratedOxygen}>
      <mesh><cylinderGeometry args={[0.2, 0.24, 1.12, 24]} /><meshStandardMaterial color="#e8f1f1" roughness={0.38} /></mesh>
      <mesh position={[0, 0.64, 0]}><cylinderGeometry args={[0.08, 0.08, 0.18, 16]} /><meshStandardMaterial color="#4fd8c9" emissive="#1d7c78" emissiveIntensity={0.6} /></mesh>
    </group>
    <group position={[1.78, -0.67, -0.38]} visible={resuscitationActive}>
      <mesh position={[0, 0.35, 0]}><boxGeometry args={[0.96, 0.76, 0.5]} /><meshStandardMaterial color="#152c38" roughness={0.55} /></mesh>
      <mesh position={[0, 0.45, 0.26]}><planeGeometry args={[0.68, 0.36]} /><meshStandardMaterial color={state.phase === "vf" ? "#ff4168" : "#55e1dc"} emissive={state.phase === "vf" ? "#8d1733" : "#176d70"} emissiveIntensity={1.2} /></mesh>
      <mesh position={[-0.32, 0.9, 0]} rotation={[0, 0, -0.15]}><boxGeometry args={[0.23, 0.42, 0.16]} /><meshStandardMaterial color="#dce8e9" /></mesh>
      <mesh position={[0.32, 0.9, 0]} rotation={[0, 0, 0.15]}><boxGeometry args={[0.23, 0.42, 0.16]} /><meshStandardMaterial color="#dce8e9" /></mesh>
    </group>
  </>;
}

function ClinicalRoom({ state, selectedRegion, onRegionSelect, showProceduralPatient }: ModelProps & { showProceduralPatient: boolean }) {
  const roomColor = useMemo(() => state.phase === "vf" ? "#210b17" : "#061722", [state.phase]);
  return <>
    <color attach="background" args={[roomColor]} />
    <fog attach="fog" args={[roomColor, 6, 14]} />
    <ambientLight intensity={0.82} />
    <directionalLight position={[3, 5, 4]} intensity={2.6} color="#d8fbff" />
    <pointLight position={[-3, 2, 2]} intensity={state.phase === "vf" ? 3.1 : 1.5} color={state.phase === "vf" ? "#ff355f" : "#39d8cf"} />
    <mesh position={[0, -1.14, 0]}><boxGeometry args={[3.6, 0.25, 2.4]} /><meshStandardMaterial color="#c8d8dc" roughness={0.9} /></mesh>
    <mesh position={[0, 0.86, -0.46]} scale={[1.12, 0.48, 0.24]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#dbe9e9" roughness={0.95} /></mesh>
    <mesh position={[-1.68, -0.46, 0]}><boxGeometry args={[0.07, 1.34, 2.28]} /><meshStandardMaterial color="#7e969d" metalness={0.72} roughness={0.3} /></mesh>
    <mesh position={[1.68, -0.46, 0]}><boxGeometry args={[0.07, 1.34, 2.28]} /><meshStandardMaterial color="#7e969d" metalness={0.72} roughness={0.3} /></mesh>
    <mesh position={[0, -1.38, 0]}><boxGeometry args={[4, 0.2, 2.8]} /><meshStandardMaterial color="#263b48" roughness={0.75} /></mesh>
    <mesh position={[-2.7, 0.25, -0.9]}><boxGeometry args={[1.22, 1.78, 0.25]} /><meshStandardMaterial color="#102c3c" emissive="#08202c" emissiveIntensity={0.8} /></mesh>
    <ClinicalEquipment state={state} />
    <group visible={showProceduralPatient}><PatientModel state={state} selectedRegion={selectedRegion} onRegionSelect={onRegionSelect} /></group>
  </>;
}

export default function PatientRoom3D({ state, selectedRegion, onRegionSelect }: ModelProps) {
  const patientSprite = state.phase === "vf"
    ? "/medical-simulation/v2/synthetic-stemi-patient-vf-v1.png"
    : "/medical-simulation/v2/synthetic-stemi-patient-v1.png";
  const [spriteReady, setSpriteReady] = useState(false);
  const cprActive = Boolean(state.flags.cprActive);

  useEffect(() => setSpriteReady(false), [patientSprite]);

  return <div className={styles.threeScene} data-phase={state.phase} data-selected-region={selectedRegion}>
    <Canvas camera={{ position: [0, 1.15, 5.35], fov: 39 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: false }}>
      <Suspense fallback={null}><ClinicalRoom state={state} selectedRegion={selectedRegion} onRegionSelect={onRegionSelect} showProceduralPatient={!spriteReady} /></Suspense>
    </Canvas>
    <div className={styles.realisticPatient} data-phase={state.phase} data-cpr={cprActive} data-ready={spriteReady}>
      <Image
        key={patientSprite}
        src={patientSprite}
        alt="Eylemlere göre klinik durumu değişen fotogerçekçi sentetik hasta"
        fill
        sizes="(max-width: 760px) 100vw, 68vw"
        onLoad={() => setSpriteReady(true)}
      />
    </div>
    <div className={styles.patientEquipmentOverlay} aria-hidden="true">
      {state.flags.monitorIv ? <div className={styles.electrodeSet}><i /><i /><i /><i /><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M38 45 C28 60 24 77 13 94 M47 49 C43 68 45 79 37 98 M56 49 C63 66 66 79 67 98 M64 45 C76 61 82 77 88 94" /></svg></div> : null}
      {state.flags.titratedOxygen ? <div className={styles.oxygenMask}><i /><span /></div> : null}
      {state.phase === "vf" || state.flags.shockDelivered ? <div className={styles.defibPads}><i /><i /></div> : null}
      {cprActive ? <div className={styles.cprOverlay}><i /><i /></div> : null}
    </div>
    <div className={styles.sceneStatus} data-critical={state.phase === "vf"}><span>{state.phase === "vf" ? "KOD MAVİ" : state.phase === "rosc" ? "ROSC" : "CANLI HASTA"}</span><strong>{state.phase === "vf" ? "Yanıtsız · VF" : state.phase === "rosc" ? "Organize ritim" : "Uyanık · göğüs ağrılı"}</strong></div>
    <div className={styles.sceneHotspots} aria-label="Hasta üzerinde muayene bölgesi seçimi">
      <button type="button" data-selected={selectedRegion === "head"} data-testid="exam-hotspot-head" onClick={() => onRegionSelect("head")}><span>01</span>Baş / genel durum</button>
      <button type="button" data-selected={selectedRegion === "chest"} data-testid="exam-hotspot-chest" onClick={() => onRegionSelect("chest")}><span>02</span>Göğüs</button>
      <button type="button" data-selected={selectedRegion === "arm"} data-testid="exam-hotspot-arm" onClick={() => onRegionSelect("arm")}><span>03</span>Periferik dolaşım</button>
    </div>
    <p className={styles.sceneAlternative}>Erişilebilir sahne özeti: {state.phase === "vf" ? "Hasta yanıtsız; monitörde VF ve resüsitasyon ekipmanı hazır." : state.phase === "rosc" ? "Organize ritim ve spontan solunum geri döndü." : "Hasta uyanık, terli ve göğüs ağrılı; solunumu ve uygulanan ekipmanlar görünür."}</p>
  </div>;
}
