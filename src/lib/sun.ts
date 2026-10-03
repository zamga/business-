/**
 * The hero's light study is labelled like an architect's sun study: a date
 * and a time of day. Sun from the left of the model reads as morning, from
 * the right as evening. Shared by the static poster and the live hero.
 */
export const STUDY_DATE = '21 June';

/** Azimuth range the hero's pointer can reach: 303° (morning) to 113° (evening). */
const MORNING = 303;
const EVENING = 113;

export function sunClock(azimuth: number): string {
  const a = ((azimuth % 360) + 360) % 360;
  const t = Math.min(1, Math.max(0, (MORNING - a) / (MORNING - EVENING)));
  const minutes = Math.round((8 + 11 * t) * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
