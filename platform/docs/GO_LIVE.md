# Go live — HotelBridge platform

About 15–30 minutes. Steps marked **(you)** need your own logins; everything else is ready in the code.
The app builds for production (`next build` passes), migrations run on any Postgres, and `npm run go-live:check` tells you what is still missing.

## 1. Database — Neon (you)
1. Sign in at neon.tech → **New project** → region **Asia Pacific (Mumbai)** or **Singapore** (closest to Indian agents).
2. Copy the **pooled** connection string (starts with `postgresql://`, has `-pooler` in the host).

(Supabase works the same way: Project → Settings → Database → connection string, "Transaction" pooler.)

## 2. Prepare the database (from this Mac)
```bash
cd /Users/ronak/Hotel-Bridge/platform
export DATABASE_URL='postgresql://…pooled string…'
npm run db:migrate
HB_ADMIN_PASSWORD='choose-a-long-password' npm run create-admin -- you@hotelbridge.co "Your Name" admin
npm run import:prospects
npm run load:partners      # the 21 best-rate-on-request hotels + Muong Thanh 2027 rates (real data, data/partners.ts)
```
Never run `npm run seed:demo` against the live database.

## 3. Hosting — Vercel (you)
1. Sign in at vercel.com → **Add New → Project** → import GitHub repo **chefsconsole/Hotel-Bridge**.
2. **Root Directory:** `platform` · Framework: Next.js (detected).
3. **Settings → Git → Production Branch:** `platform-v1` (or merge it into `main` first). The existing website (`frontend/`, on Netlify) is not touched.
4. **Environment Variables** (Production):

| Name | Value |
|---|---|
| `HB_ENV` | `production` |
| `DATABASE_URL` | the Neon pooled string |
| `APP_URL` | `https://portal.hotelbridge.co` (your chosen address) |
| `CRON_SECRET` | 32 random characters (e.g. `openssl rand -hex 16`) |
| `RESEND_API_KEY` | from step 5 |
| `EMAIL_FROM` | `HotelBridge Group Desk <groups@hotelbridge.co>` |
| `EMAIL_REPLY_TO` | `groups@hotelbridge.co` (optional) |
| `ANTHROPIC_API_KEY` | optional — turns on the AI tools |

Do **not** set `HB_DEMO` or `HB_SANDBOX_SUPPLIER` in production.

5. **Deploy.** Scheduled jobs run from `vercel.json` (`/api/cron` every 15 minutes). On Vercel's free Hobby plan crons run at most once a day — fine to start, because requests also lapse whenever the admin console loads; upgrade to Pro for 15-minute runs.

## 4. Domain (you)
Vercel → Project → **Settings → Domains** → add `portal.hotelbridge.co` → copy the **CNAME** it shows → add that record where `hotelbridge.co`'s DNS is managed. HTTPS is automatic.

## 5. Email — Resend (you)
1. resend.com → **Domains → Add** `hotelbridge.co` → add the DNS records it shows (SPF/DKIM) → wait for "Verified".
2. **API Keys → Create** → paste into Vercel as `RESEND_API_KEY` → redeploy.
Until this is done, every email is listed as **Not sent** in Admin → Emails, and group reply links can be sent by hand.

## 6. Check, then switch on
```bash
cd /Users/ronak/Hotel-Bridge/platform
HB_ENV=production DATABASE_URL='…' APP_URL='https://portal.hotelbridge.co' CRON_SECRET='…' RESEND_API_KEY='…' EMAIL_FROM='groups@hotelbridge.co' npm run go-live:check
```
Every line should show ✓. Then a 5-minute smoke test on the live site:
1. Sign in as the admin → Team → add your ops/sales people.
2. Register a test agency (your own, with your PAN card) → approve it in Agencies.
3. Hotels → add your first **signed** hotel → contract → rate sheet (`docs/contracts/rate-sheet-template.csv`) → activate.
4. As the agency: search that city → request a booking → as the hotel (partner login) accept it.
5. Send a group request for a city where a hotel is marked "Contracted for groups" → check Admin → Emails shows **sent**.

## 7. Before real money
- Payments: bookings are paid by bank transfer recorded by finance. Card/UPI checkout (Razorpay/Stripe) is not built yet.
- CA sign-off on GST treatment (`docs/TAX_INDIA.md`) and lawyer review of `docs/contracts/HOTEL_RATE_AGREEMENT.md`.
- Link the website: add "Agent login" → `https://portal.hotelbridge.co/login` and "Register your agency" → `/register` on hotelbridge.co.
