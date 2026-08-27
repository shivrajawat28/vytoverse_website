from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_user_id: int
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    due_date: Optional[date] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_user_id: Optional[int] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    assigned_user_id: int
    assigned_user_name: Optional[str] = None
    status: str
    priority: str
    due_date: Optional[date] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
