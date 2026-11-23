/* The staff-side invoice list.
 *
 * Two things here are easy to get wrong and expensive if we do:
 *  - "Still owed" belongs to the BOOKING, read from the ledger, not to the
 *    invoice document. Two invoices on one booking must not report the
 *    balance twice, or the totals overstate what an agency owes.
 *  - A credit note is shown at its face value and never netted off the
 *    invoiced figure, because the ledger already accounts for it.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { schema } from '@/lib/db';
import { createBooking, recordPayment } from '@/lib/services/bookings';
import { invoiceTotals, issueInvoice, listInvoices, type InvoiceRow } from '@/lib/services/ledger';
import { createQuote, searchHotels, type QuoteSnapshot } from '@/lib/services/search';
import { key, setup, stay, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); });

/* A real booking, so the ledger has rows to read. Note that createBooking
 * RAISES ITS OWN INVOICE (bookings.ts), so every booking here already carries
 * one before these tests add any — which is why the counts below allow for it. */
async function aBooking(fx: Fixture) {
  const s = stay(fx.today, 10, 2);
  const rooms = [{ adults: 2, childAges: [] as number[] }];
  const { results } = await searchHotels(fx.db, fx.A, { city: 'Paris', ...s, rooms });
  const offer = results[0].offers.find((o) => o.supplier === 'contracted')!;
  const q = await createQuote(fx.db, fx.A, { offerKey: offer.offerKey, hotelId: fx.hotel.id, ...s, rooms });
  const r = await createBooking(fx.db, fx.A, {
    quoteId: q.id, idempotencyKey: key(), acceptedSellMinor: (q.snapshot as QuoteSnapshot).priced.price.sellMinor,
    leadGuest: 'Ravi Kumar', guestNames: [['Ravi Kumar']],
  });
  if (r.kind !== 'created') throw new Error(r.kind);
  return r.booking;
}

const row = (over: Partial<InvoiceRow> = {}): InvoiceRow => ({
  id: crypto.randomUUID(), number: 'HB-INV-2026-00001', kind: 'invoice', currency: 'EUR',
  totalMinor: 10_000, taxMinor: 1_000, issuedAt: new Date(), dueAt: null, lines: [],
  agencyId: 'a', agencyName: 'Alpha Travels', agencyCode: 'HB-A0001',
  bookingId: 'b1', bookingRef: 'HB-1', outstandingMinor: 10_000, ...over,
});

describe('invoice totals', () => {
  it('counts one booking’s balance once, however many invoices it has', () => {
    // The real case: an invoice plus a later amendment invoice on one booking.
    const t = invoiceTotals([
      row({ number: 'HB-INV-2026-00001', totalMinor: 10_000, outstandingMinor: 12_000 }),
      row({ number: 'HB-INV-2026-00002', totalMinor: 2_000, outstandingMinor: 12_000 }),
    ]);
    expect(t).toHaveLength(1);
    expect(t[0].invoiced).toBe(12_000);
    expect(t[0].outstanding).toBe(12_000); // not 24,000
    expect(t[0].count).toBe(2);
  });

  it('keeps a credit note separate instead of netting it off', () => {
    const [t] = invoiceTotals([
      row({ totalMinor: 10_000, outstandingMinor: 0 }),
      row({ kind: 'credit_note', number: 'HB-CN-2026-00001', totalMinor: 4_000, outstandingMinor: 0 }),
    ]);
    expect(t.invoiced).toBe(10_000);
    expect(t.credited).toBe(4_000);
  });

  it('never adds across currencies', () => {
    const t = invoiceTotals([
      row({ currency: 'EUR', totalMinor: 10_000, bookingId: 'b1' }),
      row({ currency: 'INR', totalMinor: 500_000, bookingId: 'b2' }),
    ]);
    expect(t.map((x) => x.currency).sort()).toEqual(['EUR', 'INR']);
    expect(t.find((x) => x.currency === 'EUR')!.invoiced).toBe(10_000);
    expect(t.find((x) => x.currency === 'INR')!.invoiced).toBe(500_000);
  });

  it('ignores a credit balance rather than reporting negative debt', () => {
    // The agency has overpaid: they owe nothing, not minus something.
    const [t] = invoiceTotals([row({ outstandingMinor: -5_000 })]);
    expect(t.outstanding).toBe(0);
  });

  it('treats an invoice with no booking as having no balance to read', () => {
    const [t] = invoiceTotals([row({ bookingId: null, bookingRef: null, outstandingMinor: null })]);
    expect(t.outstanding).toBe(0);
    expect(t.invoiced).toBe(10_000);
  });
});

