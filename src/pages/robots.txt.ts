import type { APIRoute } from 'astro';

/** Production builds invite indexing; preview builds (no SITE_URL) do not. */
export const GET: APIRoute = ({ site }) => {
  const isPreview = !site || site.hostname.endsWith('.example');
  const body = isPreview
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site).href}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
