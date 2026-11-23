/* Shared furniture for the secondary marketing pages (about, services, why us,
 * contact). The homepage has its own bespoke sections; these pages are meant to
 * read as documents, so they stay typographic — no stock photography, because we
 * licence none, and a hotel's own pictures belong in the portal, not here. */
import type { ReactNode } from 'react';
import { cx } from '@/components/ui';

export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p className={cx('flex items-center gap-3 text-[0.72rem] font-medium tracking-[0.22em] uppercase', light ? 'text-[#d9b56f]' : 'text-champagne')}>
      <span className="h-px w-8 bg-current" />{children}
    </p>
  );
}

/** The dark band at the top of a secondary page. */
export function PageHero({ eyebrow, title, lead, children }: { eyebrow: string; title: ReactNode; lead: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden bg-[#060a14] text-paper">
      <div aria-hidden className="absolute -inset-[30%] -z-10 bg-[radial-gradient(ellipse_40%_40%_at_70%_25%,rgba(199,154,74,0.2),transparent_62%),radial-gradient(ellipse_45%_40%_at_10%_90%,rgba(37,52,104,0.8),transparent_70%)]" />
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-14 md:px-6 md:pt-20 md:pb-18">
        <Eyebrow light>{eyebrow}</Eyebrow>
        <h1 className="mt-5 max-w-3xl text-[2.4rem] leading-[1.04] font-semibold tracking-[-0.04em] md:text-[3.6rem]">{title}</h1>
        <p className="mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-paper/70">{lead}</p>
        {children}
      </div>
    </section>
  );
}

export function Section({ eyebrow, title, lead, children, tone = 'paper', id }: {
  eyebrow?: string; title?: ReactNode; lead?: ReactNode; children?: ReactNode; tone?: 'paper' | 'surface'; id?: string;
}) {
  return (
    <section id={id} className={cx('scroll-mt-20', tone === 'surface' ? 'border-y border-line bg-surface' : '')}>
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        {title && <h2 className="mt-4 max-w-3xl text-[1.9rem] leading-[1.1] font-semibold tracking-[-0.03em] md:text-[2.5rem]">{title}</h2>}
        {lead && <p className="mt-5 max-w-2xl text-[1rem] leading-relaxed text-muted">{lead}</p>}
        {children}
      </div>
    </section>
  );
}

/** A numbered or plain card in a grid. */
export function Card({ n, title, children }: { n?: number; title: string; children: ReactNode }) {
  return (
    <li className="rounded-[var(--radius-lg)] border border-line bg-paper p-6">
      {n !== undefined && (
        <span className="num flex size-9 items-center justify-center rounded-full bg-ink text-[0.85rem] font-semibold text-paper">{n}</span>
      )}
      <p className={cx('font-semibold', n !== undefined ? 'mt-5' : '')}>{title}</p>
      <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">{children}</p>
    </li>
  );
}

/** Live figures, or nothing at all when the database is unreachable. */
export function Figures({ items, light = false }: { items: [number, string][]; light?: boolean }) {
  return (
    <dl className={cx('mt-12 grid max-w-lg grid-cols-3 gap-6 border-t pt-6', light ? 'border-paper/10' : 'border-line')}>
      {items.map(([n, l]) => (
        <div key={l}>
          <dt className="sr-only">{l}</dt>
          <dd>
            <span className="num block text-[2rem] font-semibold tracking-tight">{n}</span>
            <span className={cx('text-[0.8rem]', light ? 'text-paper/50' : 'text-muted')}>{l}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
