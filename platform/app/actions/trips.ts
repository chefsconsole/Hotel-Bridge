'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { attempt, int, optStr, str, type ActionResult } from '@/lib/action';
import { decodeRooms } from '@/lib/domain/occupancy';
import { requireAgent } from '@/lib/session';
import {
  addExtra, addHotelToTrip, approveSharedTrip, bookTripHotels, createClient, createTrip, deleteClientPayment, duplicateTrip,
  priceItem, recordClientPayment, removeItem, setFollowUp, setSharing, setTripStatus, updateBranding, updateClient, updateTrip,
} from '@/lib/services/trips';

const tripFields = (fd: FormData) => ({
  title: str(fd, 'title'), currency: str(fd, 'currency'),
  startDate: optStr(fd, 'startDate'), endDate: optStr(fd, 'endDate'),
  adults: int(fd, 'adults') ?? 2, children: int(fd, 'children') ?? 0,
  balanceDueOn: optStr(fd, 'balanceDueOn'), source: optStr(fd, 'source'),
  followUpOn: optStr(fd, 'followUpOn'), followUpNote: optStr(fd, 'followUpNote'),
  notes: optStr(fd, 'notes'), clientNote: optStr(fd, 'clientNote'),
});

const refresh = (tripId: string) => { revalidatePath(`/agent/trips/${tripId}`); revalidatePath('/agent/trips'); };

export async function createTripAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let id = '';
  const r = await attempt(async () => {
    const { actor } = await requireAgent();
    const clientId = optStr(fd, 'clientId');
    const t = await createTrip(await getDb(), actor, {
      ...tripFields(fd),
      clientId: clientId && clientId !== 'new' ? clientId : null,
      newClient: !clientId || clientId === 'new' ? { name: str(fd, 'clientName'), phone: optStr(fd, 'clientPhone'), email: optStr(fd, 'clientEmail'), city: optStr(fd, 'clientCity') } : null,
    });
    id = t.id;
    return { ok: true };
  });
  if (id) redirect(`/agent/trips/${id}?new=1`);
  return r;
}

export async function updateTripAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    const t = await updateTrip(await getDb(), actor, str(fd, 'tripId'), tripFields(fd));
    refresh(t.id);
    return 'Trip details saved.';
  });
}

export async function tripStatusAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    const t = await setTripStatus(await getDb(), actor, str(fd, 'tripId'), str(fd, 'status'));
    refresh(t.id);
    return 'Stage updated.';
  });
}

export async function followUpAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    const done = str(fd, 'intent') === 'done';
    const t = await setFollowUp(await getDb(), actor, str(fd, 'tripId'), done ? { followUpOn: null } : { followUpOn: optStr(fd, 'followUpOn'), followUpNote: optStr(fd, 'followUpNote') });
    refresh(t.id);
    revalidatePath('/agent');
    return done ? 'Follow-up done.' : t.followUpOn ? 'Follow-up set.' : 'Follow-up cleared.';
  });
}

export async function addHotelToTripAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let dest = '';
  const r = await attempt(async () => {
    const { actor } = await requireAgent();
    const item = await addHotelToTrip(await getDb(), actor, str(fd, 'tripId'), {
      offerKey: str(fd, 'offerKey'), hotelId: str(fd, 'hotelId'), checkIn: str(fd, 'checkIn'), checkOut: str(fd, 'checkOut'), rooms: decodeRooms(str(fd, 'rooms')),
    });
    refresh(item.tripId);
    dest = `/agent/trips/${item.tripId}?added=${item.id}`;
    return { ok: true };
  });
  if (dest) redirect(dest);
  return r;
}

export async function addExtraAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    const item = await addExtra(await getDb(), actor, str(fd, 'tripId'), {
      kind: str(fd, 'kind') as 'flight', title: str(fd, 'title'), details: optStr(fd, 'details'),
      startDate: optStr(fd, 'startDate'), endDate: optStr(fd, 'endDate'), supplierName: optStr(fd, 'supplierName'),
      clientPrice: optStr(fd, 'clientPrice'), cost: optStr(fd, 'cost'), costCurrency: optStr(fd, 'costCurrency'),
    });
    refresh(item.tripId);
    return 'Added to the trip.';
  });
}

