from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone

from app.api.deps import get_db, get_current_user, get_current_user_optional
from app.models.page import Page, PageVersion
from app.models.user import User
from app.schemas.page import PageTreeItem, PageCreate, PageResponse, PageVersionResponse
from app.schemas.page_update import PageContentUpdate
from sqlalchemy_utils import Ltree

router = APIRouter()


async def _check_role(db: AsyncSession, user: User | None, request: Request, min_role: str):
    """Check user has minimum role in current tenant. Roles: Owner > Admin > Editor > Viewer"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.is_superuser:
        return  # superuser bypasses all checks

    tenant_id = getattr(request.state, "tenant_id", "public")
    if tenant_id == "public":
        return  # public space is open to all authenticated users

    result = await db.execute(
        text("SELECT role FROM user_rooms WHERE user_id = :uid AND room_name = :rn"),
        {"uid": user.id, "rn": tenant_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=403, detail="No access to this room")

    role_hierarchy = {"Viewer": 0, "Editor": 1, "Admin": 2, "Owner": 3}
    user_level = role_hierarchy.get(row[0], -1)
    required_level = role_hierarchy.get(min_role, 0)

    if user_level < required_level:
        raise HTTPException(status_code=403, detail=f"Requires {min_role}+ role, you have {row[0]}")


async def _ensure_columns(db: AsyncSession):
    """Ensure metadata columns exist (for existing installations)."""
    for col, col_type in [
        ("created_at", "TIMESTAMPTZ DEFAULT NOW()"),
        ("updated_at", "TIMESTAMPTZ DEFAULT NOW()"),
        ("created_by", "VARCHAR"),
        ("updated_by", "VARCHAR"),
    ]:
        try:
            await db.execute(text(f"ALTER TABLE pages ADD COLUMN IF NOT EXISTS {col} {col_type}"))
        except Exception:
            pass
    # Create page_versions table
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS page_versions (
            id SERIAL PRIMARY KEY,
            page_id INTEGER NOT NULL,
            title VARCHAR NOT NULL,
            content TEXT,
            edited_by VARCHAR,
            edited_at TIMESTAMPTZ DEFAULT NOW()
        )
    """))
    await db.commit()


@router.get("/tree", response_model=List[PageTreeItem])
async def get_page_tree(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    # Public read allowed, but if tenant is private, require Viewer+
    if getattr(request.state, "tenant_id", "public") != "public" and user:
        await _check_role(db, user, request, "Viewer")

    await _ensure_columns(db)

    # Select only the columns needed for the tree structure, preventing memory bloat
    result = await db.execute(
        select(Page.id, Page.title, Page.slug, Page.path)
        .order_by(Page.path)
    )
    pages = result.all()
    
    tree_nodes = {}
    root_nodes = []

    for page in pages:
        node = PageTreeItem(
            id=page.id,
            title=page.title,
            slug=page.slug,
            path=str(page.path),
            children=[]
        )
        tree_nodes[node.path] = node

        path_parts = node.path.split('.')
        if len(path_parts) == 1:
            root_nodes.append(node)
        else:
            parent_path = '.'.join(path_parts[:-1])
            if parent_path in tree_nodes:
                tree_nodes[parent_path].children.append(node)

    return root_nodes


@router.get("/{page_id}", response_model=PageResponse)
async def get_page(
    page_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    result = await db.execute(select(Page).filter(Page.id == page_id))
    page = result.scalars().first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    page.path = str(page.path)
    return page


@router.get("/by-slug/{slug}", response_model=PageResponse)
async def get_page_by_slug(
    slug: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    result = await db.execute(select(Page).filter(Page.slug == slug))
    page = result.scalars().first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    page.path = str(page.path)
    return page


@router.post("/", response_model=PageResponse)
async def create_page(
    page_data: PageCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _check_role(db, user, request, "Editor")
    await _ensure_columns(db)

    new_path = page_data.slug if not page_data.parent_path else f"{page_data.parent_path}.{page_data.slug}"
    # ltree labels cannot contain hyphens
    ltree_path = new_path.replace("-", "_")
    page = Page(
        title=page_data.title,
        slug=page_data.slug,
        content=page_data.content,
        path=Ltree(ltree_path),
        created_by=user.email,
        updated_by=user.email,
    )
    db.add(page)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Страница с таким URL (slug) уже существует")

    page.path = str(page.path)
    return page


@router.put("/{page_id}", response_model=PageResponse)
async def update_page(
    page_id: int,
    data: PageContentUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _check_role(db, user, request, "Editor")

    result = await db.execute(select(Page).filter(Page.id == page_id))
    page = result.scalars().first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    old_path_str = str(page.path)
    path_changed = False
    new_ltree_path = old_path_str

    if data.slug is not None or data.parent_path is not None:
        new_slug = data.slug if data.slug is not None else page.slug
        
        # If data.parent_path is not None but is an empty string, it means "root"
        if data.parent_path is not None:
            new_parent = data.parent_path
        else:
            # maintain existing parent logic: path minus the last segment
            parts = old_path_str.split('.')
            new_parent = '.'.join(parts[:-1]) if len(parts) > 1 else ""

        new_path_str = new_slug if not new_parent else f"{new_parent}.{new_slug}"
        new_ltree_path = new_path_str.replace("-", "_")

        if new_ltree_path != old_path_str:
            # Check for collision
            collision = await db.execute(select(Page).filter(Page.path == new_ltree_path))
            if collision.scalars().first():
                raise HTTPException(status_code=400, detail="Страница с таким URL или путем уже существует")
            
            page.slug = new_slug
            page.path = Ltree(new_ltree_path)
            path_changed = True

    # Save version before update only if content or title is changing
    if data.content is not None or data.title is not None:
        version = PageVersion(
            page_id=page.id,
            title=page.title,
            content=page.content,
            edited_by=page.updated_by or page.created_by,
        )
        db.add(version)

    # Update page attributes
    if data.content is not None:
        page.content = data.content
    if data.title is not None:
        page.title = data.title

    page.updated_by = user.email
    page.updated_at = datetime.now(timezone.utc)

    # Perform updates
    await db.flush() # ensure page changes are in transaction

    if path_changed:
        # Update descendants
        await db.execute(text("""
            UPDATE pages 
            SET path = (:new_path::text)::ltree || subpath(path, nlevel((:old_path::text)::ltree)) 
            WHERE path <@ (:old_path::text)::ltree AND id != :page_id
        """), {"new_path": new_ltree_path, "old_path": old_path_str, "page_id": page_id})

    await db.commit()
    page.path = str(page.path)
    return page


@router.delete("/{page_id}")
async def delete_page(
    page_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _check_role(db, user, request, "Admin")

    result = await db.execute(select(Page).filter(Page.id == page_id))
    page = result.scalars().first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    await db.delete(page)
    await db.commit()
    return {"detail": "Page deleted"}


@router.get("/{page_id}/versions", response_model=List[PageVersionResponse])
async def get_page_versions(
    page_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    """Get version history for a page, newest first."""
    result = await db.execute(
        select(PageVersion)
        .filter(PageVersion.page_id == page_id)
        .order_by(PageVersion.edited_at.desc())
        .limit(50)
    )
    versions = result.scalars().all()
    return versions
