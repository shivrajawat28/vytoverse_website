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
 */
export function getAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  // Already an absolute URL — return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
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
    return path;
  }

  // Production: prefix with the full backend URL
  const base = apiBase.replace(/\/+$/, '');
  return `${base}${path}`;
}
