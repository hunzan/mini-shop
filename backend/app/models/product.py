from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, ForeignKey, Boolean
from .product_shipping_option import ProductShippingOption
from ..db import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)  # 單位：元
    description: Mapped[str] = mapped_column(String(1000), default="")  # 短描述（前台列表用）

    # ✅ 分類（可為 None = 未分類）
    category_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("categories.id"),
        nullable=True,
    )
    category = relationship("Category")

    # ✅ 新增：庫存/上架/主圖/長說明
    stock_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    image_url: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    description_text: Mapped[str] = mapped_column(String(4000), default="", nullable=False)

    # ✅ 一商品多種運送選項
    shipping_options: Mapped[list[ProductShippingOption]] = relationship(
        "ProductShippingOption",
        back_populates="product",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

