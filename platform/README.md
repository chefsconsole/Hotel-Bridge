# HotelBridge platform

The B2B booking platform: agent portal, contracted-hotel engine, booking lifecycle, Group Desk, hotel partner view and the founder/operations console. It lives beside the existing marketing site and internal CRM (`../frontend`), which it does not touch.

```bash
npm install
cp .env.example .env.local   # HB_ENV=development, HB_DEMO=1
npm run seed:demo            # fictional sample hotels/agencies — logins are listed at the top of scripts/seed-demo.ts
npm run dev                  # http://localhost:3050
npm run check                # types + lint + 61 tests
```

## Architecture

A modular monolith: Next.js 16 (App Router, server actions) + PostgreSQL via Drizzle.

| Layer | Where | Rule |
|---|---|---|
| Domain (pure) | `lib/domain/` | money, pricing engine, contract engine, cancellation, booking state machine, rate comparison, scenario model. No I/O. |
| Suppliers | `lib/suppliers/` | Every inventory source is an adapter that declares its capabilities. `contracted` = our own contracts; `sandbox` = simulated, never loaded in production. |
| Services | `lib/services/` | All business rules, tenant scoping and authorisation. Framework-free, tested directly. |
| UI | `app/`, `components/` | Server components read through services; mutations are server actions. No price is ever taken from the browser. |

**Database.** Without `DATABASE_URL` it runs embedded PostgreSQL (PGlite) in `.data/pg`, opened lazily and single-process (stop the app before running scripts). With `DATABASE_URL` it uses any Postgres (Supabase, Neon, RDS); run `npm run db:migrate` on deploy. On Vercel/Netlify it refuses to start without `DATABASE_URL`.

### Decisions worth knowing

- **Money** is integer minor units plus an explicit currency; percentages are basis points. Totals are never added across currencies. FX conversion exists (`convert`) and needs a recorded rate.
- **Markup vs margin**: markup is on cost, margin on selling price. Both are stored with every booking's frozen breakdown.
- **Booking safety**: the booking row is written before the supplier is called, under a unique (agency, idempotency key). Double-submits return the same booking. A supplier timeout becomes `outcome_unknown` and is resolved only by looking the reservation up (reconcile), never by booking again. Prices are revalidated at checkout; any change must be re-accepted.
- **Reservation and payment states are separate.** Prepay bookings hold contracted allotment until a deadline, then release automatically (no charge). Credit is off by default and needs a recorded finance approval.
- **Ledger** (`ledger_entries`, `invoices`, `booking_events`) is append-only, enforced by database triggers. Cancellations post reversals and fees; nothing is edited.
- **Tenant isolation** is enforced in services (every agent query is scoped to the actor's agency; other agencies' records return "not found"). Partners see their own hotel's reservations with the amount owed to them — never our selling price or margin.
- **Contracts** can't be activated without loaded rates, a published hotel and explicit permission to distribute to B2B agents. Commercial edits to a live contract send it back to draft for re-approval. All changes are audited.

## The four journeys (verified in the browser)

1. **Agent** — creates a client trip, adds hotels and extras, books every hotel at once, shares a branded plan and chases payment (see Client trips) — or registers (pending until verified) → searches with mixed rooms (e.g. 2+2+1 adults, children with ages) → compares instant vs on-request, cancellation dates, VAT and city tax → checks out (revalidated) → tracks status, voucher (confirmed only), invoice, cancel with the charge shown first, amendments, Group Desk, support.
2. **Admin** — creates hotels, room types, contracts, rates (form or CSV import), restrictions and allotment; previews agent prices; verifies agencies; sets credit and pricing rules; records payments/refunds; reconciles unknown outcomes; runs Group Desk (hotel enquiry emails → offers → proposal with margin → send).
3. **Hotel partner** — confirms or declines requests with its own confirmation number; sees its reservations.
4. **Founder** — `/admin`: registered/verified/active agencies, searches, conversion, created vs confirmed bookings, GBV / supplier cost / net revenue per currency, repeat and cancellation rates, supplier failure rate, group conversion and time-to-proposal, open obligations from the ledger, hotel concentration, and a prioritised list of operational issues. `/admin/scenarios` models 100 / 1,000 / 10,000 agencies (scenarios, not forecasts).

## Client trips (the agent's own CRM)

`/agent/trips` and `/agent/clients` — every enquiry becomes a trip for one of the agency's clients:

