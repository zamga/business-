// @ts-check
import { writeFile } from 'node:fs/promises';

/**
 * Writes a `_headers` file (Netlify / Cloudflare Pages format) into the build
 * output. The Content-Security-Policy is derived from the configured enquiry
 * endpoint so the form can only post to the origin the site was built for.
 *
 * @param {{ enquiryEndpoint?: string | undefined }} options
 * @returns {import('astro').AstroIntegration}
 */
export function securityHeaders({ enquiryEndpoint } = {}) {
  return {
    name: 'bergweiss:security-headers',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        let formOrigin = '';
        if (enquiryEndpoint) {
          try {
            formOrigin = new URL(enquiryEndpoint).origin;
          } catch {
            logger.warn(`PUBLIC_ENQUIRY_ENDPOINT is not a valid URL: ${enquiryEndpoint}`);
          }
        }

        const csp = [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          "font-src 'self'",
          `connect-src 'self'${formOrigin ? ` ${formOrigin}` : ''}`,
          `form-action 'self'${formOrigin ? ` ${formOrigin}` : ''}`,
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "object-src 'none'",
          'upgrade-insecure-requests',
        ].join('; ');

        const headers = `/*
  Content-Security-Policy: ${csp}
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains

/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/brand/*
  Cache-Control: public, max-age=86400
`;
        await writeFile(new URL('_headers', dir), headers, 'utf8');
        logger.info('Wrote _headers with security policy');
      },
    },
  };
}
