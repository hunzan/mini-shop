# app/routers/admin_uploads.py
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from ..deps import require_admin

router = APIRouter(prefix="/admin/uploads", tags=["admin-uploads"])

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_BYTES = 5 * 1024 * 1024  # 5MB

EXT = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

@router.post("/image", dependencies=[Depends(require_admin)])
async def upload_image(file: UploadFile = File(...)):
    ct = (file.content_type or "").lower()
    if ct not in ALLOWED_MIME:
        raise HTTPException(status_code=415, detail="Unsupported image type")

    ext = EXT.get(ct)
    if not ext:
        raise HTTPException(status_code=415, detail="Unsupported image type")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large")

    filename = f"{uuid.uuid4().hex}{ext}"
    save_path = UPLOAD_DIR / filename
    save_path.write_bytes(data)

    return {"filename": filename, "url": f"/uploads/{filename}"}
