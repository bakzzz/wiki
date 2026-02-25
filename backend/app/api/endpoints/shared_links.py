import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from app.api.deps import get_db
from app.models.shared_link import SharedLink
from app.models.page import Page

router = APIRouter()

class SharedLinkCreate(BaseModel):
    page_id: int
    expires_in_days: Optional[int] = None

class SharedLinkResponse(BaseModel):
    uuid: str
    page_id: int
    expires_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

@router.post("/", response_model=SharedLinkResponse)
async def create_shared_link(data: SharedLinkCreate, db: AsyncSession = Depends(get_db)):
    """Generate a public UUID link for a page."""
    # Verify page exists
    result = await db.execute(select(Page).filter(Page.id == data.page_id))
    page = result.scalars().first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    expires_at = None
    if data.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=data.expires_in_days)
    
    link = SharedLink(
        uuid=str(uuid.uuid4()),
        page_id=data.page_id,
        expires_at=expires_at,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link

@router.get("/{link_uuid}")
async def get_shared_page(link_uuid: str, db: AsyncSession = Depends(get_db)):
    """Access a page via its public UUID link (read-only)."""
    result = await db.execute(select(SharedLink).filter(SharedLink.uuid == link_uuid))
    link = result.scalars().first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    # Check expiration
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Link has expired")
    
    # Fetch page
    result = await db.execute(select(Page).filter(Page.id == link.page_id))
    page = result.scalars().first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    page.path = str(page.path)
    return {
        "id": page.id,
        "title": page.title,
        "slug": page.slug,
        "content": page.content,
        "path": page.path,
        "read_only": True,
    }
