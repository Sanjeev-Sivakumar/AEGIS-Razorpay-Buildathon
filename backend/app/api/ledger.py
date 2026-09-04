import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.security import LedgerEntryResponse, LedgerVerificationResponse
from app.services.ledger.ledger_service import LedgerService

logger = logging.getLogger("aegis.api.ledger")
ledger_router = APIRouter(prefix="/ledger", tags=["Audit Ledger"])

@ledger_router.get("", response_model=List[LedgerEntryResponse])
def get_ledger_tail(limit: int = 20, db: Session = Depends(get_db)):
    """Fetch the latest append-only audit ledger records."""
    svc = LedgerService(db)
    return svc.get_tail(limit=limit)

@ledger_router.get("/{transaction_id}", response_model=LedgerEntryResponse)
def get_ledger_entry(transaction_id: str, db: Session = Depends(get_db)):
    """Retrieve an audit ledger record by entry ID or transaction ID."""
    svc = LedgerService(db)
    entry = svc.get_entry(transaction_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Ledger entry '{transaction_id}' not found")
    return entry

@ledger_router.post("/verify", response_model=LedgerVerificationResponse)
def verify_ledger_chain(db: Session = Depends(get_db)):
    """
    Verify the cryptographic integrity of the entire audit ledger from Genesis to Head.
    Validates parent hash continuity and recomputes canonical SHA-256 block hashes.
    """
    svc = LedgerService(db)
    return svc.verify_chain()
