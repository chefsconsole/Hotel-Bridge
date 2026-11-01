'use server';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { attempt, int, optStr, str, type ActionResult } from '@/lib/action';
import { hotelAnswer } from '@/lib/services/group-desk';

/** Public: a hotel answers a group request from its private link. */
export async function hotelReplyAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const token = str(fd, 'token');
    const db = await getDb();
    if (str(fd, 'intent') === 'decline') {
      await hotelAnswer(db, token, { decline: true, reason: optStr(fd, 'reason') });
      revalidatePath(`/g/${token}`);
      return 'Thank you — we have recorded that you cannot take this group.';
    }
    const lines = [0, 1, 2, 3, 4, 5]
      .map((i) => ({ roomType: str(fd, `l${i}_type`), rooms: int(fd, `l${i}_rooms`) ?? 0, nights: int(fd, `l${i}_nights`) ?? 0, rate: str(fd, `l${i}_rate`) }))
      .filter((l) => l.roomType && l.rate);
    await hotelAnswer(db, token, {
      decline: false, currency: str(fd, 'currency') as 'THB', lines, mealPlan: optStr(fd, 'mealPlan'), taxesNote: optStr(fd, 'taxesNote'),
      cityTax: optStr(fd, 'cityTax'), cancellationTerms: str(fd, 'cancellationTerms'), paymentTerms: optStr(fd, 'paymentTerms'), validUntil: str(fd, 'validUntil'),
    });
    revalidatePath(`/g/${token}`);
    return 'Thank you — your offer has reached HotelBridge.';
  });
}
