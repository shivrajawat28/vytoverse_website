/**
 * Official VytoVerse logo component.
 * Uses the provided official logo image as the single source of truth.
 *
 * Variants:
 * - "icon": Square/cropped suitable for small spaces (navbar, loader)
 * - "wordmark": Full-width logo suitable for headers and splash
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
  if (variant === 'wordmark') {
    return (
      <img
        src="/vytoverse-logo.png"
        alt={alt}
        className={`object-contain ${className}`}
        draggable={false}
      />
    );
  }

  return (
    <img
      src="/vytoverse-logo.png"
      alt={alt}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}
