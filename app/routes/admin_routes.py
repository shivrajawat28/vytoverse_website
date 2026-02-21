from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas, database
from ..auth import get_current_admin

router  = APIRouter(prefix = "/admin", tags = ["Admin"])
ALLOWED_TASK_STATUSES = {"pending", "not_completed", "completed"}


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

@router.get("/users", response_model = list[schemas.AdminUserResponse])
def get_all_users(db:Session = Depends(database.get_db), current_admin: models.User = Depends(get_current_admin)):
    users  = db.query(models.User).all()
    return users

@router.get("/users/search", response_model = list[schemas.AdminUserResponse])
def search_users(query: str, db: Session = Depends(database.get_db), current_admin: models.User = Depends(get_current_admin)):
    users = db.query(models.User).filter(models.User.name.ilike(f"%{query}%")).all()

    return users

@router.put("/users/{user_id}", response_model = schemas.AdminUserResponse)
def update_user(user_id: int, update_data: schemas.AdminUserUpdate, db: Session = Depends(database.get_db), current_admin: models.User = Depends(get_current_admin)):
    user  = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if update_data.level is not None:
        user.level = update_data.level

    if update_data.role is not None:
        user.role = update_data.role

    db.commit()
    db.refresh(user)

    return user


@router.post("/tasks", response_model=schemas.TaskResponse)
def assign_task(
    task_data: schemas.TaskCreate,
    db: Session = Depends(database.get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    assigned_user = db.query(models.User).filter(models.User.id == task_data.assigned_to).first()
    if not assigned_user:
        raise HTTPException(status_code=404, detail="Assigned user not found")

    normalized_status = task_data.status.strip().lower().replace(" ", "_")
    if normalized_status not in ALLOWED_TASK_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Use pending, not_completed, or completed.",
        )

    task = models.Task(
        title=task_data.title.strip(),
        description=(task_data.description or "").strip() or None,
        status=normalized_status,
        assigned_to=assigned_user.id,
        assigned_by=current_admin.id,
        is_new=True,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_to_response(task, db)


@router.get("/tasks", response_model=list[schemas.TaskResponse])
def get_admin_tasks(
    query: str | None = None,
    db: Session = Depends(database.get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    tasks = db.query(models.Task).order_by(models.Task.created_at.desc()).all()
    if not query:
        return [_task_to_response(task, db) for task in tasks]

    needle = query.strip().lower()
    filtered = []
    for task in tasks:
        assigned_user = db.query(models.User).filter(models.User.id == task.assigned_to).first()
        if (
            needle in task.title.lower()
            or (task.description and needle in task.description.lower())
            or (assigned_user and needle in assigned_user.name.lower())
        ):
            filtered.append(_task_to_response(task, db))
    return filtered


@router.patch("/tasks/{task_id}", response_model=schemas.TaskResponse)
def update_task_status(
    task_id: int,
    update_data: schemas.TaskStatusUpdate,
    db: Session = Depends(database.get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    normalized_status = update_data.status.strip().lower().replace(" ", "_")
    if normalized_status not in ALLOWED_TASK_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Use pending, not_completed, or completed.",
        )

    task.status = normalized_status
    db.commit()
    db.refresh(task)
    return _task_to_response(task, db)
