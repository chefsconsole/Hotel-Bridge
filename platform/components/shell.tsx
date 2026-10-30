'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Logo, cx } from './ui';

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };

const ICONS = {
  overview: 'M3 12h7V3H3v9Zm0 9h7v-6H3v6Zm11 0h7v-9h-7v9Zm0-18v6h7V3h-7Z',
  search: 'M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm5.3-2.2L21 21',
  bookings: 'M4 5h16v15H4zM4 9h16M8 3v4M16 3v4',
  groups: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3 2.7-5 6-5s6 2 6 5m0-3.6c.6-.3 1.3-.4 2-.4 3.3 0 6 2 6 5',
  saved: 'M6 3h12v18l-6-4-6 4z',
  finance: 'M3 6h18v12H3zM3 10h18M7 15h3',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9c0-4 3.6-6 8-6s8 2 8 6',
  support: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.5-11.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14m0 3h.01',
  hotels: 'M4 21V5l8-2v18M12 7l8 2v12M8 9h.01M8 13h.01M8 17h.01M16 13h.01M16 17h.01M2 21h20',
  agencies: 'M3 21V8l9-5 9 5v13M9 21v-6h6v6',
  pricing: 'M20 12 12 20 4 12V4h8zM8 8h.01',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  plug: 'M9 7V3M15 7V3M7 7h10v4a5 5 0 0 1-10 0V7Zm5 9v5',
  inbox: 'M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6z',
  audit: 'M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01',
  compare: 'M7 4v16M17 4v16M3 8h8M13 16h8',
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

export function AppShell({ nav, context, user, signOut, banner, children }: {
  nav: NavItem[]; context: ReactNode; user: ReactNode; signOut: ReactNode; banner?: ReactNode; children: ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href.split('/').length <= 2 ? path === href : path === href || path.startsWith(href + '/'));
  const links = (
    <nav className="flex flex-col gap-0.5" aria-label="Workspace">
      {nav.map((n) => (
        <Link
          key={n.href} href={n.href} onClick={() => setOpen(false)}
          aria-current={isActive(n.href) ? 'page' : undefined}
          className={cx(
            'flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-[0.88rem] transition-colors',
            isActive(n.href) ? 'bg-paper/10 text-paper' : 'text-paper/60 hover:bg-paper/5 hover:text-paper',
          )}
        >
          <Icon name={n.icon} />
          <span className="flex-1">{n.label}</span>
          {n.badge ? <span className="num rounded-full bg-champagne px-1.5 text-[0.7rem] font-semibold text-ink">{n.badge}</span> : null}
        </Link>
      ))}
    </nav>
  );
  return (
    <div className="flex min-h-dvh flex-col">
      {banner}
      <div className="flex flex-1">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-ink px-4 py-5 lg:flex">
          <Link href="/" className="px-2"><Logo inverse /></Link>
          <div className="mt-6 mb-5 rounded-[var(--radius-sm)] border border-paper/10 px-3 py-2.5 text-[0.8rem] text-paper/70">{context}</div>
          {links}
          <div className="mt-auto border-t border-paper/10 pt-4 text-[0.8rem] text-paper/60">
            <div className="px-2">{user}</div>
            <div className="mt-2">{signOut}</div>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-ink px-4 lg:hidden">
            <Link href="/"><Logo inverse /></Link>
            <button onClick={() => setOpen((v) => !v)} className="rounded-[var(--radius-sm)] px-3 py-1.5 text-[0.85rem] text-paper ring-1 ring-paper/20" aria-expanded={open}>
              {open ? 'Close' : 'Menu'}
            </button>
          </header>
          {open && (
            <div className="border-b border-paper/10 bg-ink px-4 pt-3 pb-5 lg:hidden animate-[var(--animate-fade)]">
              <div className="mb-3 text-[0.8rem] text-paper/70">{context}</div>
              {links}
              <div className="mt-4 border-t border-paper/10 pt-3 text-[0.8rem] text-paper/60">{user}<div className="mt-2">{signOut}</div></div>
            </div>
          )}
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8 md:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
