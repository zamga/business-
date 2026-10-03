// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';
import { securityHeaders } from './integrations/security-headers.mjs';

const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

/**
 * The canonical origin is not part of the brief yet. `.example` is a reserved
 * TLD, so an unconfigured build can never point canonical URLs at a domain
 * someone else owns. Set SITE_URL before deploying to production.
 */
const site = env.SITE_URL || 'https://bergweiss.example';

export default defineConfig({
  site,
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'always',
  },
  prefetch: false,
  integrations: [
    sitemap({
      filter: (page) => !/\/404\/?$/.test(page),
    }),
    securityHeaders({ enquiryEndpoint: env.PUBLIC_ENQUIRY_ENDPOINT }),
  ],
  fonts: [
    {
      // Newsreader's italic ampersand, applied to every "&" in Archivo text.
      provider: fontProviders.local(),
      name: 'BW Ampersand',
      cssVariable: '--font-amp',
      fallbacks: [],
      optimizedFallbacks: false,
      unicodeRange: ['U+26'],
      options: {
        variants: [{ src: ['./src/assets/fonts/ampersand.woff2'], weight: '100 900', style: 'normal' }],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Newsreader',
      cssVariable: '--font-newsreader',
      fallbacks: ['Georgia', 'serif'],
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/newsreader-display.woff2'],
            weight: '300 460',
            style: 'normal',
          },
          {
            src: ['./src/assets/fonts/newsreader-display-italic.woff2'],
            weight: '300 400',
            style: 'italic',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Archivo',
      cssVariable: '--font-archivo',
      fallbacks: ['Arial', 'sans-serif'],
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/archivo.woff2'],
            weight: '380 620',
            style: 'normal',
          },
        ],
      },
    },
  ],
});
