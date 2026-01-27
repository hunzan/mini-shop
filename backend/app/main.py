from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import Base, engine, SessionLocal
from .routers import products, orders, admin, categories, admin_products, admin_categories
from .seed import seed_products
from .models.order_item import OrderItem  # noqa: F401


app = FastAPI(title="A-kâu Shop API", version="0.1.0")
app.include_router(admin_categories.router)

# ✅ 靜態檔：uploads（圖片會放這裡）
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"  # backend/uploads
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# ✅ CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# 線上前端（從 ENV 讀；你 Railway 要設 FRONTEND_ORIGIN）
if settings.frontend_origin:
    origins.append(settings.frontend_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # ✅ 加入 https://julie-shop.up.railway.app
    allow_credentials=False,        # ✅ 你現在用 token header，不需要 cookies
    allow_methods=["*"],
    allow_headers=["*"],            # ✅ 允許 X-Admin-Token
)

Base.metadata.create_all(bind=engine)

# ✅ seed demo data（只在允許時）
if settings.seed_demo_data == 1:
    with SessionLocal() as db:
        seed_products(db)

# routers
app.include_router(categories.router)
app.include_router(admin_products.router)

app.include_router(products.router)
app.include_router(orders.router)
app.include_router(admin.router)

@app.get("/health", tags=["health"])
def health():
    return {"ok": True}

@app.post("/dev/seed", tags=["dev"])
def dev_seed():
    with SessionLocal() as db:
        seed_products(db)
    return {"ok": True}

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

@app.get("/debug/cors")
def debug_cors():
    return {
        "frontend_origin": settings.frontend_origin,
    }
