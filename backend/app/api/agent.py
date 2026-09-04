from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import AgentSession, AgentEvent
from app.schemas.agent import (
    AgentRunRequest,
    AgentRunResponse,
    AgentSessionResponse,
    AgentEventResponse,
)
from app.agent.controller import AgentController

router = APIRouter(prefix="/agent", tags=["Agent"])

@router.post("/run", response_model=AgentRunResponse)
def run_agent(payload: AgentRunRequest, db: Session = Depends(get_db)):
    """Trigger the Aegis Agent Loop (PERCEIVE -> ANALYZE -> DECIDE -> ACT -> COMPLETED)."""
    controller = AgentController(db)
    try:
        response = controller.run(payload.input)
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Agent Error: {str(e)}")

@router.get("/sessions", response_model=List[AgentSessionResponse])
def list_sessions(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    """List recent agent sessions."""
    sessions = (
        db.query(AgentSession)
        .order_by(AgentSession.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        AgentSessionResponse(
            id=s.id,
            status=s.status,
            current_state=s.current_state,
            created_at=s.created_at,
            updated_at=s.updated_at,
            events=[
                AgentEventResponse(
                    id=e.id,
                    session_id=e.session_id,
                    event_type=e.event_type,
                    state=e.state,
                    message=e.message,
                    payload=e.parsed_payload,
                    created_at=e.created_at,
                )
                for e in s.events
            ],
        )
        for s in sessions
    ]

@router.get("/events", response_model=List[AgentEventResponse])
def list_all_events(
    limit: int = Query(50, ge=1, le=200),
    state: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List recent events across all sessions (for live activity feeds)."""
    query = db.query(AgentEvent)
    if state:
        query = query.filter(AgentEvent.state == state.upper())
    events = query.order_by(AgentEvent.created_at.desc()).limit(limit).all()

    return [
        AgentEventResponse(
            id=e.id,
            session_id=e.session_id,
            event_type=e.event_type,
            state=e.state,
            message=e.message,
            payload=e.parsed_payload,
            created_at=e.created_at,
        )
        for e in events
    ]

@router.get("/{session_id}", response_model=AgentSessionResponse)
def get_session(session_id: str, db: Session = Depends(get_db)):
    """Retrieve an agent session by ID."""
    session = db.query(AgentSession).filter(AgentSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail=f"Agent session '{session_id}' not found")

    return AgentSessionResponse(
        id=session.id,
        status=session.status,
        current_state=session.current_state,
        created_at=session.created_at,
        updated_at=session.updated_at,
        events=[
            AgentEventResponse(
                id=e.id,
                session_id=e.session_id,
                event_type=e.event_type,
                state=e.state,
                message=e.message,
                payload=e.parsed_payload,
                created_at=e.created_at,
            )
            for e in session.events
        ],
    )

@router.get("/{session_id}/events", response_model=List[AgentEventResponse])
def get_session_events(session_id: str, db: Session = Depends(get_db)):
    """Retrieve all chronological events for a specific agent session."""
    session = db.query(AgentSession).filter(AgentSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail=f"Agent session '{session_id}' not found")

    events = (
        db.query(AgentEvent)
        .filter(AgentEvent.session_id == session_id)
        .order_by(AgentEvent.created_at.asc())
        .all()
    )

    return [
        AgentEventResponse(
            id=e.id,
            session_id=e.session_id,
            event_type=e.event_type,
            state=e.state,
            message=e.message,
            payload=e.parsed_payload,
            created_at=e.created_at,
        )
        for e in events
    ]
