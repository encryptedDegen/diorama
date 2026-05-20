"use client";

import type { Scene, SceneItem } from "@diorama/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { api } from "@/lib/api";

const SceneCanvas = dynamic(() => import("@/components/scene-canvas").then((mod) => mod.SceneCanvas), {
  ssr: false,
});

export default function ScenesPage() {
  const client = useQueryClient();
  const { data: scenes = [] } = useQuery({ queryKey: ["scenes"], queryFn: api.listScenes });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects,
    refetchInterval: 15_000,
  });
  const ready = projects.filter((project) => project.status === "READY");
  const create = useMutation({
    mutationFn: () => api.createScene({ name: "Untitled scene", items: [] }),
    onSuccess: async () => client.invalidateQueries({ queryKey: ["scenes"] }),
  });
  const update = useMutation({
    mutationFn: (scene: Scene) => api.updateScene(scene.id, { name: scene.name, items: scene.items }),
    onSuccess: async () => client.invalidateQueries({ queryKey: ["scenes"] }),
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const active = scenes.find((scene) => scene.id === activeId) ?? scenes[0];

  useEffect(() => {
    if (!activeId && scenes[0]) setActiveId(scenes[0].id);
  }, [activeId, scenes]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => update.mutate(active), 800);
    return () => window.clearTimeout(timer);
  }, [active?.items, active?.name]);

  function add(projectId: string) {
    if (!active) return;
    const item: SceneItem = {
      id: crypto.randomUUID(),
      projectId,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };
    client.setQueryData<Scene[]>(
      ["scenes"],
      scenes.map((scene) => (scene.id === active.id ? { ...scene, items: [...scene.items, item] } : scene)),
    );
  }

  return (
    <div className="builder">
      <Card>
        <CardHeader>
          <Badge>Scene Builder</Badge>
        </CardHeader>
        <CardContent>
          <Button onClick={() => create.mutate()}>New Scene</Button>
          <div className="tabs">
            {scenes.map((scene) => (
              <Button
                variant={scene.id === active?.id ? "default" : "secondary"}
                key={scene.id}
                onClick={() => setActiveId(scene.id)}
              >
                {scene.name}
              </Button>
            ))}
          </div>
          <h3>Ready assets</h3>
          <div className="form">
            {ready.map((project) => (
              <Button className="asset" variant="secondary" key={project.id} onClick={() => add(project.id)}>
                <span>{project.name}</span>
                <span>Place</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      <section>
        {active ? (
          <SceneCanvas
            items={active.items}
            projects={ready}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
          />
        ) : (
          <Card>
            <CardContent className="empty">
              <div>
                <p>No scene yet.</p>
                <Button onClick={() => create.mutate()}>Create default scene</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
