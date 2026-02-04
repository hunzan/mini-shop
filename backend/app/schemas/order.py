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

    # ✅ 郵寄/宅配地址：前端可填這裡（也可用 shipping_post_address）
    shipping_address: str = Field(default="", max_length=300)

    items: List[CartItem]

    # ✅ 收件/取貨聯絡人（必填）
    recipient_name: str = Field(min_length=1, max_length=80)
    recipient_phone: str = Field(min_length=6, max_length=40)

    # ✅ 郵寄/宅配：可選，沒填就用 shipping_address 補
    shipping_post_address: Optional[str] = Field(default=None, max_length=300)

    # ✅ 超商取貨：門市資訊
    cvs_store_id: Optional[str] = Field(default=None, max_length=50)
    cvs_store_name: Optional[str] = Field(default=None, max_length=120)

    # ✅ 兼容你 router 目前會讀的欄位（避免 AttributeError）
    # 建議：前端不用送，後端可由 shipping_method 推 brand
    cvs_brand: Optional[str] = Field(default=None, max_length=20)

    # （可選擴充，先留著以後串物流/超取需要）
    cvs_store_address: Optional[str] = Field(default=None, max_length=200)


class OrderCreated(BaseModel):
    order_id: int
    total_amount: int


class OrderShipIn(BaseModel):
    tracking_no: Optional[str] = None
    note: Optional[str] = None
