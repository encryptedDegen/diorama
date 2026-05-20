"use client";

import type { Scene, SceneItem } from "@diorama/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SceneCanvas } from "@/components/scene-canvas";
import { api } from "@/lib/api";

export default function ScenesPage() {
  const client = useQueryClient();
  const { data: scenes = [] } = useQuery({ queryKey: ["scenes"], queryFn: api.listScenes });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: api.listProjects, refetchInterval: 15_000 });
  const ready = projects.filter((project) => project.status === "READY");
  const create = useMutation({ mutationFn: () => api.createScene({ name: "Untitled scene", items: [] }), onSuccess: async () => client.invalidateQueries({ queryKey: ["scenes"] }) });
  const update = useMutation({ mutationFn: (scene: Scene) => api.updateScene(scene.id, { name: scene.name, items: scene.items }), onSuccess: async () => client.invalidateQueries({ queryKey: ["scenes"] }) });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const active = scenes.find((scene) => scene.id === activeId) ?? scenes[0];

  useEffect(() => { if (!activeId && scenes[0]) setActiveId(scenes[0].id); }, [activeId, scenes]);
  useEffect(() => { if (!active) return; const timer = window.setTimeout(() => update.mutate(active), 800); return () => window.clearTimeout(timer); }, [active?.items, active?.name]);

  function add(projectId: string) {
    if (!active) return;
    const item: SceneItem = { id: crypto.randomUUID(), projectId, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
    client.setQueryData<Scene[]>(["scenes"], scenes.map((scene) => scene.id === active.id ? { ...scene, items: [...scene.items, item] } : scene));
  }

  return <div className="builder"><aside className="card"><button className="btn primary" onClick={() => create.mutate()}>New Scene</button><div className="tabs">{scenes.map((scene) => <button className="btn" key={scene.id} onClick={() => setActiveId(scene.id)}>{scene.name}</button>)}</div><h3>Ready assets</h3>{ready.map((project) => <button className="btn asset" key={project.id} onClick={() => add(project.id)}><span>{project.name}</span><span>Place</span></button>)}</aside><section>{active ? <SceneCanvas items={active.items} projects={ready} selectedId={selectedId} setSelectedId={setSelectedId} /> : <div className="card"><p>No scene yet.</p><button className="btn primary" onClick={() => create.mutate()}>Create default scene</button></div>}</section></div>;
}
