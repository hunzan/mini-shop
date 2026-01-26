from fastapi import Header, HTTPException
from .config import settings

def require_admin(x_admin_token: str | None = Header(default=None)):
    if not settings.admin_token:
        raise HTTPException(status_code=500, detail="ADMIN_TOKEN not set")
    if x_admin_token != settings.admin_token:
        raise HTTPException(status_code=401, detail="Unauthorized")
