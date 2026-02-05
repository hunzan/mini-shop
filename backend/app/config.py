# app/config.py
import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/

def get_env() -> str:
    # Railway 通常會直接設環境變數；本機沒設就 dev
    return os.getenv("ENV", "dev").strip().lower()

def get_env_file() -> str:
    filename = ".env.prod" if get_env() == "prod" else ".env.dev"
    return str(BASE_DIR / filename)

class Settings(BaseSettings):
    # ✅ 讓 settings.env 真的反映 ENV
    env: str = get_env()

    # ✅ 給預設值：本機不設 DATABASE_URL 也能跑起來（你要的 dev.db）
    database_url: str = "sqlite:///./dev.db"

    frontend_origin: str = ""
    seed_demo_data: int = 0
    admin_token_ttl_seconds: int = 3600

    allow_dev_reset: int = 0

    enable_email_notify: int = 0
    admin_notify_email: str | None = None

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_name: str = "A-kâu Shop"
    smtp_from_email: str | None = None

    admin_token: str | None = None
    admin_password: str | None = None
    upload_dir: str | None = None

    # ✅ pydantic-settings v2 推薦用 model_config
    model_config = SettingsConfigDict(
        env_file=get_env_file(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()
