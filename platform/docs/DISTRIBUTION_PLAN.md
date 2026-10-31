# HotelBridge — how we get great rates, and how we grow

Written 31 Oct 2026. Research notes, not legal or financial advice. Every supplier term below must be confirmed in writing with that supplier before anything is built or sold. Sources are at the end; where only vendor or trade-press pages were found, it says so.

---

## 1. The short answer

There is no single "API with the best rates". The best margin comes from **layering four sources**, each doing a different job:

| Layer | What it gives us | Who | Effort | When |
|---|---|---|---|---|
| **A. Direct contracts** (our own contract engine — already built) | The best net rates, allotments, our own exclusives. This is the moat. | Premium & heritage hotels in our top destinations; strong 4★/5★ independents | Sales effort, per hotel | Now |
| **B. Wholesale bedbank APIs** | Instant breadth: 100k+ hotels so agents never hear "we don't have it" | TBO (India-strong), Ottila (India-focused, Dubai-based), WebBeds/DOTW (Gulf), RateHawk, Hotelbeds | One integration each, certification | Months 1–6 |
| **C. Chain wholesale programmes** | Chain-negotiated wholesale rates for Marriott / Hilton / Accor etc. — usually reached *through* a bedbank or a wholesale portal, not a startup-to-chain API on day one | Marriott wholesaler programme, Hilton & Accor B2B partners | Commercial relationship first | Months 6–18, once volume exists |
| **D. Channel-manager connectivity** | Live rates/availability from contracted hotels without manual loading | STAAH (big in Thailand & India), SiteMinder, AxisRooms, eZee | Per hotel consent | After 10–20 direct hotels |

**Recommended order:** 1) sign 20–40 direct contracts in the top 8 destinations, 2) integrate **TBO** first (fastest coverage for Indian agents, India + Thailand + UAE), 3) add **Ottila** (India-focused wholesaler, strong Middle East) and/or **RateHawk** or **WebBeds** as the second source for price competition, 4) chain programmes once there is booking history to show.

**About "API keys":** none of these are public. Every supplier issues sandbox and production keys only after a signed agreement, a company check and (usually) certification of our booking/cancel flow. We cannot "find" keys — we apply for them. The platform is ready for them: each supplier becomes one adapter in `lib/suppliers/` with its own capabilities, timeouts and reconciliation.

---

## 2. Wholesale APIs (Layer B) — what we found

| Supplier | Strength for our clients | How access works (as found) | Confidence |
|---|---|---|---|
| **TBO (TBO Tek / TBO Holidays)** | India-based; very widely used by Indian agents; strong in Thailand, UAE, SE Asia. TBO reports 147k+ agents on its platform. | Open an account, request hotel API access; TBO decides which hotels, rates and booking rights the account receives; test environment then go-live. | Medium — official page for scale; process from integrator pages |
| **RateHawk (Emerging Travel Group)** | Broad global inventory, net rates + our markup; good Europe coverage | Official docs: B2B API v3, sandbox, certification; production keys only after integration review; IP allow-listing; B2B vs affiliate payment types; no published API fee — sign an API agreement | **High** (official docs) |
| **WebBeds (incl. DOTW)** | Gulf/Dubai strength (DOTW), plus Europe brands (JacTravel, Sunhotels…) | API partnership via commercial team | Medium (trade press, integrator pages) |
| **Hotelbeds (APItude)** | One of the largest bedbanks; aimed at trade buyers (tour operators, B2B) | Developer portal; documented onboarding path from test to production; JSON/REST | Medium (official 2020 material — may have changed) |
| **Expedia Partner Solutions (Rapid)** | Huge inventory; strict display rules | Not public; EPS approves each partner, sandbox then certification; B2B launch requirements (e.g. how booking charges are labelled). TAAP (agent portal, not API) needs IATA/CLIA/TRUE credentials | **High** for requirements (official developer page) |
| **Ottila International** (B2B site: hotelrack.com) | Dubai-based wholesaler founded 1997; about 70% of its business is B2B hotel sales in India, also Middle East, Sri Lanka, Africa. Advertises hotel API connectivity (direct or via channel manager) and 24/7 operations; STAAH partnership (2024); listed as a Juniper client. Inventory claims vary by source (150k+ to 500k+ hotels). | No public API docs found — contact Ottila's sales team for an API agreement | Medium (press releases, partner pages) |
| **Booking.com Demand API** | Huge inventory, strong brand | Official prerequisites: must be a **Managed Affiliate Partner**; an Account Manager grants Partner Centre access after a signed contract; then an API key + affiliate ID. No open signup. Per a third-party guide, search access ≠ booking rights — booking needs separate approval. Built for affiliates more than net-rate wholesale. | High for prerequisites (official docs) |
| Tripjack, TravClan, GRN Connect, Rezlive | India B2B portals/aggregators — competitors as much as suppliers | Not researched in depth; terms change — check directly | Low |

