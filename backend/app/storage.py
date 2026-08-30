"""
Storage abstraction for VytoVerse.

Primary provider: Supabase Storage (persistent cloud object storage).
Local provider: local filesystem storage in uploads/ (for local dev only).
Optional provider: S3/R2 (legacy fallback if explicitly configured).

Environment variables:
  STORAGE_PROVIDER             "supabase" (default), "s3", or "local"
  SUPABASE_URL                 Supabase project URL (e.g. https://xyzcompany.supabase.co)
  SUPABASE_SERVICE_ROLE_KEY    Supabase service_role secret key (SERVER-ONLY)
  SUPABASE_STORAGE_BUCKET      Bucket name (default: "vytoverse-uploads")
"""

import os
import json
import logging
import urllib.request
import urllib.error
from typing import Optional, Tuple

logger = logging.getLogger("vytoverse.storage")

# Track whether bucket check was already performed during process lifecycle
_supabase_bucket_verified = False


# ── Storage Configuration & Inspection ───────────────────────────────

def get_storage_provider() -> str:
    """Return active storage provider: 'supabase', 's3', or 'local'."""
    if is_supabase_configured():
        return "supabase"
    configured = os.getenv("STORAGE_PROVIDER", "").lower().strip()
    if configured:
        return configured
    return "local"


def get_supabase_url() -> str:
    return os.getenv("SUPABASE_URL", "").strip().rstrip("/")


def get_supabase_service_role_key() -> str:
    return os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()


def get_supabase_bucket() -> str:
    return os.getenv("SUPABASE_STORAGE_BUCKET", "vytoverse-uploads").strip()


def is_supabase_configured() -> bool:
    """True when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."""
    return bool(get_supabase_url()) and bool(get_supabase_service_role_key())


def is_s3_configured() -> bool:
    """True when legacy S3/R2 credentials are set."""
    return (
        os.getenv("STORAGE_PROVIDER", "").lower().strip() == "s3"
        and bool(os.getenv("S3_BUCKET", "").strip())
        and bool(os.getenv("S3_ACCESS_KEY", "").strip())
        and bool(os.getenv("S3_SECRET_KEY", "").strip())
    )


def is_cloud_storage() -> bool:
    """True when either Supabase Storage or S3 is configured."""
    return is_supabase_configured() or is_s3_configured()


# ── Supabase Storage REST Implementation ─────────────────────────────

