from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.middleware.tenant import TenantMiddleware

MEDIA_DIR = Path(__file__).resolve().parent.parent / "media"
MEDIA_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Wiki API")

app.add_middleware(TenantMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost",
        "https://wiki.chromaton.ru",
        "http://wiki.chromaton.ru"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploaded media (logos etc.)
app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")

from app.api.endpoints import auth, pages, media, search, shared_links, redirects, admin, public_view

@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")

@app.get("/health")
async def health_check():
    return {"status": "ok"}

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(pages.router, prefix="/api/v1/pages", tags=["pages"])
app.include_router(media.router, prefix="/api/v1/media", tags=["media"])
app.include_router(search.router, prefix="/api/v1/search", tags=["search"])
app.include_router(shared_links.router, prefix="/api/v1/shared", tags=["shared"])
app.include_router(redirects.router, prefix="/api/v1/redirects", tags=["redirects"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(public_view.router, prefix="/api/v1/public", tags=["public"])
