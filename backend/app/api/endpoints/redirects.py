from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_db
from app.models.slug_redirect import SlugRedirect
from app.models.page import Page

router = APIRouter()

@router.get("/{old_slug}")
async def redirect_slug(old_slug: str, db: AsyncSession = Depends(get_db)):
    """Redirect from an old slug to the current page slug."""
    result = await db.execute(select(SlugRedirect).filter(SlugRedirect.old_slug == old_slug))
    redirect = result.scalars().first()
    if not redirect:
        raise HTTPException(status_code=404, detail="Redirect not found")
    
    return {"redirect_to": redirect.new_slug, "page_id": redirect.page_id}
