from pydantic import BaseModel
from typing import Optional, List

class PageBase(BaseModel):
    title: str
    slug: str
    content: Optional[str] = None

class PageCreate(PageBase):
    parent_path: Optional[str] = None

class PageResponse(PageBase):
    id: int
    path: str
    
    class Config:
        from_attributes = True

class PageTreeItem(PageResponse):
    children: List['PageTreeItem'] = []

PageTreeItem.model_rebuild()
