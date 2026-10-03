export interface NavItem {
  label: string;
  href: string;
}

/** Primary navigation. Insights and Transactions join automatically once published. */
export const primaryNav: NavItem[] = [
  { label: 'Expertise', href: '/expertise/' },
  { label: 'Approach', href: '/approach/' },
  { label: 'Firm', href: '/firm/' },
];

export const contactHref = '/contact/';

export const legalNav: NavItem[] = [
  { label: 'Legal notice', href: '/legal/' },
  { label: 'Privacy', href: '/privacy/' },
];
