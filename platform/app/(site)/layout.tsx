import Link from 'next/link';
import { LinkButton, Logo } from '@/components/ui';
import { getSession, homeFor } from '@/lib/session';
import { SUPPORT_EMAIL } from '@/lib/config';
import { EnvBanner } from '@/components/env-banner';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <div className="flex min-h-dvh flex-col">
      <EnvBanner />
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 md:px-6">
          <Link href="/" aria-label="HotelBridge home"><Logo /></Link>
          <nav className="hidden items-center gap-7 text-[0.88rem] text-muted md:flex" aria-label="Main">
            <Link href="/#network" className="hover:text-ink">The network</Link>
            <Link href="/#agents" className="hover:text-ink">For agents</Link>
            <Link href="/#hotels" className="hover:text-ink">For hotels</Link>
            <Link href="/#groups" className="hover:text-ink">Group Desk</Link>
            <Link href="/#how" className="hover:text-ink">How it works</Link>
          </nav>
          <div className="flex items-center gap-2">
            {session ? (
              <LinkButton href={homeFor(session.user)} size="sm">Open workspace</LinkButton>
            ) : (
              <>
                <Link href="/login" className="hidden px-2 text-[0.88rem] font-medium text-ink hover:underline sm:inline">Sign in</Link>
                <LinkButton href="/register" size="sm">Register agency</LinkButton>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-ink text-paper/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-6">
          <div>
            <Logo inverse />
            <p className="mt-4 max-w-xs text-[0.88rem] leading-relaxed">
              A curated B2B hotel network for travel agents, tour operators and DMCs.
            </p>
          </div>
          <FooterCol title="Platform" links={[['Agent portal', '/login'], ['Register your agency', '/register'], ['Group Desk', '/#groups']]} />
          <FooterCol title="Partners" links={[['Hotel partnership', '/partners'], ['Distribution partners', '/partners?kind=distribution'], ['How bookings work', '/#how']]} />
          <div>
            <p className="text-[0.75rem] font-semibold tracking-[0.14em] text-paper uppercase">Contact</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-4 block text-[0.88rem] hover:text-paper">{SUPPORT_EMAIL}</a>
          </div>
        </div>
        <div className="border-t border-paper/10">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-[0.78rem] md:flex-row md:justify-between md:px-6">
            <p>© {new Date().getFullYear()} HotelBridge</p>
            <div className="flex gap-5">
              <Link href="/legal/privacy" className="hover:text-paper">Privacy</Link>
              <Link href="/legal/terms" className="hover:text-paper">Terms of business</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-[0.75rem] font-semibold tracking-[0.14em] text-paper uppercase">{title}</p>
      <ul className="mt-4 space-y-2.5 text-[0.88rem]">
        {links.map(([l, h]) => <li key={h}><Link href={h} className="hover:text-paper">{l}</Link></li>)}
      </ul>
    </div>
  );
}
