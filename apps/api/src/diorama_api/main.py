from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Annotated
from uuid import UUID

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .db import get_session
from .models import Project, Scene
from .palatial import PalatialClient, initial_status
from .poller import poll_forever
from .schemas import GenerateBase, HealthOut, ProjectOut, SceneCreate, SceneOut, SceneUpdate
from .service import project_out, refresh_project
from .storage import LocalStorage

settings = get_settings()


async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.palatial = PalatialClient(settings)
    app.state.storage = LocalStorage(settings.uploads_dir)
    task = asyncio.create_task(poll_forever(app.state.palatial, settings.poll_interval_seconds))
    yield
    task.cancel()
    await app.state.palatial.close()


app = FastAPI(title="Diorama API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def require_key(x_diorama_key: str | None = Header(default=None)) -> None:
    if x_diorama_key != settings.diorama_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Diorama API key"
        )


Auth = Depends(require_key)
SessionDep = Depends(get_session)


async def get_project_or_404(session: AsyncSession, project_id: str) -> Project:
    parsed_id = parse_uuid(project_id, "Project not found")
    project = await session.get(Project, parsed_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def parse_uuid(value: str, detail: str) -> UUID:
    try:
        return UUID(value)
    except ValueError:
        raise HTTPException(status_code=404, detail=detail) from None


@app.get("/health", response_model=HealthOut)
async def health(session: AsyncSession = SessionDep) -> HealthOut:
    database = True
    palatial = True
    try:
        await session.execute(text("select 1"))
    except Exception:
        database = False
    try:
        await app.state.palatial.list_projects()
    except Exception:
        palatial = False
    return HealthOut(ok=database, database=database, palatial_reachable=palatial)


@app.get("/projects", response_model=list[ProjectOut], dependencies=[Auth])
async def list_projects(request: Request, session: AsyncSession = SessionDep) -> list[ProjectOut]:
    rows = (await session.scalars(select(Project).order_by(Project.created_at.desc()))).all()
    for row in rows:
        await refresh_project(request, session, row)
    return [project_out(request, row) for row in rows]


@app.post("/projects/text", response_model=ProjectOut, status_code=201, dependencies=[Auth])
async def create_text_project(
    request: Request, payload: GenerateBase, session: AsyncSession = SessionDep
) -> ProjectOut:
    palatial = await request.app.state.palatial.create_text_project(payload)
    project = Project(
        palatial_id=str(palatial["id"]),
        kind="text",
        name=payload.name,
        description=payload.description,
        params=payload.model_dump(),
        status=initial_status(palatial),
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project_out(request, project)


@app.post("/projects/image", response_model=ProjectOut, status_code=201, dependencies=[Auth])
async def create_image_project(
    request: Request,
    file: Annotated[UploadFile, File()],
    name: Annotated[str, Form()],
    description: Annotated[str, Form()],
    mesh_quality: Annotated[str, Form()] = "high",
    collision_quality: Annotated[str, Form()] = "sdf",
    enable_parts_segmentation: Annotated[bool, Form()] = True,
    create_articulation: Annotated[bool, Form()] = False,
    triangle_count: Annotated[str, Form()] = "auto",
    replace_glass: Annotated[bool, Form()] = False,
    session: AsyncSession = SessionDep,
) -> ProjectOut:
    payload = GenerateBase(
        name=name,
        description=description,
        mesh_quality=mesh_quality,
        collision_quality=collision_quality,
        enable_parts_segmentation=enable_parts_segmentation,
        create_articulation=create_articulation,
        triangle_count=triangle_count,
        replace_glass=replace_glass,
    )
    relative_path, stored_path = await request.app.state.storage.save(file)
    palatial = await request.app.state.palatial.create_image_project(payload, file, stored_path)
    project = Project(
        palatial_id=str(palatial["id"]),
        kind="image",
        name=payload.name,
        description=payload.description,
        params=payload.model_dump(),
        status=initial_status(palatial),
        thumbnail_path=relative_path,
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project_out(request, project)


@app.get("/projects/{project_id}", response_model=ProjectOut, dependencies=[Auth])
async def get_project(
    request: Request, project_id: str, session: AsyncSession = SessionDep
) -> ProjectOut:
    project = await get_project_or_404(session, project_id)
    await refresh_project(request, session, project)
    return project_out(request, project)


@app.post("/projects/{project_id}/refresh", response_model=ProjectOut, dependencies=[Auth])
async def force_refresh_project(
    request: Request, project_id: str, session: AsyncSession = SessionDep
) -> ProjectOut:
    project = await get_project_or_404(session, project_id)
    status_payload = await request.app.state.palatial.get_status(project.palatial_id)
    from .service import apply_status

    apply_status(project, status_payload)
    await session.commit()
    await session.refresh(project)
    return project_out(request, project)


@app.post("/projects/{project_id}/resubmit", dependencies=[Auth])
async def resubmit_project(
    request: Request, project_id: str, session: AsyncSession = SessionDep
) -> dict[str, object]:
    project = await get_project_or_404(session, project_id)
    return await request.app.state.palatial.resubmit(project.palatial_id)


@app.get("/projects/{project_id}/export", dependencies=[Auth])
async def export_project(
    request: Request, project_id: str, session: AsyncSession = SessionDep
) -> StreamingResponse:
    project = await get_project_or_404(session, project_id)
    return StreamingResponse(
        request.app.state.palatial.stream_export(project.palatial_id),
        media_type="model/gltf-binary",
        headers={"Content-Disposition": f'attachment; filename="{project.name}.glb"'},
    )


@app.get("/uploads/{filename}", name="get_upload", dependencies=[Auth])
async def get_upload(request: Request, filename: str) -> FileResponse:
    path = request.app.state.storage.resolve(filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Upload not found")
    return FileResponse(path)


@app.get("/scenes", response_model=list[SceneOut], dependencies=[Auth])
async def list_scenes(session: AsyncSession = SessionDep) -> list[SceneOut]:
    return list((await session.scalars(select(Scene).order_by(Scene.created_at.desc()))).all())


@app.post("/scenes", response_model=SceneOut, status_code=201, dependencies=[Auth])
async def create_scene(payload: SceneCreate, session: AsyncSession = SessionDep) -> Scene:
    scene = Scene(name=payload.name, items=[item.model_dump(mode="json") for item in payload.items])
    session.add(scene)
    await session.commit()
    await session.refresh(scene)
    return scene


@app.get("/scenes/{scene_id}", response_model=SceneOut, dependencies=[Auth])
async def get_scene(scene_id: str, session: AsyncSession = SessionDep) -> Scene:
    scene = await session.get(Scene, parse_uuid(scene_id, "Scene not found"))
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    return scene


@app.patch("/scenes/{scene_id}", response_model=SceneOut, dependencies=[Auth])
async def update_scene(
    scene_id: str, payload: SceneUpdate, session: AsyncSession = SessionDep
) -> Scene:
    scene = await session.get(Scene, parse_uuid(scene_id, "Scene not found"))
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    if payload.name is not None:
        scene.name = payload.name
    if payload.items is not None:
        scene.items = [item.model_dump(mode="json") for item in payload.items]
    await session.commit()
    await session.refresh(scene)
    return scene


@app.delete("/scenes/{scene_id}", status_code=204, dependencies=[Auth])
async def delete_scene(scene_id: str, session: AsyncSession = SessionDep) -> None:
    scene = await session.get(Scene, parse_uuid(scene_id, "Scene not found"))
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    await session.delete(scene)
    await session.commit()
