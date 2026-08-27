from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from ..models.library import LibraryResource
from ..schemas.library import LibraryCreate, LibraryUpdate, LibraryResponse

router = APIRouter(prefix="/library", tags=["Library"])


@router.get("", response_model=list[LibraryResponse])
def list_resources(
    category: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None, alias="type"),
    search: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(LibraryResource)
    if category:
        query = query.filter(LibraryResource.category == category)
    if resource_type:
        query = query.filter(LibraryResource.resource_type == resource_type)
    if search:
        query = query.filter(
            LibraryResource.title.ilike(f"%{search}%")
            | LibraryResource.description.ilike(f"%{search}%")
        )
    resources = query.order_by(LibraryResource.created_at.desc()).offset(offset).limit(limit).all()
    return [LibraryResponse.model_validate(r) for r in resources]


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    from sqlalchemy import distinct
    categories = db.query(distinct(LibraryResource.category)).all()
    return [c[0] for c in categories if c[0]]


@router.get("/{resource_id}", response_model=LibraryResponse)
def get_resource(resource_id: int, db: Session = Depends(get_db)):
    resource = db.query(LibraryResource).filter(LibraryResource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return LibraryResponse.model_validate(resource)
