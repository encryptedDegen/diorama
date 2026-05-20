"use client";

import type { Project, TextProjectCreate } from "@diorama/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { api } from "@/lib/api";

type Mode = "text" | "image";

export default function HomePage() {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects,
    refetchInterval: (query) =>
      query.state.data?.some((project) => project.status !== "READY") ? 15_000 : false,
  });
  const [mode, setMode] = useState<Mode>("text");
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (form: HTMLFormElement) =>
      mode === "text" ? api.createText(readTextForm(form)) : api.createImage(readImageForm(form)),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await mutation.mutateAsync(form);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create project");
    }
  }

  return (
    <>
      <section className="hero">
        <Card>
          <CardContent>
            <Badge>Palatial SimReady Studio</Badge>
            <h1 className="title">Generate assets. Stage worlds.</h1>
            <p className="muted">
              A black-box asset studio for creating Palatial SimReady projects, monitoring status,
              previewing GLBs, and arranging ready assets into scenes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge>Generate</Badge>
          </CardHeader>
          <CardContent>
            <form className="form" onSubmit={submit}>
              <div className="tabs">
                <Button
                  variant={mode === "text" ? "default" : "secondary"}
                  type="button"
                  onClick={() => setMode("text")}
                >
                  Text to 3D
                </Button>
                <Button
                  variant={mode === "image" ? "default" : "secondary"}
                  type="button"
                  onClick={() => setMode("image")}
                >
                  Image to 3D
                </Button>
              </div>
              <Label>
                Name
                <Input name="name" required placeholder="Eames lounge chair" />
              </Label>
              <Label>
                Description
                <Textarea name="description" required rows={3} placeholder="Materials, form, scale..." />
              </Label>
              {mode === "image" ? (
                <Label>
                  Reference image
                  <Input name="file" type="file" accept="image/*" required />
                </Label>
              ) : null}
              <Options />
              {error ? <p className="muted">{error}</p> : null}
              <Button disabled={mutation.isPending}>{mutation.isPending ? "Generating..." : "Generate"}</Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <div className="section-title">
        <div>
          <Badge>Library</Badge>
          <h2>Asset Library</h2>
        </div>
        <p className="muted">{data.length} projects</p>
      </div>
      <div className="grid">
        {data.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link className="ui-card asset-card" href={`/projects/${project.id}`}>
      <div className="thumb">
        {project.thumbnail_url ? <img src={project.thumbnail_url} alt="" /> : <span>3D</span>}
      </div>
      <CardContent>
        <Badge>{project.status} · {project.progress}%</Badge>
        <h3>{project.name}</h3>
        <p className="muted">{project.description}</p>
      </CardContent>
    </Link>
  );
}

function Options() {
  return (
    <>
      <Label>
        Articulation
        <Select name="articulation" defaultValue="rigid">
          <option value="single">Single object</option>
          <option value="rigid">Rigid parts</option>
          <option value="articulated">Articulated parts</option>
        </Select>
      </Label>
      <Label>
        Triangle count
        <Select name="triangle_count" defaultValue="auto">
          <option value="auto">auto</option>
          <option value="minimal">minimal</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="x_high">x_high</option>
        </Select>
      </Label>
      <Label>
        Mesh quality
        <Select name="mesh_quality" defaultValue="high">
          <option value="medium">medium</option>
          <option value="high">high</option>
        </Select>
      </Label>
      <Label>
        Collision quality
        <Select name="collision_quality" defaultValue="sdf">
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="sdf">sdf</option>
        </Select>
      </Label>
      <label className="switch-row">
        <input name="replace_glass" type="checkbox" />
        Replace glass
      </label>
    </>
  );
}

function readTextForm(form: HTMLFormElement): TextProjectCreate {
  const data = new FormData(form);
  const articulation = data.get("articulation");
  const triangle_count = String(data.get("triangle_count") ?? "auto");
  if (articulation === "articulated" && !["minimal", "low"].includes(triangle_count)) {
    throw new Error("Articulated projects require triangle_count to be minimal or low.");
  }
  return {
    name: String(data.get("name") ?? ""),
    description: String(data.get("description") ?? ""),
    mesh_quality: String(data.get("mesh_quality") ?? "high") as TextProjectCreate["mesh_quality"],
    collision_quality: String(
      data.get("collision_quality") ?? "sdf",
    ) as TextProjectCreate["collision_quality"],
    enable_parts_segmentation: articulation === "rigid",
    create_articulation: articulation === "articulated",
    triangle_count: triangle_count as TextProjectCreate["triangle_count"],
    replace_glass: data.get("replace_glass") === "on",
  };
}

function readImageForm(form: HTMLFormElement): FormData {
  const data = new FormData(form);
  const articulation = data.get("articulation");
  const triangle_count = String(data.get("triangle_count") ?? "auto");
  if (articulation === "articulated" && !["minimal", "low"].includes(triangle_count)) {
    throw new Error("Articulated projects require triangle_count to be minimal or low.");
  }
  data.delete("articulation");
  data.set("enable_parts_segmentation", String(articulation === "rigid"));
  data.set("create_articulation", String(articulation === "articulated"));
  data.set("replace_glass", String(data.get("replace_glass") === "on"));
  return data;
}
