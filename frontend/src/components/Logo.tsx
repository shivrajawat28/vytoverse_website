/**
 * Official VytoVerse logo component.
 * Uses the provided official logo image as the single source of truth.
 */
export default function Logo({
  className = '',
  size = 36,
  alt = 'VytoVerse',
}: {
  className?: string;
  size?: number;
  alt?: string;
}) {
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
