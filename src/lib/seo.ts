import { site } from '../data/site';

export interface Crumb {
  name: string;
  href: string;
}

export function absolute(path: string, base: URL | undefined): string {
  return new URL(path, base ?? 'https://bergweiss.example').toString();
}

export function organizationJsonLd(base: URL | undefined) {
  const sameAs = [site.social.linkedin].filter((v): v is string => Boolean(v));
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': absolute('/#organization', base),
    name: site.name,
    ...(site.legalName ? { legalName: site.legalName } : {}),
    url: absolute('/', base),
    logo: absolute('/brand/bergweiss-lockup.png', base),
    description: site.description,
    knowsAbout: [
      'Mergers and acquisitions',
      'Sell-side advisory',
      'Buy-side advisory',
      'Business valuation',
      'Strategic alternatives',
      'Transaction structuring',
    ],
    ...(site.contact.email ? { email: site.contact.email } : {}),
    ...(site.contact.phone ? { telephone: site.contact.phone } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function breadcrumbJsonLd(crumbs: Crumb[], base: URL | undefined) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absolute(crumb.href, base),
    })),
  };
}

export function serviceJsonLd(
  service: { name: string; description: string; href: string },
  base: URL | undefined,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    serviceType: service.name,
    description: service.description,
    url: absolute(service.href, base),
    provider: { '@id': absolute('/#organization', base) },
  };
}
