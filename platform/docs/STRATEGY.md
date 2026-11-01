# HotelBridge strategy — curated, contracted, on request

Written 1 Nov 2026. Business reasoning plus research; not legal or tax advice. Sources at the end.

## 1. The USP in one line

**Bedbanks give agents every hotel, good and bad. HotelBridge gives agents only the right hotels, at rates fixed for the whole year, confirmed by the hotel within 48 hours.**

| | Bedbank APIs (TBO, Hotelbeds, RateHawk…) | Consortia (Virtuoso, Serandipians) | **HotelBridge** |
|---|---|---|---|
| What you get | Everything, 100k+ hotels, no curation | Curated luxury, mostly perks (upgrade, breakfast, credit) on public/BAR rates + ~10% commission | **Curated four tiers**, contracted **fixed yearly rates**, on request |
| Price | Dynamic, changes daily | Public rate + perks | **Fixed contract rate** — agent can quote a client months ahead |
| Who | Any agent | Agencies paying for membership, mostly US/EU | **Verified Indian & Gulf B2B agencies** (PAN/KYC) |
| Groups | Not their strength | Not their focus | **Automated Group Desk** — hotels asked in minutes, offer in 48h |
| Client tools | None | Proposal tools are separate products | **Client trips, branded PDF, WhatsApp reminders, wallet** built in |

Nobody found in this research combines *curation + fixed annual contracted rates + on-request confirmation + automated groups + agent CRM* for the Indian outbound market. That combination is the moat; any one piece alone is copyable.

## 2. Four tiers — what agents filter by

Every hotel on HotelBridge carries one tier (set in `/admin/hotels`). Agents choose **"Client is…"** when they search — one or several tiers — or leave it on **Any** to see every contracted hotel.

| Tier | Typical hotel | Client | Contract angle |
|---|---|---|---|
| **Smart** | 3.5–4★, big, central, reliable | Value families, student and pilgrim groups | Big inventory (250–600 rooms) → easiest yearly contracts, best group rates |
| **Premium** | Upper 4★ | Comfort-first families, first-time international travellers | Chains' 4★ (Novotel, Courtyard, Holiday Inn Resort, Centara) — brand sales offices sign many at once |
| **Luxury** | 4.5–5★ | Honeymoons, anniversaries, weddings | Commissionable rates common; strong for pay-direct |
| **Ultra-luxury** | The icons (Khyber, Taj Lake Palace, Amanpuri…) | The best address, money no object | Few rooms, low volume — sell on request with commission; relationship-led |

Rule: **no hotel without a contract, no hotel outside a tier.** Thin coverage with excellent hotels beats a long list.

## 3. One booking flow for every hotel

1. Agent searches → sees only contracted hotels in the chosen tier(s), with the fixed contract rate.
2. Books → **request goes to the hotel** (partner screen + email). Hotel has **48 hours** to accept or decline. No answer = lapses, nothing charged.
3. Hotel accepts with its confirmation number → agent has **24 hours to pay** (or wallet). Unpaid → released, no charge.
4. Cancellation per the hotel's terms, shown in large type everywhere; refunds land in the agent's **wallet** instantly.

All of this is built and tested in the platform.

## 4. Commercial models — keep both, prefer commission where it fits

| Model | How money moves | Best for | Tax (see TAX_INDIA.md — CA to confirm) |
|---|---|---|---|
| **Net + markup** | Hotel gives us a net rate; we add a markup (pricing rules); agent pays us; we pay the hotel | Smart/Premium, high volume, hotels that won't pay commission | We resell the stay: GST treatment of the full value vs. our margin needs the CA's decision (pure agent vs principal) |
| **Commission** | Hotel gives a gross contract rate and pays us X% | Luxury/Ultra, and **all hotels outside India** | **Foreign hotels:** since **30 Mar 2026** the IGST "intermediary" rule (s.13(8)(b)) is gone — commission from a hotel abroad can be a **zero-rated export** if paid in foreign currency and the other export conditions are met. **Indian hotels:** 18% GST on the commission. |

Recommendation:
- **Outside India (Thailand, Dubai, Bali, Europe…): ask every hotel for commission first.** It is tax-efficient after the 2026 change and simpler (no hotel payable risk). Fall back to net + markup only where the hotel insists.
- **Inside India:** either model; commission is simplest for Luxury/Ultra, net + markup for Smart/Premium volume.
- The platform supports both on the same contract screen (`Rate basis`: net or commissionable; `Who collects`: us or the hotel).

