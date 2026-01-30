from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import Base, engine, SessionLocal
from .routers import products, orders, admin, categories, admin_products, admin_categories, admin_auth
from .seed import seed_products
from .models.order_item import OrderItem  # noqa: F401

app = FastAPI()

def parse_origins(value: str | None) -> list[str]:
    """
    支援：
    - 單一 origin：https://xxx.up.railway.app
    - 多個 origin（逗號分隔）：https://a,https://b
    """
    if not value:
        return []
    parts = [p.strip() for p in value.split(",")]
    return [p for p in parts if p]

# ✅ dev + 本機（shop/admin）
origins = [
    "http://localhost:5173",  # shop dev
    "http://localhost:5174",  # admin dev（如果你有跑 dev:admin）
    "http://localhost:4174",  # admin preview
    "http://127.0.0.1:5173",  # 你如果有用到
    "http://127.0.0.1:5174",
    "http://127.0.0.1:4174",
    "http://localhost:4173",
]

# ✅ 線上前端（可多個，用逗號分隔）
origins += parse_origins(settings.frontend_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,   # 你走 token header，不用 cookies
    allow_methods=["*"],
    allow_headers=["*"],       # ✅ 含 X-Admin-Token
)

# ✅ 靜態檔：uploads（圖片會放這裡）
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"  # backend/uploads
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# ✅ DB / seed
Base.metadata.create_all(bind=engine)

if settings.seed_demo_data == 1:
    with SessionLocal() as db:
        seed_products(db)

# routers
app.include_router(categories.router)
app.include_router(admin_categories.router)
app.include_router(admin_products.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(admin.router)
app.include_router(admin_auth.router)


@app.get("/health", tags=["health"])
def health():
    return {"ok": True}

@app.post("/dev/seed", tags=["dev"])
def dev_seed():
    with SessionLocal() as db:
        seed_products(db)
    return {"ok": True}

@app.get("/debug/admin-auth")
def debug_admin_auth():
    p = getattr(settings, "admin_password", None) or ""
    t = getattr(settings, "admin_token", None) or ""
    return {
        "env": settings.env,
        "admin_password_set": bool(p),
        "admin_password_len": len(p),
        "admin_token_set": bool(t),
        "admin_token_len": len(t),
        "frontend_origin": settings.frontend_origin,
    }
