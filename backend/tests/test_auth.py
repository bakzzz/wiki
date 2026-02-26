import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestAuth:
    async def test_login_success(self, client: AsyncClient, auth_token: str):
        """Login with valid credentials returns token."""
        resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@test.com",
            "password": "testpass123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self, client: AsyncClient, auth_token: str):
        """Login with wrong password returns 401."""
        resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@test.com",
            "password": "wrongpassword",
        })
        assert resp.status_code == 401

    async def test_login_nonexistent_user(self, client: AsyncClient, auth_token: str):
        """Login with non-existent email returns 401."""
        resp = await client.post("/api/v1/auth/login", json={
            "email": "nobody@test.com",
            "password": "testpass123",
        })
        assert resp.status_code == 401

    async def test_me_authenticated(self, client: AsyncClient, auth_token: str):
        """GET /me with valid token returns user info."""
        resp = await client.get("/api/v1/auth/me", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "admin@test.com"
        assert data["is_superuser"] is True

    async def test_me_unauthenticated(self, client: AsyncClient):
        """GET /me without token returns 401."""
        resp = await client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    async def test_register_blocked(self, client: AsyncClient, auth_token: str):
        """Registration when users exist returns 403."""
        resp = await client.post("/api/v1/auth/register", json={
            "email": "new@test.com",
            "password": "newpass123",
        })
        assert resp.status_code == 403
