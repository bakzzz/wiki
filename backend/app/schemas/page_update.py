from pydantic import BaseModel
from typing import Optional


class PageContentUpdate(BaseModel):
    content: Optional[str] = None
    title: Optional[str] = None
    slug: Optional[str] = None
    parent_path: Optional[str] = None
