import type { Project, Scene, SceneCreate, SceneUpdate, TextProjectCreate } from "@diorama/types";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  return parse<T>(await fetch(input, init));
}

export const api = {
  listProjects: () => request<Project[]>("/api/proxy/projects", { cache: "no-store" }),
  getProject: (id: string) => request<Project>(`/api/proxy/projects/${id}`, { cache: "no-store" }),
  createText: (payload: TextProjectCreate) => request<Project>("/api/proxy/projects/text", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }),
  createImage: (payload: FormData) => request<Project>("/api/proxy/projects/image", { method: "POST", body: payload }),
  listScenes: () => request<Scene[]>("/api/proxy/scenes", { cache: "no-store" }),
  createScene: (payload: SceneCreate) => request<Scene>("/api/proxy/scenes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }),
  updateScene: (id: string, payload: SceneUpdate) => request<Scene>(`/api/proxy/scenes/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }),
  exportUrl: (id: string) => `${baseUrl}/projects/${id}/export`
};
