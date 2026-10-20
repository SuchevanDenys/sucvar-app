import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SUCVAR | Spatial & Engineering Studio",
  description:
    "Platformă de design și specificație de materiale. Cote precise, cantități calculate și deviz gata de execuție — creat de Suchevan Denys.",
  applicationName: "SUCVAR",
  authors: [{ name: "Suchevan Denys" }],
  // iOS "Add to Home Screen": rulează ecran complet, fără bara Safari
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SUCVAR",
  },
  // Safari nu mai transformă numerele (ex. dimensiuni, prețuri) în linkuri de telefon
  formatDetection: {
    telephone: false,
  },
  // Etichetă standard (Android / Chrome), alături de cea Apple generată mai sus
  other: {
    "mobile-web-app-capable": "yes",
  },
  // Manifestul PWA vine din app/manifest.ts, iar iconițele din app/icon.tsx și app/apple-icon.tsx
};

// Zoom-ul rămâne permis intenț­ionat (accesibilitate).
// Câmpurile folosesc text de 16px, deci iOS nu face zoom automat la focus.
// viewportFit "cover" lasă aplicația să umple ecranul până la marginile iPhone-ului
// (bara de jos și header-ul compensează cu env(safe-area-inset-*)).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#141413",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ro"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col touch-manipulation [-webkit-tap-highlight-color:transparent] selection:bg-[#3B4D43] selection:text-white">
        {children}
      </body>
    </html>
  );
}
