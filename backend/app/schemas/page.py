from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PageBase(BaseModel):
    title: str
    slug: str
    content: Optional[str] = None


class PageCreate(PageBase):
    parent_path: Optional[str] = None


class PageResponse(PageBase):
    id: int
    path: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    class Config:
        from_attributes = True


class PageTreeItem(PageResponse):
    children: List['PageTreeItem'] = []


PageTreeItem.model_rebuild()


class PageVersionResponse(BaseModel):
    id: int
    page_id: int
    title: str
    edited_by: Optional[str] = None
    edited_at: Optional[datetime] = None

    class Config:
        from_attributes = True
