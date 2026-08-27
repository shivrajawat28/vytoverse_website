from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, time
from enum import Enum


class EventStatus(str, Enum):
    UPCOMING = "upcoming"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    date: date
    time_start: Optional[time] = None
    time_end: Optional[time] = None
    location: Optional[str] = None
    status: Optional[EventStatus] = EventStatus.UPCOMING
    registration_url: Optional[str] = None
    poster_url: Optional[str] = None
    invitation_url: Optional[str] = None
    category: Optional[str] = None
    max_participants: Optional[int] = None


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    date: Optional[date] = None
    time_start: Optional[time] = None
    time_end: Optional[time] = None
    location: Optional[str] = None
    status: Optional[EventStatus] = None
    registration_url: Optional[str] = None
    poster_url: Optional[str] = None
    invitation_url: Optional[str] = None
    category: Optional[str] = None
    max_participants: Optional[int] = None


class EventResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    date: date
    time_start: Optional[time] = None
    time_end: Optional[time] = None
    location: Optional[str] = None
    image: Optional[str] = None
    invitation_file: Optional[str] = None
    status: EventStatus
    registration_url: Optional[str] = None
    poster_url: Optional[str] = None
    invitation_url: Optional[str] = None
    category: Optional[str] = None
    max_participants: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
