"use client";

import type { TextProjectCreate } from "@diorama/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { api } from "@/lib/api";

type Mode = "text" | "image";

export default function HomePage() {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["projects"], queryFn: api.listProjects, refetchInterval: (query) => query.state.data?.some((project) => project.status !== "READY") ? 15_000 : false });
  const [mode, setMode] = useState<Mode>("text");
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: async (form: HTMLFormElement) => mode === "text" ? api.createText(readTextForm(form)) : api.createImage(readImageForm(form)), onSuccess: async () => { setError(null); await queryClient.invalidateQueries({ queryKey: ["projects"] }); } });

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

  return <><section className="hero"><div className="card"><span className="badge">Palatial SimReady Studio</span><h1 className="title">Generate assets. Stage worlds.</h1><p className="muted">Create 3D assets from prompts or reference images, watch Palatial processing status, preview GLB exports, and compose scenes.</p></div><form className="card form" onSubmit={submit}><div className="tabs"><button className={`btn ${mode === "text" ? "primary" : ""}`} type="button" onClick={() => setMode("text")}>Text to 3D</button><button className={`btn ${mode === "image" ? "primary" : ""}`} type="button" onClick={() => setMode("image")}>Image to 3D</button></div><label className="field">Name<input className="input" name="name" required /></label><label className="field">Description<textarea className="input" name="description" required rows={3} /></label>{mode === "image" ? <label className="field">Reference image<input className="input" name="file" type="file" accept="image/*" required /></label> : null}<Options />{error ? <p className="muted">{error}</p> : null}<button className="btn primary" disabled={mutation.isPending}>Generate</button></form></section><h2>Library</h2><div className="grid">{data.map((project) => <Link className="card" key={project.id} href={`/projects/${project.id}`}><div className="thumb">{project.thumbnail_url ? <img src={project.thumbnail_url} alt="" /> : <span>3D</span>}</div><h3>{project.name}</h3><p className="muted">{project.description}</p><span className="badge">{project.status} · {project.progress}%</span></Link>)}</div></>;
}

function Options() {
  return <><label className="field">Articulation<select className="input" name="articulation" defaultValue="rigid"><option value="single">Single object</option><option value="rigid">Rigid parts</option><option value="articulated">Articulated parts</option></select></label><label className="field">Triangle count<select className="input" name="triangle_count" defaultValue="auto"><option value="auto">auto</option><option value="minimal">minimal</option><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="x_high">x_high</option></select></label><label className="field">Mesh quality<select className="input" name="mesh_quality" defaultValue="high"><option value="medium">medium</option><option value="high">high</option></select></label><label className="field">Collision quality<select className="input" name="collision_quality" defaultValue="sdf"><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="sdf">sdf</option></select></label><label><input name="replace_glass" type="checkbox" /> Replace glass</label></>;
}

function readTextForm(form: HTMLFormElement): TextProjectCreate {
  const data = new FormData(form);
  const articulation = data.get("articulation");
  const triangle_count = String(data.get("triangle_count") ?? "auto");
  if (articulation === "articulated" && !["minimal", "low"].includes(triangle_count)) throw new Error("Articulated projects require triangle_count to be minimal or low.");
  return { name: String(data.get("name") ?? ""), description: String(data.get("description") ?? ""), mesh_quality: String(data.get("mesh_quality") ?? "high") as TextProjectCreate["mesh_quality"], collision_quality: String(data.get("collision_quality") ?? "sdf") as TextProjectCreate["collision_quality"], enable_parts_segmentation: articulation === "rigid", create_articulation: articulation === "articulated", triangle_count: triangle_count as TextProjectCreate["triangle_count"], replace_glass: data.get("replace_glass") === "on" };
}

function readImageForm(form: HTMLFormElement): FormData {
  const data = new FormData(form);
  const articulation = data.get("articulation");
  const triangle_count = String(data.get("triangle_count") ?? "auto");
  if (articulation === "articulated" && !["minimal", "low"].includes(triangle_count)) throw new Error("Articulated projects require triangle_count to be minimal or low.");
  data.delete("articulation");
  data.set("enable_parts_segmentation", String(articulation === "rigid"));
  data.set("create_articulation", String(articulation === "articulated"));
  data.set("replace_glass", String(data.get("replace_glass") === "on"));
  return data;
}
