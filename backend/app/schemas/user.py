from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class UserBase(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[EmailStr] = None


class UserCreate(BaseModel):
    name: str
    username: Optional[str] = None
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    department: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    twitter_url: Optional[str] = None
    website_url: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    name: str
    username: Optional[str] = None
    email: str
    profile_image: Optional[str] = None
    bio: Optional[str] = None
    department: Optional[str] = None
    role: UserRole
    stars: int
    team_membership: int = 0
    team_role: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    twitter_url: Optional[str] = None
    website_url: Optional[str] = None
    is_active: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserAdminUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    stars: Optional[int] = None
    team_membership: Optional[int] = None
    team_role: Optional[str] = None
    is_active: Optional[int] = None


class TeamMemberUpdate(BaseModel):
    team_membership: int
    team_role: Optional[str] = None


class StarAssign(BaseModel):
    stars: int
