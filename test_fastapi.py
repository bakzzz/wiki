from fastapi import FastAPI
from fastapi.testclient import TestClient

app = FastAPI()

@app.get("/pages/{page_id}")
def get_page(page_id: int):
    return {"id": page_id}

@app.get("/pages/by-slug/{slug}")
def get_by_slug(slug: str):
    return {"slug": slug}

client = TestClient(app)
print("by-slug:", client.get("/pages/by-slug/test").status_code)
print("id 123:", client.get("/pages/123").status_code)
