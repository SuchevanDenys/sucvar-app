// app/components/SucvarLogo.tsx
// Vector logo: two interlocking CAD plan corners that form an "S",
// joined by an origin point. It is pure SVG, so it stays sharp on Retina and in print.

interface SucvarLogoProps {
  size?: number; // size of the monogram in pixels
  withWordmark?: boolean; // show the text "S U C V A R" next to the monogram
  isDark?: boolean;
}

export default function SucvarLogo({
  size = 32,
  withWordmark = false,
  isDark = false,
}: SucvarLogoProps) {
  // Monochrome: the origin point follows the ink colour (currentColor); isDark kept for API compatibility
  void isDark;
  const inkColor = 'currentColor';

  return (
    <span className="inline-flex items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        role="img"
        aria-label="SUCVAR monogram"
      >
        {/* Corner A: top bar + left leg (upper half of the S) */}
        <path d="M26 5H6V16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
        {/* Corner B: bottom bar + right leg (lower half of the S) */}
        <path d="M6 27H26V16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
        {/* Construction axis through the origin point */}
        <path d="M6 16H26" stroke={inkColor} strokeWidth="1" opacity="0.45" />
        {/* Origin point + small crosshair ticks */}
        <circle cx="16" cy="16" r="2.4" fill={inkColor} />
        <path d="M16 11.5V13.5M16 18.5V20.5" stroke={inkColor} strokeWidth="1.2" />
      </svg>

      {withWordmark && (
        <span className="text-sm font-bold uppercase tracking-[0.34em] leading-none">
          S U C V A R
        </span>
      )}
    </span>
  );
}