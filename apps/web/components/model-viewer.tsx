"use client";

import { Environment, Gltf, OrbitControls, Grid, ContactShadows } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

export function ModelViewer({ src }: { src?: string }) {
  return <div className="canvas"><Canvas camera={{ position: [3, 2, 4], fov: 45 }}><ambientLight intensity={0.6} /><directionalLight position={[4, 6, 4]} intensity={2} />{src ? <Gltf src={src} scale={1.4} /> : null}<Grid args={[8, 8]} /><ContactShadows position={[0, -0.02, 0]} opacity={0.45} blur={2} /><Environment preset="city" /><OrbitControls makeDefault /></Canvas></div>;
}
