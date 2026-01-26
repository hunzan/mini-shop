from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models.product import Product
from ..schemas.product import ProductOut, ProductPublicOut

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductPublicOut])
def list_products(db: Session = Depends(get_db)):
    return (
        db.query(Product)
        .filter(Product.is_active == True)
        .order_by(Product.id.asc())
        .all()
    )


@router.get("/admin", response_model=list[ProductOut])
def list_products_admin(db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.id.asc()).all()


@router.get("/{product_id}", response_model=ProductPublicOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    p = (
        db.query(Product)
        .filter(Product.id == product_id, Product.is_active == True)
        .first()
    )
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p
