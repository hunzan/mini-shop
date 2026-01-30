from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import settings

router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])

class LoginIn(BaseModel):
    password: str

@router.post("/login")
def login(data: LoginIn):
    if not settings.admin_password:
        raise HTTPException(status_code=500, detail="ADMIN_PASSWORD not set")

    if data.password != settings.admin_password:
        raise HTTPException(status_code=401, detail="Invalid password")

    if not settings.admin_token:
        raise HTTPException(status_code=500, detail="ADMIN_TOKEN not set")

    # ✅ 回傳「長 token」，前端會存起來之後拿來放 X-Admin-Token
    return {"token": settings.admin_token}
