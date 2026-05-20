"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

const ModelViewer = dynamic(() => import("@/components/model-viewer").then((mod) => mod.ModelViewer), {
  ssr: false,
});

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const { data: project } = useQuery({
    queryKey: ["project", params.id],
    queryFn: () => api.getProject(params.id),
    refetchInterval: (query) => (query.state.data?.status !== "READY" ? 15_000 : false),
  });

  if (!project) return <p>Loading...</p>;

  return (
    <div className="project-layout">
      <Card>
        <CardContent>
          <Badge>{project.status}</Badge>
          <h1 className="title project-title">{project.name}</h1>
          <p className="muted">{project.description}</p>
          <p>{project.display_text ?? `${project.progress}% complete`}</p>
          {project.status === "READY" ? (
            <a className="ui-button ui-button-default" href={`/api/proxy/projects/${project.id}/export`}>
              Download GLB
            </a>
          ) : null}
        </CardContent>
      </Card>
      <section>
        {project.status === "READY" ? (
          <ModelViewer src={`/api/proxy/projects/${project.id}/export`} />
        ) : (
          <Card>
            <CardContent className="empty">
              <div>
                <Badge>Processing</Badge>
                <p>Waiting for Palatial export.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
