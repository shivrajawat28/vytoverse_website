"""
Cloud object storage abstraction.

Supports S3-compatible storage (Cloudflare R2, AWS S3, etc.) when
the required environment variables are configured.  Falls back to
local filesystem storage when cloud credentials are absent.

Environment variables (all optional — local storage used if missing):
  STORAGE_PROVIDER       "s3" to enable cloud storage (default: "local")
  S3_ENDPOINT_URL        S3-compatible endpoint (e.g. R2: https://<account>.r2.cloudflarestorage.com)
  S3_BUCKET              Bucket / container name
  S3_ACCESS_KEY          Access key ID
  S3_SECRET_KEY          Secret access key
  S3_PUBLIC_BASE_URL     Public URL prefix for served files
                         (e.g. https://pub-<hash>.r2.dev  or  https://cdn.example.com)
"""

import os
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger("vytoverse.storage")

# ── Configuration ────────────────────────────────────────────────────
STORAGE_PROVIDER = os.getenv("STORAGE_PROVIDER", "local")
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "")
S3_BUCKET = os.getenv("S3_BUCKET", "")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "")
S3_PUBLIC_BASE_URL = os.getenv("S3_PUBLIC_BASE_URL", "").rstrip("/")

# ── Lazy S3 client ──────────────────────────────────────────────────
_s3_client = None


def _get_s3_client():
    """Return a boto3 S3 client, creating it on first use."""
    global _s3_client
    if _s3_client is not None:
        return _s3_client

    try:
        import boto3

        kwargs = {
            "service_name": "s3",
            "aws_access_key_id": S3_ACCESS_KEY,
            "aws_secret_access_key": S3_SECRET_KEY,
            "region_name": "auto",
        }
        if S3_ENDPOINT_URL:
            kwargs["endpoint_url"] = S3_ENDPOINT_URL

        _s3_client = boto3.client(**kwargs)
        logger.info(f"S3 client initialised (endpoint={S3_ENDPOINT_URL}, bucket={S3_BUCKET})")
        return _s3_client
    except ImportError:
        logger.error("boto3 is not installed — cannot use S3 storage")
        return None
    except Exception as exc:
        logger.error(f"Failed to create S3 client: {exc}")
        return None


# ── Public API ───────────────────────────────────────────────────────

def is_cloud_storage() -> bool:
    """True when S3/R2 credentials are configured."""
    return (
        STORAGE_PROVIDER == "s3"
        and bool(S3_BUCKET)
        and bool(S3_ACCESS_KEY)
        and bool(S3_SECRET_KEY)
    )


def upload_file(data: bytes, key: str, content_type: str) -> Optional[str]:
    """Upload *data* to cloud storage under *key*.

    Returns the public URL on success, or None on failure / fallback to local.
    """
    if not is_cloud_storage():
        return None

    client = _get_s3_client()
    if client is None:
        return None

    try:
        client.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        public_url = f"{S3_PUBLIC_BASE_URL}/{key}" if S3_PUBLIC_BASE_URL else key
        logger.info(f"Uploaded to S3: {key}")
        return public_url
    except Exception as exc:
        logger.error(f"S3 upload failed for {key}: {exc}")
        return None


def get_public_url(relative_path: str) -> str:
    """Return the best URL for serving a stored file.

    If cloud storage is configured and a public base URL is set, return
    the full cloud URL.  Otherwise return the relative path as-is
    (the backend's local StaticFiles mount handles it).
    """
    if is_cloud_storage() and S3_PUBLIC_BASE_URL:
        # relative_path is like "/uploads/profiles/profile_8.jpg"
        # strip leading slash for the S3 key
        key = relative_path.lstrip("/")
        return f"{S3_PUBLIC_BASE_URL}/{key}"
    return relative_path
