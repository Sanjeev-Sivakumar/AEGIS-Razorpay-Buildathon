import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.security import DecisionReplayResponse
from app.services.replay import DecisionReplayService

logger = logging.getLogger("aegis.api.replay")
replay_router = APIRouter(prefix="/replay", tags=["Decision Replay"])

@replay_router.get("/{transaction_id}", response_model=DecisionReplayResponse)
def replay_decision(transaction_id: str, db: Session = Depends(get_db)):
    """
    Forensically reconstruct the full chronological decision trail for any
    transaction, attack, proposal, or audit ledger entry.
    """
    try:
        svc = DecisionReplayService(db)
        return svc.replay(transaction_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error during decision replay for '{transaction_id}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Replay reconstruction error: {str(e)}")
