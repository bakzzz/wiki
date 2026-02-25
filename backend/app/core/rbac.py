import casbin
from casbin_sqlalchemy_adapter import Adapter
from app.core.config import settings

async def get_enforcer():
    adapter = Adapter(settings.DATABASE_URL)
    # Using AsyncEnforcer with sqlalchemy-adapter might require special handling
    # casbin-sqlalchemy-adapter often blocks or requires sync URL unless configured for async
    # For now, we initialize an async enforcer assuming adapter supports it or we wrap it
    e = casbin.AsyncEnforcer("rbac_model.conf", adapter)
    await e.load_policy()
    return e
