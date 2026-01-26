from pydantic import BaseModel, Field
from typing import List, Optional, Literal

ShippingMethod = Literal["post", "cvs_711", "cvs_family", "courier"]

class ShippingOptionIn(BaseModel):
    method: ShippingMethod
    fee: int = Field(ge=0)
    region_note: str = ""

class ShippingOptionOut(ShippingOptionIn):
    id: int

class AdminProductCreate(BaseModel):
    name: str
    category_id: Optional[int] = None
    stock_qty: int = Field(ge=0)
    price: int = Field(ge=0)
    description: str = ""
    description_text: str = ""
    image_url: str = ""
    is_active: bool = True

    shipping_options: List[ShippingOptionIn] = Field(default_factory=list)

class ShippingOptionPublic(BaseModel):
    method: ShippingMethod
    fee: int
    region_note: str = ""

    class Config:
        from_attributes = True


class ProductPublicOut(BaseModel):
    id: int
    name: str
    price: int
    description: str = ""              # ✅短描述（列表用）
    description_text: str = ""         # ✅長描述（細節頁用，HTML 或長文）
    category_id: Optional[int] = None

    image_url: str = ""
    is_active: bool = True

    stock_qty: int = 0

    shipping_options: List[ShippingOptionPublic] = []

    class Config:
        from_attributes = True
        populate_by_name = True

class ProductOut(BaseModel):
    id: int
    name: str
    price: int
    description: str

    class Config:
        from_attributes = True
