import uuid
import os
import shutil
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text

from app.api.deps import get_db, get_current_user
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import UserResponse, RoomCreate, RoomResponse

router = APIRouter()

ROOMS_TABLE = "wiki_rooms"
LOGOS_DIR = Path(__file__).resolve().parents[3] / "media" / "logos"


async def _ensure_tables(db: AsyncSession):
    await db.execute(text(
        f"CREATE TABLE IF NOT EXISTS {ROOMS_TABLE} ("
        f"  name VARCHAR PRIMARY KEY, "
        f"  display_name VARCHAR NOT NULL, "
        f"  public_slug VARCHAR UNIQUE"
        f")"
    ))
    await db.execute(text(
        "CREATE TABLE IF NOT EXISTS user_rooms ("
        "  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, "
        "  room_name VARCHAR, "
        "  role VARCHAR DEFAULT 'Viewer', "
        "  PRIMARY KEY (user_id, room_name)"
        ")"
    ))
    await db.commit()


# ── Rooms ────────────────────────────────────────────────────────────

@router.get("/rooms")
async def list_rooms(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _ensure_tables(db)
    try:
        await db.execute(text(f"ALTER TABLE {ROOMS_TABLE} ADD COLUMN IF NOT EXISTS public_slug VARCHAR UNIQUE"))
        await db.execute(text(f"ALTER TABLE {ROOMS_TABLE} ADD COLUMN IF NOT EXISTS logo_url VARCHAR"))
        await db.commit()
    except Exception:
        pass

    result = await db.execute(text(f"SELECT name, display_name, public_slug, logo_url FROM {ROOMS_TABLE} ORDER BY name"))
    rows = result.fetchall()
    return [{"name": r[0], "display_name": r[1], "public_slug": r[2], "logo_url": r[3]} for r in rows]


@router.post("/rooms")
async def create_room(
    room: RoomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _ensure_tables(db)
    result = await db.execute(text(f"SELECT name FROM {ROOMS_TABLE} WHERE name = :n"), {"n": room.name})
    if result.fetchone():
        raise HTTPException(status_code=400, detail="Room already exists")

    slug = str(uuid.uuid4())[:8]
    await db.execute(
        text(f"INSERT INTO {ROOMS_TABLE} (name, display_name, public_slug) VALUES (:n, :d, :s)"),
        {"n": room.name, "d": room.display_name, "s": slug},
    )
    await db.execute(
        text("INSERT INTO user_rooms (user_id, room_name, role) VALUES (:uid, :rn, 'Owner')"),
        {"uid": current_user.id, "rn": room.name},
    )
    await db.commit()
    return {"name": room.name, "display_name": room.display_name, "public_slug": slug, "logo_url": None}


@router.delete("/rooms/{room_name}")
async def delete_room(
    room_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        result = await db.execute(
            text("SELECT role FROM user_rooms WHERE user_id = :uid AND room_name = :rn"),
            {"uid": current_user.id, "rn": room_name},
        )
        row = result.fetchone()
        if not row or row[0] != "Owner":
            raise HTTPException(status_code=403, detail="Only Owner can delete room")
    await db.execute(text(f"DELETE FROM {ROOMS_TABLE} WHERE name = :n"), {"n": room_name})
    await db.execute(text("DELETE FROM user_rooms WHERE room_name = :rn"), {"rn": room_name})
    await db.commit()
    return {"detail": "Room deleted"}


@router.post("/rooms/{room_name}/toggle-public")
async def toggle_public_link(
    room_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(text(f"SELECT public_slug FROM {ROOMS_TABLE} WHERE name = :n"), {"n": room_name})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Room not found")
    if row[0]:
        await db.execute(text(f"UPDATE {ROOMS_TABLE} SET public_slug = NULL WHERE name = :n"), {"n": room_name})
        await db.commit()
        return {"public_slug": None}
    else:
        slug = str(uuid.uuid4())[:8]
        await db.execute(text(f"UPDATE {ROOMS_TABLE} SET public_slug = :s WHERE name = :n"), {"n": room_name, "s": slug})
        await db.commit()
        return {"public_slug": slug}


@router.put("/rooms/{room_name}/logo")
async def upload_room_logo(
    room_name: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a logo image for a room."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser required")

    result = await db.execute(text(f"SELECT name FROM {ROOMS_TABLE} WHERE name = :n"), {"n": room_name})
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Room not found")

    ext = Path(file.filename or "logo.png").suffix.lower()
    if ext not in (".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif"):
        raise HTTPException(status_code=400, detail="Only image files allowed")

    LOGOS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{room_name}{ext}"
    filepath = LOGOS_DIR / filename

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    logo_url = f"/media/logos/{filename}"
    await db.execute(
        text(f"UPDATE {ROOMS_TABLE} SET logo_url = :url WHERE name = :n"),
        {"url": logo_url, "n": room_name},
    )
    await db.commit()
    return {"logo_url": logo_url}


# ── Users ────────────────────────────────────────────────────────────

@router.get("/users-with-rooms")
async def users_with_rooms(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _ensure_tables(db)
    result = await db.execute(text("SELECT id, email, is_active, is_superuser, created_at FROM users ORDER BY id"))
    users_rows = result.fetchall()

    rooms_result = await db.execute(text("SELECT user_id, room_name, role FROM user_rooms ORDER BY user_id"))
    room_rows = rooms_result.fetchall()

    user_rooms_map: dict[int, list[dict]] = {}
    for r in room_rows:
        user_rooms_map.setdefault(r[0], []).append({"room": r[1], "role": r[2]})

    return [
        {
            "id": u[0],
            "email": u[1],
            "is_active": u[2],
            "is_superuser": u[3],
            "created_at": u[4].isoformat() if u[4] else None,
            "rooms": user_rooms_map.get(u[0], []),
        }
        for u in users_rows
    ]


from pydantic import BaseModel as _BM


class _CreateUser(_BM):
    email: str
    password: str


@router.post("/users", response_model=UserResponse)
async def create_user(
    data: _CreateUser,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser required")
    result = await db.execute(select(User).filter(User.email == data.email.lower().strip()))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email.lower().strip(),
        hashed_password=get_password_hash(data.password),
        is_active=True,
        is_superuser=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser required")
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.execute(text("DELETE FROM user_rooms WHERE user_id = :uid"), {"uid": user_id})
    await db.delete(user)
    await db.commit()
    return {"detail": "User deleted"}


class _PasswordReset(_BM):
    password: str


@router.put("/users/{user_id}/password")
async def reset_password(
    user_id: int,
    data: _PasswordReset,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser required")
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = get_password_hash(data.password)
    await db.commit()
    return {"detail": "Password updated"}


class _UserRoomsUpdate(_BM):
    rooms: list[dict]


@router.put("/users/{user_id}/rooms")
async def update_user_rooms(
    user_id: int,
    data: _UserRoomsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser required")
    await _ensure_tables(db)
    await db.execute(text("DELETE FROM user_rooms WHERE user_id = :uid"), {"uid": user_id})
    for item in data.rooms:
        role = item.get("role", "Viewer")
        if role not in ("Owner", "Admin", "Editor", "Viewer"):
            role = "Viewer"
        await db.execute(
            text("INSERT INTO user_rooms (user_id, room_name, role) VALUES (:uid, :rn, :role) ON CONFLICT DO NOTHING"),
            {"uid": user_id, "rn": item["room"], "role": role},
        )
    await db.commit()
    return {"detail": "Rooms updated"}


# ── My rooms ─────────────────────────────────────────────────────────

@router.get("/my-rooms")
async def my_rooms(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _ensure_tables(db)
    result = await db.execute(text(
        f"SELECT r.name, r.display_name, r.logo_url FROM {ROOMS_TABLE} r "
        f"JOIN user_rooms ur ON r.name = ur.room_name "
        f"WHERE ur.user_id = :uid ORDER BY r.name"
    ), {"uid": current_user.id})
    rows = result.fetchall()
    return [{"name": r[0], "display_name": r[1], "logo_url": r[2]} for r in rows]


@router.get("/my-role/{room_name}")
async def my_role(
    room_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        text("SELECT role FROM user_rooms WHERE user_id = :uid AND room_name = :rn"),
        {"uid": current_user.id, "rn": room_name},
    )
    row = result.fetchone()
    return {"role": row[0] if row else None, "is_superuser": current_user.is_superuser}
