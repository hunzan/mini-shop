from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..deps import require_admin
from ..models.order import Order
from ..models.order_item import OrderItem
from ..models.product import Product
from ..deps import require_admin_key

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

ALLOWED_STATUS = {"pending", "paid", "shipped", "done", "cancelled"}

@router.get("/orders")
def list_orders(db: Session = Depends(get_db), limit: int = 50, offset: int = 0):
    qs = db.query(Order).order_by(Order.id.desc()).offset(offset).limit(limit).all()
    return [
        {
            "id": o.id,
            "status": getattr(o, "status", "pending"),
            "customer_name": o.customer_name,
            "customer_email": o.customer_email,
            "shipping_method": o.shipping_method,
            "recipient_name": o.recipient_name,
            "recipient_phone": o.recipient_phone,
            "shipping_post_address": o.shipping_post_address,
            "cvs_brand": o.cvs_brand,
            "cvs_store_id": o.cvs_store_id,
            "cvs_store_name": o.cvs_store_name,
            "total_amount": o.total_amount,
        }
        for o in qs
    ]

@router.get("/orders/{order_id}")
def get_order_full(order_id: int, db: Session = Depends(get_db)):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")

    items = (
        db.query(OrderItem, Product)
        .join(Product, Product.id == OrderItem.product_id)
        .filter(OrderItem.order_id == order_id)
        .all()
    )

    return {
        "order": {
            "id": o.id,
            "status": getattr(o, "status", "pending"),
            "customer_name": o.customer_name,
            "customer_email": o.customer_email,
            "shipping_method": o.shipping_method,
            "shipping_address": o.shipping_address,
            "recipient_name": o.recipient_name,
            "recipient_phone": o.recipient_phone,
            "shipping_post_address": o.shipping_post_address,
            "cvs_brand": o.cvs_brand,
            "cvs_store_id": o.cvs_store_id,
            "cvs_store_name": o.cvs_store_name,
            "total_amount": o.total_amount,
        },
        "items": [
            {
                "product_id": p.id,
                "name": p.name,
                "qty": oi.qty,
                "unit_price": oi.unit_price,
                "line_total": oi.qty * oi.unit_price,
            }
            for (oi, p) in items
        ],
    }

@router.patch("/orders/{order_id}/status")
def update_order_status(order_id: int, status: str, db: Session = Depends(get_db)):
    if status not in ALLOWED_STATUS:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")

    o.status = status
    db.commit()
    return {"ok": True, "order_id": order_id, "status": status}
