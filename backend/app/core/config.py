from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Wiki"
    DATABASE_URL: str = "postgresql+asyncpg://wiki_user:wiki_password@localhost:5434/wiki_db"
    MINIO_ENDPOINT: str = "localhost:9003"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin123"
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
