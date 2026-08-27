from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.user import User, UserRole
from ..models.event import Event, EventStatus
from ..models.library import LibraryResource
from ..models.task import Task
from ..models.poster import Poster
from ..models.important_link import ImportantLink

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("")
def get_stats(db: Session = Depends(get_db)):
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_members = db.query(func.count(User.id)).filter(User.is_active == 1).scalar() or 0
    total_events = db.query(func.count(Event.id)).scalar() or 0
    upcoming_events = (
        db.query(func.count(Event.id))
        .filter(Event.status == EventStatus.UPCOMING)
        .scalar()
        or 0
    )
    total_resources = db.query(func.count(LibraryResource.id)).scalar() or 0
    total_admins = db.query(func.count(User.id)).filter(User.role == UserRole.ADMIN).scalar() or 0
    team_members = db.query(func.count(User.id)).filter(User.team_membership == 1).scalar() or 0
    active_tasks = db.query(func.count(Task.id)).filter(Task.status.in_(['todo', 'in_progress'])).scalar() or 0
    active_posters = db.query(func.count(Poster.id)).filter(Poster.active == True).scalar() or 0
    total_links = db.query(func.count(ImportantLink.id)).scalar() or 0

    return {
        "total_users": total_users,
        "active_members": active_members,
        "total_events": total_events,
        "upcoming_events": upcoming_events,
        "total_resources": total_resources,
        "total_admins": total_admins,
        "team_members": team_members,
        "active_tasks": active_tasks,
        "active_posters": active_posters,
        "total_links": total_links,
    }
