import { NextRequest } from "next/server";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const key = process.env.DIORAMA_API_KEY;

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!key) return new Response("DIORAMA_API_KEY is not configured", { status: 500 });
  const { path } = await context.params;
  const target = new URL(path.join("/"), `${baseUrl.replace(/\/$/, "")}/`);
  target.search = request.nextUrl.search;
  const headers = new Headers(request.headers);
  headers.set("X-Diorama-Key", key);
  headers.delete("host");
  const response = await fetch(target, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.blob(),
    cache: "no-store"
  });
  return new Response(response.body, { status: response.status, headers: response.headers });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
