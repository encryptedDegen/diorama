from __future__ import annotations

import asyncio
import contextlib

from sqlalchemy import select

from .db import SessionLocal
from .models import Project
from .palatial import PalatialClient
from .service import apply_status


async def poll_forever(client: PalatialClient, interval_seconds: int) -> None:
    while True:
        await asyncio.sleep(interval_seconds)
        with contextlib.suppress(Exception):
            await poll_once(client)


async def poll_once(client: PalatialClient) -> None:
    async with SessionLocal() as session:
        rows = await session.scalars(select(Project).where(Project.status != "READY"))
        for project in rows.all():
            status = await client.get_status(project.palatial_id)
            apply_status(project, status)
        await session.commit()
