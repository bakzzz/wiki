import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.middleware.tenant import TenantMiddleware

# --- Logging ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("wiki")

MEDIA_DIR = Path(__file__).resolve().parent.parent / "media"
MEDIA_DIR.mkdir(exist_ok=True)


# --- Startup / Shutdown ---
async def _init_admin_tables():
    """Create admin tables once at startup, not per-request."""
    from app.db.session import async_session_maker
    from app.api.endpoints.admin import _ensure_tables
    async with async_session_maker() as session:
        await _ensure_tables(session)
    logger.info("Admin tables initialized")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Wiki API...")
    await _init_admin_tables()
    yield
    logger.info("Shutting down Wiki API...")


app = FastAPI(title="Wiki API", lifespan=lifespan)

app.add_middleware(TenantMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=500)
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
