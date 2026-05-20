from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from fastapi import UploadFile


class LocalStorage:
    def __init__(self, root: str) -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def path_for(self, filename: str | None) -> tuple[str, Path]:
        ext = Path(filename or "upload.bin").suffix or ".bin"
        stored_name = f"{uuid.uuid4()}{ext.lower()}"
        return f"uploads/{stored_name}", self.root / stored_name

    async def save(self, upload: UploadFile) -> tuple[str, Path]:
        relative, path = self.path_for(upload.filename)
        with path.open("wb") as out:
            shutil.copyfileobj(upload.file, out)
        await upload.seek(0)
        return relative, path

    def resolve(self, filename: str) -> Path:
        return self.root / filename
