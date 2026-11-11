'use client';
/* One small script for every homepage effect, driven by data attributes so the
 * sections themselves stay server-rendered:
 *   [data-reveal]      fades up when scrolled into view (only if it starts below the fold)
 *   [data-count]       counts up to its number when seen
 *   [data-typing]      types out its [data-type] text, then shows its [data-chip]s
 *   .hb-spot           soft light that follows the pointer
 * With prefers-reduced-motion everything is shown as-is. */
import { useEffect } from 'react';

export function HomeMotion() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const fold = window.innerHeight * 0.9;
    const timers: number[] = [];

    const countUp = (el: HTMLElement) => {
      const target = Number(el.dataset.count);
      if (!Number.isFinite(target) || target <= 0) return;
      const start = performance.now();
      const ms = 1400;
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / ms);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      // Background tabs pause animation frames: always land on the real number.
      timers.push(window.setTimeout(() => { el.textContent = String(target); }, ms + 300));
    };

    const typeOut = (box: HTMLElement) => {
      const el = box.querySelector<HTMLElement>('[data-type]');
      if (!el) return;
      const text = el.textContent ?? '';
      el.textContent = '';
      box.dataset.typing = 'run';
      let i = 0;
      const step = () => {
        i += Math.max(1, Math.round(text.length / 90));
        el.textContent = text.slice(0, i);
        if (i < text.length) timers.push(window.setTimeout(step, 22));
        else timers.push(window.setTimeout(() => { box.dataset.typing = 'done'; }, 250));
      };
      timers.push(window.setTimeout(step, 400));
    };

    const show = (el: HTMLElement) => {
      io.unobserve(el);
      if (el.dataset.reveal === 'hidden') el.dataset.reveal = 'shown';
      if (el.dataset.count && !el.dataset.counted) { el.dataset.counted = '1'; countUp(el); }
      if (el.dataset.typing === 'wait') typeOut(el);
    };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) show(e.target as HTMLElement);
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    // Safety net: if the observer is ever late, a scroll still reveals what is on screen.
    let last = 0;
    const onScroll = () => {
      const now = Date.now();
      if (now - last < 150) return;
      last = now;
      document.querySelectorAll<HTMLElement>('[data-reveal="hidden"], [data-typing="wait"], [data-count]:not([data-counted])').forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.95) show(el);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      if (el.getBoundingClientRect().top > fold) { el.dataset.reveal = 'hidden'; io.observe(el); }
    });
    document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => { el.textContent = '0'; io.observe(el); });
    document.querySelectorAll<HTMLElement>('[data-typing]').forEach((el) => { el.dataset.typing = 'wait'; io.observe(el); });

    const onMove = (ev: PointerEvent) => {
      const card = (ev.target as HTMLElement | null)?.closest?.<HTMLElement>('.hb-spot');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${ev.clientX - r.left}px`);
      card.style.setProperty('--my', `${ev.clientY - r.top}px`);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('pointermove', onMove); window.removeEventListener('scroll', onScroll); timers.forEach(clearTimeout); };
  }, []);
  return null;
}
