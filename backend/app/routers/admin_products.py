from fastapi import APIRouter, Depends, Header, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from ..db import get_db
from ..config import settings
from ..models.product import Product
from ..models.category import Category
from ..models.product_shipping_option import ProductShippingOption
from ..models.order_item import OrderItem
from ..deps import require_admin
from ..schemas.admin_product import AdminProductCreate, AdminProductUpdate, AdminProductOut, AdminProductActiveUpdate
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..deps import require_admin_key

_admin=Depends(require_admin_key)


router = APIRouter(prefix="/admin/products", tags=["admin-products"])


@router.delete("/{product_id}", dependencies=[Depends(require_admin)])
def delete_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="商品不存在")

    # ✅ 若商品曾出現在任何訂單明細，禁止刪除（改用下架）
    used = db.query(OrderItem.id).filter(OrderItem.product_id == product_id).first()
    if used:
        raise HTTPException(
            status_code=409,
            detail="此商品已存在於訂單明細中，為保留歷史紀錄，禁止刪除；請改用下架(is_active=false)。",
        )

    db.delete(p)          # shipping_options 會因 relationship cascade 一起刪（你已設 cascade）
    db.commit()
    return {"ok": True, "deleted_product_id": product_id}


def require_admin(x_admin_token: str | None = Header(default=None)):
    if not x_admin_token or x_admin_token != settings.admin_token:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _validate_category(db: Session, category_id: int | None):
    if category_id is None:
        return
    ok = db.query(Category.id).filter(Category.id == category_id).first()
    if not ok:
        raise HTTPException(status_code=400, detail=f"Invalid category_id: {category_id}")


def _validate_shipping_options(options: list[dict]):
    seen = set()
    for o in options:
        m = o["method"]
        if m in seen:
            raise HTTPException(status_code=400, detail=f"Duplicate shipping method: {m}")
        seen.add(m)


@router.get("", response_model=list[AdminProductOut], dependencies=[Depends(require_admin)])
def list_products(db: Session = Depends(get_db)):
    rows = db.query(Product).order_by(Product.id.desc()).all()
    return rows


@router.post("", response_model=AdminProductOut, dependencies=[Depends(require_admin)])
def create_product(payload: AdminProductCreate, db: Session = Depends(get_db)):
    _validate_category(db, payload.category_id)
    _validate_shipping_options([o.model_dump() for o in payload.shipping_options])

    p = Product(
        name=payload.name,
        category_id=payload.category_id,
        stock_qty=payload.stock_qty,
        price=payload.price,
        description=payload.description,
        description_text=payload.description_text,
        image_url=payload.image_url,
        is_active=payload.is_active,
    )
    db.add(p)
    db.flush()  # 拿到 p.id

    # ✅ 寄送方式 / 運費
    for o in payload.shipping_options:
        db.add(
            ProductShippingOption(
                product_id=p.id,
                method=o.method,
                fee=o.fee,
                region_note=o.region_note or "",
            )
        )

    db.commit()
    db.refresh(p)
    return p


@router.patch("/{product_id}/active", response_model=AdminProductOut, dependencies=[Depends(require_admin)])
def set_product_active(product_id: int, payload: AdminProductActiveUpdate, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")

    p.is_active = payload.is_active
    db.commit()
    db.refresh(p)
    return p


@router.patch("/{product_id}", response_model=AdminProductOut, dependencies=[Depends(require_admin)])
def update_product(product_id: int, payload: AdminProductUpdate, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")

    # category
    if payload.category_id is not None or payload.category_id is None:
        # 這裡的語意是：payload 有帶 category_id 才會更新
        # 但 Pydantic 會把沒帶的 field 也變成 None，因此用 model_dump(exclude_unset=True) 判斷最準
        pass

    data = payload.model_dump(exclude_unset=True)

    if "category_id" in data:
        _validate_category(db, data["category_id"])
        p.category_id = data["category_id"]

    if "name" in data:
        p.name = data["name"]
    if "stock_qty" in data:
        p.stock_qty = data["stock_qty"]
    if "price" in data:
        p.price = data["price"]
    if "description" in data:
        p.description = data["description"]
    if "description_text" in data:
        p.description_text = data["description_text"]
    if "image_url" in data:
        p.image_url = data["image_url"]
    if "is_active" in data:
        p.is_active = data["is_active"]

    # shipping options：若有送，就整組替換
    if "shipping_options" in data and data["shipping_options"] is not None:
        _validate_shipping_options(data["shipping_options"])
        # 清空舊的（delete-orphan 會處理）
        p.shipping_options.clear()
        for o in data["shipping_options"]:
            p.shipping_options.append(
                ProductShippingOption(
                    method=o["method"],
                    fee=o["fee"],
                    region_note=o.get("region_note", ""),
                )
            )

    db.commit()
    db.refresh(p)
    return p

@router.post("/{product_id}/image", response_model=AdminProductOut, dependencies=[Depends(require_admin)])
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")

    # 基本檢查：type / 副檔名
    ct = (file.content_type or "").lower()
    if ct not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="Only jpg/png/webp allowed")

    ext_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    ext = ext_map.get(ct, "")

    # ✅ 存檔位置：backend/uploads/products/<product_id>/
    base_dir = Path(__file__).resolve().parent.parent.parent / "uploads" / "products" / str(product_id)
    base_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}{ext}"
    save_path = base_dir / filename

    # 存檔（簡單版本：一次讀完；之後要做大檔再改 chunk）
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    save_path.write_bytes(data)

    # ✅ 回填 image_url（用相對路徑，前端可用 API_BASE 拼起來）
    p.image_url = f"/uploads/products/{product_id}/{filename}"
    db.commit()
    db.refresh(p)
    return p
