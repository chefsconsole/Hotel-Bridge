/* ------------------------------------------------------------------ *
 * A client trip (package): what the client owes the agency, what the
 * agency has received, and the agency's margin where it can honestly be
 * worked out. Pure functions — no I/O.
 *
 *  - Every client price is in the trip currency, so the package total is
 *    a plain sum. Lines without a price are counted, never guessed.
 *  - Margin is only computed for a line whose cost is in the trip
 *    currency; anything else is reported as "not comparable", not
 *    converted at a made-up rate.
 * ------------------------------------------------------------------ */
import { formatMoney, totalsByCurrency, type Money } from './money';

export type TripLine = {
  kind: string;
  clientPriceMinor: number | null;
  /** The agency's cost: HotelBridge net for hotels, own cost for extras. */
  costMinor: number | null;
  costCurrency: string | null;
};

export type TripTotals = {
  currency: string;
  totalMinor: number;
  hotelsMinor: number;
  extrasMinor: number;
  receivedMinor: number;
  pendingMinor: number; // negative = client overpaid
  unpricedLines: number;
  marginMinor: number; // over the lines where cost is in the trip currency
  marginLines: number;
  otherCurrencyCosts: Money[]; // costs we cannot net off without an FX rate
};

export function tripTotals(currency: string, lines: TripLine[], receivedMinor: number): TripTotals {
  let total = 0, hotels = 0, extras = 0, unpriced = 0, margin = 0, marginLines = 0;
  const foreign: Money[] = [];
  for (const l of lines) {
    if (l.clientPriceMinor == null) { unpriced++; continue; }
    total += l.clientPriceMinor;
    if (l.kind === 'hotel') hotels += l.clientPriceMinor; else extras += l.clientPriceMinor;
    if (l.costMinor != null && l.costCurrency) {
      if (l.costCurrency === currency) { margin += l.clientPriceMinor - l.costMinor; marginLines++; }
      else foreign.push({ minor: l.costMinor, currency: l.costCurrency });
    }
  }
  return {
    currency, totalMinor: total, hotelsMinor: hotels, extrasMinor: extras,
    receivedMinor, pendingMinor: total - receivedMinor, unpricedLines: unpriced,
    marginMinor: margin, marginLines, otherCurrencyCosts: totalsByCurrency(foreign),
  };
}

/** Share of the package that is hotels, in whole percent (for the 60/40 view). */
export function hotelShare(t: TripTotals): number {
  return t.totalMinor > 0 ? Math.round((t.hotelsMinor / t.totalMinor) * 100) : 0;
}

/** Amounts written for clients: "₹1,00,000" not "₹100,000.00". */
export function clientMoney(minor: number, currency: string): string {
  const whole = minor % 100 === 0 || currency === 'JPY';
  return formatMoney(minor, currency, { compact: whole });
}

export type ReminderInput = {
  clientName: string; agencyName: string; tripTitle: string;
  amountMinor: number; currency: string; dueOn?: string | null;
  totalMinor?: number; receivedMinor?: number; link?: string | null; signOff?: string | null;
};

const firstName = (n: string) => n.trim().split(/\s+/)[0] || n;

export function reminderMessage(r: ReminderInput): string {
  const due = r.dueOn ? ` by ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(r.dueOn + 'T00:00:00Z'))}` : '';
  const lines = [
    `Dear ${firstName(r.clientName)},`,
    '',
    `A gentle reminder for your trip "${r.tripTitle}": the pending amount is ${clientMoney(r.amountMinor, r.currency)}${due}.`,
  ];
  if (r.totalMinor && r.receivedMinor) {
    lines.push(`Trip total ${clientMoney(r.totalMinor, r.currency)} · received so far ${clientMoney(r.receivedMinor, r.currency)}.`);
  }
  if (r.link) lines.push('', `Your trip details: ${r.link}`);
  lines.push('', 'Please share the payment confirmation once done. Thank you!', '', r.signOff || r.agencyName);
  return lines.join('\n');
}

export function proposalMessage(r: { clientName: string; agencyName: string; tripTitle: string; link: string; signOff?: string | null }): string {
  return [
    `Dear ${firstName(r.clientName)},`,
    '',
    `Here is your trip plan for "${r.tripTitle}" — hotels, dates and the full price, all in one place:`,
    r.link,
    '',
    'Let us know if you would like any changes. We will confirm everything as soon as you approve.',
    '',
    r.signOff || r.agencyName,
  ].join('\n');
}

/** wa.me wants digits only, with country code. Indian 10-digit numbers get 91. */
export function whatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/[^\d]/g, '');
  if (phone.trim().startsWith('00')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = '91' + d.slice(1);
  if (d.length === 10) d = '91' + d;
  return d.length >= 8 && d.length <= 15 ? d : null;
}

export function whatsappLink(phone: string | null | undefined, text: string): string {
  const n = whatsappNumber(phone);
  return `https://wa.me/${n ?? ''}?text=${encodeURIComponent(text)}`;
}

export function mailtoLink(email: string | null | undefined, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(email ?? '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
