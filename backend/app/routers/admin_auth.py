from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..config import settings
from datetime import datetime, timedelta, timezone
from typing import Optional

router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])
ADMIN_EXPIRES_AT: Optional[datetime] = None

class LoginIn(BaseModel):
    password: str

@router.post("/login")
def login(data: LoginIn):
    global ADMIN_EXPIRES_AT

    if not settings.admin_password:
        raise HTTPException(status_code=500, detail="ADMIN_PASSWORD not set")

    if data.password != settings.admin_password:
        raise HTTPException(status_code=401, detail="Invalid password")

    if not settings.admin_token:
        raise HTTPException(status_code=500, detail="ADMIN_TOKEN not set")

    ttl = getattr(settings, "admin_token_ttl_seconds", 3600) or 3600
    ADMIN_EXPIRES_AT = datetime.now(timezone.utc) + timedelta(seconds=ttl)

    return {
        "token": settings.admin_token,
        "expires_at": ADMIN_EXPIRES_AT.isoformat(),
    }

