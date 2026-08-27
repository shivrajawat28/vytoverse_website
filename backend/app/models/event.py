from sqlalchemy import Column, Integer, String, DateTime, Enum as SAEnum, Text, Date, Time
from sqlalchemy.sql import func
from ..database import Base
import enum


class EventStatus(str, enum.Enum):
    UPCOMING = "upcoming"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    short_description = Column(String(500), nullable=True)
    date = Column(Date, nullable=False)
    time_start = Column(Time, nullable=True)
    time_end = Column(Time, nullable=True)
    location = Column(String(200), nullable=True)
    image = Column(String(500), nullable=True)
    invitation_file = Column(String(500), nullable=True)
    status = Column(SAEnum(EventStatus), default=EventStatus.UPCOMING, nullable=False)
    registration_url = Column(String(500), nullable=True)
    max_participants = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
