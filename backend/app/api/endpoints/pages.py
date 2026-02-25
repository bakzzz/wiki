from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text

from app.api.deps import get_db, get_current_user, get_current_user_optional
from app.models.page import Page
from app.models.user import User
from app.schemas.page import PageTreeItem, PageCreate, PageResponse
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


@router.get("/tree", response_model=List[PageTreeItem])
async def get_page_tree(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    # Public read allowed, but if tenant is private, require Viewer+
    if getattr(request.state, "tenant_id", "public") != "public" and user:
        await _check_role(db, user, request, "Viewer")

    result = await db.execute(select(Page).order_by(Page.path))
    pages = result.scalars().all()
    tree_nodes = {}
    root_nodes = []

    for page in pages:
        page.path = str(page.path)
        node = PageTreeItem.model_validate(page)
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


@router.post("/", response_model=PageResponse)
async def create_page(
    page_data: PageCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _check_role(db, user, request, "Editor")

    new_path = page_data.slug if not page_data.parent_path else f"{page_data.parent_path}.{page_data.slug}"
    page = Page(
        title=page_data.title,
        slug=page_data.slug,
        content=page_data.content,
        path=Ltree(new_path)
    )
    db.add(page)
    await db.commit()
    await db.refresh(page)
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
    page.content = data.content
    await db.commit()
    await db.refresh(page)
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
