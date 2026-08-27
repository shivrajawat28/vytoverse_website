from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PosterCreate(BaseModel):
    title: Optional[str] = None
    image_url: str
    target_url: Optional[str] = None
    active: Optional[bool] = True
    expires_at: Optional[datetime] = None


class PosterUpdate(BaseModel):
    title: Optional[str] = None
    image_url: Optional[str] = None
    target_url: Optional[str] = None
    active: Optional[bool] = None
    expires_at: Optional[datetime] = None


class PosterResponse(BaseModel):
    id: int
    title: Optional[str] = None
    image_url: str
    target_url: Optional[str] = None
    active: bool
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
