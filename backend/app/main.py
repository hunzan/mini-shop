from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import Base, engine, SessionLocal
from .routers import (
    products,
    orders,
    admin,
    categories,
    admin_products,
    admin_categories,
    admin_auth,
    admin_uploads,
)
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


# ✅ dev / local origins（shop/admin）
origins: list[str] = [
    "http://localhost:5173",  # shop dev
    "http://localhost:5174",  # admin dev（如果你有跑 dev:admin）
    "http://localhost:4173",  # shop preview
    "http://localhost:4174",  # admin preview
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:4173",
    "http://127.0.0.1:4174",
]

# ✅ production origins（Railway / 自訂網域）
# settings.frontend_origin 建議設成：
# "https://julie-shop.up.railway.app,https://julie-shop-admin.up.railway.app"
origins += parse_origins(getattr(settings, "frontend_origin", None))

# 去重（保持順序）
seen: set[str] = set()
origins = [o for o in origins if not (o in seen or seen.add(o))]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,  # 你說走 token header，不用 cookies
    allow_methods=["*"],
    allow_headers=["*"],      # 含 Content-Type / Authorization / X-Admin-Token 等
)

# ✅ 靜態檔：uploads（圖片會放這裡）
UPLOAD_DIR = Path(settings.upload_dir) if getattr(settings, "upload_dir", None) else (
    Path(__file__).resolve().parent.parent / "uploads"
)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# ✅ DB / seed
Base.metadata.create_all(bind=engine)

# ✅ 只允許在 dev + 明確開 seed 時才跑
if settings.env == "dev" and settings.seed_demo_data == 1:
    with SessionLocal() as db:
        seed_products(db)

# ✅ routers
app.include_router(categories.router)
app.include_router(admin_categories.router)
app.include_router(admin_products.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(admin.router)
app.include_router(admin_auth.router)
app.include_router(admin_uploads.router)


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
    # ⚠️ 建議 prod 關掉或加 admin token；避免洩漏環境狀態
    p = getattr(settings, "admin_password", None) or ""
    t = getattr(settings, "admin_token", None) or ""
    return {
        "env": getattr(settings, "env", None),
        "admin_password_set": bool(p),
        "admin_password_len": len(p),
        "admin_token_set": bool(t),
        "admin_token_len": len(t),
        "frontend_origin": getattr(settings, "frontend_origin", None),
        "cors_allow_origins": origins,
        "database_url": settings.database_url,
        "env_file": str(
            (Path(__file__).resolve().parent.parent) / (".env.prod" if settings.env == "prod" else ".env.dev")),
    }
