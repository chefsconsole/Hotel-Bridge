# Centre Point Plus Hotel Pratunam — contract review, 24 Nov 2026

Source: two PDFs from Mr Yossawut Laowicharath (Senior Sales Manager), dated
23 Nov 2026, refs CT26-27 and CT27. Signed by the hotel, awaiting ours.
Reservations: rsvn_pratunam@centrepoint.com · Sales +66 251 8083.

This is **not** Centre Point Sukhumvit 10 (also pending signature). A separate
property, a separate contract.

## What we have been given

Three rate sets, all net THB per room per night, inclusive of 10% service
charge and government tax, non-commissionable:

| Set | Window | Code |
|---|---|---|
| Winter promotion | 1 Nov 2026 – 31 Mar 2027 | WTTA |
| Summer promotion | 1 Apr 2027 – 31 Oct 2027 | SMTA |
| Main contract rate | 1 Nov 2026 – 31 Oct 2027 | — |

**The two promotions together cover the whole main-contract window exactly, and
both are cheaper.** Grand Deluxe twin with breakfast: 3,100 winter / 3,000
summer against 3,900 on the main rate — the main rate is 26–30% higher and
never the one we would book at. So the promos are what should be loaded as
sellable; the main rate belongs in internal notes as the reference that applies
if a promotion is withdrawn.

Both promos are "new bookings only", cannot be combined with any other
promotion, must not be shown on any B2C channel, and the code (WTTA / SMTA)
must be quoted on the booking and the voucher.

## Seasonal surcharges (winter rates)

Per room per night, on top:

- 18–30 Dec 2026 — THB 400
- 31 Dec 2026 — THB 1,000
- 1–3 Jan 2027 — THB 400
- 4–8 Feb 2027 — THB 400

All four fall inside the winter window. Representable as per-room supplements,
the same mechanism as Patong's gala. Note these are **per room**, not per
person, so no child-pricing trap here.

## Two things that must be settled before anything is loaded

**1. A number that cannot be right.** The summer sheet prices Family Connecting
at "110,400" for 7 PAX, between 9,300 for 6 and 12,000 for 8. Almost certainly
10,400 — the winter sheet has 10,300 in the same slot. I have not loaded it and
will not guess a rate: if 110,400 were taken literally we would quote roughly
THB 100,000 a night too much, and if the guess is wrong in the other direction
we absorb the difference. Needs one line of confirmation from the hotel.

**2. The Presidential Suite row is ambiguous.** Every other room gives six
figures (no-breakfast / with-breakfast, for 1-2 PAX, triple and quad). The
Presidential Suite gives "N/A, 7,100, 7,500" (winter) and "N/A, 7,300, 7,700"
(summer) — three values for six slots. It is not determinable from the PDF
which occupancies those two prices belong to. Ask whether 7,100/7,500 is the
1-2 PAX no-breakfast/with-breakfast pair, or the triple pair.

## An engine gap this contract exposes

`rate_periods` carries `price1Minor`, `price2Minor`, `price3Minor` — one, two
and three adults. There is no fourth. But `roomRequestSchema` lets an agent ask
for **4 adults per room**, so today that search silently finds no rate.

Centre Point's Grand Deluxe has a published quad rate (winter 4,900 / 5,300;
summer 4,800 / 5,200). We cannot sell it as the contract is written.

Worse, **Family Connecting is priced by headcount, 4 to 8 PAX** (winter
7,000 / 8,100 / 9,000 / 10,300 / 11,400, all with breakfast). That is five
price points on one room and the rate sheet has no concept of it at all.

So loading this contract fully needs a schema and engine change, not data
entry:

- add `price4Minor` for the quad case — small, additive, and it closes a gap
  that already affects every contract with a quad rate, not just this one;
- decide how a headcount-priced family room is modelled. The cheap option is
  to load Family Connecting as room-only at its 4-PAX price and treat each
  further guest as a per-person supplement (8,100 − 7,000 = 1,100 per extra
  guest, and the steps are not even: 1,100 / 900 / 1,300 / 1,100). That is a
  fudge and would misprice some occupancies. The honest option is occupancy
  pricing as its own small table.

Until then: the four 1-3 PAX room types load cleanly and are sellable; Grand
Deluxe quad and Family Connecting cannot be, and must be quoted by hand.

## Not representable — internal notes only

- **Guarantee Connecting**: THB 500 net per night per 2 rooms. Conditional on a
  request, so it cannot sit in a rate.
- **Group concession**: every 15 paying guests (minimum 8 rooms) earns one
  complimentary half-twin, maximum 2 rooms. Group Desk business, by hand.
- **Early check-in / late check-out**: 50% of the rate before 11:59 or before
  18:00; 100% before 07:00 or after 18:00. Subject to availability, charged by
  the hotel.
- **Allotment**: "negotiated directly with the Travel Agent" — none agreed, so
  this contract is request-only until we have one in writing.

## Terms for the contract record

- Rate basis: net, tax included. Thai service charge and government tax are
  inside the rate.
- Cancellation: main contract charges 1 night for cancellation within 3 days of
  arrival; both promos say 1–3 days before arrival charges 1 night. Early
  check-out and no-show are charged for the full stay.
- Payment: full pre-payment at least 3 days before arrival unless credit terms
  are agreed.
- Child policy: free 0–11 room only, **maximum one child per room**; breakfast
  for a child 4–11 is THB 300 per coupon; 0–3 free. 12 and over counts as an
  adult. So room capacity is max 1 child, and the BB plan carries a 300 child
  charge while room-only carries none.
- Extra breakfast: adult THB 550 (winter) / 540 (summer), child THB 300.
- Stop sales apply automatically on the hotel's email — someone must action
  those into a stop-sell as they arrive.

## Our own address

The contract shows "Mumbai, India" with no street. Our other contracts carry
"Sunrise Charkop, Kandivali West, Mumbai 400067", and the existing Centre Point
contract carries something different again. Still unsettled across the
portfolio — worth fixing once before countersigning more.
