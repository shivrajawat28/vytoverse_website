from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ImportantLinkCreate(BaseModel):
    title: str
    description: Optional[str] = None
    url: str
    assigned_user_id: int
    active: Optional[bool] = True
    expires_at: Optional[datetime] = None


class ImportantLinkUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    assigned_user_id: Optional[int] = None
    active: Optional[bool] = None
    expires_at: Optional[datetime] = None


class ImportantLinkResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    url: str
    assigned_user_id: int
    assigned_user_name: Optional[str] = None
    active: bool
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
