import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from ..models.user import User, UserRole
from ..models.event import Event, EventStatus
from ..models.library import LibraryResource
from ..schemas.user import UserResponse, UserAdminUpdate, StarAssign, TeamMemberUpdate
from ..schemas.event import EventCreate, EventUpdate, EventResponse
from ..schemas.library import LibraryCreate, LibraryUpdate, LibraryResponse
from ..auth.dependencies import get_current_admin
from ..config import UPLOAD_DIR, MAX_UPLOAD_SIZE

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
