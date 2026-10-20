// app/apple-icon.tsx
// Iconița afișată pe iPhone/iPad după „Add to Home Screen” (180 × 180 px).
// iOS rotunjește singur colțurile, deci imaginea trebuie să fie pătrată, fără transparență.
import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#141413',
          color: '#F7F6F2',
          fontSize: 112,
          fontWeight: 700,
          letterSpacing: -3,
          borderBottom: '9px solid #3B4D43',
        }}
      >
        S
      </div>
    ),
    size
  );
}
