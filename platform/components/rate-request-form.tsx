/* The agent's "Get best rate" form on an on-request hotel. The budget is
 * kept private: it helps us suggest alternatives and is never sent to the hotel. */
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { createRateRequestAction } from '@/app/actions/rate-requests';
import { addDays, todayIso } from '@/lib/domain/dates';
import { CURRENCIES } from '@/lib/domain/money';
import { describeRooms, encodeRooms } from '@/lib/domain/occupancy';
import type { RoomRequest } from '@/lib/db/schema';
import { MEAL_PLANS } from '@/lib/services/catalog';
import { RATE_TARGET_HOURS } from '@/lib/services/rate-requests';

export function RateRequestForm({ hotelId, checkIn, checkOut, rooms, currency }: { hotelId: string; checkIn?: string; checkOut?: string; rooms?: RoomRequest[] | null; currency: string }) {
  const tomorrow = addDays(todayIso(), 1);
  return (
    <ActionForm action={createRateRequestAction} className="space-y-4">
      <input type="hidden" name="hotelId" value={hotelId} />
      <p className="text-[0.88rem] text-muted">
        This hotel gives HotelBridge a special rate for each enquiry, usually below its public price. Send your client&apos;s dates and rooms: we aim to get you the hotel&apos;s best offer within {RATE_TARGET_HOURS} hour, right here on the portal.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Arrival"><input name="checkIn" type="date" min={todayIso()} defaultValue={checkIn ?? ''} className="field num" required /></Field>
        <Field label="Departure"><input name="checkOut" type="date" min={tomorrow} defaultValue={checkOut ?? ''} className="field num" required /></Field>
      </div>
      {rooms?.length ? (
        <div className="rounded-[var(--radius-sm)] bg-mist px-3 py-2 text-[0.88rem]">
          <input type="hidden" name="roomsEncoded" value={encodeRooms(rooms)} />
          Rooms from your search: <span className="font-medium">{describeRooms(rooms)}</span>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rooms"><select name="roomCount" defaultValue="1" className="field">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n}>{n}</option>)}</select></Field>
          <Field label="Adults per room"><select name="adults" defaultValue="2" className="field">{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></Field>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Meals"><select name="mealPlan" defaultValue="BB" className="field"><option value="">Hotel&apos;s best option</option>{Object.entries(MEAL_PLANS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Notes for the hotel" hint="Optional"><input name="notes" className="field" placeholder="Honeymoon, sea view, early check-in…" /></Field>
      </div>
      <fieldset className="rounded-[var(--radius-md)] border border-champagne/40 bg-champagne-soft/50 p-4">
        <legend className="px-1 text-[0.82rem] font-medium">Client budget — private</legend>
        <p className="mb-3 text-[0.8rem] text-muted">Never sent to the hotel. If the quote comes in above it, we show you similar hotels that fit.</p>
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <Field label="Total for the whole stay"><input name="budget" inputMode="decimal" className="field num" placeholder="e.g. 45000" /></Field>
          <Field label="Currency"><select name="budgetCurrency" defaultValue={currency} className="field">{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        </div>
      </fieldset>
      <SubmitButton size="lg" pendingLabel="Asking the hotel…">Get best rate</SubmitButton>
    </ActionForm>
  );
}