describe('the staff invoice list', () => {
  it('reads what is still owed from the ledger, not from the invoice', async () => {
    f = await setup();
    const b = await aBooking(f);
    const inv = await issueInvoice(f.db, {
      agencyId: b.agencyId, bookingId: b.id, kind: 'invoice', currency: b.currency,
      totalMinor: b.sellMinor, taxMinor: 0, lines: [{ label: 'Accommodation', amountMinor: b.sellMinor }],
    });
    expect(inv.number).toMatch(/^HB-INV-\d{4}-\d{5}$/);

    const before = await listInvoices(f.db);
    const mine = before.find((x) => x.number === inv.number)!;
    expect(mine).toMatchObject({ agencyName: 'Alpha Travels', bookingRef: b.reference });
    // The booking's own invoice plus this one, both reading the same balance.
    expect(before.map((x) => x.outstandingMinor)).toEqual([b.sellMinor, b.sellMinor]);

    // Pay it. The invoice rows never change; the balance does.
    await recordPayment(f.db, f.ADMIN, b.id, { amountMinor: b.sellMinor, reference: 'TT-1' });
    const after = await listInvoices(f.db);
    expect(after.find((x) => x.number === inv.number)!.totalMinor).toBe(inv.totalMinor);
    expect(after.every((x) => x.outstandingMinor === 0)).toBe(true);
  });

  it('filters to what is still owed', async () => {
    f = await setup();
    const b = await aBooking(f);
    // The booking already carries one invoice; this is its second.
    await issueInvoice(f.db, { agencyId: b.agencyId, bookingId: b.id, kind: 'invoice', currency: b.currency, totalMinor: b.sellMinor, taxMinor: 0, lines: [] });
    expect(await listInvoices(f.db, { unpaid: true })).toHaveLength(2);
    await recordPayment(f.db, f.ADMIN, b.id, { amountMinor: b.sellMinor, reference: 'TT-1' });
    expect(await listInvoices(f.db, { unpaid: true })).toHaveLength(0);
    // Still listed when the filter is off — a settled invoice is not deleted.
    expect(await listInvoices(f.db)).toHaveLength(2);
  });

  it('counts a booking’s balance once even with two invoices on it', async () => {
    f = await setup();
    const b = await aBooking(f);
    await issueInvoice(f.db, { agencyId: b.agencyId, bookingId: b.id, kind: 'invoice', currency: b.currency, totalMinor: 2_000, taxMinor: 0, lines: [] });
    const rows = await listInvoices(f.db);
    expect(rows).toHaveLength(2);
    const [t] = invoiceTotals(rows);
    // Both rows report the same ledger balance; the total must not double it.
    expect(t.outstanding).toBe(b.sellMinor);
    expect(t.invoiced).toBe(b.sellMinor + 2_000);
  });

  it('filters by kind, by agency and by number', async () => {
    f = await setup();
    const b = await aBooking(f);
    const inv = await issueInvoice(f.db, { agencyId: b.agencyId, bookingId: b.id, kind: 'invoice', currency: b.currency, totalMinor: 10_000, taxMinor: 0, lines: [] });
    const cn = await issueInvoice(f.db, { agencyId: b.agencyId, bookingId: b.id, kind: 'credit_note', currency: b.currency, totalMinor: 4_000, taxMinor: 0, lines: [] });
    // Another agency's invoice, which must not show up under Alpha's filter.
    await f.db.insert(schema.invoices).values({
      number: 'HB-INV-2026-09999', agencyId: f.agencyB.id, bookingId: null, kind: 'invoice',
      currency: 'EUR', totalMinor: 7_000, taxMinor: 0, lines: [],
    });

    expect((await listInvoices(f.db, { kind: 'credit_note' })).map((x) => x.number)).toEqual([cn.number]);
    expect((await listInvoices(f.db, { agencyId: f.agencyB.id })).map((x) => x.number)).toEqual(['HB-INV-2026-09999']);
    expect((await listInvoices(f.db, { q: inv.number })).map((x) => x.number)).toEqual([inv.number]);
    // Searching the booking reference finds every document on it — the two
    // raised here plus the one createBooking raised.
    const onBooking = (await listInvoices(f.db, { q: b.reference })).map((x) => x.number);
    expect(onBooking).toHaveLength(3);
    expect(onBooking).toContain(inv.number);
    expect(onBooking).toContain(cn.number);
    expect((await listInvoices(f.db, { q: 'Beta' })).map((x) => x.number)).toEqual(['HB-INV-2026-09999']);
    // Beta's invoice has no booking, so it is not found by Alpha's reference.
    expect(onBooking).not.toContain('HB-INV-2026-09999');
  });

  it('lists an invoice with no booking, with no balance claimed for it', async () => {
    f = await setup(); // no booking made, so this is the only invoice
    await f.db.insert(schema.invoices).values({
      number: 'HB-INV-2026-00500', agencyId: f.agencyA.id, bookingId: null, kind: 'invoice',
      currency: 'EUR', totalMinor: 7_000, taxMinor: 700, lines: [{ label: 'Annual platform fee', amountMinor: 7_000 }],
    });
    const [r] = await listInvoices(f.db);
    expect(r.bookingRef).toBeNull();
    expect(r.outstandingMinor).toBeNull();
  });

  it('shows the newest invoice first, even when two share an instant', async () => {
    f = await setup();
    const b = await aBooking(f);
    // Raised back to back, so issuedAt ties and only the number can order them.
    const first = await issueInvoice(f.db, { agencyId: b.agencyId, bookingId: b.id, kind: 'invoice', currency: b.currency, totalMinor: 1_000, taxMinor: 0, lines: [] });
    const second = await issueInvoice(f.db, { agencyId: b.agencyId, bookingId: b.id, kind: 'invoice', currency: b.currency, totalMinor: 2_000, taxMinor: 0, lines: [] });
    const numbers = (await listInvoices(f.db)).map((x) => x.number);
    expect(numbers[0]).toBe(second.number);
    expect(numbers.indexOf(second.number)).toBeLessThan(numbers.indexOf(first.number));
  });
});
