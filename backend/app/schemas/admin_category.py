from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class AdminCategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sort_order: int
    is_active: bool


class AdminCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    sort_order: int = 0
    is_active: bool = True


class AdminCategoryUpdate(BaseModel):
    # 允許局部更新
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
