import asyncio
from app.schemas.page import PageTreeItem

print(PageTreeItem(id=1, title="test", slug="test", path="test", children=[]).model_dump())
