/**
 * Pinned horizontal gallery for the mandates. The section is made exactly as
 * tall as the track is wide, the inner frame sticks under the header, and the
 * track follows the native scroll position: there is no scroll-jacking, so
 * keyboard, wheel, touch and scrollbar all behave normally.
 *
 * Only on large screens with motion allowed; elsewhere the CSS lays the
 * mandates out as a plain list.
 */
const section = document.querySelector<HTMLElement>('[data-gallery]');
const pin = section?.querySelector<HTMLElement>('[data-gallery-pin]');
const track = section?.querySelector<HTMLElement>('[data-gallery-track]');
const bar = section?.querySelector<HTMLElement>('[data-gallery-bar]');
const count = section?.querySelector<HTMLElement>('[data-gallery-count]');

if (section && pin && track) {
  const query = matchMedia('(min-width: 64em) and (min-height: 36em) and (prefers-reduced-motion: no-preference)');
  const cards = Array.from(track.querySelectorAll<HTMLElement>('.xp__card'));
  let distance = 0;
  let start = 0;
  let frame = 0;

  const headerHeight = () => document.querySelector('[data-header]')?.getBoundingClientRect().height ?? 0;

  const update = () => {
    frame = 0;
    if (!section.classList.contains('is-pinned')) return;
    const progress = distance > 0 ? Math.min(1, Math.max(0, (window.scrollY - start) / distance)) : 0;
    track.style.transform = `translate3d(${-progress * distance}px, 0, 0)`;
    if (bar) bar.style.transform = `scaleX(${progress})`;
    if (count) {
      const current = Math.min(cards.length, Math.floor(progress * cards.length) + 1);
      count.textContent = `${String(current).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    }
  };

  const request = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  const measure = () => {
    if (!query.matches) {
      section.classList.remove('is-pinned');
      section.style.removeProperty('height');
      track.style.removeProperty('transform');
      return;
    }
    section.classList.add('is-pinned');
    distance = Math.max(0, track.scrollWidth - pin.clientWidth);
    section.style.height = `${pin.clientHeight + distance}px`;
    start = section.getBoundingClientRect().top + window.scrollY - headerHeight();
    update();
  };

  // Tabbing to a card that is off to the side scrolls the page to it.
  track.addEventListener('focusin', (event) => {
    if (!section.classList.contains('is-pinned') || distance === 0) return;
    const card = (event.target as Element).closest<HTMLElement>('.xp__card');
    if (!card) return;
    pin.scrollLeft = 0;
    const margin = (pin.clientWidth - card.offsetWidth) / 2;
    const offset = Math.min(distance, Math.max(0, card.offsetLeft - margin));
    window.scrollTo({ top: start + offset, behavior: 'instant' });
  });
  pin.addEventListener('scroll', () => {
    pin.scrollLeft = 0;
  });

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', measure);
  query.addEventListener('change', measure);
  new ResizeObserver(measure).observe(track);
  window.addEventListener('load', measure, { once: true });
  measure();
}
