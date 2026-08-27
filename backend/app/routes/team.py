from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..schemas.user import UserResponse

router = APIRouter(prefix="/team", tags=["Team"])


@router.get("", response_model=list[UserResponse])
def list_team_members(db: Session = Depends(get_db)):
    """Public endpoint — returns all users marked as team members."""
    members = (
        db.query(User)
        .filter(User.team_membership == 1, User.is_active == 1)
        .order_by(User.role.desc(), User.name.asc())
        .all()
    )
    return [UserResponse.model_validate(m) for m in members]
