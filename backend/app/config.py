import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

# Get the directory of the backend folder
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/fitnova"
    SECRET_KEY: str = "9a6d71b87a8b417c800b21a361df40bb959f6354b7c1265db26d8ee1c3d90f23"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours — handles Render cold-start delays
    GEMINI_API_KEY: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=os.path.join(BASE_DIR, ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
# Print loaded settings details (masking keys) for validation
if __name__ == "__main__":
    print(f"Database URL: {settings.DATABASE_URL}")
    print(f"Algorithm: {settings.ALGORITHM}")
    print(f"Access Token Expiry: {settings.ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
