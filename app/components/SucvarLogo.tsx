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
  // The origin point is olive green (lighter on dark backgrounds)
  let oliveColor = '#3B4D43';
  if (isDark) {
    oliveColor = '#8FAE9B';
  }

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
        <path d="M6 16H26" stroke={oliveColor} strokeWidth="1" opacity="0.45" />
        {/* Origin point + small crosshair ticks */}
        <circle cx="16" cy="16" r="2.4" fill={oliveColor} />
        <path d="M16 11.5V13.5M16 18.5V20.5" stroke={oliveColor} strokeWidth="1.2" />
      </svg>

      {withWordmark && (
        <span className="text-sm font-semibold uppercase tracking-[0.34em] leading-none">
          S U C V A R
        </span>
      )}
    </span>
  );
}