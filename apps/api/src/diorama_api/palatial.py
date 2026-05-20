from __future__ import annotations

from collections.abc import AsyncIterator
from pathlib import Path
from typing import TypedDict

import httpx
from fastapi import HTTPException, UploadFile

from .config import Settings
from .schemas import GenerateBase


class PalatialCreateResponse(TypedDict, total=False):
    id: str
    name: str
    description: str
    type: str
    status: str | dict[str, object]
    createdAt: str
    parameters: dict[str, object]
    workspace: str


class PalatialStatusResponse(TypedDict, total=False):
    status: str
    totalSteps: int
    completedSteps: int
    progress: int
    displayText: str
    _id: str
    createdAt: str
    updatedAt: str


class PalatialClient:
    def __init__(self, settings: Settings) -> None:
        self._client = httpx.AsyncClient(
            base_url=settings.palatial_base_url.rstrip("/") + "/",
            headers={"x-api-key": settings.palatial_api_key},
            timeout=90,
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def list_projects(self) -> list[dict[str, object]]:
        response = await self._client.get("projects")
        self._raise_for_status(response)
        data = response.json()
        return data if isinstance(data, list) else []

    async def create_text_project(self, payload: GenerateBase) -> PalatialCreateResponse:
        response = await self._client.post("projects/create/texttosim", json=payload.model_dump())
        self._raise_for_status(response)
        return response.json()

    async def create_image_project(
        self, payload: GenerateBase, upload: UploadFile, stored_path: Path
    ) -> PalatialCreateResponse:
        form = {
            key: str(value).lower() if isinstance(value, bool) else str(value)
            for key, value in payload.model_dump().items()
        }
        with stored_path.open("rb") as image_file:
            files = {
                "file": (
                    upload.filename or stored_path.name,
                    image_file,
                    upload.content_type or "application/octet-stream",
                )
            }
            response = await self._client.post("projects/create/imagetosim", data=form, files=files)
        self._raise_for_status(response)
        return response.json()

    async def get_status(self, palatial_id: str) -> PalatialStatusResponse:
        response = await self._client.get(f"projects/{palatial_id}/status")
        self._raise_for_status(response)
        return response.json()

    async def resubmit(self, palatial_id: str) -> dict[str, object]:
        response = await self._client.post(
            f"projects/{palatial_id}/submit", json={"type": "imagetosimready"}
        )
        self._raise_for_status(response)
        return response.json()

    async def stream_export(self, palatial_id: str) -> AsyncIterator[bytes]:
        async with self._client.stream("GET", f"projects/{palatial_id}/media/export") as response:
            self._raise_for_status(response)
            async for chunk in response.aiter_bytes():
                yield chunk

    def _raise_for_status(self, response: httpx.Response) -> None:
        if response.status_code < 400:
            return
        try:
            detail: object = response.json()
        except ValueError:
            detail = response.text
        raise HTTPException(status_code=response.status_code, detail=detail)


def initial_status(response: PalatialCreateResponse) -> str:
    status = response.get("status")
    if isinstance(status, dict):
        nested = status.get("status")
        return str(nested or "SUBMITTED")
    return str(status or "SUBMITTED")
