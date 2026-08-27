/**
 * Resolve backend-hosted asset URLs for the frontend.
 *
 * In production, the frontend runs on Netlify but backend assets (profile images,
 * event images, uploads) are served by Render. A relative path like
 * "/uploads/profiles/profile_2.png" would resolve against Netlify's domain,
 * returning a 404. This helper prefixes backend-relative paths with the API base URL.
 *
 * - Returns null for empty/null values
 * - Preserves absolute HTTPS URLs (e.g. external Google Drive links)
 * - Converts "/uploads/..." paths to "{API_BASE}/uploads/..."
 * - Works in both local development and production
 * - Supports optional version param for cache-busting (e.g. after profile image upload)
 */
export function getAssetUrl(path: string | null | undefined, version?: string | number): string | null {
  if (!path) return null;

  // Already an absolute URL — return as-is (but still append version if provided)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    if (version != null) {
      const sep = path.includes('?') ? '&' : '?';
      return `${path}${sep}v=${version}`;
    }
    return path;
  }

  // Backend-relative path — prefix with API base URL
  const apiBase = import.meta.env.VITE_API_URL || '/api';

  // In development, the Vite proxy handles /uploads → backend.
  // In production, VITE_API_URL is the full Render URL (e.g. https://app.onrender.com).
  // We need to hit the backend directly for /uploads paths.
  if (apiBase === '/api') {
    // Dev mode: Vite proxy rewrites /api → backend, but /uploads is also proxied.
    // Return the path as-is; Vite's proxy config handles it.
    if (version != null) {
      return `${path}?v=${version}`;
    }
    return path;
  }

  // Production: prefix with the full backend URL
  const base = apiBase.replace(/\/+$/, '');
  const url = `${base}${path}`;
  if (version != null) {
    return `${url}?v=${version}`;
  }
  return url;
}
