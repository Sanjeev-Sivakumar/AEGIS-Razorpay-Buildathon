import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import QueryIntent, generate_uuid
from app.schemas.intent import QueryIntentCreate, QueryIntentResponse, IntentExtractionResult
from app.ai.groq_client import get_groq_client

router = APIRouter(prefix="/intent", tags=["Intent"])

@router.post("/create", response_model=QueryIntentResponse)
def create_intent(payload: QueryIntentCreate, db: Session = Depends(get_db)):
    """Extract structured intent from text using Groq or fallback, and persist to SQLite."""
    text_clean = payload.text.strip()
    if not text_clean:
        raise HTTPException(status_code=400, detail="Input text cannot be empty")

    groq_client = get_groq_client()
    extracted: IntentExtractionResult = groq_client.extract_intent(text_clean)

    intent = QueryIntent(
        id=generate_uuid("INT-"),
        raw_text=text_clean,
        category=extracted.category,
        location=extracted.location,
        max_budget=extracted.max_budget,
        currency=extracted.currency,
        attributes=json.dumps(extracted.attributes),
        source=extracted.source,
    )
    db.add(intent)
    db.commit()
    db.refresh(intent)

    return QueryIntentResponse(
        id=intent.id,
        raw_text=intent.raw_text,
        category=intent.category,
        location=intent.location,
        max_budget=intent.max_budget,
        currency=intent.currency,
        attributes=intent.parsed_attributes,
        source=intent.source,
        created_at=intent.created_at,
    )

@router.get("/{intent_id}", response_model=QueryIntentResponse)
def get_intent(intent_id: str, db: Session = Depends(get_db)):
    """Retrieve an intent by ID."""
    intent = db.query(QueryIntent).filter(QueryIntent.id == intent_id).first()
    if not intent:
        raise HTTPException(status_code=404, detail=f"Intent '{intent_id}' not found")

    return QueryIntentResponse(
        id=intent.id,
        raw_text=intent.raw_text,
        category=intent.category,
        location=intent.location,
        max_budget=intent.max_budget,
        currency=intent.currency,
        attributes=intent.parsed_attributes,
        source=intent.source,
        created_at=intent.created_at,
    )

@router.get("", response_model=List[QueryIntentResponse])
def list_intents(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    """List recent intents ordered by creation time."""
    intents = db.query(QueryIntent).order_by(QueryIntent.created_at.desc()).limit(limit).all()
    return [
        QueryIntentResponse(
            id=i.id,
            raw_text=i.raw_text,
            category=i.category,
            location=i.location,
            max_budget=i.max_budget,
            currency=i.currency,
            attributes=i.parsed_attributes,
            source=i.source,
            created_at=i.created_at,
        )
        for i in intents
    ]
