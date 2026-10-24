// Shared helpers for the website's Cloudflare Pages Functions
export const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });

const enc = new TextEncoder();
async function hmac(key, msg) { const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg))); }
const hex = (u) => [...u].map((b) => b.toString(16).padStart(2, '0')).join('');
// Constant-time comparison (hashes both sides first, so length and content leak nothing through timing)
export async function safeEqual(a, b, key) { const x = await hmac(key, String(a)), y = await hmac(key, String(b)); let d = 0; for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i]; return d === 0; }
export const pwOk = (env) => typeof env.ADMIN_PASSWORD === 'string' && env.ADMIN_PASSWORD.length >= 10;
export async function makeSession(env, ttl = 12 * 3600e3) { const exp = Date.now() + ttl; return exp + '.' + hex(await hmac('session:' + env.ADMIN_PASSWORD, String(exp))); }
export const sessionCookie = (v, maxAge) => `osca_admin=${v}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

// Returns 'admin' if the request carries a valid, unexpired login cookie, otherwise null.
// Changing the ADMIN_PASSWORD secret instantly logs everyone out.
export async function adminSession(request, env) {
  try {
    if (!pwOk(env)) return null;
    const c = (request.headers.get('cookie') || '').match(/(?:^|;\s*)osca_admin=([^;]+)/); if (!c) return null;
    const [exp, sig] = c[1].split('.'); if (!exp || !sig || !(+exp > Date.now())) return null;
    const want = hex(await hmac('session:' + env.ADMIN_PASSWORD, exp));
    return (await safeEqual(sig, want, 'cmp:' + env.ADMIN_PASSWORD)) ? 'admin' : null;
  } catch (e) { return null; }
}
export const kvGet = async (db, key, dflt) => { const r = await db.prepare('SELECT value FROM kv WHERE key = ?').bind(key).first(); try { return r ? JSON.parse(r.value) : dflt; } catch (e) { return dflt; } };
export const kvSet = (db, key, val) => db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(key, JSON.stringify(val)).run();
