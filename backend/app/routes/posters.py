from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.poster import Poster
from ..schemas.poster import PosterResponse

router = APIRouter(prefix="/posters", tags=["Posters"])


@router.get("/active", response_model=list[PosterResponse])
def get_active_posters(db: Session = Depends(get_db)):
    """Return only active, non-expired posters."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    posters = (
        db.query(Poster)
        .filter(Poster.active == True)
        .order_by(Poster.created_at.desc())
        .all()
    )
    result = []
    for p in posters:
        if p.expires_at:
            exp = p.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < now:
                continue
        result.append(PosterResponse.model_validate(p))
    return result
