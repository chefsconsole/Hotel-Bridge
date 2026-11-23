import Link from 'next/link';
import { LinkButton, Logo } from '@/components/ui';
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, whatsappUrl } from '@/lib/config';
import { EnvBanner } from '@/components/env-banner';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <EnvBanner />
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 md:px-6">
          <Link href="/" aria-label="HotelBridge home"><Logo /></Link>
          <nav className="hidden items-center gap-5 text-[0.88rem] whitespace-nowrap text-muted md:flex lg:gap-7" aria-label="Main">
            <Link href="/services" className="hover:text-ink">What we do</Link>
            <Link href="/why-us" className="hover:text-ink">Why us</Link>
            <Link href="/#groups" className="hover:text-ink">Group Desk</Link>
            <Link href="/about" className="hover:text-ink">About</Link>
            <Link href="/contact" className="hover:text-ink">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden px-2 text-[0.88rem] font-medium text-ink hover:underline sm:inline">Sign in</Link>
            <LinkButton href="/register" size="sm">Register agency</LinkButton>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-ink text-paper/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1.1fr] md:px-6">
          <div>
            <Logo inverse />
            <p className="mt-4 max-w-xs text-[0.88rem] leading-relaxed">
              A curated B2B hotel network for travel agents, tour operators and DMCs.
            </p>
          </div>
          <FooterCol title="Platform" links={[['Agent portal', '/login'], ['Register your agency', '/register'], ['Group Desk', '/#groups']]} />
          <FooterCol title="Company" links={[['About HotelBridge', '/about'], ['What we do', '/services'], ['Why agencies use us', '/why-us'], ['Contact', '/contact']]} />
          <FooterCol title="Partners" links={[['Hotel partnership', '/partners'], ['Distribution partners', '/partners?kind=distribution'], ['How bookings work', '/#how']]} />
          <div>
            <p className="text-[0.75rem] font-semibold tracking-[0.14em] text-paper uppercase">Contact</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-4 block text-[0.88rem] hover:text-paper">{SUPPORT_EMAIL}</a>
            <a href={whatsappUrl('Hello HotelBridge — I have a question about the agent portal.')} target="_blank" rel="noreferrer"
              className="mt-2 inline-flex items-start gap-2 text-[0.88rem] hover:text-paper">
              <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0" fill="currentColor" aria-hidden><path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.25-1.38A9.9 9.9 0 1 0 12.04 2Zm0 1.8a8.1 8.1 0 1 1-4.13 15.07l-.3-.18-3.1.82.83-3.02-.2-.31A8.1 8.1 0 0 1 12.04 3.8Zm4.66 10.2c-.25-.13-1.47-.73-1.7-.81-.23-.09-.4-.13-.56.12s-.64.8-.79.97c-.14.17-.29.19-.54.06a6.63 6.63 0 0 1-3.3-2.88c-.25-.43.25-.4.71-1.33.08-.17.04-.31-.02-.44s-.56-1.35-.77-1.85c-.2-.48-.4-.42-.56-.42h-.47c-.17 0-.44.06-.67.31s-.88.86-.88 2.1.9 2.43 1.03 2.6c.12.16 1.77 2.7 4.28 3.78 1.6.69 2.22.75 3.02.63.49-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.11-.23-.17-.48-.3Z" /></svg>
              <span>
                <span className="block whitespace-nowrap">{SUPPORT_PHONE_DISPLAY}</span>
                <span className="block text-paper/60">WhatsApp</span>
              </span>
            </a>
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
