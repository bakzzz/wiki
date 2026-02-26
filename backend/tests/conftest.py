import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.db.base import Base
from app.main import app
from app.api.deps import get_db


# Use test database
TEST_DB_URL = settings.DATABASE_URL.replace("/wiki_db", "/wiki_db_test") if "wiki_db_test" not in settings.DATABASE_URL else settings.DATABASE_URL

test_engine = create_async_engine(TEST_DB_URL, echo=False, poolclass=NullPool)
TestSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Create all tables before tests and drop after."""
    async with test_engine.begin() as conn:
        # Install ltree extension if needed
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS ltree"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session():
    """Provide a transactional db session that rolls back after test."""
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def override_db():
    """Override app dependency to use test database."""
    async def _get_test_db():
        async with TestSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client(override_db):
    """AsyncClient for testing FastAPI endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_token(client: AsyncClient, db_session: AsyncSession):
    """Register first user and return auth token."""
    from app.core.security import get_password_hash
    from app.models.user import User

    # Clean users table
    await db_session.execute(text("DELETE FROM users"))
    await db_session.commit()

    # Create superuser directly
    user = User(
        email="admin@test.com",
        hashed_password=get_password_hash("testpass123"),
        is_active=True,
        is_superuser=True,
    )
    db_session.add(user)
    await db_session.commit()

    # Login
    resp = await client.post("/api/v1/auth/login", json={
        "email": "admin@test.com",
        "password": "testpass123",
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]
