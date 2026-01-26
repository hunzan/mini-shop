from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models.product import Product
from ..models.order import Order
from ..models.order_item import OrderItem
from ..schemas.order import OrderCreate, OrderCreated, OrderShipIn
from fastapi import BackgroundTasks
from ..services.emailer import send_admin_email, send_email
from datetime import datetime, timezone


router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderCreated)
def create_order(
    payload: OrderCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # ====== A) 情境驗證 ======
    def _require(v: str | None) -> str:
        return (v or "").strip()

    m = _require(payload.shipping_method)  # "post" | "courier" | "cvs_711" | "cvs_family"
    is_post = m in ("post", "courier")
    is_cvs = m in ("cvs_711", "cvs_family")

    # 共用必填
    if not _require(payload.customer_name):
        raise HTTPException(status_code=400, detail="customer_name required")
    if not _require(payload.customer_email):
        raise HTTPException(status_code=400, detail="customer_email required")
    if not _require(payload.customer_phone):
        raise HTTPException(status_code=400, detail="customer_phone required")
    if not _require(payload.recipient_name):
        raise HTTPException(status_code=400, detail="recipient_name required")
    if not _require(payload.recipient_phone):
        raise HTTPException(status_code=400, detail="recipient_phone required")

    if is_post:
        post_addr = _require(payload.shipping_post_address) or _require(payload.shipping_address)
        if not post_addr:
            raise HTTPException(status_code=400, detail="shipping_address required for post/courier")

    elif is_cvs:
        # cvs 必填：門市名稱（你前端是 cvs_store_name）
        store_name = _require(payload.cvs_store_name)
        if not store_name:
            raise HTTPException(status_code=400, detail="cvs_store_name required for cvs")

        # 可選：store_id
        store_id = _require(payload.cvs_store_id)

        # brand 可自動補
        brand = _require(payload.cvs_brand) or ("7-11" if m == "cvs_711" else "全家")

        # ✅ 把補齊的值寫回 payload（後面建單/寄信都一致）
        payload.cvs_brand = brand
        payload.cvs_store_name = store_name
        payload.cvs_store_id = store_id

        # ✅ shipping_address 你可以當「縣市區」備援（你前端有送）
        if not _require(payload.shipping_address):
            payload.shipping_address = store_name  # 沒送縣市區就用門市名稱頂一下

    else:
        raise HTTPException(status_code=400, detail="invalid shipping_method")

    # ====== 0) 合併同商品（避免重複 product_id） ======
    merged: dict[int, int] = defaultdict(int)
    for it in payload.items:
        if it.qty <= 0:
            raise HTTPException(status_code=400, detail="qty must be > 0")
        merged[it.product_id] += it.qty

    # ====== 1) 重新計算總金額 + 先做庫存檢查 ======
    calc_items: list[tuple[Product, int]] = []
    total = 0

    # 一次撈出所有 products
    product_ids = list(merged.keys())
    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    by_id = {p.id: p for p in products}

    # 逐一檢查（存在 / 上架 / 庫存足夠），並計算 total
    for pid, qty in merged.items():
        p = by_id.get(pid)
        if not p:
            raise HTTPException(status_code=400, detail=f"Invalid product_id: {pid}")

        # ✅ 若你想禁止買下架商品（建議）
        if hasattr(p, "is_active") and not p.is_active:
            raise HTTPException(status_code=400, detail=f"Product not active: {p.id}")

        # ✅ 擋超庫存
        if p.stock_qty is None:
            raise HTTPException(status_code=400, detail=f"Product stock not set: {p.id}")
        if qty > p.stock_qty:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock: product_id={p.id}, stock={p.stock_qty}, requested={qty}",
            )

        calc_items.append((p, qty))
        total += p.price * qty

    # ====== 2) 扣庫存（在 commit 前先扣） ======
    # ⚠️ 這一步一定要在 commit 前做，確保訂單和庫存一致
    for p, qty in calc_items:
        p.stock_qty -= qty

    # ====== 3) 建立訂單主檔 ======
    order = Order(
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,

        shipping_method=payload.shipping_method,
        shipping_address=payload.shipping_address,

        recipient_name=payload.recipient_name,
        recipient_phone=payload.recipient_phone,

        # 郵寄/宅配可放這欄；超商取件通常不需要（避免資料混在一起）
        shipping_post_address=payload.shipping_post_address if payload.shipping_method in ("post", "courier") else None,

        total_amount=total,
    )

    # ✅ 若 Order model 有這些欄位就寫入（沒有也不會炸）
    if hasattr(order, "customer_phone"):
        order.customer_phone = payload.customer_phone

    # ✅ CVS 欄位：只有在 cvs_711/cvs_family 才寫
    if payload.shipping_method in ("cvs_711", "cvs_family"):
        if hasattr(order, "cvs_brand"):
            order.cvs_brand = payload.cvs_brand
        if hasattr(order, "cvs_store_name"):
            order.cvs_store_name = payload.cvs_store_name
        if hasattr(order, "cvs_store_id"):
            order.cvs_store_id = payload.cvs_store_id

    db.add(order)
    db.flush()  # 先拿到 order.id（不 commit）

    # ====== 4) 建立訂單明細 ======
    for p, qty in calc_items:
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=p.id,
                qty=qty,
                unit_price=p.price,
            )
        )

    db.commit()
    db.refresh(order)

    # ✅ 老闆通知（Email）— 你原本後面應該還有（此段以下我保留你既有變數結構）
    lines: list[str] = []
    lines.append("新訂單成立！")
    lines.append(f"Order ID: {order.id}")
    lines.append(f"總金額: {order.total_amount} 元")
    lines.append("")
    lines.append("【買家資訊】")
    lines.append(f"買家: {payload.customer_name}")
    lines.append(f"Email: {payload.customer_email}")
    lines.append("")

    # 物流資訊（永遠不空白：recipient_* 沒填就用 customer_* 補）
    lines.append("【物流資訊】")

    # ====== ✅ 買家確認信（下單成功即寄） ======
    buyer_subject = f"[A-kâu Shop] 已收到您的訂單 #{order.id}"

    def _s(v: str | None) -> str:
        return (v or "").strip()

    def _ship_label(m: str) -> str:
        return {
            "post": "郵寄",
            "courier": "宅配",
            "cvs_711": "超商取貨（7-11）",
            "cvs_family": "超商取貨（全家）",
        }.get(m, m)

    buyer_lines: list[str] = []
    buyer_lines.append(f"{payload.customer_name} 您好：")
    buyer_lines.append("")
    buyer_lines.append("我們已收到您的訂單，將盡快為您處理與出貨。")
    buyer_lines.append("")
    buyer_lines.append(f"訂單編號：{order.id}")
    buyer_lines.append(f"訂單金額：{order.total_amount} 元")
    buyer_lines.append("")
    buyer_lines.append("【訂購內容】")
    for p, qty in calc_items:
        buyer_lines.append(f"- {p.name} × {qty}（單價 {p.price}）")
    buyer_lines.append("")

    # 物流資訊（用 order 內已存欄位）
    buyer_lines.append("【配送方式】")
    buyer_lines.append(f"方式：{_ship_label(order.shipping_method)}")

    addr = _s(order.shipping_post_address) or _s(order.shipping_address)
    buyer_lines.append(f"地址：{addr}" if addr else "地址：（未提供）")

    buyer_lines.append("")
    buyer_lines.append("如需修改訂單或有任何問題，請直接回覆此信與我們聯繫。")

    buyer_body = "\n".join(buyer_lines)

    background_tasks.add_task(
        send_email,
        payload.customer_email,
        buyer_subject,
        buyer_body,
    )

    # ✅ 給後面「賣家通知 / 出貨通知」共用的收件資訊（對齊新 schema）
    recipient = _s(order.recipient_name) or _s(payload.recipient_name) or _s(payload.customer_name)
    phone = _s(order.recipient_phone) or _s(payload.recipient_phone) or _s(payload.customer_phone)

    def method_label(m: str) -> str:
        return {
            "post": "郵寄",
            "courier": "宅配",
            "cvs_711": "7-11 取貨",
            "cvs_family": "全家取貨",
        }.get(m, m)

    lines.append(f"方式：{method_label(order.shipping_method)}")

    if order.shipping_method in ("post", "courier"):
        addr = (
                    order.shipping_post_address or payload.shipping_post_address or order.shipping_address or payload.shipping_address or "").strip()
        lines.append(f"收件人：{recipient}")
        lines.append(f"電話：{phone}")
        lines.append(f"地址：{addr}")

    elif order.shipping_method in ("cvs_711", "cvs_family"):
        store_name = (getattr(order, "cvs_store_name", None) or getattr(payload, "cvs_store_name", None) or "").strip()
        store_id = (getattr(order, "cvs_store_id", None) or getattr(payload, "cvs_store_id", None) or "").strip()
        brand = (getattr(order, "cvs_brand", None) or getattr(payload, "cvs_brand", None) or "").strip()
        # 組一個乾淨的門市字串：有啥顯示啥，避免空括號
        parts: list[str] = []
        if brand:
            parts.append(brand)
        if store_name:
            parts.append(store_name)

        store_text = " ".join(parts).strip()
        if store_id:
            store_text = f"{store_text}（{store_id}）" if store_text else f"（{store_id}）"

        # 如果 cvs 欄位都空，退回顯示 shipping_address（你前端有塞縣市區）
        if not store_text:
            fallback = (getattr(order, "shipping_address", "") or "").strip()
            store_text = fallback or "（未提供）"

        lines.append(f"取貨人：{recipient}")
        lines.append(f"電話：{phone}")
        lines.append(f"門市：{brand} {store_name}{f'（{store_id}）' if store_id else ''}")

    else:
        lines.append(f"備援資訊：{order.shipping_address}")

    lines.append("")
    lines.append("【訂單明細】")
    for p, qty in calc_items:
        lines.append(f"- {p.name} × {qty}（單價 {p.price}）")

    subject = f"[A-kâu Shop] 新訂單 #{order.id}（{order.total_amount} 元）"
    body = "\n".join(lines)

    background_tasks.add_task(send_admin_email, subject, body)

    # ====== ✅ 買家確認信 ======
    buyer_subject = f"[A-kâu Shop] 已收到您的訂單 #{order.id}"

    buyer_lines: list[str] = []
    buyer_lines.append(f"{payload.customer_name} 您好：")
    buyer_lines.append("")
    buyer_lines.append("我們已收到您的訂單，將盡快為您處理與出貨。")
    buyer_lines.append("")
    buyer_lines.append(f"訂單編號：{order.id}")
    buyer_lines.append(f"訂單金額：{order.total_amount} 元")
    buyer_lines.append("")
    buyer_lines.append("【訂購內容】")
    for p, qty in calc_items:
        buyer_lines.append(f"- {p.name} × {qty}")

    buyer_lines.append("")
    buyer_lines.append("如需修改訂單或有任何問題，請直接回覆此信與我們聯繫。")

    buyer_body = "\n".join(buyer_lines)

    background_tasks.add_task(
        send_email,
        payload.customer_email,
        buyer_subject,
        buyer_body,
    )

    return OrderCreated(order_id=order.id, total_amount=order.total_amount)

