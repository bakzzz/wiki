import boto3
from botocore.exceptions import ClientError
from app.core.config import settings

def get_s3_client():
    return boto3.client(
        's3',
        endpoint_url=f'http://{settings.MINIO_ENDPOINT}',
        aws_access_key_id=settings.MINIO_ACCESS_KEY,
        aws_secret_access_key=settings.MINIO_SECRET_KEY,
        region_name='us-east-1',
    )

def ensure_bucket(bucket_name: str = 'wiki-media'):
    client = get_s3_client()
    try:
        client.head_bucket(Bucket=bucket_name)
    except ClientError:
        client.create_bucket(Bucket=bucket_name)

def generate_presigned_upload_url(object_key: str, bucket: str = 'wiki-media', expires: int = 3600) -> str:
    client = get_s3_client()
    url = client.generate_presigned_url(
        'put_object',
        Params={'Bucket': bucket, 'Key': object_key},
        ExpiresIn=expires,
    )
    return url

def generate_presigned_download_url(object_key: str, bucket: str = 'wiki-media', expires: int = 3600) -> str:
    client = get_s3_client()
    url = client.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket, 'Key': object_key},
        ExpiresIn=expires,
    )
    return url
