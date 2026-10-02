/**
 * Drives the signature assembly. A stage counts as "reached" once its top
 * crosses the reading line; the number of reached stages decides how many
 * members are placed. Scrolling back reverses the assembly.
 *
 * Positions are read on scroll (one rAF per frame, read-only) rather than
 * inferred from intersection events, so jumps (Home/End keys, anchors,
 * scroll restoration) always land in the correct state.
 */
const COMPLETE_DELAY = 900;

const stageNames = [
  'Exploded view',
  'Strategy — foundation',
  'Valuation — first column',
  'Counterparties — second column',
  'Terms — beam',
  'Execution — brace',
];

export function initAssembly(root: HTMLElement): void {
  const frame = root.querySelector<HTMLElement>('[data-frame]');
  const stages = Array.from(root.querySelectorAll<HTMLElement>('[data-stage]'));
  const members = Array.from(root.querySelectorAll<HTMLElement>('[data-member]'));
  const readoutStep = root.querySelector<HTMLElement>('[data-readout-step]');
  const readoutName = root.querySelector<HTMLElement>('[data-readout-name]');
  if (!frame || stages.length === 0) return;

  const desktop = window.matchMedia('(min-width: 64em)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const total = stages.length;
  let current = -1;
  let completeTimer = 0;
  let queued = false;

  const pad = (n: number) => String(n).padStart(2, '0');

  const apply = (count: number) => {
    if (count === current) return;
    current = count;

    frame.dataset.step = String(count);
    members.forEach((member, i) => member.classList.toggle('is-placed', i < count));
    stages.forEach((stage, i) => stage.classList.toggle('is-active', i === count - 1));
    if (readoutStep) readoutStep.textContent = `${pad(count)} / ${pad(total)}`;
    if (readoutName) readoutName.textContent = stageNames[count] ?? '';

    window.clearTimeout(completeTimer);
    if (count === total) {
      completeTimer = window.setTimeout(
        () => frame.setAttribute('data-complete', ''),
        reduced.matches ? 0 : COMPLETE_DELAY,
      );
    } else {
      frame.removeAttribute('data-complete');
    }
  };

  const measure = () => {
    queued = false;
    // The reading line sits lower on small screens, below the sticky drawing.
    const line = window.innerHeight * (desktop.matches ? 0.5 : 0.7);
    let count = 0;
    for (const stage of stages) {
      if (stage.getBoundingClientRect().top < line) count += 1;
      else break;
    }
    apply(count);
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(measure);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', schedule);
  desktop.addEventListener('change', schedule);
  // First read waits for the browser's own layout, so loading never forces one.
  schedule();
}
