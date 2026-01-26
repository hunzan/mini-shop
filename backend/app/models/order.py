from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Integer, String, DateTime, func
from ..db import Base
from sqlalchemy.orm import Mapped, mapped_column


class Order(Base):
    __tablename__ = "orders"

    # ===== 基本訂單資訊 =====
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_name: Mapped[str] = mapped_column(String(100))
    customer_email: Mapped[str] = mapped_column(String(200))
    total_amount: Mapped[int] = mapped_column(Integer)  # 總金額（元）
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # ===== 物流方式（共用） =====
    shipping_method: Mapped[str] = mapped_column(String(50))  # post | cvs_711 | cvs_family
    shipping_address: Mapped[str] = mapped_column(String(300), default="")

    recipient_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    recipient_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)

    # ===== 郵寄 =====
    shipping_post_address: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ===== 超商 =====
    cvs_brand: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cvs_store_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    cvs_store_name: Mapped[str | None] = mapped_column(String(120), nullable=True)

    # ===== 訂單狀態 =====
    status: Mapped[str] = mapped_column(String(20), default="pending")
    shipped_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    tracking_no: Mapped[str | None] = mapped_column(
        String(80),
        nullable=True
    )
