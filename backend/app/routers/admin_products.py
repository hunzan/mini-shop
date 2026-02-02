from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_admin
from ..models.product import Product
from ..models.category import Category
from ..models.product_shipping_option import ProductShippingOption
from ..models.order_item import OrderItem
from ..schemas.admin_product import (
    AdminProductCreate,
    AdminProductUpdate,
    AdminProductOut,
    AdminProductActiveUpdate,
)

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
