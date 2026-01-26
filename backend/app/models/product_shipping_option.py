from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, ForeignKey
from ..db import Base


class ProductShippingOption(Base):
    __tablename__ = "product_shipping_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=False, index=True)

    # method 建議固定這幾個字串：
    # post, cvs_711, cvs_family, courier
    method: Mapped[str] = mapped_column(String(30), nullable=False)
    fee: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    region_note: Mapped[str] = mapped_column(String(200), default="", nullable=False)

    product = relationship("Product", back_populates="shipping_options")
