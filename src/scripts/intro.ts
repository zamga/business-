/**
 * The intro runs on CSS alone; this adds skipping (any key, click, touch or
 * wheel opens it at once) and announces its end with `bw:intro-done`.
 */
const root = document.documentElement;
const intro = document.querySelector<HTMLElement>('[data-intro]');

if (intro && root.classList.contains('is-intro')) {
  const listeners = new AbortController();
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    listeners.abort();
    intro.hidden = true;
    window.dispatchEvent(new Event('bw:intro-done'));
  };
  const skip = (event: Event) => {
    // A click that opens the intro should not also land on the page beneath it.
    if (event.type === 'pointerdown') event.preventDefault();
    intro.classList.add('is-skipping');
  };
  for (const type of ['keydown', 'pointerdown', 'wheel', 'touchstart'] as const) {
    window.addEventListener(type, skip, { signal: listeners.signal, passive: type !== 'pointerdown' });
  }
  // The halves finish together; the overlay's own `intro-off` keyframe is the backstop.
  intro.addEventListener(
    'animationend',
    (event) => {
      const name = (event as AnimationEvent).animationName;
      if (name === 'intro-split-b' || name === 'intro-off') finish();
    },
    { signal: listeners.signal },
  );
  // Hidden tabs may never run the animations; never leave the page waiting.
  window.setTimeout(finish, 4000);
}