export async function priceItemAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    const item = await priceItem(await getDb(), actor, str(fd, 'itemId'), {
      clientPrice: optStr(fd, 'clientPrice') ?? null,
      ...(fd.has('cost') ? { cost: optStr(fd, 'cost') ?? null, costCurrency: optStr(fd, 'costCurrency') } : {}),
    });
    refresh(item.tripId);
    return 'Price saved.';
  });
}

export async function removeItemAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    await removeItem(await getDb(), actor, str(fd, 'itemId'));
    refresh(str(fd, 'tripId'));
    return 'Removed.';
  });
}

export async function bookTripHotelsAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    const tripId = str(fd, 'tripId');
    const results = await bookTripHotels(await getDb(), actor, tripId, { leadGuest: optStr(fd, 'leadGuest') });
    refresh(tripId);
    revalidatePath('/agent', 'layout');
    if (!results.length) return { ok: false, message: 'There are no hotels on this trip yet. Add hotels from search first.' };
    const ok = results.filter((x) => x.outcome === 'booked' || x.outcome === 'already_booked');
    const lines = results.map((x) => `${x.outcome === 'booked' || x.outcome === 'already_booked' ? '✓' : '!'} ${x.title} — ${x.message}`).join('\n');
    return { ok: ok.length === results.length, message: `${ok.length} of ${results.length} hotel${results.length === 1 ? '' : 's'} booked.\n${lines}` };
  });
}

export async function clientPaymentAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    const tripId = str(fd, 'tripId');
    await recordClientPayment(await getDb(), actor, tripId, {
      amount: str(fd, 'amount'), method: str(fd, 'method') as 'upi', receivedOn: str(fd, 'receivedOn'), reference: optStr(fd, 'reference'), note: optStr(fd, 'note'),
    });
    refresh(tripId);
    return 'Payment recorded.';
  });
}

export async function deleteClientPaymentAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    const p = await deleteClientPayment(await getDb(), actor, str(fd, 'paymentId'));
    refresh(p.tripId);
    return 'Payment removed.';
  });
}

export async function sharingAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    const intent = str(fd, 'intent');
    const t = await setSharing(await getDb(), actor, str(fd, 'tripId'), {
      enabled: intent === 'enable' ? true : intent === 'disable' ? false : undefined,
      showItemPrices: intent === 'prices_on' ? true : intent === 'prices_off' ? false : undefined,
      rotate: intent === 'rotate',
    });
    refresh(t.id);
    return intent === 'rotate' ? 'New link created. The old link no longer works.' : 'Saved.';
  });
}

export async function duplicateTripAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let id = '';
  const r = await attempt(async () => {
    const { actor } = await requireAgent();
    id = (await duplicateTrip(await getDb(), actor, str(fd, 'tripId'))).id;
    return { ok: true };
  });
  if (id) redirect(`/agent/trips/${id}?copied=1`);
  return r;
}

export async function saveClientAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let id = '';
  const r = await attempt(async () => {
    const { actor } = await requireAgent();
    const input = { name: str(fd, 'name'), phone: optStr(fd, 'phone'), email: optStr(fd, 'email'), city: optStr(fd, 'city'), notes: optStr(fd, 'notes') };
    const existing = optStr(fd, 'clientId');
    const db = await getDb();
    if (existing) {
      await updateClient(db, actor, existing, input);
      revalidatePath(`/agent/clients/${existing}`);
      return 'Client saved.';
    }
    id = (await createClient(db, actor, input)).id;
    return { ok: true };
  });
  if (id) redirect(`/agent/clients/${id}`);
  return r;
}

export async function brandingAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    await updateBranding(await getDb(), actor, {
      brandName: optStr(fd, 'brandName'), brandEmail: optStr(fd, 'brandEmail'), brandPhone: optStr(fd, 'brandPhone'),
      logoUrl: optStr(fd, 'logoUrl'), brandFooter: optStr(fd, 'brandFooter'),
    });
    revalidatePath('/agent/profile');
    return 'Saved. Your proposals and reminders now use these details.';
  });
}

/** Public: the client approves the plan from the shared link. */
export async function approveTripAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const token = str(fd, 'token');
    const t = await approveSharedTrip(await getDb(), token);
    if (!t) return { ok: false, message: 'This link is no longer active. Please contact your travel agent.' };
    revalidatePath(`/t/${token}`);
    return 'Thank you — your travel agent has been told you approved this plan.';
  });
}
