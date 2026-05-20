"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ModelViewer } from "@/components/model-viewer";
import { api } from "@/lib/api";

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const { data: project } = useQuery({ queryKey: ["project", params.id], queryFn: () => api.getProject(params.id), refetchInterval: (query) => query.state.data?.status !== "READY" ? 15_000 : false });
  if (!project) return <p>Loading...</p>;
  return <div className="grid"><section className="card"><span className="badge">{project.status}</span><h1>{project.name}</h1><p className="muted">{project.description}</p><p>{project.display_text ?? `${project.progress}% complete`}</p>{project.status === "READY" ? <a className="btn primary" href={`/api/proxy/projects/${project.id}/export`}>Download GLB</a> : null}</section><section>{project.status === "READY" ? <ModelViewer src={`/api/proxy/projects/${project.id}/export`} /> : <div className="card">Waiting for Palatial export.</div>}</section></div>;
}
