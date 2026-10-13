import type { RequestHandler } from 'express';
import { ACADEMY_ENABLED } from '../../config/features';

/** Firebase (Academy profile/certificates) is the only third-party runtime the SPA talks to. */
const FIREBASE_ORIGINS = [
  'https://firestore.googleapis.com',
  'https://firebase.googleapis.com',
  'https://firebaseinstallations.googleapis.com',
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
];

function httpsOrigin(raw: string | undefined): URL | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * Enforced in production. Scripts are same-origin only; inline styles stay allowed because
 * React style props and Tailwind arbitrary values set style attributes.
 */
export function contentSecurityPolicy(env: Record<string, string | undefined>): string {
  const storage = httpsOrigin(env.SMARTCHECK_S3_ENDPOINT);
  // Presigned uploads go browser -> bucket, either path-style or virtual-hosted (bucket.host).
  const storageOrigins = storage ? [storage.origin, `https://*.${storage.host}`] : [];
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", ...storageOrigins, ...FIREBASE_ORIGINS],
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  return Object.entries(directives).map(([name, values]) => [name, ...values].join(' ')).join('; ');
}

/** 301s www.<apex> to the canonical origin from PUBLIC_APP_URL; other hosts pass through untouched. */
export function canonicalHostRedirect(publicAppUrl: string | undefined): RequestHandler {
  const canonical = httpsOrigin(publicAppUrl);
  const wwwHost = canonical && !canonical.hostname.startsWith('www.') ? `www.${canonical.hostname}` : null;
  return (req, res, next) => {
    if (!canonical || !wwwHost || req.hostname !== wwwHost) return next();
    res.redirect(301, `${canonical.origin}${req.originalUrl}`);
  };
}

const ACADEMY_PAGES = ['/academy', '/academy/complete', '/academy/allplan'];
const PUBLIC_PAGES = ['/', '/about', '/features', '/pricing', '/smartcheck', ...(ACADEMY_ENABLED ? ACADEMY_PAGES : []), '/pilot', '/terms', '/privacy'];

export function sitemapXml(publicAppUrl: string): string {
  const origin = new URL(publicAppUrl).origin;
  const urls = PUBLIC_PAGES.map(page => `  <url><loc>${origin}${page}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(publicAppUrl: string): string {
  const origin = new URL(publicAppUrl).origin;
  return ['User-agent: *', 'Disallow: /app/', 'Disallow: /admin/', 'Disallow: /api/', '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n');
}
