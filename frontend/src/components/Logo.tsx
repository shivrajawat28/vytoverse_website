/**
 * Official VytoVerse logo component.
 * Uses the provided official logo image as the single source of truth.
 *
 * Variants:
 * - "icon": Compact icon mode — height controlled, width auto (for navbar, loader)
 * - "wordmark": Full wordmark — height controlled, width auto (for headers, splash)
 */
export default function Logo({
  className = '',
  size = 36,
  alt = 'VytoVerse',
  variant = 'icon',
}: {
  className?: string;
  size?: number;
  alt?: string;
  variant?: 'icon' | 'wordmark';
}) {
  // Always use height-based sizing with auto width to preserve aspect ratio.
  // The logo is a wide wordmark (~6:1 aspect ratio) — never force square dimensions.
  return (
    <img
      src="/vytoverse-logo.png"
      alt={alt}
      height={size}
      className={`w-auto object-contain ${className}`}
      draggable={false}
    />
  );
}
