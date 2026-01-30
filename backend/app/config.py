import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
# config.py 在 backend/app/，所以 parent.parent = backend/

def get_env_file() -> str:
    env = os.getenv("ENV", "dev").lower()
    filename = ".env.prod" if env == "prod" else ".env.dev"
    return str(BASE_DIR / filename)


class Settings(BaseSettings):
    env: str = "dev"
    database_url: str
    frontend_origin: str
    seed_demo_data: int = 0
    admin_token_ttl_seconds: int = 3600

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

    class Config:
        env_file = get_env_file()
        env_file_encoding = "utf-8"


settings = Settings()
