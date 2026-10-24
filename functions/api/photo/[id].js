// Public: serves a photo that was uploaded from the admin area.
export async function onRequestGet({ env, params, request }) {
  const id = String(params.id || '');
  if (!env.DB || !/^[a-z0-9_-]{1,120}$/i.test(id)) return new Response('Not found', { status: 404 });
  const r = await env.DB.prepare('SELECT mime, data FROM photos WHERE id = ?').bind(id).first();
  if (!r) return new Response('Not found', { status: 404 });
  const bin = Uint8Array.from(atob(r.data), (c) => c.charCodeAt(0));
  const versioned = new URL(request.url).searchParams.has('v');
  return new Response(bin, { headers: { 'content-type': r.mime, 'cache-control': versioned ? 'public, max-age=31536000, immutable' : 'public, max-age=300' } });
}
