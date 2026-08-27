from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class ResourceType(str, Enum):
    PDF = "pdf"
    DOCUMENT = "document"
    LINK = "link"
    VIDEO = "video"
    TUTORIAL = "tutorial"
    NOTE = "note"
    OTHER = "other"


class LibraryBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    resource_type: ResourceType = ResourceType.PDF
    external_url: Optional[str] = None
    author: Optional[str] = None


class LibraryCreate(LibraryBase):
    pass


class LibraryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    resource_type: Optional[ResourceType] = None
    external_url: Optional[str] = None
    author: Optional[str] = None


class LibraryResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    category: str
    resource_type: ResourceType
    file_url: Optional[str] = None
    external_url: Optional[str] = None
    author: Optional[str] = None
    uploaded_by: Optional[int] = None
    downloads: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
