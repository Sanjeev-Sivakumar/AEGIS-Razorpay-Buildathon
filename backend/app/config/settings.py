import os
from pathlib import Path
from functools import lru_cache
from typing import Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory for the backend and root
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent

class Settings(BaseSettings):
    APP_NAME: str = "AEGIS"
    APP_ENV: str = "development"
    ENVIRONMENT: str = "development"
    VERSION: str = "1.0.0"
    PHASE: str = "5 / 5"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{BACKEND_DIR / 'aegis.db'}"
    
    # Groq AI
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "openai/gpt-oss-20b"
    GROQ_FALLBACK_MODEL: str = "qwen/qwen3.8-27b"
    GROQ_TIMEOUT_SECONDS: float = 10.0

    # Cryptographic Signing (Development-safe HMAC-SHA256)
    AEGIS_SIGNING_KEY: str = "aegis_dev_secret_signing_key_2026_phase2"

    # Phase 3: Growth Intelligence ML
    GROWTH_MODEL_VERSION: str = "aegis-selection-v1"
    GROWTH_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    GROWTH_DATASET_SEED: int = 42
    GROWTH_MODEL_DIR: Path = BACKEND_DIR / "models"

    # Razorpay Test Mode
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None
    TEST_API_KEY: Optional[str] = None
    TEST_KEY_SECRET: Optional[str] = None
    RAZORPAY_BASE_URL: str = "https://api.razorpay.com/v1"

    # Risk Engine Thresholds
    RISK_SAFE_MAX: int = 24
    RISK_REVIEW_MAX: int = 49
    RISK_HIGH_MAX: int = 74

    @model_validator(mode="after")
    def resolve_database_path(self):
        if self.DATABASE_URL.startswith("sqlite:///."):
            rel_path = self.DATABASE_URL.replace("sqlite:///.", "").lstrip("/\\")
            abs_path = (ROOT_DIR / rel_path).resolve().as_posix()
            self.DATABASE_URL = f"sqlite:///{abs_path}"
        return self

    @property
    def resolved_razorpay_key_id(self) -> Optional[str]:
        return self.RAZORPAY_KEY_ID or self.TEST_API_KEY

    @property
    def resolved_razorpay_key_secret(self) -> Optional[str]:
        return self.RAZORPAY_KEY_SECRET or self.TEST_KEY_SECRET
    
    model_config = SettingsConfigDict(
        env_file=(
            str(ROOT_DIR / ".env"),
            str(BACKEND_DIR / ".env")
        ),
        env_file_encoding="utf-8",
        extra="ignore"
    )

@lru_cache()
def get_settings() -> Settings:
    return Settings()
