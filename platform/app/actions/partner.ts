'use server';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { attempt, str, type ActionResult } from '@/lib/action';
import { requirePartner } from '@/lib/session';
import { hotelRespond } from '@/lib/services/bookings';

export async function partnerRespondAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requirePartner();
    const accept = str(fd, 'decision') === 'accept';
    await hotelRespond(await getDb(), actor, str(fd, 'bookingId'), { accept, confirmation: str(fd, 'confirmation'), note: str(fd, 'note') });
    revalidatePath('/partner');
    return accept ? 'Confirmed. The agent has been updated.' : 'Declined. The agent has been informed; no charge applies.';
  });
}
