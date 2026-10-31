# Hotel B2B Rate Agreement — DRAFT

> **Draft for discussion. Not legal advice.** Have a lawyer review it, and fill every `[bracket]`, before anyone signs. It is written to match how the HotelBridge platform actually works (fixed contracted rates, on-request bookings, a 48-hour answer window, agent wallet refunds), so the contract and the software say the same thing.

**Between**
**[Hotel legal name]**, [address], GSTIN [ ], PAN [ ] (the **Hotel**), operating **[Hotel name]**; and
**[HotelBridge legal entity]**, [address], GSTIN [ ], PAN [ ] (**HotelBridge**).

**Commercial model** (tick one): ☐ **Net rates** — HotelBridge pays the Hotel the net rate and sets its own selling price. ☐ **Commissionable rates** — rates are gross; the Hotel pays HotelBridge **[ ]%** commission.

---

## 1. What this agreement is for
1.1 The Hotel appoints HotelBridge to distribute its rooms to **verified travel agencies only** (a closed B2B network). HotelBridge verifies each agency (including PAN/KYC in India) before it can book.
1.2 HotelBridge will not show the contracted rates to the public or to consumer websites, and requires agencies not to publish them.
1.3 This is not an exclusive agreement for either party unless Annex D says so.

## 2. Rates
2.1 The rates in **Annex A (Rate Sheet)** are **fixed for their validity period**. Any booking HotelBridge sends at an Annex A rate inside its validity is booked at that rate.
2.2 Rates are per room per night for the occupancy and meal plan shown. Child and extra-bed charges are as in Annex A.
2.3 Taxes: rates are ☐ inclusive ☐ exclusive of GST. If exclusive, GST is added at the rate the law sets for the room tariff on the date of supply. Local or city taxes payable by the guest at the Hotel are listed in Annex A.
2.4 Changes to Annex A apply only to **new** bookings, need **[30]** days' written notice, and never affect confirmed bookings.
2.5 Stop-sales and blackout dates are only valid if listed in Annex A or notified in writing **before** the booking request is sent.

## 3. Booking on request — the 48-hour rule
3.1 Every booking is sent **on request** through the HotelBridge partner portal at `[portal address]/partner`, and by email to the reservations address in Annex C.
3.2 The Hotel will **accept** (with its own confirmation number) or **decline** each request within **48 hours** of receipt, or a shorter time where arrival is close (Annex A may set this).
3.3 A request not answered within the time **lapses automatically**. Nobody is charged, and the Hotel has no obligation for a lapsed request.
3.4 Once the Hotel accepts, the booking is **confirmed** at the Annex A rate and the Hotel must provide the room, meal plan and inclusions booked.
3.5 No allotment is guaranteed unless **Annex B (Allotment)** is signed. If Annex B applies, bookings inside the allotment and release period are confirmed instantly.

## 4. Payments
4.1 **Net model — prepaid stays:** HotelBridge pays the Hotel the net amount of each stay within **[ ] days after check-out** against the Hotel's invoice (or before arrival if Annex A says so). The guest pays only the extras they use at the Hotel.
4.2 **Commissionable model — pay at hotel:** the guest pays the Hotel. The Hotel pays HotelBridge **[ ]%** of room revenue for each completed stay, monthly, within **[15] days** of HotelBridge's statement.
4.3 Each party can see the open balance at any time. The Hotel sees its own in the partner portal ("Your account with us").
4.4 Invoices carry the GST details required by law. Each party is responsible for its own taxes.

## 5. Cancellation, changes and no-shows
5.1 The cancellation policy for each rate is in Annex A (for example: free until **[ ] days** before arrival; after that, first night; no-show, full stay).
5.2 The Hotel charges **only** what Annex A allows. Where cancellation is free under Annex A, the Hotel charges nothing and HotelBridge returns **100%** to the agency.
5.3 Changes to dates or rooms are new requests and follow clause 3.

## 6. Service to guests
6.1 The Hotel treats HotelBridge guests like its direct guests.
6.2 **Overbooking:** if the Hotel cannot provide a confirmed room, it will, at its own cost, move the guests to a hotel of equal or higher category nearby, with transport, and tell HotelBridge immediately.
6.3 Special requests (e.g. vegetarian or Jain meals, connecting rooms) are on a best-effort basis unless confirmed in writing.

## 7. Content
7.1 The Hotel gives HotelBridge a non-exclusive licence to use the Hotel's name, descriptions and the images it supplies, to promote the Hotel to agencies for as long as this agreement runs.
7.2 HotelBridge only uses images the Hotel supplies or approves.

## 8. Data protection
8.1 Guest data is used only to deliver the stay and meet legal obligations, under applicable data-protection law (including India's Digital Personal Data Protection Act, 2023). Neither party sells guest data.

## 9. Term and ending
9.1 This agreement runs from **[start]** for **12 months** and renews automatically for 12 months unless either party gives **[30] days'** written notice.
9.2 Confirmed bookings made before it ends are honoured on their terms.

## 10. General
10.1 Liability, indemnity and force majeure: **[to be drafted by counsel]**.
10.2 Governing law: the laws of India. Courts: **[city]**. **[Or arbitration clause, to be decided by counsel.]**
10.3 Notices are given by email to the addresses in Annex C.

**Signed for the Hotel:** _____________ Name / title / date
**Signed for HotelBridge:** _____________ Name / title / date

---

## Annex A — Rate Sheet
Send it as a spreadsheet in exactly this layout (template: [`rate-sheet-template.csv`](rate-sheet-template.csv)). It loads straight into the platform at `/admin/contracts/[contract]` → Import.

| Column | Meaning |
|---|---|
| room_type | Must match the room-type name set up for the hotel (e.g. "Deluxe Double") |
| meal | RO, BB, HB or FB |
| from / to | Season dates (YYYY-MM-DD), `to` = last night |
| price_1_adult / price_2_adults / price_3_adults | Per room per night; leave empty if that occupancy isn't sold |
| child | Per child per night |
| min_stay | Minimum nights |
| release_days | For allotments: days before arrival when unsold rooms go back |

Also state, per rate: taxes included or excluded, city tax, cancellation policy, and the answer window if shorter than 48 hours.

## Annex B — Allotment (optional)
Room type · rooms per night · dates · release days.

## Annex C — Contacts
Reservations (requests and confirmations): name, email, phone, WhatsApp · Accounts (statements, payments) · Sales (rates and contract).

## Annex D — Exclusivity or special terms (optional)
