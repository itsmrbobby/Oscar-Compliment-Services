/* Keeps photos on the visitor's phone after the first visit, so they appear instantly next time.
   Only pictures are stored. Pages, prices, the admin and all /api/ data (except uploaded photos) always come fresh. */
const CACHE = 'osca-photos-v2';
const MISS = 'osca-missing-v2';        // remembers photos that are not uploaded yet, so the phone stops asking for them
const MISS_FOR = 30 * 1000;          // ...for only thirty seconds, so a newly added photo shows up straight away
const MAX_ITEMS = 400;           // keeps the stored set small
const REFRESH_AFTER = 0;   // a stored photo is re-checked quietly on every visit, so replaced pictures appear on the next view

const isPhoto = (url) => url.origin === self.location.origin && (/\/images\/.+\.(jpe?g|png|webp|gif|svg)$/i.test(url.pathname) || url.pathname.startsWith('/api/photo/'));

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  // HARD RESET: wipe every stored photo from older versions of this helper, once, on every device that has visited before
  let hadOld = false;
  for (const k of await caches.keys()) if (k.startsWith('osca-') && k !== CACHE && k !== MISS) { hadOld = true; await caches.delete(k); }
  if (await caches.has(MISS)) { await caches.delete(MISS); }
  await self.clients.claim();
  // Pages already open on an old visit reload once so they show the fresh pictures (the admin is left alone)
  if (hadOld) for (const c of await self.clients.matchAll({ type: 'window' })) { if (!/\/admin/.test(c.url)) c.navigate(c.url).catch(() => {}); }
})()));

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_ITEMS; i++) await cache.delete(keys[i]);
}
async function fetchAndStore(req, cache) {
  const res = await fetch(req, { cache: 'no-cache' });
  if (res && res.status === 200 && res.type !== 'opaque') {
    const h = new Headers(res.headers); h.set('x-osca-cached', String(Date.now()));
    const copy = new Response(await res.clone().blob(), { status: 200, statusText: 'OK', headers: h });
    await cache.put(req, copy); trim(cache);
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!isPhoto(url)) return;
  e.respondWith((async () => {
    const miss = await caches.open(MISS), seen = await miss.match(req);
    if (seen && Date.now() - Number(seen.headers.get('x-osca-cached') || 0) < MISS_FOR) return new Response(null, { status: 404, statusText: 'Not Found' });
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) {
      const age = Date.now() - Number(hit.headers.get('x-osca-cached') || 0);
      if (age > REFRESH_AFTER) e.waitUntil(fetchAndStore(req, cache).catch(() => {}));
      return hit;
    }
    try {
      const res = await fetchAndStore(req, cache);
      if (res && res.status === 404) await miss.put(req, new Response(null, { status: 404, headers: { 'x-osca-cached': String(Date.now()) } }));
      return res;
    } catch (err) { return fetch(req, { cache: 'no-cache' }); }
  })());
});
