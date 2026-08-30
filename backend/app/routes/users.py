import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..schemas.user import UserResponse, UserUpdate
from ..auth.dependencies import get_current_user
from ..config import UPLOAD_DIR, MAX_UPLOAD_SIZE, ALLOWED_IMAGE_TYPES
from ..storage import (
    is_cloud_storage,
    is_supabase_configured,
    upload_file,
    get_public_url,
    get_storage_provider,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
def update_profile(
    request: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    update_data = request.model_dump(exclude_unset=True)

    if "username" in update_data and update_data["username"]:
        existing = db.query(User).filter(
            User.username == update_data["username"],
            User.id != current_user.id,
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )

    for key, value in update_data.items():
        setattr(current_user, key, value)

    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


ALLOWED_PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
PROFILE_MAX_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/me/profile-image", response_model=UserResponse)
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_PROFILE_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: JPEG, PNG, WebP",
        )

    contents = await file.read()
    if len(contents) > PROFILE_MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size: 5MB",
        )

    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "jpg"
    if ext == "jpeg":
        ext = "jpg"
    filename = f"profile_{current_user.id}.{ext}"
    storage_path = f"profiles/{filename}"
    local_relative = f"/uploads/profiles/{filename}"

    # Determine execution environment
    is_render = bool(os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID"))
    provider = get_storage_provider()

    # 1. Supabase Storage (Primary persistent storage)
    if is_supabase_configured():
        try:
            cloud_url = upload_file(
                data=contents,
                key=storage_path,
                content_type=file.content_type or "image/jpeg",
            )
            if not cloud_url:
                raise RuntimeError("Supabase upload returned empty URL")
            current_user.profile_image = cloud_url
        except Exception as exc:
            import logging
            logging.getLogger("vytoverse.users").error(
                f"Supabase Storage upload failed for user {current_user.id}: {exc}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload profile image to Supabase Storage: {str(exc)}",
            )
    elif provider == "s3":
        # Legacy S3 fallback
        try:
            cloud_url = upload_file(
                data=contents,
                key=f"uploads/profiles/{filename}",
                content_type=file.content_type or "image/jpeg",
            )
            if not cloud_url:
                raise RuntimeError("S3 upload returned empty URL")
            current_user.profile_image = cloud_url
        except Exception as exc:
            import logging
            logging.getLogger("vytoverse.users").error(
                f"S3 upload failed for user {current_user.id}: {exc}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload profile image to S3: {str(exc)}",
            )
    elif is_render:
        # On Render, ephemeral local disk is prohibited for user uploads to avoid data loss
        missing = []
        if not os.getenv("SUPABASE_URL"):
            missing.append("SUPABASE_URL")
        if not os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
            missing.append("SUPABASE_SERVICE_ROLE_KEY")
        error_msg = (
            "Persistent Supabase Storage is not configured on Render. "
            "Local container disk is ephemeral and will be wiped on redeploy. "
            f"Please configure: {', '.join(missing)} in Render Environment Variables."
        )
        import logging
        logging.getLogger("vytoverse.users").error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg,
        )
    else:
        # Local filesystem storage (for local development only)
        upload_path = os.path.join(UPLOAD_DIR, "profiles")
        os.makedirs(upload_path, exist_ok=True)
        filepath = os.path.join(upload_path, filename)
        with open(filepath, "wb") as f:
            f.write(contents)
        current_user.profile_image = local_relative

    # Force updated_at to change so the frontend cache-busting URL parameter updates
    from datetime import datetime, timezone
    current_user.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(current_user)

    return UserResponse.model_validate(current_user)
