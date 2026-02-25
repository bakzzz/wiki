from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.services.search import search_pages

router = APIRouter()

@router.get("/")
async def search(q: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db)):
    """Search pages using PostgreSQL Full-Text Search."""
    results = await search_pages(db, q)
    return {"results": results, "total": len(results)}
