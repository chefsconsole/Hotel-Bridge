# HotelBridge 2.0: vision, audit and build order

Written 11 Nov 2026 in answer to the "think big" brief. The rules carry over: no invented inventory, rates, bookings or metrics; no buttons that don't work; every phase is built on a branch, shown on a preview link, and goes live only after approval.

## The idea in one line
Most B2B hotel portals are search engines on top of resold API feeds. HotelBridge is a **direct line to the hotel's own sales team, with an operating system around it**. The product should make that difference visible and feel faster than WhatsApp-ing a hotel yourself.

## Audit: the biggest opportunities

| # | What we found | Why it matters | Response |
|---|---|---|---|
| 1 | The agent home was a wall of 7 equal panels. Best-rate offers, the core promise, weren't on it at all. | Agents had to hunt for the offer a hotel had sent them. The "1 hour" promise was invisible at the moment it was kept. | **Today** (built): one ranked list of everything that needs the agent, with hotel offers first. |
| 2 | The greeting used the server's clock (UTC). | It said "Good morning" to an agent in Mumbai at 5 pm. A small thing, but it reads as careless. | Fixed: greetings use India time. |
| 3 | No evidence for "offer within an hour". | A claim without proof is marketing. | **Pulse** (built): the median time hotels actually took to answer *this agent*, from real timestamps. |
| 4 | Phones used a desktop menu behind a "Menu" button. | Agents work from WhatsApp on their phones. | **Tab bar** (built): Today, Search, Best rates, Clients and Bookings, with live badges. |
| 5 | On phones, long single-line text widened the dashboard grid, so the browser zoomed out. | Text was tiny and the tab bar was half off-screen. | Fixed; still to check on the other agent pages (see Next). |
| 6 | The homepage told the story but didn't show it. | First impressions decide whether hotels and agents trust us. | **Homepage v2** (built, on preview): live route map from India to every real destination, a city ribbon, and live demos of the best-rate flow, direct vs chain, and Group Desk. |
| 7 | Hotel pages without licensed photos look empty. | Immersive photography is only allowed with the hotel's permission. | Ask each partner hotel for its media kit, record the licence, then load photos. Until then, design for typography rather than fake imagery. |
| 8 | Group offers were a raw table. | Hard to choose between hotels. | **Offer comparison** (live): cheapest per room-night, coverage, budget, missing terms. |

## Signature experiences (the "who built this?" moments)
1. **The live network map**: the homepage map is drawn from the database, so every partner we add appears on it. *Built.*
2. **Today**: a calm, ranked queue of work. When it's empty, the agent is done. *Built.*
3. **Proof, not promises**: real reply times and real numbers everywhere a claim is made. *Started with Pulse.*
4. **Paste anything**: a WhatsApp enquiry becomes a structured group request. *Built; switches on with the AI key.*
5. **One-tap client message**: from a confirmed booking, a ready WhatsApp message with the voucher link, in the client's language. *Built inside AI tools; next step is surfacing it on "arrives tomorrow" items.*

## Features worth adding (each one saves real time)
- **Offer countdown**: a quoted best rate shows how long it stays valid, so agents accept before it lapses.
- **Accept from Today**: accept a best-rate offer straight from the list, with an undo window, without opening the request.
- **Rate alerts**: "Phuket in February: tell me when a partner hotel quotes under ₹6,000." Built from real quotes, not scraped prices.
- **Client-ready proposal links**: a beautiful, agency-branded page per trip (exists at `/t/<token>`). Next: hotel photos once licensed, and a WhatsApp share button.
- **Hotel response league**: admin-only ranking of partner hotels by reply speed and acceptance, to decide who gets featured.
- **Notifications centre**: the same events that send emails today, shown in the portal with a bell.

## Design system direction
- **Colours:** navy-black (`#060a14`) for the stage, warm paper for work surfaces, gold only for things that matter (the next action, the lowest offer, the live dot).
- **Motion:** one shared motion script (`components/home/home-motion.tsx`) plus CSS. Elements rise in as they scroll into view, counters roll up to their real totals, bar charts grow, and cards lift on hover. All of it switches off for reduced-motion users, and no animation library is used.
- **Layout:** one primary list per screen, with supporting cards beside it. Avoid walls of identical panels.

## Build order
1. ✅ Phase 3: Group Desk board and offer comparison (live).
2. 🟡 Homepage v2 (on preview).
3. 🟡 Agent Today, Pulse, activity and phone tab bar (this branch).
4. Next: hotel search results redesigned around the decision (price, board, cancellation and offer speed side by side), with the same phone fixes.
5. Then: offer countdown and accept-from-Today; notifications centre; commission ledger (once the business-model decision is made).
