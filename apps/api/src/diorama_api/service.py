from __future__ import annotations

from datetime import UTC, datetime

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Project
from .palatial import PalatialStatusResponse
from .schemas import ProjectOut


def apply_status(project: Project, status: PalatialStatusResponse) -> None:
    project.status = str(status.get("status") or project.status)
    project.total_steps = int(status.get("totalSteps") or project.total_steps or 1)
    project.completed_steps = int(status.get("completedSteps") or project.completed_steps or 0)
    project.progress = int(status.get("progress") or project.progress or 0)
    project.display_text = status.get("displayText")
    project.status_updated_at = datetime.now(UTC)


async def refresh_project(request: Request, session: AsyncSession, project: Project) -> Project:
    if project.status == "READY":
        return project
    status = await request.app.state.palatial.get_status(project.palatial_id)
    apply_status(project, status)
    await session.commit()
    await session.refresh(project)
    return project


def project_out(request: Request, project: Project) -> ProjectOut:
    out = ProjectOut.model_validate(project)
    if project.thumbnail_path:
        filename = project.thumbnail_path.removeprefix("uploads/")
        out.thumbnail_url = str(request.url_for("get_upload", filename=filename))
    return out
