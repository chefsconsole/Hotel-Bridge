/* HotelBridge QA sweep — run before every release.
 *
 * How: start the dev server, sign in (as the demo agent, then as the demo admin),
 * open the browser console on any portal page and paste this file. Then:
 *
 *   const r = await qaPages(['/agent', '/agent/search', ...]);   // every page reachable from the seeds
 *   await qaLinks(r);                                            // every internal link on those pages
 *   await qaPhone([...r.pages.keys()]);                          // each page at 375 px: nothing wider than the screen
 *
 * It reports: server errors, crashed pages ("Something went wrong"), not-found pages,
 * broken links, and anything that pushes a phone layout sideways (with the culprit element).
 * 12 Nov 2026 baseline: 31 agent/public pages, 108 links; 45 admin pages, 491 links — all clean.
 */
const ERR = [/Something went wrong on our side/, /Application error/, /Internal Server Error/, /Unhandled Runtime Error/];
const NOT_FOUND = /We can(’|')t find that page/;
const pattern = (p) => p.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/g, '/[id]').replace(/\/(set-password|g|r|t)\/[^/]+/, '/$1/[token]').replace(/\/legal\/[^/]+/, '/legal/[doc]');

async function check(url) {
  const res = await fetch(url, { redirect: 'manual' });
  if (res.type === 'opaqueredirect') return { status: 'redirect', doc: null };
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
  doc.querySelectorAll('script,template').forEach((s) => s.remove()); // ignore hidden payloads
  const h1 = [...doc.querySelectorAll('h1')].map((h) => h.textContent).join(' | ');
  return { status: res.status, doc, h1, error: ERR.some((r) => r.test(doc.body?.textContent ?? '')), notFound: NOT_FOUND.test(h1) };
}

window.qaPages = async function (seeds, max = 120) {
  const pages = new Map(), links = new Map(), seen = new Set(), queue = [...seeds];
  while (queue.length && pages.size < max) {
    const url = queue.shift();
    const key = pattern(new URL(url, location.origin).pathname) + (url.includes('?') ? `?${url.split('?')[1].split('=')[0]}` : '');
    if (seen.has(key)) continue;
    seen.add(key);
    const c = await check(url);
    pages.set(url, { status: c.status, error: c.error, notFound: c.notFound, h1: c.h1 });
    c.doc?.querySelectorAll('a[href]').forEach((a) => {
      const h = a.getAttribute('href');
      if (!h || /^(#|mailto:|tel:)/.test(h) || (/^https?:/.test(h) && !h.startsWith(location.origin))) return;
      const u = new URL(h, location.origin + url);
      if (u.pathname.startsWith('/_next') || u.pathname.startsWith('/api/') || /\/logout$/.test(u.pathname)) return;
      if (!links.has(u.pathname + u.search)) links.set(u.pathname + u.search, url);
      if (!/\/voucher$/.test(u.pathname)) queue.push(u.pathname + u.search);
    });
  }
  console.table([...pages].map(([url, p]) => ({ url, ...p })).filter((p) => p.status !== 200 || p.error || p.notFound));
  return { pages, links };
};

window.qaLinks = async function ({ links }, workers = 4) {
  const list = [...links], bad = [];
  let i = 0;
  const run = async () => { while (i < list.length) { const [href, from] = list[i++]; const c = await check(href).catch((e) => ({ status: `FAIL ${e}` })); if (c.status !== 'redirect' && (c.status >= 400 || typeof c.status === 'string' || c.error || c.notFound)) bad.push({ href, from, status: c.status, h1: c.h1 }); } };
  await Promise.all(Array.from({ length: workers }, run));
  console.log(`${list.length} links checked, ${bad.length} broken`);
  console.table(bad);
  return bad;
};

window.qaPhone = async function (urls, width = 375) {
  const issues = [];
  for (const url of urls) {
    const f = Object.assign(document.createElement('iframe'), { src: url });
    f.style.cssText = `position:fixed;left:-5000px;top:0;width:${width}px;height:800px;border:0`;
    document.body.appendChild(f);
    await new Promise((r) => { f.onload = r; setTimeout(r, 15000); });
    await new Promise((r) => setTimeout(r, 1500));
    const d = f.contentDocument;
    if (d && d.documentElement.scrollWidth > width + 1) {
      const culprits = [...d.querySelectorAll('body *')].filter((e) => {
        const r = e.getBoundingClientRect();
        if (r.right <= width + 1 || !r.width) return false;
        for (let p = e.parentElement; p; p = p.parentElement) if (getComputedStyle(p).overflowX !== 'visible') return false;
        return true;
      }).slice(0, 3).map((e) => `${e.tagName}.${String(e.className).slice(0, 70)}`);
      issues.push({ url, width: d.documentElement.scrollWidth, culprits });
    }
    f.remove();
  }
  console.log(`${urls.length} pages at ${width}px, ${issues.length} too wide`);
  console.table(issues);
  return issues;
};