@router.get("/{order_id}/items")
def get_order_items(order_id: int, db: Session = Depends(get_db)):
    rows = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
    return [
        {
            "id": r.id,
            "order_id": r.order_id,
            "product_id": r.product_id,
            "qty": r.qty,
            "unit_price": r.unit_price,
        }
        for r in rows
    ]

@router.get("/{order_id}")
def get_order(order_id: int, db: Session = Depends(get_db)):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")

    return {
        "id": o.id,
        "customer_name": o.customer_name,
        "customer_email": o.customer_email,
        "shipping_method": o.shipping_method,
        "shipping_address": o.shipping_address,

        # ✅ 結構化物流欄位
        "recipient_name": o.recipient_name,
        "recipient_phone": o.recipient_phone,
        "shipping_post_address": o.shipping_post_address,
        "cvs_brand": o.cvs_brand,
        "cvs_store_id": o.cvs_store_id,
        "cvs_store_name": o.cvs_store_name,

        "total_amount": o.total_amount,
    }

@router.post("/{order_id}/ship")
def mark_shipped(
    order_id: int,
    payload: OrderShipIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")

    # ✅ 狀態更新
    o.status = "shipped"

    # ✅ 可選：若你有加欄位就存（沒有也不會炸）
    if hasattr(o, "shipped_at"):
        o.shipped_at = datetime.now(timezone.utc)
    if hasattr(o, "tracking_no"):
        o.tracking_no = (payload.tracking_no or "").strip() or None

    db.commit()
    db.refresh(o)

    # ✅ 寄出貨通知給買家
    subject = f"[A-kâu Shop] 您的訂單 #{o.id} 已出貨"

    lines: list[str] = []
    lines.append(f"{o.customer_name} 您好：")
    lines.append("")
    lines.append("您的訂單已完成出貨/交寄，感謝您的購買！")
    lines.append("")
    lines.append(f"訂單編號：{o.id}")
    lines.append(f"訂單金額：{o.total_amount} 元")
    lines.append("")

    # 物流資訊（用 order 內已存欄位）
    buyer_lines.append("【配送方式】")
    buyer_lines.append(f"方式：{_ship_label(order.shipping_method)}")

    sm = _s(order.shipping_method)

    if sm in ("post", "courier"):
        addr = _s(order.shipping_post_address) or _s(order.shipping_address)
        buyer_lines.append(f"地址：{addr}" if addr else "地址：（未提供）")

    elif sm in ("cvs_711", "cvs_family"):
        store_name = _s(order.cvs_store_name)
        store_id = _s(order.cvs_store_id)

        if store_name or store_id:
            # 7-11 / 全家由 shipping_method 決定，不再需要 cvs_brand
            buyer_lines.append(f"門市：{store_name}{f'（{store_id}）' if store_id else ''}".strip())
        else:
            buyer_lines.append("門市：（未提供）")

    else:
        # 保底：避免未來新增 shipping_method 時信件空白
        addr = _s(order.shipping_post_address) or _s(order.shipping_address)
        if addr:
            buyer_lines.append(f"地址：{addr}")

    if (payload.tracking_no or "").strip():
        lines.append(f"物流單號：{payload.tracking_no.strip()}")

    if (payload.note or "").strip():
        lines.append("")
        lines.append("【備註】")
        lines.append(payload.note.strip())

    lines.append("")
    lines.append("如有任何問題，請直接回覆此信，我們會盡快協助您。")

    body = "\n".join(lines)

    background_tasks.add_task(send_email, o.customer_email, subject, body)

    return {"ok": True, "order_id": o.id, "status": o.status}