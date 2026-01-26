from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from ..db import get_db
from ..models.category import Category
from ..schemas.admin_category import (
    AdminCategoryOut,
    AdminCategoryCreate,
    AdminCategoryUpdate,
)
from ..deps import require_admin

router = APIRouter(prefix="/admin/categories", tags=["admin"])


@router.get("", response_model=list[AdminCategoryOut])
def admin_list_categories(
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    rows = (
        db.query(Category)
        .order_by(Category.sort_order.asc(), Category.id.asc())
        .all()
    )
    return rows


@router.post("", response_model=AdminCategoryOut)
def admin_create_category(
    payload: AdminCategoryCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="分類名稱不可為空白。")

    row = Category(
        name=name,
        sort_order=int(payload.sort_order or 0),
        is_active=bool(payload.is_active),
    )
    db.add(row)
    try:
        db.commit()
        db.refresh(row)
        return row
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="分類名稱已存在，請換一個名稱。")


@router.patch("/{category_id}", response_model=AdminCategoryOut)
def admin_update_category(
    category_id: int,
    payload: AdminCategoryUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    row = db.query(Category).filter(Category.id == category_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="找不到分類。")

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="分類名稱不可為空白。")
        row.name = name

    if payload.sort_order is not None:
        row.sort_order = int(payload.sort_order)

    if payload.is_active is not None:
        row.is_active = bool(payload.is_active)

    try:
        db.commit()
        db.refresh(row)
        return row
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="分類名稱已存在，請換一個名稱。")
