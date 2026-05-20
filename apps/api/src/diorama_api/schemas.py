from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

TriangleCount = Literal["minimal", "low", "medium", "high", "x_high", "auto"]


class GenerateBase(BaseModel):
    name: str = Field(min_length=1)
    description: str = Field(min_length=1)
    mesh_quality: Literal["medium", "high"] = "high"
    collision_quality: Literal["low", "medium", "high", "sdf"] = "sdf"
    enable_parts_segmentation: bool = True
    create_articulation: bool = False
    triangle_count: TriangleCount = "auto"
    replace_glass: bool = False

    @model_validator(mode="after")
    def validate_articulation(self) -> GenerateBase:
        if self.create_articulation and self.triangle_count not in {"minimal", "low"}:
            raise ValueError("Articulated projects require triangle_count to be minimal or low.")
        return self


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    palatial_id: str
    kind: Literal["text", "image"]
    name: str
    description: str
    params: dict[str, object]
    status: str
    display_text: str | None
    progress: int
    total_steps: int
    completed_steps: int
    thumbnail_url: str | None = None
    created_at: datetime
    updated_at: datetime
    status_updated_at: datetime


class SceneItem(BaseModel):
    id: str
    projectId: UUID
    position: tuple[float, float, float]
    rotation: tuple[float, float, float]
    scale: tuple[float, float, float]


class SceneCreate(BaseModel):
    name: str = Field(min_length=1)
    items: list[SceneItem] = Field(default_factory=list)


class SceneUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    items: list[SceneItem] | None = None


class SceneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    items: list[SceneItem]
    created_at: datetime
    updated_at: datetime

    @field_validator("items", mode="before")
    @classmethod
    def parse_items(cls, value: object) -> object:
        return value or []


class HealthOut(BaseModel):
    ok: bool
    database: bool
    palatial_reachable: bool