**Typical Indian B2B stack** (per an integrator guide, unverified): one global bedbank + one India-strong bedbank (TBO) + one aggregator. That matches our order.

**What every supplier will ask us for:** company registration + GST, PAN, directors' KYC, bank details, expected monthly volume, target markets, B2B/B2C model, how we take payment, support coverage, and for some (Expedia TAAP) IATA/TIDS or similar accreditation. **Action:** get the legal entity, GST and an IATA TIDS code in place first.

---

## 3. Hotel chains (Layer C)

- **Marriott** runs a wholesaler platform (built with Sabre) giving *authorised* wholesalers real-time rates for thousands of properties. We would apply as a wholesaler once we have volume.
- **Hilton** has direct connections with wholesalers and TMCs (e.g. through Amadeus; an Asia B2B group announced a Hilton direct connect in 2022).
- **Accor** distributes B2B through partners such as Hotelbeds and has said B2B is fundamental to the group.
- **Radisson** connected its EMMA reservation system directly to the Amadeus Travel Platform by API ("Radisson Direct Connect", reported Feb 2026), so agencies on Amadeus see real-time Radisson rates. It also restarted its **India B2B sales roadshow** (75 cities in India, more opening) to rebuild ties with B2B partners. No public India wholesaler API programme found — start with Radisson's India sales team.
- **IHG / Hyatt:** not researched here — same approach: wholesale/B2B team, usually via a bedbank or GDS first.

**Honest view:** chains do not hand a direct API to a new distributor. The realistic path is (1) sell their hotels through bedbanks now, (2) show 6–12 months of volume per chain, (3) then negotiate a wholesale agreement or a direct connect. Locally, **hotel-level sales managers** (e.g. the Phuket or Dubai property) can give group and static net rates much sooner — that is Layer A.

---

## 4. Premium hotels to approach directly (Layer A)

The full list is now **[HOTEL_TARGETS.md](HOTEL_TARGETS.md) — 170 hotels in 20 destinations, 159 web-checked** — with a working tracker **[hotel-targets.csv](hotel-targets.csv)** (status, contact, next step, rate type). Covered:

- **India:** Kashmir, Udaipur, Jaipur, Jodhpur/Jaisalmer/Ranthambore, Shimla/Manali/Rishikesh/Agra, Goa, Kerala, Ooty/Coonoor/Coorg/Kabini, **East & North-East** (Darjeeling, Gangtok, Pelling, Puri, Shillong, Kaziranga), Andaman.
- **International:** Bangkok, Phuket/Krabi, Pattaya, Dubai, Sri Lanka, Vietnam, Maldives, Bali, Switzerland, Paris/London.

Targets, not partners — no rates implied. Contacts come from each hotel's official site or brand sales office, recorded in the tracker. East India and Shillong/Kaziranga have fewer true luxury options; there the list leans on the best available 4–5★.

**Brand shortcut:** IHCL (Taj, Vivanta, SeleQtions), Oberoi, ITC, Marriott, Hilton, Accor, Hyatt, Radisson, Anantara and Centara all have India or regional sales teams — one meeting can open many properties. Independents (Khyber, Suryagarh, Evolve Back, Amangalla, Rayavadee…) are one-by-one.

## 5. What we took from travel CRMs and lead tools

Compared: Telecrm, Sembark, Zoho/HubSpot/Pipedrive-style pipelines, Travefy, Safari Portal, Tern, TBO's agent portal, TravClan. Kept only what is simple and useful — **all built and live in the agent portal now**:

| Idea (seen in) | What we built |
|---|---|
| Lead pipeline with stages (Pipedrive/HubSpot/Telecrm) | **Client trips** with stages: New enquiry → Proposal sent → Booked → Travelled / Cancelled |
| "Next activity" on every lead (Pipedrive/Telecrm) | **Follow-up date + note**; due follow-ups on the overview and as a badge in the menu |
| Lead source tracking (Sembark/Telecrm) | **Lead came from**: WhatsApp, Instagram, referral, repeat, walk-in, website |
| Branded proposals / client portal (Safari Portal, Travefy) | **White-label trip page + PDF** with the agency's logo/name — never HotelBridge, never net rates |
| Client approves online (Safari Portal/Tern-style) | **"Approve this plan"** button on the shared page; agent sees "Client approved" |
| Itinerary templates (Travefy) | **Duplicate trip** — re-quote a package in one click |
| Profit per file (Sembark) | **Your profit** per line and per trip (only where costs share the trip currency — no invented FX) |
| WhatsApp-first communication (Indian CRMs) | **WhatsApp / email / copy** for the plan and reminders — opens on the agent's own phone, nothing sent silently |
| Payment tracking & reminders | **Client payments**, pending and overdue per trip, **reminder with editable amount** |
| Net + markup (TBO, TravClan) | Hotel shows **our price to you** next to **client pays**; agent sets the markup |

