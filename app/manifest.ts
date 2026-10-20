// app/manifest.ts
// Manifestul PWA: spune browserului cum se instalează și cum arată aplicația pe ecranul principal.
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SUCVAR | Spatial & Engineering Studio',
    short_name: 'SUCVAR',
    description: 'Design și specificație de materiale: cote precise, cantități calculate, deviz gata de execuție.',
    start_url: '/',
    scope: '/',
    display: 'standalone', // ecran complet, fără bara browserului
    orientation: 'portrait',
    background_color: '#F7F6F2', // ivory (ecranul de pornire)
    theme_color: '#141413', // negru mat
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}
