import { ActionForm, SubmitButton } from './forms';
import { Money, Pill } from './ui';
import { quoteAction } from '@/app/actions/agent';
import { addHotelToTripAction } from '@/app/actions/trips';
import { formatDate, daysBetween } from '@/lib/domain/dates';
import { encodeRooms } from '@/lib/domain/occupancy';
import { MEAL_PLANS } from '@/lib/services/catalog';
import type { PricedOffer } from '@/lib/services/search';
import type { RoomRequest } from '@/lib/db/schema';

export function AvailabilityPill({ availability }: { availability: 'instant' | 'on_request' }) {
  return availability === 'instant'
    ? <Pill tone="positive">Instant confirmation</Pill>
    : <Pill tone="pending">On request · hotel confirms</Pill>;
}

export function OfferList({ offers, hotelId, stay, limit, tripId }: {
  offers: PricedOffer[]; hotelId: string; stay: { checkIn: string; checkOut: string; rooms: RoomRequest[] }; limit?: number;
  /** When set, offers are added to this client trip instead of booked now. */
  tripId?: string;
}) {
  const nights = daysBetween(stay.checkIn, stay.checkOut);
  const shown = limit ? offers.slice(0, limit) : offers;
  return (
    <ul className="divide-y divide-line">
      {shown.map((o) => (
        <li key={o.offerKey} className="grid gap-4 py-5 xl:grid-cols-[1fr_auto] xl:items-center xl:gap-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{o.roomName}</p>
              <span className="text-[0.82rem] text-muted">· {MEAL_PLANS[o.mealPlan as keyof typeof MEAL_PLANS] ?? o.mealPlan}</span>
              {o.simulated && <Pill tone="neutral" dot={false}>Simulated supplier</Pill>}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.82rem]">
              <AvailabilityPill availability={o.availability} />
              <span className={o.nonRefundable ? 'text-attention' : o.freeCancelUntil ? 'text-positive' : 'text-muted'}>
                {o.nonRefundable ? 'Non-refundable' : o.freeCancelUntil ? `Free cancellation until ${formatDate(o.freeCancelUntil)}` : 'Cancellation charges apply'}
              </span>
            </div>
            {o.notes.length > 0 && <p className="mt-1.5 text-[0.78rem] text-faint">{o.notes.join(' ')}</p>}
          </div>
          <div className="flex items-center justify-between gap-5 xl:justify-end">
            <div className="text-right">
              <Money minor={o.price.sellMinor} currency={o.price.currency} className="text-[1.15rem] font-semibold" />
              <p className="text-[0.75rem] text-muted">
                {stay.rooms.length} room{stay.rooms.length === 1 ? '' : 's'} · {nights} night{nights === 1 ? '' : 's'}
                {o.price.taxMinor > 0 ? ' · taxes incl.' : ''}
              </p>
              {o.price.localTaxMinor > 0 && <p className="text-[0.72rem] text-faint">+ <Money minor={o.price.localTaxMinor} currency={o.price.currency} /> city tax at hotel</p>}
            </div>
            <ActionForm action={tripId ? addHotelToTripAction : quoteAction}>
              {tripId && <input type="hidden" name="tripId" value={tripId} />}
              <input type="hidden" name="offerKey" value={o.offerKey} />
              <input type="hidden" name="hotelId" value={hotelId} />
              <input type="hidden" name="checkIn" value={stay.checkIn} />
              <input type="hidden" name="checkOut" value={stay.checkOut} />
              <input type="hidden" name="rooms" value={encodeRooms(stay.rooms)} />
              {tripId
                ? <SubmitButton size="sm" pendingLabel="Adding…">Add to trip</SubmitButton>
                : <SubmitButton size="sm" pendingLabel="Checking…">{o.availability === 'instant' ? 'Select' : 'Request'}</SubmitButton>}
            </ActionForm>
          </div>
        </li>
      ))}
      {limit && offers.length > limit && (
        <li className="pt-3 text-[0.82rem] text-muted">{offers.length - limit} more option{offers.length - limit === 1 ? '' : 's'} on the hotel page</li>
      )}
    </ul>
  );
}
