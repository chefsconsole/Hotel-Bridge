# HotelBridge portal: design direction and build plan

This plan answers the "next-generation hospitality platform" brief (11 Nov 2026), checked against the portal as it actually is. Rules carried over from the brief: no invented metrics, no buttons that don't work, and no feature shown before its backend exists. Every phase is built on a branch, shown on a preview link, then goes live only after approval.

## 1. What already exists (audit)

| Brief asks for | Status today | Where |
|---|---|---|
| Warm off-white surfaces, ink text, refined status colours | ✅ Design tokens exist | `app/globals.css` (`--color-paper`, `--color-ink`, `--color-positive`, …) |
| Premium type with tight tracking | ✅ Inter plus Inter Tight for headings | `app/layout.tsx` |
| Grouped sidebar with active states, mobile menu | ✅ Grouped by real pages, filtered by staff role | `components/shell.tsx`, both layouts |
| Skeleton loading and empty states | ✅ Loading added 8 Nov; `Empty` component | `components/page-loading.tsx`, `components/ui.tsx` |
| Group RFQ pipeline | ✅ 10 stages, from new to won or lost | `lib/services/groups.ts` (`GROUP_STAGES`) |
| AI: natural-language search, group brief, rate-sheet reader, client messages | ✅ Built; needs `ANTHROPIC_API_KEY` | `lib/ai/tools.ts` |
| Agency brand on client documents | ✅ | agency `brandName` and `logoUrl` |
| Commission-receivable accounting | ✅ For commissionable contracts | ledger, `commissionReceivableMinor` |
| Cmd+K command palette | ✅ **Phase 1, this branch** | `components/command-palette.tsx` |
| Hotel comparison, hotel dossier tabs | ❌ Not yet | Phase 2 |
| Commission ledger dashboard | ⚠️ Data exists, no dedicated screen | Phase 3 (needs the business-model decision) |
| Email centre (inbox) | ❌ Needs a Gmail connection | Phase 4; won't be faked |
| PDF or Excel extraction | ⚠️ Pasted text only today | Phase 4; needs the AI key |
| Dark mode | ❌ | Deferred: high effort, low value for daytime operations |

## 2. Deliberate departures from the brief

1. **Accent stays navy and gold, not cobalt.** Gold is in the logo, the emails, the Diwali card and the homepage. Changing the accent would split the brand.
2. **No new navigation for pages that don't exist.** The brief itself says not to add routes for decoration. The current groups (Book · Sell · Manage for agents; Business · Operations · Portfolio · Commercial · Governance for staff) already match real work.
3. **Photography only with permission.** Hotel images come from each partner hotel's own media kit, recorded per hotel. No stock photos.
4. **Finance screens wait for the model decision.** Section 9 of the brief assumes HotelBridge earns commission from hotels. The code also supports prepaid bookings and markups (best rate 8%, groups 8%, extras 20%). Designing the money screens before choosing the model would show wrong numbers.

## 3. Phases

### Phase 1: foundation (this branch)
- **Done:** Cmd+K / Ctrl+K command palette for agents and staff:
  - Real records only. Staff see hotels, agencies, bookings, groups and outreach. Agents see partner hotels plus only their **own** bookings, groups, clients and best-rate requests.
  - Quick actions, keyboard navigation, a phone search button, and a "searching" indicator.
  - Tested: agency isolation, search text can't act as a wildcard, and hotel partners see nothing.
- **Next:** tables with sticky headers on long lists (bookings, agencies, outreach); one button and input style everywhere; `prefers-reduced-motion` respected throughout.

### Phase 2: main experience
- **Hotel dossier (admin):** a header with the hotel's own photo when licensed, plus tabs for Overview, Rates, Contracts, Bookings, Contacts and Activity, all from existing tables.
- **Side-by-side comparison for agents:** pick 2–4 hotels and compare room price per night, breakfast, taxes, cancellation, payment deadline and contract type. Real offers only.
- **Executive overview:** KPI cards counted from the database (active hotels, verified agencies, confirmed bookings, room nights, pending confirmations), with an activity feed from the audit log. No trends until there is enough history to be honest about.

### Phase 3: core workflows
- **Group Desk kanban** on the existing 10 stages: drag to move, with the next action shown on each card.
- **Group offer comparison and a client proposal preview** (proposals already exist at `/t/<token>`).
- **Commission ledger:** earned, receivable, received and overdue per hotel, always kept separate from booking value. Built only after the model decision.

### Phase 4: intelligence
- **Document intake:** upload a hotel proposal and the AI extracts rates and terms into an editable form before saving. Needs the AI key.
- **Notifications centre** in the portal, built on the email events that already exist.
- **Email centre** only if Gmail is connected by OAuth.

## 4. Quality gate for every phase
Each phase must pass all of these before it can go live:
- types, lint and every test (`npm run check`);
- a production build;
- a check at 375 px, 768 px and 1280 px;
- no sideways scroll;
- keyboard navigation;
- a preview link, then Ronak's approval.
