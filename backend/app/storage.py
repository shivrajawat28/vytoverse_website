"""
Cloud object storage abstraction.

Supports S3-compatible storage (Cloudflare R2, AWS S3, etc.) when
the required environment variables are configured. Falls back to
local filesystem storage for local development.

Environment variables:
  STORAGE_PROVIDER       "s3" to enable cloud storage (default: "local")
  S3_ENDPOINT_URL        S3-compatible endpoint (e.g. R2: https://<account>.r2.cloudflarestorage.com)
  S3_BUCKET              Bucket / container name
  S3_ACCESS_KEY          Access key ID
  S3_SECRET_KEY          Secret access key
  S3_PUBLIC_BASE_URL     Public URL prefix for served files
                         (e.g. https://pub-<hash>.r2.dev or https://cdn.example.com)
  S3_REGION              Region name (default: "auto" for R2, "us-east-1" for AWS)
"""

import os
import logging
from typing import Optional

logger = logging.getLogger("vytoverse.storage")

# ── Lazy S3 client ──────────────────────────────────────────────────
_s3_client = None


def get_storage_provider() -> str:
    return os.getenv("STORAGE_PROVIDER", "local").lower().strip()


def is_cloud_storage() -> bool:
    """True when S3/R2 credentials are configured."""
    return (
        get_storage_provider() == "s3"
        and bool(os.getenv("S3_BUCKET", "").strip())
        and bool(os.getenv("S3_ACCESS_KEY", "").strip())
        and bool(os.getenv("S3_SECRET_KEY", "").strip())
    )


def _get_s3_client():
    """Return a boto3 S3 client, creating it on first use."""
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

        # signature_version="s3v4" is required for Cloudflare R2 and modern AWS regions
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
        logger.info(f"S3 client initialised (endpoint={endpoint}, bucket={bucket})")
        return _s3_client
    except ImportError:
        logger.error("boto3 is not installed — cannot use S3 storage")
        return None
    except Exception as exc:
        logger.error(f"Failed to create S3 client: {exc}")
        return None


# ── Public API ───────────────────────────────────────────────────────

def upload_file(data: bytes, key: str, content_type: str) -> Optional[str]:
    """Upload *data* to cloud storage under *key*.

    Returns the public URL on success, or raises RuntimeError on failure.
    """
    if not is_cloud_storage():
        return None

    client = _get_s3_client()
    if client is None:
        raise RuntimeError("Failed to initialise S3 client. Check boto3 installation and credentials.")

    bucket = os.getenv("S3_BUCKET", "").strip()
    public_base = os.getenv("S3_PUBLIC_BASE_URL", "").strip().rstrip("/")

    client.put_object(
        Bucket=bucket,
        Key=key,
        Body=data,
        ContentType=content_type,
    )

    if public_base:
        public_url = f"{public_base}/{key}"
    else:
        endpoint = os.getenv("S3_ENDPOINT_URL", "").strip()
        if endpoint:
            public_url = f"{endpoint.rstrip('/')}/{bucket}/{key}"
        else:
            public_url = f"https://{bucket}.s3.amazonaws.com/{key}"

    logger.info(f"Uploaded to S3: {key} -> {public_url}")
    return public_url


def get_public_url(relative_path: str) -> str:
    """Return the best URL for serving a stored file.

    If cloud storage is configured and a public base URL is set, return
    the full cloud URL. Otherwise return the relative path as-is
    (the backend's local StaticFiles mount handles it).
    """
    public_base = os.getenv("S3_PUBLIC_BASE_URL", "").strip().rstrip("/")
    if is_cloud_storage() and public_base:
        key = relative_path.lstrip("/")
        return f"{public_base}/{key}"
    return relative_path
