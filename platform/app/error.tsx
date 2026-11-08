'use client';

import { useEffect } from 'react';

/* A controlled message instead of a broken screen. Never shows technical detail. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-[1.5rem] font-semibold">Something went wrong on our side</h1>
      <p className="mt-2 text-muted">Nothing you entered has been lost. Please try again. If it keeps happening, write to info@hotelbridge.co{error.digest ? ` and quote ${error.digest}` : ''}.</p>
      <button onClick={reset} className="mt-6 rounded-full bg-ink px-5 py-2.5 text-[0.9rem] font-medium text-paper">Try again</button>
    </div>
  );
}
