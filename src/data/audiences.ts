import type { audienceKeys } from '../content.config';

export type AudienceKey = (typeof audienceKeys)[number];

export interface Audience {
  key: AudienceKey;
  letter: string;
  name: string;
  situation: string;
  primary: string;
  secondary: string[];
}

/** Who BERGWEISS acts for, each mapped to the mandates that answer their situation. */
export const audiences: Audience[] = [
  {
    key: 'owners',
    letter: 'A',
    name: 'Founders and owners',
    situation:
      'You are considering selling all or part of your company, or want to understand what a sale would mean before you decide.',
    primary: 'sell-side',
    secondary: ['valuation', 'strategic-alternatives'],
  },
  {
    key: 'families',
    letter: 'B',
    name: 'Family businesses',
    situation:
      'You are planning the next generation of ownership, within the family or beyond it, and need a structure that serves both the business and the family.',
    primary: 'strategic-alternatives',
    secondary: ['sell-side', 'transaction-structuring'],
  },
  {
    key: 'acquirers',
    letter: 'C',
    name: 'Acquirers',
    situation:
      'You are pursuing growth through acquisition and want a disciplined way to find, assess and secure the right business.',
    primary: 'buy-side',
    secondary: ['valuation', 'transaction-structuring'],
  },
  {
    key: 'investors',
    letter: 'D',
    name: 'Family offices and private equity',
    situation:
      'You are seeking investment opportunities, or need support on a specific transaction, from evaluating a business to structuring and negotiating the deal.',
    primary: 'buy-side',
    secondary: ['transaction-structuring', 'valuation'],
  },
];

export const audienceName = (key: AudienceKey): string =>
  audiences.find((a) => a.key === key)?.name ?? key;
