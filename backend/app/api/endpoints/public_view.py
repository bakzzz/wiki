"""Public read-only access to a room's wiki by its public_slug — no auth required."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text

from app.db.session import async_session_maker
from app.db.tenancy import set_tenant_schema
from app.models.page import Page

router = APIRouter()

ROOMS_TABLE = "wiki_rooms"


async def _resolve_room(slug: str):
    """Resolve room name from public slug using the public schema."""
    async with async_session_maker() as session:
        result = await session.execute(
            text(f"SELECT name, display_name, logo_url FROM {ROOMS_TABLE} WHERE public_slug = :s"),
            {"s": slug},
        )
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Public link not found")
        return {"name": row[0], "display_name": row[1], "logo_url": row[2]}


@router.get("/{slug}")
async def public_room_info(slug: str):
    """Get room info by public slug (no auth)."""
    return await _resolve_room(slug)


@router.get("/{slug}/tree")
async def public_room_tree(slug: str):
    """Get page tree for a public room (no auth)."""
    room = await _resolve_room(slug)
    room_name = room["name"]

    async with async_session_maker() as session:
        await set_tenant_schema(session, room_name)
        result = await session.execute(select(Page).order_by(Page.path))
        pages = result.scalars().all()

    tree_nodes = {}
    root_nodes = []
    for page in pages:
        path_str = str(page.path)
        node = {
            "id": page.id,
            "title": page.title,
            "slug": page.slug,
            "path": path_str,
            "children": [],
        }
        tree_nodes[path_str] = node
        parts = path_str.split(".")
        if len(parts) == 1:
            root_nodes.append(node)
        else:
            parent_path = ".".join(parts[:-1])
            if parent_path in tree_nodes:
                tree_nodes[parent_path]["children"].append(node)

    return root_nodes


@router.get("/{slug}/page/{page_id}")
async def public_room_page(slug: str, page_id: int):
    """Get a single page content for a public room (no auth, read-only)."""
    room = await _resolve_room(slug)
    room_name = room["name"]

    async with async_session_maker() as session:
        await set_tenant_schema(session, room_name)
        result = await session.execute(select(Page).filter(Page.id == page_id))
        page = result.scalars().first()

    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    return {
        "id": page.id,
        "title": page.title,
        "slug": page.slug,
        "content": page.content,
        "path": str(page.path),
        "read_only": True,
    }
