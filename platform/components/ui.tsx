/* The HotelBridge design system: a small set of deliberate primitives.
 * Server-component safe (no hooks); interactive pieces live in forms.tsx. */
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { formatMoney } from '@/lib/domain/money';
import type { Tone } from '@/lib/domain/booking-state';

export function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(' ');
}

/* --------------------------------- brand --------------------------------- */

export function Logo({ inverse = false, className = '' }: { inverse?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 40 28" className="h-6 w-auto" aria-hidden>
        <path d="M3 22C7.5 11 13.5 6 20 6s12.5 5 17 16" fill="none" stroke="var(--color-champagne)" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M3 25h34" stroke={inverse ? 'var(--color-paper)' : 'var(--color-ink)'} strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className={cx('font-[family-name:var(--font-display)] text-[1.08rem] font-semibold tracking-[-0.02em]', inverse ? 'text-paper' : 'text-ink')}>
        HotelBridge
      </span>
    </span>
  );
}

/* -------------------------------- buttons -------------------------------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink-3 shadow-[0_1px_0_rgb(255_255_255/0.08)_inset,0_8px_20px_-12px_rgb(10_15_26/0.6)]',
  secondary: 'bg-surface text-ink border border-line-strong hover:border-ink',
  ghost: 'text-ink hover:bg-mist',
  inverse: 'bg-paper text-ink hover:bg-white',
  danger: 'bg-surface text-negative border border-line-strong hover:border-negative',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[0.82rem]',
  md: 'h-11 px-5 text-[0.9rem]',
  lg: 'h-13 px-7 text-[0.98rem]',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return cx(
    'inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium tracking-[0.005em] whitespace-nowrap transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none',
    variants[variant], sizes[size], extra,
  );
}

export function Button({ variant = 'primary', size = 'md', className = '', ...p }: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...p} />;
}

export function LinkButton({ variant = 'primary', size = 'md', className = '', ...p }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...p} />;
}

/* --------------------------------- layout --------------------------------- */

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="text-[2rem] leading-[1.1] font-medium tracking-[-0.035em] md:text-[2.6rem]">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ title, description, actions, children, className = '', padded = true }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cx('min-w-0 rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-soft)]', className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            {title && <h2 className="text-[1.02rem] font-medium tracking-[-0.01em]">{title}</h2>}
            {description && <p className="mt-1 text-[0.85rem] leading-relaxed text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={padded ? 'p-6' : 'overflow-x-auto'}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.68rem] font-medium tracking-[0.14em] text-faint uppercase">{label}</p>
      <p className="num mt-3 font-[family-name:var(--font-display)] text-[1.9rem] leading-none font-light tracking-[-0.03em]">{value}</p>
      {hint && <p className="mt-2 text-[0.78rem] leading-snug text-muted">{hint}</p>}
    </div>
  );
}

export function DL({ items, cols = 2 }: { items: Array<[string, ReactNode]>; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cx('grid gap-x-8 gap-y-4', cols === 1 ? 'grid-cols-1' : cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[0.75rem] font-medium tracking-wide text-faint uppercase">{k}</dt>
          <dd className="mt-1 text-[0.92rem] break-words">{v ?? <span className="text-faint">Not recorded</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

/* --------------------------------- status --------------------------------- */

const toneClass: Record<Tone | 'info', string> = {
  positive: 'bg-positive-bg text-positive',
  pending: 'bg-pending-bg text-pending',
  attention: 'bg-attention-bg text-attention',
  negative: 'bg-negative-bg text-negative',
  neutral: 'bg-neutral-bg text-neutral',
  info: 'bg-champagne-soft text-ink',
};

export function Pill({ tone = 'neutral', children, dot = true }: { tone?: Tone | 'info'; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium whitespace-nowrap', toneClass[tone])}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

export function Notice({ tone = 'info', title, children }: { tone?: 'info' | 'warning' | 'error' | 'success'; title?: ReactNode; children?: ReactNode }) {
  const t = { info: 'border-line bg-mist', warning: 'border-[#ecd9b5] bg-pending-bg', error: 'border-[#f0caca] bg-negative-bg', success: 'border-[#c7e1d1] bg-positive-bg' }[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('rounded-[var(--radius-md)] border px-4 py-3 text-[0.9rem]', t)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cx('text-muted', title ? 'mt-0.5' : '')}>{children}</div>}
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <svg viewBox="0 0 48 32" className="mb-4 h-8 w-auto text-line-strong" aria-hidden>
        <path d="M4 26C10 12 17 6 24 6s14 6 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 4" />
      </svg>
      <p className="font-medium">{title}</p>
      {children && <p className="mt-1 max-w-md text-[0.9rem] text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* --------------------------------- money --------------------------------- */

export function Money({ minor, currency, className = '', compact }: { minor: number; currency: string; className?: string; compact?: boolean }) {
  return <span className={cx('num', className)}>{formatMoney(minor, currency, { compact })}</span>;
}

/* ------------------------------ hotel visual ------------------------------ */

/** Real, licensed photography when we have it; otherwise an honest, deliberate placeholder. */
export function HotelVisual({ hotel, className = '', size = 'md' }: {
  hotel: { name: string; city: string; country?: string; images: { url: string; alt: string; credit?: string }[]; isSample?: boolean };
  className?: string; size?: 'sm' | 'md' | 'lg';
}) {
  const img = hotel.images[0];
  if (img) {
    return (
      <figure className={cx('relative overflow-hidden bg-mist', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={img.alt} className="size-full object-cover" loading="lazy" />
        {img.credit && <figcaption className="absolute right-2 bottom-2 rounded bg-ink/60 px-1.5 py-0.5 text-[0.65rem] text-paper">{img.credit}</figcaption>}
      </figure>
    );
  }
  const initials = hotel.name.replace(/^(Hotel|The)\s+/i, '').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div className={cx('relative isolate flex flex-col justify-between overflow-hidden bg-ink p-4 text-paper', className)} aria-label={`${hotel.name} — photography not yet available`}>
      <svg className="absolute inset-0 -z-10 size-full opacity-[0.18]" aria-hidden>
        <defs><pattern id="hbgrid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="#f8f6f2" strokeWidth="0.5" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#hbgrid)" />
      </svg>
      <svg viewBox="0 0 200 80" className="absolute -right-6 bottom-6 -z-10 w-[80%] opacity-60" aria-hidden>
        <path d="M0 70C40 25 80 10 100 10s60 15 100 60" fill="none" stroke="var(--color-champagne)" strokeWidth="1.2" />
      </svg>
      <p className="text-[0.66rem] tracking-[0.18em] text-paper/60 uppercase">{hotel.city}</p>
      <div>
        <p className={cx('font-[family-name:var(--font-display)] font-semibold tracking-tight', size === 'sm' ? 'text-2xl' : size === 'lg' ? 'text-6xl' : 'text-4xl')}>{initials}</p>
        {size !== 'sm' && <p className="mt-1 text-[0.7rem] text-paper/50">Photography pending licensing</p>}
      </div>
    </div>
  );
}

export function SampleTag() {
  return <span className="rounded-sm border border-dashed border-line-strong px-1.5 py-px text-[0.66rem] font-semibold tracking-wider text-muted uppercase">Sample</span>;
}

export function Divider({ className = '' }: { className?: string }) {
  return <hr className={cx('border-0 border-t border-line', className)} />;
}
