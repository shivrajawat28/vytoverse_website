from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_
from ..database import get_db
from ..models.user import User, UserRole
from ..schemas.user import UserResponse

router = APIRouter(prefix="/team", tags=["Team"])


@router.get("", response_model=list[UserResponse])
def list_team_members(db: Session = Depends(get_db)):
    """Public endpoint — returns all team members plus leadership.

    PRESIDENT and VICE_PRESIDENT always appear regardless of
    the team_membership flag, so the front-end can display a
    dedicated Leadership section.
    """
    members = (
        db.query(User)
        .filter(
            User.is_active == 1,
            or_(
                User.team_membership == 1,
                User.role.in_([UserRole.PRESIDENT, UserRole.VICE_PRESIDENT]),
            ),
        )
        .order_by(User.role.desc(), User.name.asc())
        .all()
    )
    return [UserResponse.model_validate(m) for m in members]
