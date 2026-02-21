from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key  = True, index= True)
    name = Column(String, nullable= False)
    email = Column(String, nullable = False, unique=True, index=True)
    hashed_password = Column(String, nullable = False)
    phone = Column(String, nullable = False)
    role = Column(String, default="user")
    level = Column(Integer, default = 1)
    profile_image = Column(String, nullable=True)


class Library(Base):
    __tablename__ = "libraries"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    drive_link = Column(String, nullable=False)
    preview_link = Column(String, nullable=True)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="pending", nullable=False)
    assigned_to = Column(Integer, nullable=False, index=True)
    assigned_by = Column(Integer, nullable=False)
    is_new = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

