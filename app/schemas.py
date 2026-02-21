from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional 


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str 


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: str
    profile_image: Optional[str] = None

    class Config:
        from_attributes = True

class UserProfileResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: str
    role: str
    level: int
    profile_image: Optional[str] = None

    class Config:
        from_attributes = True

class AdminUserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    level: int
    phone: str
    profile_image: Optional[str] = None

    class Config:
        from_attributes = True
    
class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    profile_image: Optional[str] = None


class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    level: Optional[int] = None


class LibraryCreate(BaseModel):
    title: str
    drive_link: str
    preview_link: Optional[str] = None

class LibraryResponse(BaseModel):
    id: int
    title: str
    drive_link: str
    preview_link: Optional[str] = None

    class Config:
        from_attributes = True
 
class ChangePassword(BaseModel):
    old_password: str
    new_password: str


class TeamMemberCard(BaseModel):
    id: int
    name: str
    role: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    profile_image: Optional[str] = None


class TeamDataResponse(BaseModel):
    presidents: list[TeamMemberCard]
    vice_presidents: list[TeamMemberCard]
    past_presidents: list[TeamMemberCard]
    members: list[TeamMemberCard]


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: int
    status: str = "pending"


class TaskStatusUpdate(BaseModel):
    status: str


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    assigned_to: int
    assigned_to_name: Optional[str] = None
    assigned_by: int
    assigned_by_name: Optional[str] = None
    is_new: bool
    created_at: datetime
    updated_at: datetime


class TaskNotificationResponse(BaseModel):
    unread_count: int