Not built (complex, low value now): marketing automation, call recording, chatbots on WhatsApp Business API (needs Meta approval and a paid provider — next step if wanted), accounting/GST invoices for the agent's own clients (needs accountant review).

---

## 6. A realistic path to scale ("the $1B plan")

A billion-dollar outcome in B2B hotel distribution means roughly **US$1B of yearly booking value (GBV)**, which at a 6–10% net take is US$60–100M of net revenue. Those are illustrative assumptions — the app's **/admin/scenarios** models 100 / 1,000 / 10,000 agencies with your own inputs. Stages:

1. **Prove (0–6 months):** 50 verified agencies, 40 direct contracts in 8 destinations (Thailand ×3, Dubai, Bali, Kashmir, Rajasthan, Kerala), TBO live. Target: agents rebook every month; hotel confirmations in < 2 hours.
2. **Repeatable (6–18 months):** 500 agencies; second bedbank; Group Desk as a profit centre (weddings, MICE); channel-manager live rates for top 50 hotels; credit lines for the best agencies (with finance approval).
3. **Scale (18–36 months):** 5,000+ agencies across India tier-2/3 cities and the Gulf; chain wholesale agreements backed by volume; exclusive allotments in peak dates (Diwali, Christmas, May–June); white-label trip tools become the reason agents stay.
4. **Moat:** curated contracts + agents' client data living in our trip tools + fast, honest operations. Price alone is not a moat — bedbanks sell the same rooms.

Key metrics to watch (already on `/admin`): verified → active agencies, search → booking conversion, confirmed vs created bookings, net revenue per currency, hotel response time, cancellation rate, supplier failure rate.

---

## 7. Start selling — the next 14 days

Selling can start **before** any API: agents already search, quote, build client trips and book contracted hotels on the platform. What's missing is real hotels and a real host.

| Day | Do | Who |
|---|---|---|
| 1–2 | Company basics ready to send: legal entity, GST, PAN, bank letter, one-page company profile. Apply for IATA TIDS. | You |
| 1–3 | Put the platform online: a Postgres database (Supabase/Neon) + a host (Vercel), a domain like `app.hotelbridge.co`. | You + Claude |
| 2–5 | Send the API requests (TBO, Ottila, RateHawk, WebBeds) using `outreach/EMAILS.md`. Each takes weeks — start now. | You |
| 3–10 | Work the P1 rows in `hotel-targets.csv`: ~40 conversations, aim for 10 signed B2B rate sheets. Load each in `/admin/hotels` → contract → rates. | You (sales), Claude can help load CSV rate sheets |
| 5–10 | Invite 20 agencies you know; verify them in `/admin/agencies`. Show them Client trips — the branded plan + reminders is the hook. | You |
| 10–14 | First bookings on contracted hotels (prepaid, bank transfer). Group Desk for anything not yet contracted. | Agents + you |

Before going live with real money: payments provider (Razorpay/Stripe hosted checkout), an email provider for confirmations, and an accountant's review of invoices/GST — see the README's "Not connected yet" table.

## 8. Next steps that need you

1. Company basics: legal entity, GST, bank account, IATA TIDS (or equivalent) — suppliers ask for these first.
2. Approve the outreach emails in `docs/outreach/` (TBO, Ottila, RateHawk, WebBeds, Hotelbeds, Expedia Partner Solutions, Marriott/Hilton/Accor/Radisson wholesale, channel managers, premium hotel template). Fill in the company details, then send from your own email — or ask Claude to create Gmail drafts for you to review.
3. Work the P1 rows of `hotel-targets.csv` (section 4).
4. Load signed contracts through `/admin/hotels` (partner data stays out of the repo).

---

## Sources

