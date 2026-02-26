from fastapi import Request, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from jose import jwt, JWTError

from app.db.session import async_session_maker
from app.db.tenancy import set_tenant_schema
from app.core.config import settings
from app.models.user import User

security = HTTPBearer(auto_error=False)


async def get_db(request: Request) -> AsyncSession:
    """Dependency that yields a database session configured for the current tenant."""
    tenant_id = getattr(request.state, "tenant_id", "public")

    async with async_session_maker() as session:
        if tenant_id != "public":
            await set_tenant_schema(session, tenant_id)
        else:
            await session.execute(text('SET search_path TO "public"'))
        yield session


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract current user from JWT token. Raises 401 if invalid."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).filter(User.id == int(user_id)))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")
    return user


async def get_current_user_optional(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Same as get_current_user but returns None instead of raising."""
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None

    result = await db.execute(select(User).filter(User.id == int(user_id)))
    user = result.scalars().first()
    if user and user.is_active:
        return user
    return None


def require_superuser(user: User = Depends(get_current_user)) -> User:
    """Require superuser privileges."""
    if not user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser required")
    return user
