from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.important_link import ImportantLink
from ..models.user import User
from ..schemas.important_link import ImportantLinkResponse
from ..auth.dependencies import get_current_user

router = APIRouter(prefix="/important-links", tags=["Important Links"])


@router.get("/me", response_model=list[ImportantLinkResponse])
def get_my_important_links(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    links = (
        db.query(ImportantLink)
        .filter(
            ImportantLink.assigned_user_id == current_user.id,
            ImportantLink.active == True,
        )
        .order_by(ImportantLink.created_at.desc())
        .all()
    )
    result = []
    for link in links:
        # Skip expired links
        if link.expires_at:
            exp = link.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < now:
                continue
        resp = ImportantLinkResponse.model_validate(link)
        resp.assigned_user_name = link.assigned_user.name if link.assigned_user else None
        result.append(resp)
    return result
