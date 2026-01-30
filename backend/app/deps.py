# backend/app/deps.py
from datetime import datetime, timezone
from fastapi import Header, HTTPException
from .config import settings
from .routers import admin_auth


def require_admin(x_admin_token: str | None = Header(default=None)):
    if not settings.admin_token:
        raise HTTPException(status_code=500, detail="ADMIN_TOKEN not set")

    if not x_admin_token or x_admin_token != settings.admin_token:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # ✅ 這裡改成每次動態讀 admin_auth.ADMIN_EXPIRES_AT
    expires_at = admin_auth.ADMIN_EXPIRES_AT
    if expires_at is None:
        raise HTTPException(status_code=401, detail="Session expired")

    now = datetime.now(timezone.utc)
    if now >= expires_at:
        raise HTTPException(status_code=401, detail="Session expired")

require_admin_key = require_admin
