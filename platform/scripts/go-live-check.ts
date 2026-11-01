import './env';
import { sql } from 'drizzle-orm';
import { closeDb, getDb, schema } from '@/lib/db';

/* npm run go-live:check — run with the PRODUCTION environment variables set.
 * Checks every setting and the database before HotelBridge is switched on.
 * Prints what is missing; changes nothing. */
type Row = { item: string; ok: boolean; note: string };
const rows: Row[] = [];
const need = (item: string, ok: boolean, note: string) => rows.push({ item, ok, note });
const env = (k: string) => (process.env[k] ?? '').trim();

(async () => {
  need('HB_ENV=production', env('HB_ENV') === 'production', 'Must be production on the live host');
  need('HB_DEMO off', env('HB_DEMO') !== '1', 'Never show sample data in production');
  need('HB_SANDBOX_SUPPLIER off', env('HB_SANDBOX_SUPPLIER') !== '1', 'The simulated supplier must not be loaded');
  need('DATABASE_URL', /^postgres(ql)?:\/\//.test(env('DATABASE_URL')), 'Postgres connection string (Neon / Supabase)');
  need('APP_URL', /^https:\/\//.test(env('APP_URL')), 'e.g. https://portal.hotelbridge.co — used in email links');
  need('CRON_SECRET', env('CRON_SECRET').length >= 16, '16+ random characters; Vercel Cron sends it');
  need('RESEND_API_KEY + EMAIL_FROM', !!env('RESEND_API_KEY') && /@/.test(env('EMAIL_FROM')), 'Needed for group requests to reach hotels (otherwise recorded as not sent)');
  need('ANTHROPIC_API_KEY (optional)', true, env('ANTHROPIC_API_KEY') ? 'set — AI tools on' : 'not set — AI tools show "not connected"');

  if (/^postgres(ql)?:\/\//.test(env('DATABASE_URL'))) {
    try {
      const db = await getDb();
      await db.execute(sql`select 1`);
      need('Database reachable', true, 'connected');
      const t = await db.execute(sql`select to_regclass('public.hotel_prospects') is not null as ok`);
      const ok = Boolean(((t as unknown as { rows?: { ok: boolean }[] }).rows ?? (t as unknown as { ok: boolean }[]))[0]?.ok);
      need('Migrations applied', ok, ok ? 'latest tables present' : 'run: npm run db:migrate');
      if (ok) {
        const admins = await db.select({ n: sql<number>`count(*)::int` }).from(schema.users).where(sql`platform_role = 'admin' and status = 'active'`);
        need('At least one admin', admins[0].n > 0, admins[0].n > 0 ? `${admins[0].n} active` : 'run: HB_ADMIN_PASSWORD=… npm run create-admin -- you@hotelbridge.co "Your Name" admin');
        const samples = await db.select({ n: sql<number>`count(*)::int` }).from(schema.hotels).where(sql`is_sample`);
        need('No sample hotels', samples[0].n === 0, samples[0].n ? `${samples[0].n} sample hotels in the live database — remove them` : 'clean');
      }
    } catch (e) {
      need('Database reachable', false, e instanceof Error ? e.message.slice(0, 120) : 'connection failed');
    }
  }

  const w = Math.max(...rows.map((r) => r.item.length));
  for (const r of rows) console.log(`${r.ok ? '✓' : '✗'}  ${r.item.padEnd(w)}  ${r.note}`);
  const bad = rows.filter((r) => !r.ok).length;
  console.log(bad ? `\n${bad} thing(s) to fix before going live.` : '\nReady to go live.');
  await closeDb();
  process.exit(bad ? 1 : 0);
})();
