import Link from 'next/link';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/hotelbridge-mark.png" alt="HotelBridge" width={100} height={62} className="h-14 w-auto" />
      <h1 className="mt-6 text-[1.7rem] font-semibold">We can&apos;t find that page</h1>
      <p className="mt-2 text-muted">The link may be old or mistyped.</p>
      <Link href="/" className="mt-6 rounded-full bg-ink px-5 py-2.5 text-[0.9rem] font-medium text-paper">Back to HotelBridge</Link>
    </div>
  );
}
