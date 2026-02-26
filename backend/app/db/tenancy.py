import re
from sqlalchemy import text
from app.db.session import engine
from sqlalchemy.ext.asyncio import AsyncSession

_TENANT_RE = re.compile(r'^[a-zA-Z0-9_]+$')

async def create_tenant_schema(tenant_id: str):
    """Creates a new isolated schema for a tenant."""
    if not _TENANT_RE.match(tenant_id):
        raise ValueError(f"Invalid tenant_id: {tenant_id}")
    async with engine.begin() as conn:
        await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{tenant_id}"'))

async def set_tenant_schema(session: AsyncSession, tenant_id: str):
    """Sets the search_path for the current database session to the tenant's schema."""
    if not _TENANT_RE.match(tenant_id):
        raise ValueError(f"Invalid tenant_id: {tenant_id}")
    await session.execute(text(f'SET search_path TO "{tenant_id}", public'))
