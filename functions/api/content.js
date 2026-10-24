import { json, kvGet } from '../_lib.js';
// Public: the website reads edited text, price changes and the list of replaced photos from here.
export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: 'database not connected' }, 503);
  const [text, products, ph] = await Promise.all([kvGet(env.DB, 'text', {}), kvGet(env.DB, 'products', {}), env.DB.prepare('SELECT id, updated FROM photos').all()]);
  const photos = {}; (ph.results || []).forEach((r) => { photos[r.id] = r.updated; });
  return json({ ok: true, text, overrides: products.overrides || {}, extra: products.extra || [], photos }, 200, { 'cache-control': 'public, max-age=20' });
}
