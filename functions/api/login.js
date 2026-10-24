import { json, safeEqual, pwOk, makeSession, sessionCookie } from '../_lib.js';
// Admin sign-in. Wrong guesses are limited per visitor and overall, and the password is compared in constant time.
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'database not connected' }, 503);
  if (!pwOk(env)) return json({ error: 'The admin password is not set up yet. See CLOUDFLARE-SETUP.md (step 4).' }, 503);
  const ip = String(request.headers.get('CF-Connecting-IP') || 'unknown').slice(0, 64), now = Date.now(), win = now - 15 * 60 * 1000;
  await env.DB.prepare('DELETE FROM logins WHERE created < ?').bind(now - 24 * 3600 * 1000).run();
  const per = await env.DB.prepare('SELECT COUNT(*) AS n FROM logins WHERE ip = ? AND created > ?').bind(ip, win).first();
  const all = await env.DB.prepare('SELECT COUNT(*) AS n FROM logins WHERE created > ?').bind(win).first();
  if ((per && per.n >= 5) || (all && all.n >= 40)) return json({ error: 'Too many attempts. Wait 15 minutes and try again.' }, 429);
  let b; try { b = await request.json(); } catch (e) { return json({ error: 'bad request' }, 400); }
  if (!(await safeEqual(String(b.password || ''), env.ADMIN_PASSWORD, 'cmp:' + env.ADMIN_PASSWORD))) {
    await env.DB.prepare('INSERT INTO logins (ip, created) VALUES (?, ?)').bind(ip, now).run();
    return json({ error: 'Wrong password.' }, 401);
  }
  await env.DB.prepare('DELETE FROM logins WHERE ip = ?').bind(ip).run();
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie(await makeSession(env), 12 * 3600) });
}
