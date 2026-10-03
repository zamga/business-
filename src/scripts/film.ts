/**
 * The model film: loads as it approaches, plays once when half in view
 * (unless motion is reduced), pauses when scrolled away, and always has a
 * play / pause / replay control. Stage captions light up as members lock.
 */
const figure = document.querySelector<HTMLElement>('[data-film]');
const video = figure?.querySelector<HTMLVideoElement>('[data-film-video]');
const toggle = figure?.querySelector<HTMLButtonElement>('[data-film-toggle]');
const state = figure?.querySelector<HTMLElement>('[data-film-state]');
const stages = figure ? Array.from(figure.querySelectorAll<HTMLElement>('[data-film-stage]')) : [];

if (figure && video && toggle && state) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let autoplayed = false;
  let userPaused = false;
  let frame = 0;

  const labels = {
    paused: ['Play', 'Play the model film'],
    playing: ['Pause', 'Pause the model film'],
    ended: ['Replay', 'Replay the model film'],
  } as const;

  const setState = (next: keyof typeof labels) => {
    figure.dataset.state = next;
    state.textContent = labels[next][0];
    toggle.setAttribute('aria-label', labels[next][1]);
  };

  const sync = () => {
    frame = 0;
    const t = video.currentTime;
    for (const stage of stages) stage.classList.toggle('is-locked', t >= Number(stage.dataset.at));
    if (!video.paused) frame = requestAnimationFrame(sync);
  };

  const play = async () => {
    try {
      await video.play();
    } catch {
      setState('paused');
    }
  };

  video.addEventListener('play', () => {
    setState('playing');
    if (!frame) frame = requestAnimationFrame(sync);
  });
  video.addEventListener('pause', () => {
    if (!video.ended) setState('paused');
    sync();
  });
  video.addEventListener('ended', () => {
    setState('ended');
    sync();
  });

  toggle.addEventListener('click', () => {
    if (video.ended) {
      video.currentTime = 0;
      userPaused = false;
      void play();
    } else if (video.paused) {
      userPaused = false;
      void play();
    } else {
      userPaused = true;
      video.pause();
    }
  });

  // Start loading a little before the film arrives on screen.
  new IntersectionObserver(
    ([entry], observer) => {
      if (!entry?.isIntersecting) return;
      video.preload = 'auto';
      observer.disconnect();
    },
    { rootMargin: '50% 0px' },
  ).observe(figure);

  new IntersectionObserver(
    ([entry]) => {
      if (!entry) return;
      if (entry.isIntersecting) {
        if (!reduced && !autoplayed && !userPaused) {
          autoplayed = true;
          void play();
        }
      } else if (!video.paused) {
        video.pause();
      }
    },
    { threshold: 0.5 },
  ).observe(figure);

  setState('paused');
  // Without playback the poster shows the finished structure: every stage is in place.
  if (reduced) stages.forEach((stage) => stage.classList.add('is-locked'));
}
