from pydantic import BaseModel, Field
from typing import Optional, Literal, List

class CartItem(BaseModel):
    product_id: int
    qty: int = Field(ge=1, le=99)


ShippingMethod = Literal["post", "courier", "cvs_711", "cvs_family"]

class OrderCreate(BaseModel):
    customer_name: str = Field(min_length=1, max_length=100)
    customer_email: str = Field(min_length=3, max_length=200)
    customer_phone: str = Field(min_length=6, max_length=30)

    shipping_method: ShippingMethod

    # ✅郵寄/宅配地址：前端可填這裡（也可用 shipping_post_address）
    shipping_address: str = Field(default="", max_length=300)

    items: List[CartItem]

    # ✅收件/取貨聯絡人（必填）
    recipient_name: str = Field(min_length=1, max_length=80)
    recipient_phone: str = Field(min_length=6, max_length=40)

    # ✅郵寄/宅配：可選，沒填就用 shipping_address 補
    shipping_post_address: Optional[str] = None

    # ✅超商：可選（但情境驗證會要求 cvs_* 必填）
    cvs_brand: Optional[Literal["7-11", "全家"]] = None
    cvs_store_id: Optional[str] = None
    cvs_store_name: Optional[str] = None

class OrderCreated(BaseModel):
    order_id: int
    total_amount: int

class OrderShipIn(BaseModel):
    tracking_no: Optional[str] = None
    note: Optional[str] = None
