'use client';
/* Makes the registration form do the typing for the agent:
 *  - city → state; GSTIN → PAN + state; country → billing currency and +91;
 *  - PAN checked live ("Company PAN"); email typos caught ("did you mean gmail.com?");
 *  - show/hide password with a length meter; website gets https://;
 *  - everything typed is kept as a draft in this browser, so a refresh or a
 *    closed tab loses nothing (never the password or documents).
 * Works on top of the server-rendered form; with JS off the form still works. */
import { useEffect } from 'react';
import { COUNTRY_CURRENCY, emailTypoFix, fromGstin, normalisePhone, panHolder, stateForCity } from '@/lib/domain/india';

const DRAFT = 'hb-register-draft-v1';
const SKIP = new Set(['password', 'company_url', 'panCard', 'gstCertificate', 'terms']);

export function RegisterSmart() {
  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>('form#register-form');
    if (!form) return;
    const $ = <T extends HTMLElement = HTMLInputElement>(n: string) => form.querySelector<T>(`[name="${n}"]`);
    const note = (key: string, text: string, tone: 'ok' | 'warn' | 'muted' = 'muted') => {
      const el = form.querySelector<HTMLElement>(`[data-smart-note="${key}"]`);
      if (!el) return;
      el.textContent = text;
      el.dataset.tone = tone;
    };
    const set = (n: string, v: string) => {
      const el = $(n);
      if (!el || el.value.trim()) return false;
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.animate?.([{ backgroundColor: 'rgb(199 154 74 / 0.22)' }, { backgroundColor: 'transparent' }], { duration: 1200 });
      return true;
    };
    const country = () => $('country')?.value ?? '';
    const india = () => country().trim().toLowerCase() === 'india';

    // ---- draft: restore, then save as they type
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT) ?? 'null') as Record<string, string | string[]> | null;
      if (saved) {
        let restored = 0;
        for (const [k, v] of Object.entries(saved)) {
          if (SKIP.has(k)) continue;
          if (Array.isArray(v)) {
            form.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="${k}"]`).forEach((c) => { c.checked = v.includes(c.value); });
          } else {
            const el = $<HTMLInputElement | HTMLSelectElement>(k);
            if (el && v && (el as HTMLInputElement).type !== 'file' && el.value !== v) { el.value = v; restored++; }
          }
        }
        if (restored) note('draft', 'We kept what you typed last time — carry on where you left off.', 'ok');
      }
    } catch { /* storage blocked: the form still works */ }
    let t: number | undefined;
    const save = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        const data: Record<string, string | string[]> = {};
        new FormData(form).forEach((v, k) => {
          if (SKIP.has(k) || typeof v !== 'string') return;
          if (form.querySelector(`input[type="checkbox"][name="${k}"]`)) data[k] = [...((data[k] as string[]) ?? []), v];
          else data[k] = v;
        });
        try { localStorage.setItem(DRAFT, JSON.stringify(data)); } catch { /* ignore */ }
      }, 300);
    };

    // ---- smart fills
    const onCountry = () => {
      const cur = COUNTRY_CURRENCY[Object.keys(COUNTRY_CURRENCY).find((c) => c.toLowerCase() === country().trim().toLowerCase()) ?? ''];
      const sel = $<HTMLSelectElement>('billingCurrency');
      if (cur && sel && !sel.dataset.touched) sel.value = cur;
      note('country', india() ? 'Indian agencies: PAN and a PAN card scan are required.' : cur ? `Billing currency set to ${cur} — change it if you prefer.` : '');
    };
    const onCity = () => {
      if (!india()) return;
      const st = stateForCity($('city')?.value ?? '');
      if (st && set('state', st)) note('city', `State filled in: ${st}`, 'ok');
    };
    const onGstin = () => {
      const el = $('gstin');
      if (!el) return;
      el.value = el.value.toUpperCase().replace(/\s/g, '');
      if (!el.value) return note('gstin', '');
      if (el.value.length < 15) return note('gstin', `${15 - el.value.length} more characters`, 'muted');
      const g = fromGstin(el.value);
      if (!g) return note('gstin', 'This GSTIN doesn’t look right — check it on your GST certificate.', 'warn');
      const filled = [set('pan', g.pan) && 'PAN', g.state && set('state', g.state) && 'state'].filter(Boolean);
      note('gstin', `Valid GSTIN${g.state ? ` · ${g.state}` : ''}${filled.length ? ` · ${filled.join(' and ')} filled in for you` : ''}`, 'ok');
      onPan();
    };
    const onPan = () => {
      const el = $('pan');
      if (!el) return;
      el.value = el.value.toUpperCase().replace(/\s/g, '');
      if (!el.value) return note('pan', '');
      const h = panHolder(el.value);
      note('pan', h ? `✓ ${h}` : el.value.length < 10 ? `${10 - el.value.length} more characters (format ABCDE1234F)` : 'Format is 5 letters, 4 digits, 1 letter — e.g. ABCDE1234F', h ? 'ok' : el.value.length < 10 ? 'muted' : 'warn');
    };
    const onEmail = () => {
      const el = $('email');
      const fix = el ? emailTypoFix(el.value) : null;
      const box = form.querySelector<HTMLElement>('[data-smart-note="email"]');
      if (!box) return;
      box.replaceChildren();
      if (!fix || !el) return;
      box.dataset.tone = 'warn';
      box.append('Did you mean ');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'font-semibold underline underline-offset-2';
      b.textContent = fix;
      b.onclick = () => { el.value = fix; box.replaceChildren(); save(); };
      box.append(b, '?');
    };
    const onPhone = () => { const el = $('phone'); if (el) { const v = normalisePhone(el.value, country()); if (v !== el.value) { el.value = v; save(); } } };
    const onWebsite = () => { const el = $('website'); if (el && el.value.trim() && !/^https?:\/\//i.test(el.value.trim())) el.value = `https://${el.value.trim()}`; };
    const onPassword = () => {
      const el = $('password');
      const meter = form.querySelector<HTMLElement>('[data-smart-meter]');
      if (!el || !meter) return;
      const n = el.value.length;
      meter.style.width = `${Math.min(100, (n / 14) * 100)}%`;
      meter.dataset.tone = n >= 14 ? 'ok' : n >= 10 ? 'fine' : 'short';
      note('password', n === 0 ? '' : n < 10 ? `${10 - n} more characters` : n < 14 ? 'Good — a few more makes it stronger' : 'Strong password', n >= 10 ? 'ok' : 'muted');
    };

    const onInput = (e: Event) => {
      const n = (e.target as HTMLInputElement).name;
      if (n === 'gstin') onGstin();
      else if (n === 'pan') onPan();
      else if (n === 'password') onPassword();
      else if (n === 'email') note('email', '');
      save();
    };
    const onChange = (e: Event) => {
      const el = e.target as HTMLInputElement;
      if (el.name === 'billingCurrency') el.dataset.touched = '1';
      if (el.name === 'country') onCountry();
      if (el.name === 'city') onCity();
      save();
    };
    const onBlur = (e: FocusEvent) => {
      const n = (e.target as HTMLInputElement).name;
      if (n === 'email') onEmail();
      if (n === 'phone') onPhone();
      if (n === 'website') onWebsite();
      if (n === 'city') onCity();
      if (n === 'country') onCountry();
    };
    const onSubmit = () => { try { localStorage.removeItem(DRAFT); } catch { /* ignore */ } };
    // Re-save if the server sends the form back (the draft is cleared on submit).
    form.addEventListener('input', onInput);
    form.addEventListener('change', onChange);
    form.addEventListener('focusout', onBlur);
    form.addEventListener('submit', onSubmit);

    const toggle = form.querySelector<HTMLButtonElement>('[data-smart-show]');
    const onToggle = () => {
      const el = $('password');
      if (!el || !toggle) return;
      el.type = el.type === 'password' ? 'text' : 'password';
      toggle.textContent = el.type === 'password' ? 'Show' : 'Hide';
    };
    toggle?.addEventListener('click', onToggle);

    onCountry(); onPan(); onGstin(); onPassword();
    return () => {
      form.removeEventListener('input', onInput); form.removeEventListener('change', onChange);
      form.removeEventListener('focusout', onBlur); form.removeEventListener('submit', onSubmit);
      toggle?.removeEventListener('click', onToggle);
      window.clearTimeout(t);
    };
  }, []);
  return null;
}
