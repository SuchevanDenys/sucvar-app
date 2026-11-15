import type { NextConfig } from "next";

// Antete de securitate HTTP, aplicate pe toate rutele.
//  • X-Frame-Options / frame-ancestors: interzic încadrarea în iframe (clickjacking)
//  • nosniff: browserul nu „ghicește" tipul MIME
//  • Referrer-Policy: nu trimitem căi complete către alte domenii
//  • Permissions-Policy: dezactivăm API-urile de dispozitiv nefolosite (camera/microfon/locație)
//  • HSTS: doar HTTPS (browserele îl ignoră pe http://localhost)
//  • CSP parțială: fără `script-src` strict (Next injectează scripturi inline; un CSP cu nonce
//    ar cere randare dinamică pentru toate paginile). Restrângem însă ce nu are nevoie de flexibilitate.
//    `form-action` include Stripe, `connect-src` include Supabase, `img-src` include Replicate/Unsplash.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.stripe.com"), interest-cohort=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // CSP doar în producție: în dev, HMR (websocket) și eval-urile Turbopack ar fi blocate
  ...(process.env.NODE_ENV === 'production' ? [{
    key: 'Content-Security-Policy',
    value: [
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self' https://checkout.stripe.com",
      "img-src 'self' data: blob: https://images.unsplash.com https://replicate.delivery https://*.replicate.delivery https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
    ].join('; '),
  }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false, // nu dezvăluim tehnologia serverului
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
