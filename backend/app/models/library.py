from sqlalchemy import Column, Integer, String, DateTime, Enum as SAEnum, Text
from sqlalchemy.sql import func
from ..database import Base
import enum


class ResourceType(str, enum.Enum):
    PDF = "pdf"
    DOCUMENT = "document"
    LINK = "link"
    VIDEO = "video"
    TUTORIAL = "tutorial"
    NOTE = "note"
    OTHER = "other"


class LibraryResource(Base):
    __tablename__ = "library_resources"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, index=True)
    resource_type = Column(SAEnum(ResourceType), default=ResourceType.PDF, nullable=False)
    file_url = Column(String(500), nullable=True)
    file_path = Column(String(500), nullable=True)
    external_url = Column(String(500), nullable=True)
    author = Column(String(200), nullable=True)
    uploaded_by = Column(Integer, nullable=True)
    downloads = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
