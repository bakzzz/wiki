import asyncio
from fastapi.testclient import TestClient
from app.main import app

def test_api():
    client = TestClient(app)
    # First, get tree
    response = client.get("/api/v1/pages/tree", headers={"X-Tenant-ID": "test_room"})
    if response.status_code == 401:
        print("Requires auth, let's bypass auth check by assuming tenant public")
    
    response = client.get("/api/v1/pages/tree", headers={"X-Tenant-ID": "public"})
    print("TREE", response.status_code, response.text[:200])
    
    if response.status_code == 200:
        pages = response.json()
        if pages:
            first_id = pages[0]["id"]
            print(f"Fetching ID: {first_id}")
            res2 = client.get(f"/api/v1/pages/{first_id}", headers={"X-Tenant-ID": "public"})
            print(f"PAGE {first_id}:", res2.status_code, res2.text[:200])
        else:
            print("No pages found in public tree.")

test_api()
