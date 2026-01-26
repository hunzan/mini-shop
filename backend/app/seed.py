import os
from sqlalchemy.orm import Session

from .db import SessionLocal, Base, engine
from .models.product import Product
from .models.product_shipping_option import ProductShippingOption


def get_or_create_product(db: Session, name: str, defaults: dict) -> Product:
    """
    用 name 當唯一鍵：避免 seed 重複新增商品。
    若已存在就回傳，不覆蓋（避免你後台改過資料又被 seed 蓋掉）
    """
    row = db.query(Product).filter(Product.name == name).first()
    if row:
        return row

    row = Product(**defaults)
    db.add(row)
    db.flush()  # 先拿到 product.id
    return row


def ensure_shipping_options(db: Session, product: Product, options: list[dict]) -> None:
    """
    若商品目前沒有任何 shipping_options，才幫它補上預設選項。
    （避免你之後在後台改過，又被 seed 重複塞）
    """
    existing = (
        db.query(ProductShippingOption)
        .filter(ProductShippingOption.product_id == product.id)
        .count()
    )
    if existing > 0:
        return

    for opt in options:
        db.add(
            ProductShippingOption(
                product_id=product.id,
                method=opt["method"],
                fee=int(opt.get("fee", 0)),
                region_note=str(opt.get("region_note", "")),
            )
        )


def seed_products(db: Session) -> None:
    """
    seed 只做少量示範資料。
    ✅ 分類已前端化：seed 不建立/不修改分類。
    ✅ 示範商品預設下架 is_active=False，且 stock_qty=0，避免買家誤下單。
    """

    # ===== 1) 共用運送選項（示範用） =====
    default_shipping = [
        {"method": "post", "fee": 60, "region_note": ""},
        {"method": "cvs_711", "fee": 45, "region_note": ""},
        {"method": "cvs_family", "fee": 45, "region_note": ""},
        {"method": "courier", "fee": 120, "region_note": "限本島"},
    ]

    # ===== 2) 示範商品（預設下架 / 未分類） =====
    demo_products = [
        {
            "name": "商品 1.",
            "price": 199,
            "description": "示範用短描述（列表用）。",
            "description_text": """
                <p>這是一個示範商品，用於測試：</p>
                <ul>
                  <li>商品列表縮圖</li>
                  <li>商品詳細頁長文（HTML）</li>
                  <li>購物車 + 結帳流程</li>
                </ul>
            """.strip(),
        },
        {
            "name": "商品 2.",
            "price": 99,
            "description": "示範用短描述。",
            "description_text": "<p>示範用長描述（可含 HTML）。</p>",
        },
        {
            "name": "商品 3.",
            "price": 299,
            "description": "示範商品短描述。",
            "description_text": "<p>示範商品長描述。</p>",
        },
    ]

    for dp in demo_products:
        product_defaults = {
            "name": dp["name"],
            "price": dp["price"],
            "description": dp.get("description", ""),
            "description_text": dp.get("description_text", ""),

            # ✅ 分類前端化：未分類（後台再指派）
            "category_id": None,

            # ✅ 雙保險：示範商品預設下架 + 庫存 0
            "is_active": False,
            "stock_qty": 0,

            # 圖片可留空；你若有 demo 圖可改這裡
            "image_url": "",
        }

        p = get_or_create_product(db, dp["name"], product_defaults)
        ensure_shipping_options(db, p, default_shipping)

    db.commit()


def main() -> None:
    """
    ✅ 安全機制：只有當你明確設定 SEED=1 才會執行
    PowerShell：
      $env:SEED="1"
      python -m app.seed
    """
    if os.getenv("SEED") != "1":
        print("[seed] skipped (set SEED=1 to run)")
        return

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_products(db)
        print("[seed] done")
    finally:
        db.close()


if __name__ == "__main__":
    main()
