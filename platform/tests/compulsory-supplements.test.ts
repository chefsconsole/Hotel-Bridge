/* Compulsory per-person supplements — the gala-dinner case.
 *
 * Patong Resort's contract makes the New Year's Eve gala compulsory at THB
 * 4,300 an adult and 2,800 a child 4–12. Until now the engine could only add a
 * supplement per room per night, so there were two options: leave 31 December
 * unpriced, or quote the room alone and absorb the gala for every guest. We
 * left it unpriced.
 *
 * Marking the gala "compulsory" on a hotel extra does not help: that flag is a
 * badge in the agent's extras list and the engine never reads it. Enforcement
 * belongs on the contract, next to blackouts and stop-sells, which is what a
 * per-person supplement is.
 */
import { describe, expect, it } from 'vitest';
import { evaluateStay, supplementFor, type RestrictionRow } from '@/lib/domain/contract-engine';

const contract = {
  id: 'c1', status: 'active', distributionPermitted: true,
  validFrom: '2026-11-01', validTo: '2027-10-31',
  confirmationMode: 'on_request', inventoryModel: 'direct_net',
};
const roomType = { id: 'r1', name: 'Superior', active: true, maxAdults: 3, maxChildren: 2, maxOccupancy: 3 };

/** Patong's Period B: twin 3,700, triple 4,700, child extra bed 900. */
const period = {
  roomTypeId: 'r1', mealPlan: 'BB', dateFrom: '2026-12-01', dateTo: '2026-12-31', active: true,
  price1Minor: 340_000, price2Minor: 370_000, price3Minor: 470_000, childMinor: 90_000,
  minStay: 1, releaseDays: 0,
};

/** The gala, as the contract writes it: one night, per person. */
const GALA: RestrictionRow = {
  roomTypeId: null, kind: 'supplement', dateFrom: '2026-12-31', dateTo: '2026-12-31',
  basis: 'per_person', amountMinor: 430_000, childAmountMinor: 280_000,
  note: 'Compulsory New Year’s Eve gala dinner',
};

const stay = (checkIn: string, checkOut: string, rooms = [{ adults: 2, childAges: [] as number[] }]) =>
  ({ checkIn, checkOut, rooms, today: '2026-11-23' });

const run = (s: ReturnType<typeof stay>, restrictions: RestrictionRow[] = [GALA]) =>
  evaluateStay({ contract, roomType, mealPlan: 'BB', periods: [period], restrictions, allocations: [], stay: s });

describe('compulsory per-person supplements', () => {
  it('charges a per-person supplement for each adult, on the night it applies', () => {
    // 30 Dec and 31 Dec: only the second night carries the gala.
    const r = run(stay('2026-12-30', '2027-01-01'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [room] = r.rooms;
    expect(room.nightly).toEqual([
      { night: '2026-12-30', amountMinor: 370_000 },
      { night: '2026-12-31', amountMinor: 370_000 + 2 * 430_000 },
    ]);
    expect(r.contractAmountMinor).toBe(370_000 + 370_000 + 860_000);
  });

  it('prices children at the child rate, not the adult one', () => {
    const r = run(stay('2026-12-31', '2027-01-01', [{ adults: 2, childAges: [7] }]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Room: twin 3,700 + child extra bed 900. Gala: two adults + one child.
    expect(r.contractAmountMinor).toBe(370_000 + 90_000 + 2 * 430_000 + 280_000);
  });

  it('refuses the stay rather than under-charging when children have no gala price', () => {
    const noChildPrice = { ...GALA, childAmountMinor: null };
    const r = run(stay('2026-12-31', '2027-01-01', [{ adults: 2, childAges: [7] }]), [noChildPrice]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toMatch(/not priced for children/);
  });

  it('still sells a room with no children when the child price is missing', () => {
    const noChildPrice = { ...GALA, childAmountMinor: null };
    const r = run(stay('2026-12-31', '2027-01-01'), [noChildPrice]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.contractAmountMinor).toBe(370_000 + 2 * 430_000);
  });

  it('charges every room in the booking', () => {
    const r = run(stay('2026-12-31', '2027-01-01', [{ adults: 2, childAges: [] }, { adults: 1, childAges: [] }]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rooms[0].totalMinor).toBe(370_000 + 2 * 430_000);
    expect(r.rooms[1].totalMinor).toBe(340_000 + 1 * 430_000);
  });

  it('leaves nights outside the supplement window alone', () => {
    const r = run(stay('2026-12-20', '2026-12-22'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.contractAmountMinor).toBe(2 * 370_000);
    expect(r.notes).not.toContain('Includes a compulsory supplement on some nights, charged per person.');
  });

  it('tells the agent a per-person supplement is in the price', () => {
    const r = run(stay('2026-12-31', '2027-01-01'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.notes).toContain('Includes a compulsory supplement on some nights, charged per person.');
  });

  it('keeps per-room supplements exactly as they were', () => {
    // The default basis, and every supplement already in the database: one
    // amount per room per night, regardless of who is in the room.
    const perRoom: RestrictionRow = {
      roomTypeId: null, kind: 'supplement', dateFrom: '2026-12-31', dateTo: '2026-12-31',
      amountMinor: 500_000, note: 'Trade fair',
    };
    const r = run(stay('2026-12-31', '2027-01-01', [{ adults: 2, childAges: [7] }]), [perRoom]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.contractAmountMinor).toBe(370_000 + 90_000 + 500_000);
    expect(r.notes).toContain('Includes a high-demand supplement on some nights.');
  });

  it('adds a per-room and a per-person supplement on the same night', () => {
    const perRoom: RestrictionRow = {
      roomTypeId: null, kind: 'supplement', dateFrom: '2026-12-31', dateTo: '2026-12-31',
      amountMinor: 100_000, note: 'Peak night',
    };
    const r = run(stay('2026-12-31', '2027-01-01'), [GALA, perRoom]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.contractAmountMinor).toBe(370_000 + 2 * 430_000 + 100_000);
  });

  it('computes one room’s supplement on its own', () => {
    expect(supplementFor([GALA], { adults: 2, childAges: [] })).toBe(860_000);
    expect(supplementFor([GALA], { adults: 1, childAges: [5, 9] })).toBe(430_000 + 560_000);
    expect(supplementFor([], { adults: 2, childAges: [] })).toBe(0);
    expect(supplementFor([{ ...GALA, childAmountMinor: null }], { adults: 2, childAges: [5] })).toBeNull();
    // A blackout is not a supplement and never adds money.
    expect(supplementFor([{ ...GALA, kind: 'blackout' }], { adults: 2, childAges: [] })).toBe(0);
  });
});
