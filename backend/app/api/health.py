import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.config.settings import get_settings
from app.ai.groq_client import get_groq_client

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
def health_check(db: Session = Depends(get_db)):
    """System health check endpoint checking backend, SQLite, and Groq status."""
    settings = get_settings()
    groq_client = get_groq_client()

    # Verify SQLite connectivity
    sqlite_ok = False
    try:
        db.execute(text("SELECT 1"))
        sqlite_ok = True
    except Exception:
        sqlite_ok = False

    groq_status = "configured" if groq_client.is_configured else "not_configured"

    # Growth ML Status
    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    checkpoint_file = settings.GROWTH_MODEL_DIR / f"{settings.GROWTH_MODEL_VERSION}.pt"
    growth_ml_status = {
        "configured": checkpoint_file.exists(),
        "model_version": settings.GROWTH_MODEL_VERSION,
        "device": device,
        "graphsage": True,
        "reason": None if checkpoint_file.exists() else "Model checkpoint not generated yet. Run 'aegis growth train'.",
    }

    return {
        "status": "ok" if sqlite_ok else "degraded",
        "backend": "online",
        "sqlite": "connected" if sqlite_ok else "error",
        "groq": groq_status,
        "growth_ml": growth_ml_status,
        "database": os.path.basename(settings.DATABASE_URL.replace("sqlite:///", "")),
        "environment": settings.APP_ENV,
        "phase": settings.PHASE,
        "version": settings.VERSION,
    }