- **Pipeline** (new enquiry → proposal sent → booked → travelled), lead source, and a **follow-up** date per lead (due follow-ups on the overview and as a menu badge).
- **One package price**: hotels added from search ("Add to trip", price re-checked) plus flights, visa, transfers, tours the agency sells itself. Shows hotels vs other share, the client price vs our price, and the agent's profit where costs share the trip currency (no invented FX).
- **Book all hotels** in one click — each through the normal booking lifecycle with a key derived from the item, so a double click never books twice; a changed price is held back for review.
- **Client payments** (the agency's own records, not our ledger), pending and overdue per trip, and a **reminder** with an editable amount for WhatsApp / email / copy — opened on the agent's phone, never sent silently.
- **White-label trip page and PDF** at `/t/<token>` with the agency's brand (set in Agency profile) — never HotelBridge, net rates or internal references; the client can **approve** the plan there. The link can be turned off or replaced.

Logic: `lib/domain/trip.ts` (pure), `lib/services/trips.ts`, tests in `tests/trips.test.ts`. Supplier, chain and premium-hotel research: `docs/DISTRIBUTION_PLAN.md`; outreach drafts: `docs/outreach/EMAILS.md`.

## Contracts, wallet, KYC, tracker, team

- **Fixed-rate, on-request contracts:** a hotel has **48 hours** (per contract, 1–72h) to accept or decline each request in its partner view; unanswered requests lapse automatically with no charge (`lapseUnansweredRequests`, run on every console load until a scheduler exists). Ops is alerted 12h before a window closes. Draft agreement and rate-sheet template: `docs/contracts/`.
- **Cancellation terms up top:** checkout and booking pages show a large free-until box; the cancel button states exactly what goes back.
- **Agency wallet:** a paid booking cancelled inside the free window credits 100% to the agency wallet instantly (after the window: everything except the hotel's penalty). Agents pay held bookings from the wallet or ask for a bank payout; finance records payouts. Built on the append-only ledger (agency rows with no booking), serialised per agency with an advisory lock.
- **Agency KYC:** Indian agencies give PAN (format-checked) and upload a PAN card; GSTIN is validated (check digit, matches PAN, state). Files are type-checked by their bytes, max 4 MB, readable only by staff and the agency (`/documents/[id]`). Approval is blocked until KYC is complete; declining needs a reason.
- **Arrivals & hotels** (`/admin/tracker`): today / tomorrow / 7 / 30 days, FIT vs Group Desk groups, and per hotel the volume, our revenue, what we owe it and the commission it owes us; finance records settlements. Hotels see their own arrivals and account in `/partner`.
- **Team** (`/admin/team`): admin, operations, sales & contracting, finance — each sees its own menu and the services enforce the same rules; the last active admin can't be removed.
- **Tax:** `docs/TAX_INDIA.md` — GST/TCS/TDS research and the decisions a CA must make before real invoicing.

## Insights and AI

- **Insights** (`/agent/insights`, `/admin/insights`) are counted from real searches and bookings: demand per destination, empty searches, search→booking conversion, lead times, hotel production and hotel response times, agency leaderboard, agencies gone quiet, and destinations agents asked for that we don't sell.
- **AI toolbox** (Claude, model `claude-opus-5-5`, via `lib/ai/`). Agents: describe-the-stay search, client WhatsApp/email drafts (never mention HotelBridge or net rates), client brief → pre-filled group request, help answers. Staff: founder weekly brief, hotel rate-offer reader on each contract page (output goes into the import box for validation — never imported automatically). Every call is grounded in our records, rate-limited per user (`HB_AI_HOURLY_LIMIT`, default 40/hour), logged in `ai_usage`, and uses the API's server-side refusal fallback. Without `ANTHROPIC_API_KEY` the tools show "not connected" and everything else works.

## Rate sources for Thailand and India-outbound destinations

Recommendation, in order — each needs a commercial agreement that permits onward B2B distribution before any code is written:

1. **Direct contracts** with the hotels you already know (this platform's contract engine) — best margin, and the core of the model.
2. **TBO Holidays** — India-based B2B bedbank, widely used by Indian agents, strong in Thailand, UAE and South-East Asia.
3. **WebBeds (incl. DOTW)** — strongest for Dubai / the Gulf, with Asia coverage.
4. **Hotelbeds** or **RateHawk** — broad global reach for Europe and long-tail destinations.
5. **Direct hotel connectivity** through the hotels' channel manager (STAAH is widely used in Thailand; also SiteMinder) — live rates for your contracted partners, with each hotel's consent.

Priority destinations from 2025 Indian outbound data: Thailand (Bangkok, Pattaya, Phuket, Krabi), Dubai/UAE, Singapore, Vietnam, Bali, Malaysia. Demo data now includes fictional sample hotels in Bangkok, Pattaya and Phuket priced in THB (Thai "++" pricing modelled as 17.7% taxes on top).

## Not connected yet — needs you

| Area | Status | What is needed |
|---|---|---|
| AI tools | Built; off until a key is set. | `ANTHROPIC_API_KEY` on the server (usage is billed by Anthropic). |
| Real hotels & rates | None loaded. Demo data is fictional and tagged "Sample". | Enter contracted partners through `/admin/hotels` (partner data stays out of the repo). |
| Production database | Embedded locally only. | A Postgres `DATABASE_URL` (e.g. Supabase/Neon) and a host. |
| Third-party suppliers (Hotelbeds, TBO, RateHawk, channel managers) | Interface ready; no adapters. | Commercial agreements confirming onward distribution, API credentials, then one adapter each in `lib/suppliers/`. |
| Payments | Recorded manually by finance (bank transfer). No card processing. | Choose a provider (e.g. Stripe/Razorpay) and its hosted checkout; never store card data. |
| Email | Hotel enquiries and support replies are generated, not sent; the UI says so. | An email provider (e.g. Resend/Postmark) and verified sending domain. |
| Invoices & tax | Commercial documents only, flagged "tax details pending". | Legal entity, tax registrations and accountant review of VAT/GST treatment. |
| Legal pages | Plain-language drafts flagged "pending legal review". | Counsel review; contracting entity and governing law. |
| Photography | Deliberate placeholder treatment; licensed image URLs can be added per hotel. | Images with written permission from each hotel. |
| Scheduled jobs | Unpaid-hold expiry and reconciliation run on demand from `/admin`. | A cron calling them (e.g. Vercel Cron) once deployed. |
| Password reset, 2FA, rate limiting beyond login | Login throttling only. | Email provider first, then reset flow. |

This is a working first release on demo data, not a production launch: it has not been load-tested, security-reviewed or run against a real supplier.
