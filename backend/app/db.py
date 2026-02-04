# app/db.py
from __future__ import annotations

from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import settings

db_url: str = settings.database_url or ""
is_sqlite = db_url.startswith("sqlite")

# SQLite：給 FastAPI 用的常見設定
connect_args = {"check_same_thread": False, "timeout": 30} if is_sqlite else {}

def _ensure_sqlite_dir(url: str) -> None:
    """確保 sqlite 檔案所在資料夾存在，避免 unable to open database file"""
    prefix = "sqlite:///"
    if not url.startswith("sqlite") or prefix not in url:
        return

    path_str = url.split(prefix, 1)[1]  # 可能是 /data/app.db、./dev.db、C:/xxx.db
    if not path_str:
        return

    db_path = Path(path_str).expanduser()
    db_dir = db_path.parent if str(db_path.parent) else Path(".")
    db_dir.mkdir(parents=True, exist_ok=True)

if is_sqlite:
    _ensure_sqlite_dir(db_url)

engine_kwargs = {
    "connect_args": connect_args,
}

# Postgres / MySQL 之類：才需要 pool 設定
if not is_sqlite:
    engine_kwargs.update(
        pool_pre_ping=True,
        pool_recycle=300,
    )

engine = create_engine(db_url, **engine_kwargs)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
