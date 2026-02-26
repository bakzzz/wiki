import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from app.models.page import Page
from app.core.config import settings

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine) as session:
        await session.execute(text('SET search_path TO "ixora"'))
        result = await session.execute(select(Page).limit(1))
        page = result.scalars().first()
        if page:
            print(f"Original type: {type(page.path)}")
            page.path = str(page.path)
            print(f"New type: {type(page.path)}")
        else:
            print("No pages found in ixora")

asyncio.run(main())
