from pydantic import BaseModel
from typing import Optional

class PageContentUpdate(BaseModel):
    content: str
