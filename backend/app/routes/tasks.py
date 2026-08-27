from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.task import Task
from ..models.user import User
from ..schemas.task import TaskResponse
from ..auth.dependencies import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("/me", response_model=list[TaskResponse])
def get_my_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tasks = (
        db.query(Task)
        .filter(Task.assigned_user_id == current_user.id)
        .order_by(Task.created_at.desc())
        .all()
    )
    result = []
    for t in tasks:
        resp = TaskResponse.model_validate(t)
        resp.assigned_user_name = t.assigned_user.name if t.assigned_user else None
        result.append(resp)
    return result
