import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const audienceKeys = ['owners', 'families', 'acquirers', 'investors'] as const;
export const drawingKeys = ['table', 'targets', 'range', 'options', 'section'] as const;
/** Model photographs a mandate can use (see src/data/models.ts). */
export const serviceModelKeys = ['plan', 'field', 'range', 'options', 'layers'] as const;

/**
 * Mandates. One YAML file per service in `src/content/services/`.
 * The schema enforces the editorial structure every service page relies on:
 * objective, role, scope, five process stages and the questions clients ask.
 */
const services = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/services' }),
  schema: z.object({
    order: z.number().int().min(1),
    ref: z.string().regex(/^S-\d{2}$/, 'Use a drawing reference such as S-01'),
    name: z.string(),
    need: z.string(),
    needFirstPerson: z.string(),
    headline: z.string(),
    intro: z.string(),
    summary: z.string().max(200),
    objective: z.string(),
    role: z.string(),
    scope: z.array(z.string()).min(3).max(9),
    audiences: z.array(z.enum(audienceKeys)).min(1),
    process: z
      .array(z.object({ title: z.string(), text: z.string() }))
      .length(5, 'Every mandate follows the five-stage structure'),
    questions: z.array(z.object({ q: z.string(), a: z.string() })).max(6),
    related: z.array(reference('services')).max(3),
    drawing: z.enum(drawingKeys),
    figure: z.object({ title: z.string(), caption: z.string() }),
    model: z.object({ key: z.enum(serviceModelKeys), caption: z.string().max(180) }),
    cta: z.object({ label: z.string(), topic: z.string() }),
    seo: z.object({
      title: z.string().max(70),
      description: z.string().min(70).max(170),
    }),
  }),
});

/**
 * Insights. Markdown articles in `src/content/insights/`.
 * Articles stay unpublished until `draft: false` and a verified author is set.
 */
const insights = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/insights' }),
  schema: z.object({
    title: z.string(),
    dek: z.string().max(220),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    author: z.string().optional(),
    topics: z.array(z.string()).min(1),
    related: z.array(reference('services')).default([]),
    draft: z.boolean().default(true),
  }),
});

/**
 * Team. Add people only with their confirmed biography and consent.
 * Prior-career experience must be described as such, never as firm credentials.
 */
const team = defineCollection({
  loader: file('src/content/team.yaml'),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    order: z.number().int(),
    bio: z.string(),
    focus: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
    priorExperience: z.string().optional(),
    linkedin: z.url().optional(),
  }),
});

/**
 * Transactions. Publishing requires explicit client consent and a clear
 * attribution: completed by the firm, or a team member's prior experience.
 */
const transactions = defineCollection({
  loader: file('src/content/transactions.yaml'),
  schema: z.object({
    title: z.string(),
    year: z.number().int().min(1990),
    mandate: reference('services'),
    sector: z.string(),
    summary: z.string(),
    attribution: z.enum(['firm', 'prior-experience']),
    teamMember: reference('team').optional(),
    clientConsent: z.literal(true),
  }),
});

export const collections = { services, insights, team, transactions };
