import { json } from '../_lib.js';
// Public: the quote form, contact form and chat bot post new requests here.
const clip = (v, n) => String(v == null ? '' : v).slice(0, n);
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'database not connected' }, 503);
  let b; try { b = await request.json(); } catch (e) { return json({ error: 'bad request' }, 400); }
  const type = ['quote', 'contact', 'chat'].includes(b.type) ? b.type : 'contact';
  const message = clip(b.message, 3500).trim(), name = clip(b.name, 150).trim();
  if (!message && !name) return json({ error: 'empty' }, 400);
  const ip = clip(request.headers.get('CF-Connecting-IP') || 'unknown', 64), now = Date.now();
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM requests WHERE ip = ? AND created > ?').bind(ip, now - 10 * 60 * 1000).first();
  if (recent && recent.n >= 8) return json({ error: 'too many requests, try again later' }, 429);
  await env.DB.prepare('INSERT INTO requests (type, page, name, phone, email, message, status, ip, created) VALUES (?, ?, ?, ?, ?, ?, \'new\', ?, ?)')
    .bind(type, clip(b.page, 60), name, clip(b.phone, 60), clip(b.email, 150), message, ip, now).run();
  return json({ ok: true });
}
