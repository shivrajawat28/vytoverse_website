from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from .. import models, schemas, database
from ..auth import get_current_admin

router = APIRouter(prefix = "/libraries", tags=["Libraries"])
DEFAULT_PREVIEW = "/static/images/founder.jpg"

@router.get("/", response_model = list[schemas.LibraryResponse])
def get_libraries(db:Session = Depends(database.get_db)):
    libraries = db.query(models.Library).order_by(models.Library.id.desc()).all()

    return libraries

@router.post("/", response_model = schemas.LibraryResponse)
def create_library(library_data: schemas.LibraryCreate, db: Session = Depends(database.get_db), current_admin: models.User = Depends(get_current_admin)):
    preview_link = (library_data.preview_link or "").strip() or DEFAULT_PREVIEW
    new_library = models.Library(
        title=library_data.title,
        drive_link=library_data.drive_link,
        preview_link=preview_link
    )

    db.add(new_library)
    db.commit()
    db.refresh(new_library)

    return new_library

@router.put("/{library_id}", response_model  =schemas.LibraryResponse)
def update_library(library_id: int, updated_data: schemas.LibraryCreate, db: Session = Depends(database.get_db), current_admin: models.User = Depends(get_current_admin)):
    library = db.query(models.Library).filter(models.Library.id == library_id).first()

    if not library:
        raise HTTPException(status_code=404, detail="Library not found")

    library.title  = updated_data.title
    library.drive_link = updated_data.drive_link
    library.preview_link = (updated_data.preview_link or "").strip() or DEFAULT_PREVIEW

    db.commit()
    db.refresh(library)

    return library


@router.delete("/{library_id}")
def delete_library(library_id: int, db: Session = Depends(database.get_db), current_admin: models.User = Depends(get_current_admin)):
    library = db.query(models.Library).filter(models.Library.id == library_id).first()

    if not library:
        raise HTTPException(status_code=404, detail= "Library not found")

    db.delete(library)
    db.commit()

    return {"message": "Library deleted successfully"}
