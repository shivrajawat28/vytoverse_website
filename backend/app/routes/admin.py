import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from ..database import get_db
from ..models.user import User, UserRole
from ..models.event import Event, EventStatus
from ..models.library import LibraryResource
from ..models.task import Task
from ..models.poster import Poster
from ..models.important_link import ImportantLink
from ..schemas.user import UserResponse, UserAdminUpdate, StarAssign, TeamMemberUpdate, RoleAssign
from ..schemas.event import EventCreate, EventUpdate, EventResponse
from ..schemas.library import LibraryCreate, LibraryUpdate, LibraryResponse
from ..schemas.task import TaskCreate, TaskUpdate, TaskResponse
from ..schemas.poster import PosterCreate, PosterUpdate, PosterResponse
from ..schemas.important_link import ImportantLinkCreate, ImportantLinkUpdate, ImportantLinkResponse
from ..auth.dependencies import get_current_admin
from ..models.user import ADMIN_LEVEL_ROLES
from ..config import UPLOAD_DIR, MAX_UPLOAD_SIZE, ALLOWED_IMAGE_TYPES
import re

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Users Management ──
@router.get("/users", response_model=list[UserResponse])
def list_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if search:
        query = query.filter(
            User.name.ilike(f"%{search}%")
            | User.email.ilike(f"%{search}%")
            | User.username.ilike(f"%{search}%")
        )
    if role:
        query = query.filter(User.role == role)
    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    return [UserResponse.model_validate(u) for u in users]


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    request: UserAdminUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/users/{user_id}/stars", response_model=UserResponse)
def assign_stars(
    user_id: int,
    request: StarAssign,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.stars = request.stars
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.put("/users/{user_id}/role", response_model=UserResponse)
def assign_role(
    user_id: int,
    request: RoleAssign,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Assign a system role to a user. Only admin-level users can do this.
    Prevents removing the last admin-level user."""
    # Only ADMIN, PRESIDENT, VICE_PRESIDENT can assign roles
    if admin.role not in ADMIN_LEVEL_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only leadership can assign roles",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    new_role = request.role

    # Prevent removing the last admin-level user
    if user.role in ADMIN_LEVEL_ROLES and new_role not in ADMIN_LEVEL_ROLES:
        admin_count = db.query(func.count(User.id)).filter(
            User.role.in_([r.value for r in ADMIN_LEVEL_ROLES])
        ).scalar() or 0
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last admin-level user",
            )

    user.role = new_role

    # Auto-add to team when setting PRESIDENT or VICE_PRESIDENT
    if new_role in (UserRole.PRESIDENT, UserRole.VICE_PRESIDENT):
        if user.team_membership != 1:
            user.team_membership = 1
            if not user.team_role:
                user.team_role = new_role.value.replace('_', ' ').title()

    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.put("/users/{user_id}/team", response_model=UserResponse)
def toggle_team_membership(
    user_id: int,
    request: TeamMemberUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.team_membership = 1 if request.team_membership else 0

    if request.team_membership:
        # When adding to team, team_role is required
        if not request.team_role or not request.team_role.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Team role is required when adding a team member",
            )
        role = request.team_role.strip()
        if len(role) > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Team role must be 100 characters or fewer",
            )
        user.team_role = role
    else:
        # When removing from team, clear the role
        user.team_role = None

    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


# ── Events Management ──
@router.get("/events", response_model=list[EventResponse])
def admin_list_events(
    status_filter: Optional[str] = Query(None, alias="status"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Event)
    if status_filter:
        query = query.filter(Event.status == status_filter)
    events = query.order_by(Event.date.desc()).all()
    return [EventResponse.model_validate(e) for e in events]


@router.post("/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    request: EventCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    event = Event(**request.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return EventResponse.model_validate(event)


@router.put("/events/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    request: EventUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)

    db.commit()
    db.refresh(event)
    return EventResponse.model_validate(event)


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    db.delete(event)
    db.commit()


@router.post("/events/{event_id}/image")
async def upload_event_image(
    event_id: int,
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large")

    upload_path = os.path.join(UPLOAD_DIR, "events")
    os.makedirs(upload_path, exist_ok=True)

    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"event_{event_id}.{ext}"
    filepath = os.path.join(upload_path, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    event.image = f"/uploads/events/{filename}"
    db.commit()

    return {"image_url": event.image}


# ── Library Management ──
@router.get("/library", response_model=list[LibraryResponse])
def admin_list_resources(
    category: Optional[str] = Query(None),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(LibraryResource)
    if category:
        query = query.filter(LibraryResource.category == category)
    resources = query.order_by(LibraryResource.created_at.desc()).all()
    return [LibraryResponse.model_validate(r) for r in resources]


@router.post("/library", response_model=LibraryResponse, status_code=status.HTTP_201_CREATED)
def create_resource(
    request: LibraryCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    resource = LibraryResource(**request.model_dump(), uploaded_by=admin.id)
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return LibraryResponse.model_validate(resource)


@router.put("/library/{resource_id}", response_model=LibraryResponse)
def update_resource(
    resource_id: int,
    request: LibraryUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    resource = db.query(LibraryResource).filter(LibraryResource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(resource, key, value)

    db.commit()
    db.refresh(resource)
    return LibraryResponse.model_validate(resource)


@router.delete("/library/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    resource_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    resource = db.query(LibraryResource).filter(LibraryResource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    db.delete(resource)
    db.commit()


@router.post("/library/{resource_id}/file")
async def upload_library_file(
    resource_id: int,
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    resource = db.query(LibraryResource).filter(LibraryResource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large")

    upload_path = os.path.join(UPLOAD_DIR, "library")
    os.makedirs(upload_path, exist_ok=True)

    filename = f"resource_{resource_id}_{file.filename}"
    filepath = os.path.join(upload_path, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    resource.file_path = filepath
    resource.file_url = f"/uploads/library/{filename}"
    db.commit()

    return {"file_url": resource.file_url}


# ── Task Management ──
@router.get("/tasks", response_model=list[TaskResponse])
def admin_list_tasks(
    search: Optional[str] = Query(None),
    assigned_user_id: Optional[int] = Query(None),
    task_status: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Task)
    if search:
        query = query.filter(Task.title.ilike(f"%{search}%"))
    if assigned_user_id:
        query = query.filter(Task.assigned_user_id == assigned_user_id)
    if task_status:
        query = query.filter(Task.status == task_status)
    if priority:
        query = query.filter(Task.priority == priority)
    tasks = query.order_by(Task.created_at.desc()).all()
    result = []
    for t in tasks:
        resp = TaskResponse.model_validate(t)
        resp.assigned_user_name = t.assigned_user.name if t.assigned_user else None
        result.append(resp)
    return result


@router.get("/tasks/{task_id}", response_model=TaskResponse)
def admin_get_task(
    task_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    resp = TaskResponse.model_validate(task)
    resp.assigned_user_name = task.assigned_user.name if task.assigned_user else None
    return resp


@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    request: TaskCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    # Validate user exists
    user = db.query(User).filter(User.id == request.assigned_user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned user not found")
    task = Task(**request.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    resp = TaskResponse.model_validate(task)
    resp.assigned_user_name = user.name
    return resp


@router.put("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    request: TaskUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    update_data = request.model_dump(exclude_unset=True)
    if "assigned_user_id" in update_data:
        user = db.query(User).filter(User.id == update_data["assigned_user_id"]).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned user not found")
    for key, value in update_data.items():
        setattr(task, key, value)
    db.commit()
    db.refresh(task)
    resp = TaskResponse.model_validate(task)
    resp.assigned_user_name = task.assigned_user.name if task.assigned_user else None
    return resp


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    db.delete(task)
    db.commit()


# ── Poster Management ──
@router.get("/posters", response_model=list[PosterResponse])
def admin_list_posters(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    posters = db.query(Poster).order_by(Poster.created_at.desc()).all()
    return [PosterResponse.model_validate(p) for p in posters]


@router.post("/posters", response_model=PosterResponse, status_code=status.HTTP_201_CREATED)
def create_poster(
    request: PosterCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    poster = Poster(**request.model_dump())
    db.add(poster)
    db.commit()
    db.refresh(poster)
    return PosterResponse.model_validate(poster)


@router.put("/posters/{poster_id}", response_model=PosterResponse)
def update_poster(
    poster_id: int,
    request: PosterUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    poster = db.query(Poster).filter(Poster.id == poster_id).first()
    if not poster:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Poster not found")
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(poster, key, value)
    db.commit()
    db.refresh(poster)
    return PosterResponse.model_validate(poster)


@router.delete("/posters/{poster_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_poster(
    poster_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    poster = db.query(Poster).filter(Poster.id == poster_id).first()
    if not poster:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Poster not found")
    db.delete(poster)
    db.commit()


@router.post("/posters/{poster_id}/image")
async def upload_poster_image(
    poster_id: int,
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    poster = db.query(Poster).filter(Poster.id == poster_id).first()
    if not poster:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Poster not found")
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type. Allowed: JPEG, PNG, WebP")
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large")
    upload_path = os.path.join(UPLOAD_DIR, "posters")
    os.makedirs(upload_path, exist_ok=True)
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"poster_{poster_id}.{ext}"
    filepath = os.path.join(upload_path, filename)
    with open(filepath, "wb") as f:
        f.write(contents)
    poster.image_url = f"/uploads/posters/{filename}"
    db.commit()
    return {"image_url": poster.image_url}


# ── Important Links Management ──
@router.get("/important-links", response_model=list[ImportantLinkResponse])
def admin_list_important_links(
    search: Optional[str] = Query(None),
    assigned_user_id: Optional[int] = Query(None),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(ImportantLink)
    if search:
        query = query.filter(ImportantLink.title.ilike(f"%{search}%"))
    if assigned_user_id:
        query = query.filter(ImportantLink.assigned_user_id == assigned_user_id)
    links = query.order_by(ImportantLink.created_at.desc()).all()
    result = []
    for link in links:
        resp = ImportantLinkResponse.model_validate(link)
        resp.assigned_user_name = link.assigned_user.name if link.assigned_user else None
        result.append(resp)
    return result


@router.post("/important-links", response_model=ImportantLinkResponse, status_code=status.HTTP_201_CREATED)
def create_important_link(
    request: ImportantLinkCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == request.assigned_user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned user not found")
    link = ImportantLink(**request.model_dump())
    db.add(link)
    db.commit()
    db.refresh(link)
    resp = ImportantLinkResponse.model_validate(link)
    resp.assigned_user_name = user.name
    return resp


@router.put("/important-links/{link_id}", response_model=ImportantLinkResponse)
def update_important_link(
    link_id: int,
    request: ImportantLinkUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    link = db.query(ImportantLink).filter(ImportantLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")
    update_data = request.model_dump(exclude_unset=True)
    if "assigned_user_id" in update_data:
        user = db.query(User).filter(User.id == update_data["assigned_user_id"]).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned user not found")
    for key, value in update_data.items():
        setattr(link, key, value)
    db.commit()
    db.refresh(link)
    resp = ImportantLinkResponse.model_validate(link)
    resp.assigned_user_name = link.assigned_user.name if link.assigned_user else None
    return resp


@router.delete("/important-links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_important_link(
    link_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    link = db.query(ImportantLink).filter(ImportantLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")
    db.delete(link)
    db.commit()
