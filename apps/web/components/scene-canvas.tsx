"use client";

import { ContactShadows, Environment, Gltf, Grid, OrbitControls, TransformControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { Project, SceneItem } from "@diorama/types";

export function SceneCanvas({ items, projects, selectedId, setSelectedId }: { items: SceneItem[]; projects: Project[]; selectedId: string | null; setSelectedId: (id: string) => void }) {
  const ready = new Map(projects.map((project) => [project.id, project]));
  return <div className="canvas"><Canvas camera={{ position: [4, 3, 6], fov: 45 }}><ambientLight intensity={0.5} /><rectAreaLight position={[0, 4, 1]} width={5} height={3} intensity={8} /><Room />{items.map((item) => { const selected = item.id === selectedId; const project = ready.get(item.projectId); return project ? <TransformControls key={item.id} enabled={selected} mode="translate"><group position={item.position} rotation={item.rotation} scale={item.scale} onClick={(event) => { event.stopPropagation(); setSelectedId(item.id); }}><Gltf src={`/api/proxy/projects/${project.id}/export`} /></group></TransformControls> : null; })}<Grid args={[6, 6]} /><ContactShadows position={[0, 0, 0]} /><Environment preset="city" /><OrbitControls makeDefault /></Canvas></div>;
}

function Room() {
  return <group><mesh position={[0, -0.01, 0]}><boxGeometry args={[6, 0.02, 6]} /><meshStandardMaterial color="#202027" /></mesh><mesh position={[0, 1.5, -3]}><boxGeometry args={[6, 3, 0.05]} /><meshStandardMaterial color="#171a22" /></mesh><mesh position={[-3, 1.5, 0]}><boxGeometry args={[0.05, 3, 6]} /><meshStandardMaterial color="#141720" /></mesh><mesh position={[3, 1.5, 0]}><boxGeometry args={[0.05, 3, 6]} /><meshStandardMaterial color="#141720" /></mesh></group>;
}
