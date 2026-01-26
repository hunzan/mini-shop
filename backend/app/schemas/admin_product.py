from pydantic import BaseModel, Field
from typing import Optional, List, Literal

ShippingMethod = Literal["post", "cvs_711", "cvs_family", "courier"]


class ShippingOptionIn(BaseModel):
    method: ShippingMethod
    fee: int = Field(ge=0, le=99999)
    region_note: str = Field(default="", max_length=200)

class AdminProductActiveUpdate(BaseModel):
    is_active: bool

class AdminProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category_id: int | None = None
    stock_qty: int = Field(default=0, ge=0, le=999999)
    price: int = Field(ge=0, le=99999999)

    description: str = Field(default="", max_length=1000)        # 短描述
    description_text: str = Field(default="", max_length=4000)   # 長說明（先純文字）
    image_url: str = Field(default="", max_length=500)

    is_active: bool = True

    shipping_options: list[ShippingOptionIn] = Field(default_factory=list)


class AdminProductUpdate(BaseModel):
    # ✅ 全部 optional：PATCH 才能局部更新
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    category_id: Optional[int] = None
    stock_qty: Optional[int] = Field(default=None, ge=0)
    price: Optional[int] = Field(default=None, ge=0)

    description: Optional[str] = None
    description_text: Optional[str] = None

    image_url: Optional[str] = None
    is_active: Optional[bool] = None

    # ✅ 一次整包更新運送選項
    shipping_options: Optional[List[ShippingOptionIn]] = None


class ShippingOptionOut(BaseModel):
    id: int
    method: str
    fee: int
    region_note: str

    class Config:
        from_attributes = True


class AdminProductOut(BaseModel):
    id: int
    name: str
    category_id: int | None
    stock_qty: int
    price: int
    description: str
    description_text: str
    image_url: str
    is_active: bool
    shipping_options: list[ShippingOptionOut]

    class Config:
        from_attributes = True
