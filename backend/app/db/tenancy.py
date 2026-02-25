from sqlalchemy import text
from app.db.session import engine
from sqlalchemy.ext.asyncio import AsyncSession

async def create_tenant_schema(tenant_id: str):
    """Creates a new isolated schema for a tenant."""
    async with engine.begin() as conn:
        await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{tenant_id}"'))

async def set_tenant_schema(session: AsyncSession, tenant_id: str):
    """Sets the search_path for the current database session to the tenant's schema."""
    await session.execute(text(f'SET search_path TO "{tenant_id}", public'))
