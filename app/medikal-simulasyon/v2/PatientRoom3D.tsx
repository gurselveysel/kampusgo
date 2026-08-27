"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import type { ClinicalState } from "../../../services/medical-simulation-v2/engine.js";
import styles from "./simulation-v2.module.css";

type Region = "head" | "chest" | "arm";

function PatientModel({ state, onRegionSelect }: { state: ClinicalState; onRegionSelect: (region: Region) => void }) {
  const group = useRef<Group>(null);
  const chest = useRef<Mesh>(null);
  const critical = state.phase === "vf" || state.vitals.systolic < 80;
  const skinColor = state.phase === "rosc" ? "#d6a17f" : critical ? "#9ea7b6" : "#bb7654";
  const respiration = Math.max(0, state.vitals.respiratoryRate);
  const breathSpeed = Math.max(0.7, Math.min(2.6, respiration / 12));
  const accent = state.phase === "vf" ? "#ff5571" : state.phase === "rosc" ? "#44e1b1" : "#5bd5df";

  useFrame(({ clock }) => {
    if (!group.current || !chest.current) return;
    const time = clock.getElapsedTime();
    const breath = state.phase === "vf" ? 0 : Math.sin(time * Math.PI * breathSpeed) * 0.018;
    chest.current.scale.y = 1 + breath;
    group.current.rotation.z = state.phase === "vf" ? Math.sin(time * 18) * 0.012 : 0;
  });

  return (
    <group ref={group} position={[0, -0.2, 0.15]} rotation={[-0.1, 0, 0]}>
      <mesh position={[0, 1.18, 0]} onClick={() => onRegionSelect("head")} userData={{ role: "exam-hotspot", region: "head" }}>
        <sphereGeometry args={[0.34, 40, 40]} />
        <meshStandardMaterial color={skinColor} roughness={0.72} />
      </mesh>
      <mesh position={[-0.115, 1.23, 0.3]}>
        <sphereGeometry args={[0.025, 18, 18]} />
        <meshStandardMaterial color="#152433" />
      </mesh>
      <mesh position={[0.115, 1.23, 0.3]}>
        <sphereGeometry args={[0.025, 18, 18]} />
        <meshStandardMaterial color="#152433" />
      </mesh>
      <mesh ref={chest} position={[0, 0.46, 0]} onClick={() => onRegionSelect("chest")} userData={{ role: "exam-hotspot", region: "chest" }}>
        <capsuleGeometry args={[0.45, 0.76, 12, 28]} />
        <meshStandardMaterial color="#28798b" roughness={0.78} />
      </mesh>
      <mesh position={[-0.59, 0.48, 0]} rotation={[0, 0, 0.22]} onClick={() => onRegionSelect("arm")} userData={{ role: "exam-hotspot", region: "arm" }}>
        <capsuleGeometry args={[0.13, 0.72, 10, 22]} />
        <meshStandardMaterial color={skinColor} roughness={0.75} />
      </mesh>
      <mesh position={[0.59, 0.48, 0]} rotation={[0, 0, -0.22]} onClick={() => onRegionSelect("arm")} userData={{ role: "exam-hotspot", region: "arm" }}>
        <capsuleGeometry args={[0.13, 0.72, 10, 22]} />
        <meshStandardMaterial color={skinColor} roughness={0.75} />
      </mesh>
      <mesh position={[0, -0.24, 0.06]} scale={[1.15, 0.72, 0.62]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#d7eef0" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.6, 0.5]}>
        <torusGeometry args={[0.08, 0.018, 12, 32]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}

function ClinicalEquipment({ state }: { state: ClinicalState }) {
  const oxygenActive = state.flags.titratedOxygen;
  const resuscitationActive = state.phase === "vf" || state.flags.shockDelivered;
  return (
    <>
      <group position={[-1.55, 0.05, 0.35]} visible={state.flags.monitorIv}>
        <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.025, 0.025, 2.5, 12]} /><meshStandardMaterial color="#b9c9cc" metalness={0.8} roughness={0.25} /></mesh>
        <mesh position={[0, 1.26, 0]}><boxGeometry args={[0.42, 0.52, 0.08]} /><meshPhysicalMaterial color="#9be8dc" transparent opacity={0.58} transmission={0.28} /></mesh>
        <mesh position={[0, -1.14, 0]}><cylinderGeometry args={[0.35, 0.35, 0.06, 20]} /><meshStandardMaterial color="#344d58" metalness={0.6} /></mesh>
      </group>
      <group position={[1.52, -0.5, 0.45]} visible={oxygenActive}>
        <mesh><cylinderGeometry args={[0.2, 0.24, 1.1, 24]} /><meshStandardMaterial color="#e8f1f1" roughness={0.38} /></mesh>
        <mesh position={[0, 0.62, 0]}><cylinderGeometry args={[0.08, 0.08, 0.18, 16]} /><meshStandardMaterial color="#4fd8c9" emissive="#1d7c78" emissiveIntensity={0.6} /></mesh>
      </group>
      <group position={[1.7, -0.72, -0.45]} visible={resuscitationActive}>
        <mesh position={[0, 0.35, 0]}><boxGeometry args={[0.9, 0.72, 0.5]} /><meshStandardMaterial color="#152c38" roughness={0.55} /></mesh>
        <mesh position={[0, 0.44, 0.26]}><planeGeometry args={[0.62, 0.34]} /><meshStandardMaterial color={state.phase === "vf" ? "#ff4168" : "#55e1dc"} emissive={state.phase === "vf" ? "#8d1733" : "#176d70"} emissiveIntensity={1.2} /></mesh>
        <mesh position={[-0.32, 0.88, 0]} rotation={[0, 0, -0.15]}><boxGeometry args={[0.22, 0.42, 0.16]} /><meshStandardMaterial color="#dce8e9" /></mesh>
        <mesh position={[0.32, 0.88, 0]} rotation={[0, 0, 0.15]}><boxGeometry args={[0.22, 0.42, 0.16]} /><meshStandardMaterial color="#dce8e9" /></mesh>
      </group>
    </>
  );
}

function ClinicalRoom({ state, onRegionSelect }: { state: ClinicalState; onRegionSelect: (region: Region) => void }) {
  const roomColor = useMemo(() => state.phase === "vf" ? "#270d19" : "#071824", [state.phase]);
  return (
    <>
      <color attach="background" args={[roomColor]} />
      <fog attach="fog" args={[roomColor, 6, 14]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 5, 4]} intensity={2.4} color="#d8fbff" />
      <pointLight position={[-3, 2, 2]} intensity={state.phase === "vf" ? 3 : 1.4} color={state.phase === "vf" ? "#ff355f" : "#39d8cf"} />
      <mesh position={[0, -1.05, 0]}>
        <boxGeometry args={[3.5, 0.25, 2.3]} />
        <meshStandardMaterial color="#c8d8dc" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.78, -0.42]} scale={[1.1, 0.45, 0.24]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#dbe9e9" roughness={0.95} />
      </mesh>
      <mesh position={[-1.63, -0.42, 0]}><boxGeometry args={[0.07, 1.25, 2.22]} /><meshStandardMaterial color="#7e969d" metalness={0.72} roughness={0.3} /></mesh>
      <mesh position={[1.63, -0.42, 0]}><boxGeometry args={[0.07, 1.25, 2.22]} /><meshStandardMaterial color="#7e969d" metalness={0.72} roughness={0.3} /></mesh>
      <mesh position={[0, -1.28, 0]}>
        <boxGeometry args={[3.9, 0.2, 2.7]} />
        <meshStandardMaterial color="#263b48" roughness={0.75} />
      </mesh>
      <mesh position={[-2.6, 0.25, -0.9]}>
        <boxGeometry args={[1.2, 1.7, 0.25]} />
        <meshStandardMaterial color="#102c3c" emissive="#08202c" emissiveIntensity={0.8} />
      </mesh>
      <ClinicalEquipment state={state} />
      <PatientModel state={state} onRegionSelect={onRegionSelect} />
    </>
  );
}