Supplier access
- [ETG / RateHawk API — integration requirements (official docs)](https://docs.emergingtravel.com/docs/integration-requirements/)
- [Expedia Rapid — B2B standalone launch requirements (official)](https://developers.expediagroup.com/rapid/resources/reference/b2b-standalone)
- [TBO platform (official)](https://tbo.com/tbo-Platform)
- [Booking.com Demand API prerequisites (official)](https://developers.booking.com/demand/docs/getting-started/prerequisites) · [Vorp Labs guide (third party)](https://vorplabs.com/agent-tools/booking-demand-api)
- Ottila: [Trip Affiliates profile](https://www.tripaffiliates.com/About-Us/News-Room/Otilla-International) · [STAAH partnership (10min Hotel, 2024)](https://en.10minhotel.com/2024/10/07/staah-partners-with-b2b-online-trendsetter-ottila-international) · [Expedia Partner Solutions case study](https://expediapartnersolutions.com/resources/research/case-study/partner-case-study-ottila-international) · [Juniper client page](https://ejuniper.com/en/clients/ottila) · [TravelgateX collaboration](https://blog.travelgate.com/en/expanding-ottila-international-dmc-globally-a-collaboration-with-travelgatex) · [Technoheaven integration (vendor)](https://www.technoheaven.com/ottila-api-integration.aspx)
- [Hotelbeds API portal launch (official, 2020)](https://www.hbxgroup.com/news-room/press-release/hotelbeds-continues-innovate-launch-api-portal) · [Hotelbeds onboarding PDF](https://cms.hotelbeds.com/en-na/hotelbedsapi/api/v1/pdf/node/2652) · [AltexSoft on Hotelbeds API](https://www.altexsoft.com/blog/hotelbeds-api-integration/)
- [AltexSoft on Expedia TAAP / Rapid](https://www.altexsoft.com/blog/expedia-taap-rapid-api-partner-solutions)
- Integrator pages (indicative only): [PHPTRAVELS TBO](https://phptravels.com/de/integrations/tbo-api-integration), [PHPTRAVELS RateHawk](https://phptravels.com/integrations/ratehawk-api-integration), [PHPTRAVELS WebBeds](https://phptravels.com/blog/how-webbeds-api-integration-works), [Vervotech India](https://www.vervotech.com/hub/regional/hotel-api-india/), [Vervotech DOTW](https://www.vervotech.com/hub/master-suppliers/dotw/)
- [Webjet acquires DOTW (TTG)](https://www.ttgmedia.com/news/webbeds-owner-webjet-lands-173m-destinations-of-the-world-acquisition-15963)

Chains
- Radisson: [Hospitality Net — Radisson × Amadeus direct API](https://www.hospitalitynet.org/news/4130871/radisson-hotel-group-and-amadeus-launch-direct-api-connectivity-to-modernize-hotel-distribution) · [Travolution — EMMA CRS to Amadeus](https://www.travolution.com/news/radisson-connects-its-emma-crs-to-amadeus-via-api/) · [Travel Trade Journal — India roadshow](https://traveltradejournal.com/radisson-hotel-group-revives-india-sales-roadshow-after-five-year-hiatus/)
- [Hilton–Amadeus API agreement (Travolution)](https://www.travolution.com/news/amadeus-and-hilton-have-reached-an-agreement-for-better-api-connectivity)
- [MG Group direct connect with Hilton (2022)](https://www.mgholidaygroup.com/post/mg-group-s-announce-the-direct-connect-partnership-with-hilton-to-drive-growth-for-asia-s-b2b-travel)
- [Hotelbeds × Accor B2B platform (Journal des Palaces)](https://www.journaldespalaces.com/communique-61855-hotelbeds-devient-partenaire-lancement-nouvelle-plateforme-distribution-innovante-accor-.html) · [Accor & distribution (L'Echo touristique)](https://www.lechotouristique.com/article/accor-veut-aussi-se-rapprocher-de-la-distribution,42627)
- Marriott wholesaler platform: trade-press summary found via [eHotelier wholesalers](https://insights.ehotelier.com/tag/wholesalers/) — confirm current status with Marriott.

CRM / agent tools
- [Techjockey: travel CRMs in India 2026](https://www.techjockey.com/blog/best-travel-crm) · [ZentrumHub: travel agency software India 2026](https://www.zentrumhub.com/blog/best-travel-agency-software-india/) · [ClickUp: travel agency CRMs](https://clickup.com/blog/travel-agency-crm/)
- [G2: Safari Portal vs Travefy](https://g2.com/compare/safari-portal-vs-travefy) · [Safari Portal CRM](https://www.safariportal.app/travel-crm-contact-management-custom-forms) · [Capterra: Travefy](https://www.capterra.in/reviews/148927/travefy-agent)
- [TravClan alternative comparison](https://dmcquote.com/compare/travclan-alternative)
