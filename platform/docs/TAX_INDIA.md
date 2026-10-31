# Tax in India for HotelBridge — what to decide with your CA

Research notes from 31 Oct 2026. **Not tax advice.** Most sources found are tax blogs and forums, not CBIC/CBDT notifications, and some contradict each other. Take this page to a chartered accountant (CA) and get each decision below in writing before HotelBridge invoices real money. The platform's invoices are already marked "tax details pending" until then.

## The short version

| Topic | What the research says | Confidence | Decision for your CA |
|---|---|---|---|
| **GST on Indian hotel rooms** | Since **22 Sep 2025**: tariff up to ₹1,000/night 0%; ₹1,001–7,500 **5% without ITC**; above ₹7,500 **18% with ITC**. Older 12% figures online are pre-change. | Medium-high (many sources agree; confirm against the notification) | Which rate applies to each contracted hotel's rooms — the hotel charges it, we must show it correctly to agents |
| **Our model 1 — commission** (hotel pays us %; pay-at-hotel) | GST **18% on the commission/fee only**, not on the room value (SAC 9985). Advance rulings support charging 18% only on the commission when the hotel cost is shown separately. | Medium | Confirm 18% on commission, and how we invoice hotels for it |
| **Our model 2 — net rate + markup** (we sell the room to agents) | Either we act as a **pure agent** (hotel cost passed through; GST only on our margin/fee), or we are **principal** reselling accommodation (GST on the full value at the room rate). It depends on contracts and invoicing. | Low — needs CA | **The big decision.** Pure-agent structure means hotel invoices in the guest's or agent's name and our separate fee invoice |
| **E-commerce operator (Section 9(5))** | Accommodation is a "notified service": an e-commerce operator pays the GST for bookings made through it, notably when the hotel is **unregistered**. Premises above ₹7,500 declared tariff are carved out. Sources disagree on the details. | Low-medium | Are we an "e-commerce operator" under GST? If yes, 9(5) liability for small unregistered hotels, registration, GSTR-3B reporting. **Simplest: contract only with GST-registered hotels.** |
| **GST TCS (Section 52)** | E-commerce operators collect **0.5%** TCS on net taxable supplies by suppliers through the platform (cut from 1% on 10 Jul 2024). | Medium-high | Applies only if we are an ECO and hotels supply "through" us |
| **Income-tax TDS on e-commerce (194-O → now 393(1))** | **0.1%** from 1 Oct 2024 (was 1%), on payments to participants (hotels). Renumbered under the Income-tax Act, 2025 from 1 Apr 2026. | Medium-high | Whether we deduct 0.1% when paying hotels |
| **Hotels outside India** (Thailand, Dubai…) | The room itself is supplied where the hotel is — outside Indian GST. Our commission or fee from a foreign hotel may still be taxable in India depending on the intermediary place-of-supply rules (IGST Act s.13(8)); sources conflict. | Low | GST on our margin/commission for foreign hotels; export-of-service treatment |
| **TCS on overseas tour packages (206C(1G) → 394(1))** | Applies to sellers of an **overseas tour program package**. A CBDT clarification says **hotel-only bookings are not a package**: a package needs at least two components, e.g. flight + hotel. Rates and thresholds changed recently and 2026 sources conflict (5%/20% vs 2%). | Medium on "hotel-only isn't a package"; low on current rates | HotelBridge sells hotels only, so likely outside. **Agents** selling Thailand packages (flights + hotel) to their clients must collect TCS themselves — worth a help note for agents |
| **Agency KYC** | PAN is needed for TDS/TCS and invoices; GSTIN lets GST-registered agencies take input credit on our invoices. | High | Already built: PAN required, GSTIN validated (check digit, matches PAN) |

## Practical rules already in the platform
- Agencies in India must give a **PAN** and upload a **PAN card** before approval; **GSTIN** is validated and the state is read from it (for place of supply).
- Money is kept per currency and never converted silently; foreign-hotel bookings stay in the hotel's currency.
- Invoices and credit notes are numbered, append-only, and marked "tax details pending" until your CA signs off the GST treatment.

## What your CA should set up
1. GST registration of the HotelBridge entity, in the state of the main office (others if needed).
2. Pure agent vs principal for the net-rate model, and the matching invoice formats (we will change the invoice template to match).
3. Whether HotelBridge is an e-commerce operator (and so 9(5), TCS 0.5%, TDS 0.1%) — or whether contracting only GST-registered hotels and invoicing as agent avoids that.
4. GST on commission and margin for **foreign** hotels.
5. A one-paragraph note for agents on TCS for overseas packages they sell themselves.

## Sources
- Hotel room GST slabs (Sep 2025): [TheMunim 2026](https://themunim.com/blog/gst-on-hotel-rooms/) · [Kanakkupillai](https://www.kanakkupillai.com/learn/gst-on-hotel-rooms/) · [Brigade Group](https://www.brigadegroup.com/blog/hospitality/gst-on-hotel-rooms-india) · [Business Standard — HRAWI proposal](https://www.business-standard.com/industry/news/hrawi-proposes-5-percent-gst-hotel-room-rates-itc-benefit-125092401378_1.html)
- Commission / pure agent: [TaxGuru — advance ruling](https://taxguru.in/?p=769936) · [Busy — travel agency GST](https://busy.in/gst-rates/travel-agency) · [Razorpay — GST on tours and travels](https://razorpay.com/learn/gst-on-tours-and-travels/) · [TaxGuru — hotel services outside India](https://taxguru.in/goods-and-service-tax/hotel-accommodation-services-provided-outside-india-attracts-gst.html)
- Section 9(5): [TaxGuru — s.9(5)](https://taxguru.in/goods-and-service-tax/section-9-5-cgst-act-2017-ecommerce-operators.html) · [ClearTax](https://cleartax.in/s/gst-on-notified-services-ecommerce-operators-95) · [West Bengal CT — services through ECO (Apr 2026)](https://comtax.wb.gov.in/GST/GST_PPU/Services%20through%20ECO%20Consolidated%201141FT_20260416.pdf)
- TCS s.52 and TDS 194-O: [Patron — s.52](https://www.patronaccounting.com/blog/tcs-section-52-ecommerce-gst-explained) · [Patron — 194-O](https://www.patronaccounting.com/blog/section-194o-tds-ecommerce-guide) · [TDSMAN — 393(1)](https://blog.tdsman.com/2026/07/tds-on-e-commerce-transactions-section-3931-194o/)
- Foreign hotels / place of supply: [Lakshmikumaran & Sridharan — intermediaries](https://www.lakshmisri.com/insights/articles/intermediary-mediating-required-for-intermediary) · [TaxTMI forum](https://www.taxtmi.com/forum/issue?id=114250)
- Overseas tour package TCS: [TDSMAN — 394(1)/206C(1G)](https://blog.tdsman.com/2026/05/tcs-on-foreign-remittances-and-overseas-tour-packages-section-3941-206c1g/) · [Deloitte — TCS on LRS clarifications](https://www2.deloitte.com/content/dam/Deloitte/in/Documents/tax/Global%20Business%20Tax%20Alert/in-tax-gbt-Clarifications-on-TCS-on-LRS-noexp.pdf) · [Travel Trade Journal](https://traveltradejournal.com/understanding-tcs-on-overseas-tour-packages/)
