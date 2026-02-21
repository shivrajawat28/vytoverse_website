from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from .. import models, schemas, database
from ..auth import get_current_user, verify_password, get_password_hash

router = APIRouter(prefix = "/users", tags = ["Users"])

PROFILE_UPLOAD_DIR = Path("static/uploads/profile")
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024


def _task_to_response(task: models.Task, db: Session):
    assigned_user = db.query(models.User).filter(models.User.id == task.assigned_to).first()
    assigned_by_user = db.query(models.User).filter(models.User.id == task.assigned_by).first()
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "assigned_to": task.assigned_to,
        "assigned_to_name": assigned_user.name if assigned_user else None,
        "assigned_by": task.assigned_by,
        "assigned_by_name": assigned_by_user.name if assigned_by_user else None,
        "is_new": task.is_new,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
    }

@router.get("/profile", response_model = schemas.UserProfileResponse)
def get_profile(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/profile-image", response_model=schemas.UserProfileResponse)
async def upload_profile_image(
    image: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not image.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image file is required",
        )

    extension = Path(image.filename).suffix.lower()
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files are allowed (jpg, jpeg, png, webp, gif, bmp)",
        )

    content = await image.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image is empty",
        )
    if len(content) > MAX_PROFILE_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image too large. Maximum allowed size is 5MB",
        )

    PROFILE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"user_{current_user.id}_{uuid4().hex}{extension}"
    file_path = PROFILE_UPLOAD_DIR / filename
    with open(file_path, "wb") as uploaded_file:
        uploaded_file.write(content)

    old_image = (current_user.profile_image or "").strip()
    current_user.profile_image = f"/static/uploads/profile/{filename}"
    db.commit()
    db.refresh(current_user)

    if old_image.startswith("/static/uploads/profile/") and old_image != current_user.profile_image:
        old_file = Path(old_image.lstrip("/"))
        if old_file.is_file():
            old_file.unlink()

    return current_user


@router.put("/profile", response_model = schemas.UserProfileResponse)
def update_profile(update_data: schemas.UserUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    if update_data.name is not None:
        current_user.name = update_data.name.strip()

    if update_data.email is not None:
        new_email = update_data.email.strip().lower()
        existing_user = (
            db.query(models.User)
            .filter(models.User.email == new_email, models.User.id != current_user.id)
            .first()
        )
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists",
            )
        current_user.email = new_email
    
    if update_data.phone is not None:
        current_user.phone = update_data.phone.strip()
    
    if update_data.profile_image is not None:
        current_user.profile_image = update_data.profile_image.strip()
    
    db.commit()
    db.refresh(current_user)
    
    return current_user


@router.get("/team", response_model = list[schemas.UserResponse])
def get_team(db: Session = Depends(database.get_db)):
    
    users = db.query(models.User).all()

    return users


@router.put("/change_password")
def update_password(password_data: schemas.ChangePassword, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    if not verify_password(password_data.old_password, current_user.hashed_password):
        raise HTTPException(status_code = status.HTTP_400_BAD_REQUEST, detail="Old password is incorrect")

    
    if password_data.old_password == password_data.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password cannot be same as old password")

    if len(password_data.new_password)> 72:
        raise HTTPException(status_code=400, detail="Password too long")

    new_hashed = get_password_hash(password_data.new_password)

    current_user.hashed_password = new_hashed

    db.commit()

    return {"message": "Password updated successfully"}

@router.get("/team-data", response_model=schemas.TeamDataResponse)
def get_team_data(db: Session = Depends(database.get_db)):
    users = (
        db.query(models.User)
        .order_by(models.User.level.desc(), models.User.id.asc())
        .all()
    )

    presidents = []
    vice_presidents = []
    past_presidents = []
    members = []

    for user in users:
        member = {
            "id": user.id,
            "name": user.name,
            "role": user.role or "user",
            "phone": user.phone,
            "email": user.email,
            "profile_image": user.profile_image,
        }

        normalized_role = (user.role or "user").strip().lower().replace(" ", "_")

        if "vice" in normalized_role and "president" in normalized_role:
            vice_presidents.append(member)
        elif "past" in normalized_role and "president" in normalized_role:
            past_presidents.append(member)
        elif "president" in normalized_role or normalized_role == "admin":
            presidents.append(member)
        else:
            members.append(member)

    return {
        "presidents": presidents,
        "vice_presidents": vice_presidents,
        "past_presidents": past_presidents,
        "members": members,
    }


@router.get("/tasks", response_model=list[schemas.TaskResponse])
def get_tasks(db: Session = Depends(database.get_db)):
    tasks = db.query(models.Task).order_by(models.Task.created_at.desc()).all()
    return [_task_to_response(task, db) for task in tasks]


@router.get("/my-tasks", response_model=list[schemas.TaskResponse])
def get_my_tasks(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    tasks = (
        db.query(models.Task)
        .filter(models.Task.assigned_to == current_user.id)
        .order_by(models.Task.created_at.desc())
        .all()
    )
    return [_task_to_response(task, db) for task in tasks]


@router.get("/task-notifications", response_model=schemas.TaskNotificationResponse)
def get_task_notifications(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    unread_count = (
        db.query(models.Task)
        .filter(models.Task.assigned_to == current_user.id, models.Task.is_new == True)
        .count()
    )
    return {"unread_count": unread_count}


@router.put("/task-notifications/read", response_model=schemas.TaskNotificationResponse)
def mark_task_notifications_as_read(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    tasks = (
        db.query(models.Task)
        .filter(models.Task.assigned_to == current_user.id, models.Task.is_new == True)
        .all()
    )
    for task in tasks:
        task.is_new = False
    db.commit()
    return {"unread_count": 0}
