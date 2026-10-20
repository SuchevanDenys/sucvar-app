// app/icon.tsx
// Iconița aplicației (favicon + PWA), generată din cod: nu ai nevoie de fișiere PNG.
// Poți înlocui acest fișier cu un `icon.png` real când ai logo-ul final.
import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
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
          fontSize: 320,
          fontWeight: 700,
          letterSpacing: -8,
          borderBottom: '24px solid #3B4D43',
        }}
      >
        S
      </div>
    ),
    size
  );
}