def _ensure_supabase_bucket(supabase_url: str, service_role_key: str, bucket: str) -> None:
    """Verify or auto-create the public storage bucket in Supabase."""
    global _supabase_bucket_verified
    if _supabase_bucket_verified:
        return

    url = f"{supabase_url}/storage/v1/bucket"
    payload = json.dumps({
        "id": bucket,
        "name": bucket,
        "public": True,
        "file_size_limit": 5242880,  # 5MB
        "allowed_mime_types": ["image/jpeg", "image/png", "image/webp"],
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, method="POST")
    req.add_header("Authorization", f"Bearer {service_role_key}")
    req.add_header("apikey", service_role_key)
    req.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status in (200, 201):
                logger.info(f"Supabase public bucket created: {bucket}")
    except urllib.error.HTTPError as err:
        # HTTP 400 or 409 means the bucket already exists, which is expected
        logger.debug(f"Supabase bucket initialization status: HTTP {err.code}")
    except Exception as exc:
        logger.warning(f"Supabase bucket initialization check: {exc}")
    finally:
        _supabase_bucket_verified = True


def upload_supabase_file(data: bytes, path: str, content_type: str) -> str:
    """Upload *data* to Supabase Storage under *path* and return its permanent public URL.

    Uses the Supabase Storage REST API with upsert enabled (overwrites previous file).
    Raises RuntimeError on failure.
    """
    supabase_url = get_supabase_url()
    service_role_key = get_supabase_service_role_key()
    bucket = get_supabase_bucket()

    if not supabase_url or not service_role_key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.")

    clean_path = path.lstrip("/")

    # Ensure bucket exists
    _ensure_supabase_bucket(supabase_url, service_role_key, bucket)

    # Supabase Storage Object Upload endpoint with x-upsert: true
    url = f"{supabase_url}/storage/v1/object/{bucket}/{clean_path}"

    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Authorization", f"Bearer {service_role_key}")
    req.add_header("apikey", service_role_key)
    req.add_header("Content-Type", content_type)
    req.add_header("x-upsert", "true")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            if resp.status not in (200, 201):
                err_body = resp.read().decode("utf-8", errors="replace")
                raise RuntimeError(f"Supabase Storage responded with HTTP {resp.status}: {err_body}")
    except urllib.error.HTTPError as err:
        err_body = err.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase Storage error (HTTP {err.code}): {err_body}")
    except Exception as exc:
        raise RuntimeError(f"Failed to upload to Supabase Storage: {exc}")

    # Build and return permanent public URL
    public_url = f"{supabase_url}/storage/v1/object/public/{bucket}/{clean_path}"
    logger.info(f"Uploaded profile image to Supabase: {clean_path} -> {public_url}")
    return public_url


# ── Legacy S3 Client (Fallback) ──────────────────────────────────────
_s3_client = None


def _get_s3_client():
    global _s3_client
    if _s3_client is not None:
        return _s3_client

    bucket = os.getenv("S3_BUCKET", "").strip()
    access_key = os.getenv("S3_ACCESS_KEY", "").strip()
    secret_key = os.getenv("S3_SECRET_KEY", "").strip()
    endpoint = os.getenv("S3_ENDPOINT_URL", "").strip()

    try:
        import boto3
        from botocore.config import Config

        client_config = Config(
            signature_version="s3v4",
            retries={"max_attempts": 3, "mode": "standard"},
        )
        kwargs = {
            "service_name": "s3",
            "aws_access_key_id": access_key,
            "aws_secret_access_key": secret_key,
            "config": client_config,
        }
        if endpoint:
            kwargs["endpoint_url"] = endpoint
            kwargs["region_name"] = os.getenv("S3_REGION", "auto")
        else:
            kwargs["region_name"] = os.getenv("S3_REGION", "us-east-1")

        _s3_client = boto3.client(**kwargs)
        return _s3_client
    except Exception as exc:
        logger.error(f"Failed to create S3 client: {exc}")
        return None


def upload_s3_file(data: bytes, key: str, content_type: str) -> str:
    client = _get_s3_client()
    if client is None:
        raise RuntimeError("Failed to initialise S3 client.")

    bucket = os.getenv("S3_BUCKET", "").strip()
    public_base = os.getenv("S3_PUBLIC_BASE_URL", "").strip().rstrip("/")

    client.put_object(
        Bucket=bucket,
        Key=key,
        Body=data,
        ContentType=content_type,
    )

    if public_base:
        return f"{public_base}/{key}"
    endpoint = os.getenv("S3_ENDPOINT_URL", "").strip()
    if endpoint:
        return f"{endpoint.rstrip('/')}/{bucket}/{key}"
    return f"https://{bucket}.s3.amazonaws.com/{key}"


# ── Unified Public Storage API ───────────────────────────────────────

def upload_file(data: bytes, key: str, content_type: str) -> Optional[str]:
    """Upload *data* to active cloud storage (Supabase or S3).

    Returns the public URL on success, or raises RuntimeError on failure.
    Returns None if cloud storage is not configured.
    """
    if is_supabase_configured():
        return upload_supabase_file(data, key, content_type)
    if is_s3_configured():
        return upload_s3_file(data, key, content_type)
    return None


def get_public_url(relative_path: str) -> str:
    """Return the best URL for serving a stored file.

    If path is already an absolute HTTP/HTTPS URL, returns it as-is.
    If Supabase is configured and path is relative, returns Supabase public URL.
    Otherwise returns relative path (handled by backend static mount).
    """
    if not relative_path:
        return relative_path

    if relative_path.startswith("http://") or relative_path.startswith("https://"):
        return relative_path

    clean_path = relative_path.lstrip("/")
    if is_supabase_configured():
        supabase_url = get_supabase_url()
        bucket = get_supabase_bucket()
        return f"{supabase_url}/storage/v1/object/public/{bucket}/{clean_path}"

    public_base = os.getenv("S3_PUBLIC_BASE_URL", "").strip().rstrip("/")
    if is_s3_configured() and public_base:
        return f"{public_base}/{clean_path}"

    return relative_path