export default function PatientRoom3D({ state, onRegionSelect }: { state: ClinicalState; onRegionSelect: (region: Region) => void }) {
  return (
    <div className={styles.threeScene} data-phase={state.phase}>
      <Canvas camera={{ position: [0, 1.1, 5.2], fov: 42 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: false }}>
        <Suspense fallback={null}>
          <ClinicalRoom state={state} onRegionSelect={onRegionSelect} />
        </Suspense>
      </Canvas>
      <div className={styles.sceneHotspots} aria-label="Hasta üzerinde muayene bölgesi seçimi">
        <button type="button" data-testid="exam-hotspot-head" onClick={() => onRegionSelect("head")}><span>01</span>Baş / genel durum</button>
        <button type="button" data-testid="exam-hotspot-chest" onClick={() => onRegionSelect("chest")}><span>02</span>Göğüs</button>
        <button type="button" data-testid="exam-hotspot-arm" onClick={() => onRegionSelect("arm")}><span>03</span>Periferik dolaşım</button>
      </div>
      <p className={styles.sceneAlternative}>Erişilebilir sahne özeti: {state.phase === "vf" ? "Hasta yanıtsız; monitörde VF." : state.phase === "rosc" ? "Organize ritim ve spontan solunum geri döndü." : "Hasta uyanık, terli ve göğüs ağrılı; solunumu görünür."}</p>
    </div>
  );
}
