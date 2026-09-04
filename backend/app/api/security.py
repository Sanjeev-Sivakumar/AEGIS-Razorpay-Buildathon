import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import AttackRecord
from app.schemas.security import AttackRunRequest, AttackResultResponse
from app.security.attack_lab import AttackLab

logger = logging.getLogger("aegis.api.security")
security_router = APIRouter(prefix="/security", tags=["Security & Attack Lab"])

@security_router.get("/scenarios", response_model=List[Dict[str, Any]])
def list_attack_scenarios(db: Session = Depends(get_db)):
    """List all available Attack Lab scenarios and their metadata."""
    lab = AttackLab(db)
    return lab.list_scenarios()

@security_router.post("/attack/run", response_model=AttackResultResponse, status_code=status.HTTP_201_CREATED)
def run_attack_simulation(request: AttackRunRequest, db: Session = Depends(get_db)):
    """
    Run an attack simulation safely in the local sandboxed Trust Engine.
    Guarantees no money moves and no Razorpay order is ever created.
    """
    try:
        lab = AttackLab(db)
        record = lab.run_attack(
            scenario_name=request.scenario,
            custom_instruction=request.custom_instruction,
        )
        return record
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Attack simulation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")

@security_router.get("/attacks", response_model=List[AttackResultResponse])
def list_attack_records(limit: int = 20, db: Session = Depends(get_db)):
    """List recent executed Attack Lab records."""
    records = (
        db.query(AttackRecord)
        .order_by(AttackRecord.created_at.desc())
        .limit(limit)
        .all()
    )
    return records

@security_router.get("/attack/{attack_id}", response_model=AttackResultResponse)
def get_attack_record(attack_id: str, db: Session = Depends(get_db)):
    """Retrieve details of an executed attack record by ID."""
    record = db.query(AttackRecord).filter(AttackRecord.id == attack_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Attack record '{attack_id}' not found")
    return record
