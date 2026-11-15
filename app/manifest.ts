// app/manifest.ts
// Manifestul PWA: spune browserului cum se instalează și cum arată aplicația pe ecranul principal.
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SUCVAR — Spatial & Engineering Systems',
    short_name: 'SUCVAR',
    description: 'Design și specificație de materiale: cote precise, cantități calculate, deviz gata de execuție.',
    start_url: '/',
    scope: '/',
    display: 'standalone', // ecran complet, fără bara browserului
    orientation: 'portrait',
    background_color: '#FFFFFF', // alb de galerie (ecranul de pornire iOS/Android)
    theme_color: '#FFFFFF', // alb de galerie (bara de stare / titlu)
    // PNG-uri reale (logo SUCVAR pe obsidian); 'maskable' permite decupare adaptivă pe Android
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
