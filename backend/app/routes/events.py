from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from ..models.event import Event, EventStatus
from ..schemas.event import EventCreate, EventUpdate, EventResponse

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("", response_model=list[EventResponse])
def list_events(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Event)
    if status_filter:
        query = query.filter(Event.status == status_filter)
    events = query.order_by(Event.date.desc()).offset(offset).limit(limit).all()
    return [EventResponse.model_validate(e) for e in events]


@router.get("/upcoming", response_model=list[EventResponse])
def list_upcoming_events(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    from datetime import date
    events = (
        db.query(Event)
        .filter(Event.date >= date.today(), Event.status != EventStatus.CANCELLED)
        .order_by(Event.date.asc())
        .limit(limit)
        .all()
    )
    return [EventResponse.model_validate(e) for e in events]


@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return EventResponse.model_validate(event)
