import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema } from '@/lib/db';
import { actorFor, login } from '@/lib/services/auth';
import { setContractStatus } from '@/lib/services/catalog';
import { recordPayment } from '@/lib/services/bookings';
import { addStaff, listStaff, updateStaff } from '@/lib/services/staff';
import { setup, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); });

describe('HotelBridge team', () => {
  it('only admins manage the team, and there is always an active admin', async () => {
    f = await setup();
    const sales = await addStaff(f.db, f.ADMIN, { name: 'Sana Sales', email: 'sana@hb.test', role: 'sales', password: 'long enough pw' });
    const S = actorFor(sales);
    await expect(addStaff(f.db, S, { name: 'X', email: 'x@hb.test', role: 'admin', password: 'long enough pw' })).rejects.toThrow();
    expect((await listStaff(f.db)).map((u) => u.role).sort()).toEqual(['admin', 'sales']);

    // Sales prepares contracts but cannot activate them, and never touches money.
    await setContractStatus(f.db, S, f.contract.id, 'suspended');
    await expect(setContractStatus(f.db, S, f.contract.id, 'active')).rejects.toThrow();
    await expect(recordPayment(f.db, S, '00000000-0000-0000-0000-000000000000', { amountMinor: 1, reference: 'XX' })).rejects.toThrow();

    // The last admin can't be demoted or disabled.
    await expect(updateStaff(f.db, f.ADMIN, f.ADMIN.userId, { role: 'ops' })).rejects.toThrow(/at least one active admin/);
    await expect(updateStaff(f.db, f.ADMIN, f.ADMIN.userId, { status: 'disabled' })).rejects.toThrow();

    // Disabling someone stops them signing in.
    await login(f.db, 'sana@hb.test', 'long enough pw');
    await updateStaff(f.db, f.ADMIN, sales.id, { status: 'disabled' });
    expect((await f.db.select().from(schema.sessions).where(eq(schema.sessions.userId, sales.id))).length).toBe(0);
    await expect(login(f.db, 'sana@hb.test', 'long enough pw')).rejects.toThrow(/disabled/);
  });
});
