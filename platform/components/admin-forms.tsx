import { ActionForm, Field, SubmitButton } from './forms';
import { COLLECTIONS } from '@/lib/services/catalog';
import { toDecimalString } from '@/lib/domain/money';
import type { schema } from '@/lib/db';
import type { ActionResult } from '@/lib/action';

type Hotel = typeof schema.hotels.$inferSelect;
type Contract = typeof schema.contracts.$inferSelect;
type Act = (p: ActionResult | null, fd: FormData) => Promise<ActionResult>;

export function HotelForm({ action, hotel, submit }: { action: Act; hotel?: Hotel; submit: string }) {
  return (
    <ActionForm action={action} className="space-y-4">
      {hotel && <input type="hidden" name="hotelId" value={hotel.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Hotel name" className="sm:col-span-3"><input name="name" defaultValue={hotel?.name} className="field" /></Field>
        <Field label="City"><input name="city" defaultValue={hotel?.city} className="field" /></Field>
        <Field label="Country"><input name="country" defaultValue={hotel?.country} className="field" /></Field>
        <Field label="Official star rating"><select name="starRating" defaultValue={hotel?.starRating ?? ''} className="field"><option value="">Not stated</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
        <Field label="Address" className="sm:col-span-2"><input name="address" defaultValue={hotel?.address ?? ''} className="field" /></Field>
        <label className="flex items-center gap-2 self-end pb-3 text-[0.85rem]"><input type="checkbox" name="starRatingVerified" defaultChecked={hotel?.starRatingVerified} className="size-4" /> Rating verified with official source</label>
      </div>
      <fieldset><legend className="mb-2 text-[0.82rem] font-medium">Why it is in the collection</legend>
        <div className="flex flex-wrap gap-3">{COLLECTIONS.map(([k, l]) => <label key={k} className="flex items-center gap-1.5 text-[0.85rem]"><input type="checkbox" name="collections" value={k} defaultChecked={hotel?.collections.includes(k)} className="size-4" />{l}</label>)}</div>
      </fieldset>
      <Field label="One-line summary for search results"><input name="summary" defaultValue={hotel?.summary ?? ''} maxLength={240} className="field" /></Field>
      <Field label="Description" hint="Only verified facts — no invented amenities"><textarea name="description" rows={5} defaultValue={hotel?.description ?? ''} className="field" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Facilities" hint="One per line"><textarea name="facilities" rows={5} defaultValue={hotel?.facilities.join('\n')} className="field" /></Field>
        <div className="space-y-4">
          <Field label="Getting there"><textarea name="transport" rows={2} defaultValue={hotel?.transport ?? ''} className="field" /></Field>
          <Field label="Group notes" hint="Coach access, breakfast capacity…"><textarea name="groupNotes" rows={2} defaultValue={hotel?.groupNotes ?? ''} className="field" /></Field>
        </div>
        <Field label="Check-in from"><input name="checkInTime" defaultValue={hotel?.checkInTime ?? ''} placeholder="15:00" className="field" /></Field>
        <Field label="Check-out by"><input name="checkOutTime" defaultValue={hotel?.checkOutTime ?? ''} placeholder="11:00" className="field" /></Field>
        <Field label="Commercial contact"><input name="contactName" defaultValue={hotel?.contactName ?? ''} className="field" /></Field>
        <Field label="Contact email"><input name="contactEmail" defaultValue={hotel?.contactEmail ?? ''} className="field" /></Field>
        <Field label="Reservations email" hint="Used for group enquiries"><input name="reservationsEmail" defaultValue={hotel?.reservationsEmail ?? ''} className="field" /></Field>
      </div>
      <SubmitButton>{submit}</SubmitButton>
    </ActionForm>
  );
}

export function ContractForm({ action, hotelId, contract, submit }: { action: Act; hotelId: string; contract?: Contract; submit: string }) {
  const c = contract;
  const cur = c?.currency ?? 'EUR';
  return (
    <ActionForm action={action} className="space-y-4">
      <input type="hidden" name="hotelId" value={hotelId} />
      {c && <input type="hidden" name="contractId" value={c.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Contract reference"><input name="reference" defaultValue={c?.reference} className="field" /></Field>
        <Field label="Valid from"><input type="date" name="validFrom" defaultValue={c?.validFrom} className="field num" /></Field>
        <Field label="Valid to"><input type="date" name="validTo" defaultValue={c?.validTo} className="field num" /></Field>
        <Field label="Inventory model"><select name="inventoryModel" defaultValue={c?.inventoryModel ?? 'direct_net'} className="field"><option value="direct_net">Direct net rates</option><option value="direct_commissionable">Direct commissionable</option><option value="request_only">Request-to-book only</option></select></Field>
        <Field label="Rate basis"><select name="rateBasis" defaultValue={c?.rateBasis ?? 'net'} className="field"><option value="net">Net (we add markup)</option><option value="commissionable">Commissionable (hotel pays us)</option></select></Field>
        <Field label="Who collects payment"><select name="collectionModel" defaultValue={c?.collectionModel ?? 'prepaid_to_hb'} className="field"><option value="prepaid_to_hb">Agent pays HotelBridge</option><option value="pay_direct_to_hotel">Guest pays hotel directly</option></select></Field>
        <Field label="Currency"><select name="currency" defaultValue={cur} className="field">{['EUR', 'GBP', 'CHF', 'USD', 'INR', 'AED', 'THB', 'SGD'].map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Commission %" hint="Commissionable contracts"><input name="commissionPct" defaultValue={c ? c.commissionBps / 100 : ''} className="field num" inputMode="decimal" /></Field>
        <Field label="Confirmation"><select name="confirmationMode" defaultValue={c?.confirmationMode ?? 'on_request'} className="field"><option value="on_request">On request — hotel confirms</option><option value="instant_allocation">Instant from allotment</option></select></Field>
        <Field label="VAT in rates"><select name="taxMode" defaultValue={c?.taxMode ?? 'included'} className="field"><option value="included">Included</option><option value="excluded">Excluded — add on top</option></select></Field>
        <Field label="VAT %"><input name="taxPct" defaultValue={c ? c.taxBps / 100 : ''} className="field num" inputMode="decimal" /></Field>
        <Field label="City tax per person/night" hint="Payable at hotel"><input name="localTax" defaultValue={c ? toDecimalString(c.localTaxMinor, cur) : ''} className="field num" inputMode="decimal" /></Field>
        <Field label="Free cancellation — days before arrival" hint="Empty = none"><input name="freeCancelDays" defaultValue={c?.freeCancelDays ?? ''} className="field num" inputMode="numeric" /></Field>
        <Field label="Late cancellation charge"><select name="latePenaltyType" defaultValue={c?.latePenaltyType ?? 'first_night'} className="field"><option value="first_night">First night</option><option value="percent">Percentage</option><option value="full">Full stay</option></select></Field>
        <Field label="Late charge %" hint="If percentage"><input name="latePenaltyPct" defaultValue={c ? c.latePenaltyBps / 100 : ''} className="field num" /></Field>
      </div>
      <div className="flex flex-wrap gap-6 text-[0.88rem]">
        <label className="flex items-center gap-2"><input type="checkbox" name="nonRefundable" defaultChecked={c?.nonRefundable} className="size-4" /> Non-refundable</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="distributionPermitted" defaultChecked={c?.distributionPermitted} className="size-4" /> Contract permits resale to B2B agents</label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Payment terms with the hotel"><textarea name="paymentTerms" rows={2} defaultValue={c?.paymentTerms ?? ''} className="field" /></Field>
        <Field label="Internal notes"><textarea name="internalNotes" rows={2} defaultValue={c?.internalNotes ?? ''} className="field" /></Field>
        <Field label="Signed contract document link" hint="Private storage link"><input name="documentUrl" defaultValue={c?.documentUrl ?? ''} className="field" /></Field>
      </div>
      <SubmitButton>{submit}</SubmitButton>
    </ActionForm>
  );
}
