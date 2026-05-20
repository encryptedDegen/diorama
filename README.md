# Diorama

Diorama is a monorepo for generating Palatial SimReady assets from text or images, browsing them in a library, viewing GLB exports, and composing assets into scenes.

## Deploy

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/<slug>)

One click provisions:
- **diorama-api** — FastAPI service
- **diorama-db** — Postgres

Required variables: `PALATIAL_API_KEY`, `DIORAMA_API_KEY`, `WEB_ORIGIN`.

Deploy `apps/web` separately to Vercel or Railway and set `NEXT_PUBLIC_API_BASE_URL` plus server-only `DIORAMA_API_KEY`.

## Local Development

```bash
pnpm install
cd apps/api && uv sync && cd ../..
cp .env.example .env
docker compose up -d db
pnpm db:migrate
pnpm dev
```

The web app runs on `http://localhost:3000`; the API runs on `http://localhost:8000`.

## TODO

- CAD to SimReady upload form.
- Multi-user auth and workspace selection.
- Physics, undo/redo, multi-select, and scene sharing.
- S3/R2 storage backend.
