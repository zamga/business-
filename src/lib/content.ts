import { getCollection, type CollectionEntry } from 'astro:content';
import { showDrafts } from '../data/site';
import { primaryNav, type NavItem } from '../data/navigation';

export type Service = CollectionEntry<'services'>;
export type Insight = CollectionEntry<'insights'>;
export type Transaction = CollectionEntry<'transactions'>;
export type Person = CollectionEntry<'team'>;

/** Collections are read once per build and shared by every page. */
const once = <T>(load: () => Promise<T>) => {
  let cached: Promise<T> | undefined;
  return () => (cached ??= load());
};

export const getServices = once(async (): Promise<Service[]> => {
  const services = await getCollection('services');
  return services.sort((a, b) => a.data.order - b.data.order);
});

/** Published insights; drafts are included only on preview deployments. */
export const getInsights = once(async (): Promise<Insight[]> => {
  const entries = await getCollection('insights', ({ data }) => showDrafts || !data.draft);
  return entries.sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf());
});

export const getPublishedTransactions = once(async (): Promise<Transaction[]> => {
  const entries = await getCollection('transactions');
  return entries.sort((a, b) => b.data.year - a.data.year);
});

export const getTeam = once(async (): Promise<Person[]> => {
  const team = await getCollection('team');
  return team.sort((a, b) => a.data.order - b.data.order);
});

/** Navigation grows with the content: sections appear once they have entries. */
export const getPrimaryNav = once(async (): Promise<NavItem[]> => {
  const [insights, transactions] = await Promise.all([getInsights(), getPublishedTransactions()]);
  const nav = [...primaryNav];
  if (transactions.length > 0) nav.splice(2, 0, { label: 'Transactions', href: '/transactions/' });
  if (insights.length > 0) nav.push({ label: 'Insights', href: '/insights/' });
  return nav;
});

export function serviceHref(id: string): string {
  return `/expertise/${id}/`;
}

export function readingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

export const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
