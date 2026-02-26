"""Public read-only access to a room's wiki by its public_slug — no auth required."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text, func
from pydantic import BaseModel

from app.db.session import async_session_maker
from app.db.tenancy import set_tenant_schema
from app.models.page import Page

router = APIRouter()

ROOMS_TABLE = "wiki_rooms"


async def _resolve_room(slug: str):
    """Resolve room name from public slug using the public schema."""
    async with async_session_maker() as session:
        result = await session.execute(
            text(f"SELECT name, display_name, logo_url, "
                 f"COALESCE(public_title, '') as public_title, "
                 f"COALESCE(public_subtitle, '') as public_subtitle "
                 f"FROM {ROOMS_TABLE} WHERE public_slug = :s"),
            {"s": slug},
        )
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Public link not found")
        return {"name": row[0], "display_name": row[1], "logo_url": row[2],
                "public_title": row[3], "public_subtitle": row[4]}


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


# ── Feedback ─────────────────────────────────────────────────────────

FEEDBACK_TABLE = "feedback"

async def _ensure_feedback_table(session: AsyncSession):
    """Create feedback table if it does not exist."""
    await session.execute(text(
        f"CREATE TABLE IF NOT EXISTS {FEEDBACK_TABLE} ("
        "id SERIAL PRIMARY KEY, "
        "room_name VARCHAR(100) NOT NULL, "
        "text TEXT NOT NULL, "
        "author_name VARCHAR(200) NOT NULL DEFAULT '', "
        "author_org VARCHAR(200) NOT NULL DEFAULT '', "
        "created_at TIMESTAMPTZ NOT NULL DEFAULT now()"
        ")"
    ))
    # Index for fast count queries
    await session.execute(text(
        f"CREATE INDEX IF NOT EXISTS idx_feedback_room ON {FEEDBACK_TABLE} (room_name)"
    ))
    await session.commit()


class FeedbackCreate(BaseModel):
    text: str
    author_name: str = ""
    author_org: str = ""


@router.post("/{slug}/feedback")
async def submit_feedback(slug: str, data: FeedbackCreate):
    """Submit feedback for a public room (no auth required)."""
    room = await _resolve_room(slug)
    room_name = room["name"]

    async with async_session_maker() as session:
        await _ensure_feedback_table(session)
        await session.execute(
            text(
                f"INSERT INTO {FEEDBACK_TABLE} (room_name, text, author_name, author_org) "
                "VALUES (:rn, :txt, :name, :org)"
            ),
            {"rn": room_name, "txt": data.text, "name": data.author_name, "org": data.author_org},
        )
        await session.commit()

    return {"ok": True}


@router.get("/{slug}/feedback")
async def list_feedback(slug: str):
    """List all feedback for a public room (no auth — admin checks on frontend)."""
    room = await _resolve_room(slug)
    room_name = room["name"]

    async with async_session_maker() as session:
        await _ensure_feedback_table(session)
        result = await session.execute(
            text(
                f"SELECT id, text, author_name, author_org, created_at "
                f"FROM {FEEDBACK_TABLE} WHERE room_name = :rn ORDER BY created_at DESC"
            ),
            {"rn": room_name},
        )
        rows = result.fetchall()

    return [
        {
            "id": r[0],
            "text": r[1],
            "author_name": r[2],
            "author_org": r[3],
            "created_at": r[4].isoformat() if r[4] else None,
        }
        for r in rows
    ]


@router.get("/{slug}/feedback/count")
async def feedback_count(slug: str):
    """Get feedback count for a public room."""
    room = await _resolve_room(slug)
    room_name = room["name"]

    async with async_session_maker() as session:
        await _ensure_feedback_table(session)
        result = await session.execute(
            text(f"SELECT COUNT(*) FROM {FEEDBACK_TABLE} WHERE room_name = :rn"),
            {"rn": room_name},
        )
        count = result.scalar()

    return {"count": count}
