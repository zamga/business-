/**
 * Reveals [data-reveal] elements once as they enter the viewport.
 * Content is visible by default; the hidden start state only exists under
 * html.js (set inline in <head>), and reduced motion skips the transition.
 */
const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');

if (!('IntersectionObserver' in window)) {
  targets.forEach((el) => el.classList.add('is-revealed'));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );
  targets.forEach((el) => observer.observe(el));
}

// When a page is restored from the back/forward cache, keep revealed state.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) targets.forEach((el) => el.classList.add('is-revealed'));
});