## 5. Groups — automated Group Desk (built)

1. Agent sends a group request — or pastes the client's WhatsApp/email and **AI fills the form** (needs the Claude key) — with city, dates, rooms, meals and the **tier**.
2. The system **immediately asks our contracted group hotels in that city** (up to 4, in that tier). If we have none there, it asks **up to 15 hotels from Hotel outreach** that have a contact email.
3. Each hotel gets an email with a **private reply link** (no login): it quotes rates per room type or declines, within **48 hours**. Unanswered requests lapse.
4. When every city has an offer, the system **builds the agent's offer** — best offer per city + group markup (default 8%, set in Pricing & settings) — and sends it, **held for 48 hours**.
5. The Group Desk still sees everything, can override, rebuild or ask more hotels with one click.

Email goes out through Resend once `RESEND_API_KEY` and `EMAIL_FROM` are set. Until then every email is recorded as **Not sent** (Admin → Emails) and the reply links can be sent by hand — the system never pretends.

## 6. Which hotels to sign first

- **Big hotels sign yearly fixed-rate contracts most easily** (they need base volume, especially Sun–Thu and shoulder season). Research list now has room counts for 26 large hotels (250–2,561 rooms) in Pattaya, Bangkok, Phuket, Bali, Singapore and KL — start Smart/Premium there.
- **Chain sales offices** (Centara, Accor, Marriott, IHG, Hilton, Radisson, IHCL) can open many properties in one conversation.
- **Icons** are signed one by one, on request with commission.
- Industry practice for fixed-rate wholesale deals: rates fixed for the contract period, optional allotment with a release period (often 7–21 days), and market-movement clauses that hotels increasingly ask for — our on-request model needs **no allotment**, which makes saying yes easier for hotels.

## 7. The pitch to hotels (one paragraph)

> "HotelBridge sells your hotel only to verified Indian and Gulf travel agencies, at a rate you fix with us for the year. Every booking reaches you as a request in your own partner screen — you accept or decline within 48 hours; no allotment, no rate parity issues, your public rates are never shown. You see arrivals, revenue and what we owe you (or the commission due) at any time. For groups, requests arrive with a one-minute reply link. Commission or net — your choice."

Templates: `outreach/EMAILS.md` §7 and `contracts/HOTEL_RATE_AGREEMENT.md`.

## 8. What would make this a very large company

1. **Density before breadth:** 20–40 excellent contracted hotels per top destination, across the four tiers, beats 100k bedbank listings for Indian agents.
2. **Groups as the wedge:** weddings, MICE and family groups from India are high-value and badly served; the automated Group Desk answers in 48 hours where others take a week.
3. **Agents' daily tool:** client trips, branded plans, reminders and the wallet make HotelBridge where agents run their business — not just where they book.
4. **Data:** every search, request and answer shows where demand is and which hotels perform — the basis for better contracts every year.

## Sources
- Section 13(8)(b) omitted by Finance Act 2026: [Grant Thornton](https://www.grantthornton.in/insights/articles/gst-on-intermediary-services/) · [TaxGuru](https://taxguru.in/goods-and-service-tax/gst-intermediary-services-section-13-8-b-removed-means-indian-exporters.html) · [CAclubindia — w.e.f. 30 March 2026](https://www.caclubindia.com/articles/a-new-era-for-place-of-supply-of-intermediary-services-exports-vs-imports-of-services-wef-march-30-2026-55072.asp)
- Curated networks: [TourMaG — Serandipians vs Virtuoso](https://www.tourmag.com/Serandipians-qui-est-ce-reseau-cree-par-un-Francais-qui-concurrence-Virtuoso-%F0%9F%94%91_a121134.html) · [Hospitality.today — consortia and independents](https://www.hospitality.today/article/beyond-the-rfp-how-independent-hotels-reach-the-high-value-leisure-traveler) · [Virtuoso](https://www.virtuoso.com/why-virtuoso)
- Fixed-rate wholesale contracts: [Wikipedia — Allotment](https://en.wikipedia.org/wiki/Allotment_(travel_industry)) · [DMC Quote — allotment contracts](https://dmcquote.com/blog/post/hotel-allotment-contracts-negotiating-terms) · [Tourism Update — Protea and static rates](https://www.tourismupdate.com/article/proteas-push-for-dynamic-rates-knocking-out-tour-ops)
- Room counts: see HOTEL_TARGETS.md sources.
