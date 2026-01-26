import os
from pydantic_settings import BaseSettings


def get_env_file() -> str:
    """
    決定要讀哪個 env 檔
    優先順序：
    1. OS 環境變數 ENV
    2. 預設 dev
    """
    env = os.getenv("ENV", "dev").lower()
    if env == "prod":
        return ".env.prod"
    return ".env.dev"


class Settings(BaseSettings):
    # 基本環境
    env: str = "dev"

    # DB
    database_url: str

    # CORS
    frontend_origin: str

    # seed 控制
    seed_demo_data: int = 0  # 1 / 0

    # notify (email)
    enable_email_notify: int = 0
    admin_notify_email: str | None = None

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_name: str = "A-kâu Shop"
    smtp_from_email: str | None = None

    admin_token: str | None = None

    class Config:
        env_file = get_env_file()
        env_file_encoding = "utf-8"


settings = Settings()
