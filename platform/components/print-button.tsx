'use client';
import { buttonClass } from './ui';

export function PrintButton({ label = 'Print or save as PDF' }: { label?: string }) {
  return <button onClick={() => window.print()} className={buttonClass('primary', 'sm', 'no-print')}>{label}</button>;
}
