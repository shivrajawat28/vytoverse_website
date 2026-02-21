from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas, database
from ..auth import get_password_hash, verify_password, create_access_token


router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/signup", response_model = schemas.UserResponse) 
def signup(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()

    if existing_user:
        raise HTTPException(status_code = status.HTTP_400_BAD_REQUEST, detail = "Email already exists")

    if len(user.password) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password too long (max 72 characters)"
        )
    
    hashed_password = get_password_hash(user.password)

    new_user = models.User(
        name = user.name,
        email = user.email,
        phone = user.phone,
        hashed_password = hashed_password,
        role = "user",
        level = 1
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

@router.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    access_token = create_access_token(data={"sub": db_user.email})
    return {"access_token": access_token, "token_type": "bearer"}
