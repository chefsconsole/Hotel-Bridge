'use client';
import { useEffect } from 'react';

/** Opens the print dialog (Save as PDF) once the page has painted. */
export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return null;
}

export function PrintLink() {
  return (
    <button type="button" onClick={() => window.print()}
      className="no-print inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-[0.85rem] font-medium hover:border-ink">
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" /></svg>
      Download PDF
    </button>
  );
}
