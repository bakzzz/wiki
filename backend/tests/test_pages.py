import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestPages:
    async def test_get_tree_empty(self, client: AsyncClient, auth_token: str):
        """GET /tree returns empty list when no pages exist."""
        resp = await client.get("/api/v1/pages/tree", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_create_page(self, client: AsyncClient, auth_token: str):
        """POST /pages creates a new page."""
        resp = await client.post("/api/v1/pages/", json={
            "title": "Test Page",
            "slug": "test-page",
            "content": '{"type": "doc", "content": []}',
            "parent_path": "",
        }, headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Test Page"
        assert data["slug"] == "test-page"
        assert "id" in data

    async def test_get_page_by_id(self, client: AsyncClient, auth_token: str):
        """GET /pages/{id} returns the page."""
        # Create a page first
        create_resp = await client.post("/api/v1/pages/", json={
            "title": "Page By ID",
            "slug": "page-by-id",
            "content": "",
            "parent_path": "",
        }, headers={
            "Authorization": f"Bearer {auth_token}"
        })
        page_id = create_resp.json()["id"]

        resp = await client.get(f"/api/v1/pages/{page_id}", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert resp.status_code == 200
        assert resp.json()["title"] == "Page By ID"

    async def test_get_page_by_slug(self, client: AsyncClient, auth_token: str):
        """GET /pages/by-slug/{slug} returns the page."""
        # Create a page first
        await client.post("/api/v1/pages/", json={
            "title": "Slug Page",
            "slug": "slug-page",
            "content": "",
            "parent_path": "",
        }, headers={
            "Authorization": f"Bearer {auth_token}"
        })

        resp = await client.get("/api/v1/pages/by-slug/slug-page", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert resp.status_code == 200
        assert resp.json()["title"] == "Slug Page"

    async def test_get_page_not_found(self, client: AsyncClient, auth_token: str):
        """GET /pages/99999 returns 404."""
        resp = await client.get("/api/v1/pages/99999", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert resp.status_code == 404

    async def test_health_check(self, client: AsyncClient):
        """GET /health returns ok."""
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
