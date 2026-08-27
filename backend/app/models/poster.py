from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.sql import func
from ..database import Base


class Poster(Base):
    __tablename__ = "posters"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=True)
    image_url = Column(String(500), nullable=False)
    target_url = Column(String(500), nullable=True)
    active = Column(Boolean, default=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
