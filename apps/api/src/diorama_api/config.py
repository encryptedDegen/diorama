from functools import lru_cache

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../../.env", extra="ignore")

    database_url_raw: str = Field(alias="DATABASE_URL")
    palatial_api_key: str = Field(alias="PALATIAL_API_KEY")
    palatial_base_url: str = Field(
        default="https://dashboard.palatial.cloud/api/v1/external", alias="PALATIAL_BASE_URL"
    )
    diorama_api_key: str = Field(alias="DIORAMA_API_KEY")
    web_origin: str = Field(default="http://localhost:3000", alias="WEB_ORIGIN")
    uploads_dir: str = Field(default="/data/uploads", alias="UPLOADS_DIR")
    log_level: str = Field(default="info", alias="LOG_LEVEL")
    poll_interval_seconds: int = Field(default=15, alias="POLL_INTERVAL_SECONDS")

    @computed_field  # type: ignore[prop-decorator]
    @property
    def database_url(self) -> str:
        if self.database_url_raw.startswith("postgresql://"):
            return self.database_url_raw.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self.database_url_raw


@lru_cache
def get_settings() -> Settings:
    return Settings()
