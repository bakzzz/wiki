import casbin

async def init_base_roles(e: casbin.AsyncEnforcer, tenant_id: str):
    """Инициализация базовых ролей и их наследований для нового пространства (tenant)"""
    
    # Ролевое наследование (Role hierarchy)
    # Owner -> Admin -> Editor -> Viewer
    await e.add_named_grouping_policy("g", "Owner", "Admin", tenant_id)
    await e.add_named_grouping_policy("g", "Admin", "Editor", tenant_id)
    await e.add_named_grouping_policy("g", "Editor", "Viewer", tenant_id)
    
    # Права по умолчанию (Base permissions)
    await e.add_named_policy("p", "Viewer", tenant_id, "page:*", "read")
    await e.add_named_policy("p", "Editor", tenant_id, "page:*", "write")
    await e.add_named_policy("p", "Admin", tenant_id, "tenant:*", "manage")
    await e.add_named_policy("p", "Owner", tenant_id, "subscription:*", "manage")
    
    await e.save_policy()
