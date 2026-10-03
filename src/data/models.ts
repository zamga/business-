/**
 * Model photography. Every image on the site is rendered in-house from the
 * same 3D model of the BERGWEISS structure (src/three/), so the imagery is
 * the brand itself rather than stock. Regenerate with `npm run media:render`.
 *
 * Plates are numbered like sheets in a drawing set. Alt text describes what
 * the picture shows; captions say what it means.
 */
import type { ImageMetadata } from 'astro';
import heroWide from '../assets/models/hero-wide.webp';
import heroTall from '../assets/models/hero-tall.webp';
import joint from '../assets/models/joint.webp';
import plan from '../assets/models/plan.webp';
import field from '../assets/models/field.webp';
import range from '../assets/models/range.webp';
import options from '../assets/models/options.webp';
import layers from '../assets/models/layers.webp';
import night from '../assets/models/night.webp';
import racked from '../assets/models/racked.webp';
import front from '../assets/models/front.webp';

export interface ModelPhoto {
  src: ImageMetadata;
  /** Plate reference in the drawing set. */
  ref: string;
  title: string;
  alt: string;
}

const structure =
  'A model of the BERGWEISS structure: four pale concrete members forming a square frame, held by a red steel brace across its diagonal';

export const models = {
  heroWide: { src: heroWide, ref: 'M-00', title: 'The structure', alt: `${structure}, its long shadow falling across the page.` },
  heroTall: { src: heroTall, ref: 'M-00', title: 'The structure', alt: `${structure}, its long shadow falling across the page.` },
  joint: {
    src: joint,
    ref: 'M-06',
    title: 'The joint',
    alt: 'Close-up of the model: the red steel brace, pinned through a galvanised steel angle into the corner where a concrete column meets the base.',
  },
  plan: {
    src: plan,
    ref: 'M-01',
    title: 'Plan — the parts laid out',
    alt: 'Seen from above, the five members of the structure laid out flat before assembly: base and beam above and below, a column at each side, the red brace on the diagonal between them.',
  },
  field: {
    src: field,
    ref: 'M-02',
    title: 'The field',
    alt: 'Rows of pale, unbraced frames receding out of focus; one frame in sharp focus carries the red brace.',
  },
  range: {
    src: range,
    ref: 'M-03',
    title: 'The range',
    alt: 'Five frames of increasing size standing in a row; only the fourth carries the red brace.',
  },
  options: {
    src: options,
    ref: 'M-04',
    title: 'Three options',
    alt: 'Three frames of different proportions, each on its own plinth: low and wide, square, tall and narrow. Only the square one is braced.',
  },
  layers: {
    src: layers,
    ref: 'M-05',
    title: 'Section — the layers',
    alt: 'Three braced frames stacked into a tower, each brace running the opposite way to the one below it.',
  },
  night: {
    src: night,
    ref: 'M-07',
    title: 'After hours',
    alt: `${structure}, lit from one side against a dark ground.`,
  },
  racked: {
    src: racked,
    ref: 'M-08',
    title: 'Without its brace',
    alt: 'An unbraced frame leaning out of square; its red brace lies on the ground in front of it.',
  },
  front: {
    src: front,
    ref: 'M-09',
    title: 'Elevation',
    alt: `${structure}, seen straight on.`,
  },
} satisfies Record<string, ModelPhoto>;

export type ModelKey = keyof typeof models;
