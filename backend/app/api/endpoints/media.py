import uuid
from fastapi import APIRouter
from app.services.storage import generate_presigned_upload_url, generate_presigned_download_url, ensure_bucket

router = APIRouter()

@router.post("/upload-url")
async def get_upload_url(filename: str):
    """Generate a presigned URL for uploading a file to MinIO S3."""
    ensure_bucket()
    object_key = f"uploads/{uuid.uuid4()}/{filename}"
    url = generate_presigned_upload_url(object_key)
    return {"upload_url": url, "object_key": object_key}

@router.get("/download-url")
async def get_download_url(object_key: str):
    """Generate a presigned URL for downloading a file from MinIO S3."""
    url = generate_presigned_download_url(object_key)
    return {"download_url": url}
