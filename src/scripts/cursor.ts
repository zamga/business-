/**
 * A drafting crosshair in place of the arrow, for mouse users only.
 *
 * - Default: a small registration mark that tracks the pointer exactly.
 * - Over links and buttons: the cross opens into a ring.
 * - Over [data-cursor="view"|"play"]: a disc with a short label.
 * - Over [data-cursor="sun"]: a sun, because there the pointer moves the light.
 * - Over text fields: the system caret returns.
 *
 * Never shown for touch or pen, and the ring does not trail with reduced
 * motion. The native cursor is hidden only once this is running.
 */
type Mode = 'default' | 'link' | 'view' | 'play' | 'sun' | 'text';

const fine = matchMedia('(hover: hover) and (pointer: fine)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

if (fine.matches) start();

function start(): void {
  const root = document.documentElement;
  const el = document.createElement('div');
  el.className = 'cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML =
    '<span class="cursor__ring"></span><span class="cursor__cross"></span><span class="cursor__sun"></span><span class="cursor__label"></span>';
  document.body.append(el);
  const ring = el.querySelector<HTMLElement>('.cursor__ring')!;
  const label = el.querySelector<HTMLElement>('.cursor__label')!;

  let x = -100;
  let y = -100;
  let rx = x;
  let ry = y;
  let frame = 0;
  let mode: Mode = 'default';
  let visible = false;

  const labels: Partial<Record<Mode, string>> = { view: 'View', play: 'Play' };

  const setMode = (next: Mode) => {
    if (next === mode) return;
    mode = next;
    el.dataset.mode = next;
    label.textContent = labels[next] ?? '';
  };

  const textField =
    'input:not([type="radio"], [type="checkbox"], [type="submit"], [type="button"]), textarea, select, [contenteditable="true"]';
  const resolve = (target: EventTarget | null): Mode => {
    if (!(target instanceof Element)) return 'default';
    if (target.closest(textField)) return 'text';
    const tagged = target.closest<HTMLElement>('[data-cursor]');
    const tag = tagged?.dataset.cursor;
    if (tag === 'view' || tag === 'play') return tag;
    if (target.closest('a[href], button, [role="button"], label, summary')) return 'link';
    if (tag === 'sun' && tagged?.classList.contains('is-live')) return 'sun';
    return 'default';
  };

  const loop = () => {
    frame = 0;
    const lag = reduced.matches ? 1 : 0.22;
    rx += (x - rx) * lag;
    ry += (y - ry) * lag;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    ring.style.transform = `translate3d(${rx - x}px, ${ry - y}px, 0)`;
    if (Math.abs(x - rx) > 0.1 || Math.abs(y - ry) > 0.1) frame = requestAnimationFrame(loop);
  };

  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse') return;
      x = event.clientX;
      y = event.clientY;
      if (!visible) {
        visible = true;
        rx = x;
        ry = y;
        root.classList.add('has-cursor');
        el.classList.add('is-visible');
      }
      setMode(resolve(event.target));
      if (!frame) frame = requestAnimationFrame(loop);
    },
    { passive: true },
  );

  // Leaving the window, or switching to touch, hands back the system cursor.
  document.addEventListener('pointerleave', () => {
    visible = false;
    el.classList.remove('is-visible');
  });
  window.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse') {
      visible = false;
      root.classList.remove('has-cursor');
      el.classList.remove('is-visible');
      return;
    }
    el.classList.add('is-down');
  });
  window.addEventListener('pointerup', () => el.classList.remove('is-down'));
  // Content can change under a still pointer (menus, page scroll).
  window.addEventListener(
    'scroll',
    () => {
      if (!visible) return;
      setMode(resolve(document.elementFromPoint(x, y)));
    },
    { passive: true },
  );
  fine.addEventListener('change', () => {
    if (!fine.matches) {
      root.classList.remove('has-cursor');
      el.remove();
    }
  });
}
