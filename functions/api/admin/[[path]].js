import { json, adminSession, kvGet, kvSet } from '../../_lib.js';
// Admin API. Every call needs a valid admin login cookie.
const okId = (s) => /^[a-z0-9_-]{1,120}$/i.test(s || '');
export async function onRequest({ request, env, params }) {
  const email = await adminSession(request, env);
  if (!email) return json({ error: 'Not allowed' }, 401);
  // Changes must come from the admin page itself (a browser cannot add this header from another site)
  if (request.method !== 'GET' && request.headers.get('x-osca-admin') !== '1') return json({ error: 'Not allowed' }, 403);
  if (!env.DB) return json({ error: 'database not connected' }, 503);
  const db = env.DB, m = request.method, seg = [].concat(params.path || []), area = seg[0], id = seg[1];
  let body = {}; if (m === 'PUT' || m === 'PATCH' || m === 'POST') { try { body = await request.json(); } catch (e) { return json({ error: 'bad request' }, 400); } }

  if (area === 'me') return json({ ok: true });

  if (area === 'requests') {
    if (m === 'GET') { const r = await db.prepare('SELECT id, type, page, name, phone, email, message, status, created FROM requests ORDER BY created DESC LIMIT 200').all(); return json({ items: r.results || [] }); }
    if (m === 'PATCH' && /^\d+$/.test(id || '')) { await db.prepare('UPDATE requests SET status = ? WHERE id = ?').bind(body.status === 'done' ? 'done' : 'new', +id).run(); return json({ ok: true }); }
    if (m === 'DELETE' && /^\d+$/.test(id || '')) { await db.prepare('DELETE FROM requests WHERE id = ?').bind(+id).run(); return json({ ok: true }); }
  }
  if (area === 'products') {
    if (m === 'GET') return json(await kvGet(db, 'products', {}));
    if (m === 'PUT') { await kvSet(db, 'products', { overrides: body.overrides || {}, extra: Array.isArray(body.extra) ? body.extra.slice(0, 500) : [] }); return json({ ok: true }); }
  }
  if (area === 'text') {
    if (m === 'GET') return json({ vals: await kvGet(db, 'text', {}) });
    if (m === 'PUT') { const v = {}; Object.entries(body.vals || {}).forEach(([k, x]) => { if (/^[a-z0-9_]{1,60}$/i.test(k) && typeof x === 'string' && x.trim()) v[k] = x.slice(0, 2000); }); await kvSet(db, 'text', v); return json({ ok: true }); }
  }
  if (area === 'photos') {
    if (m === 'GET') { const r = await db.prepare('SELECT id, updated FROM photos').all(); const ids = {}; (r.results || []).forEach((x) => { ids[x.id] = x.updated; }); return json({ ids }); }
    if (m === 'PUT' && okId(id)) {
      const mm = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(body.data || '');
      if (!mm || mm[2].length > 1500000) return json({ error: 'Photo is missing or too large' }, 400);
      const now = Date.now();
      await db.prepare('INSERT INTO photos (id, mime, data, updated) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET mime = excluded.mime, data = excluded.data, updated = excluded.updated').bind(id, mm[1], mm[2], now).run();
      return json({ ok: true, updated: now });
    }
    if (m === 'DELETE' && okId(id)) { await db.prepare('DELETE FROM photos WHERE id = ?').bind(id).run(); return json({ ok: true }); }
  }
  return json({ error: 'Not found' }, 404);
}
