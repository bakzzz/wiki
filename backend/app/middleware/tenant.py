import os

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Get tenant_id from header (can be changed to subdomain later)
        tenant_id = request.headers.get("X-Tenant-ID", "public")
        
        # Inject tenant_id into request state for dependencies
        request.state.tenant_id = tenant_id
        
        response = await call_next(request)
        return response
