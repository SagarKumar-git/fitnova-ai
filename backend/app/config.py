import os
import logging
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("fitnova.security")

# Get the directory of the backend folder
BASE_DIR = Path(__file__).resolve().parent.parent

INSECURE_DEV_SECRET = "9a6d71b87a8b417c800b21a361df40bb959f6354b7c1265db26d8ee1c3d90f23"

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/fitnova"
    SECRET_KEY: str = INSECURE_DEV_SECRET
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours — handles Render cold-start delays
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.0-flash"
    FRONTEND_URL: Optional[str] = None
    PORT: int = 8000

    @property
    def normalized_database_url(self) -> str:
        url = self.DATABASE_URL.strip()
        # Normalizes Render / Heroku / Neon 'postgres://' connection URIs to SQLAlchemy-compliant 'postgresql://'
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    model_config = SettingsConfigDict(
        env_file=os.path.join(BASE_DIR, ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Enforce security alert if default key is deployed to production
if settings.ENVIRONMENT.lower() == "production" and settings.SECRET_KEY == INSECURE_DEV_SECRET:
    logger.critical(
        "SECURITY ALERT: Insecure default SECRET_KEY detected in production! "
        "Provide a secure SECRET_KEY via environment variables to protect JWT authentication."
    )

# Print loaded settings details (masking keys) for validation
if __name__ == "__main__":
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Database URL: {settings.DATABASE_URL}")
    print(f"Algorithm: {settings.ALGORITHM}")
    print(f"Access Token Expiry: {settings.ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
    print(f"Secret Key Configured: {'Yes (Custom)' if settings.SECRET_KEY != INSECURE_DEV_SECRET else 'Default Dev Key'}")
