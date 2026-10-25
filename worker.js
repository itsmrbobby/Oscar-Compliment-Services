// Cloudflare Worker entry: runs the /api/* endpoints and serves every other path from the website files.
import * as content from './functions/api/content.js';
import * as photo from './functions/api/photo/[id].js';
import * as request from './functions/api/request.js';
import * as login from './functions/api/login.js';
import * as logout from './functions/api/logout.js';
import * as admin from './functions/api/admin/[[path]].js';

const nf = () => new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const bad = () => new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    const seg = url.pathname.slice(5).split('/').filter(Boolean), m = req.method;
    try {
      switch (seg[0]) {
        case 'content': return m === 'GET' ? content.onRequestGet({ env, request: req }) : bad();
        case 'photo': return m === 'GET' && seg[1] ? photo.onRequestGet({ env, request: req, params: { id: seg[1] } }) : nf();
        case 'request': return m === 'POST' ? request.onRequestPost({ env, request: req }) : bad();
        case 'login': return m === 'POST' ? login.onRequestPost({ env, request: req }) : bad();
        case 'logout': return m === 'POST' ? logout.onRequestPost({ env, request: req }) : bad();
        case 'admin': return admin.onRequest({ env, request: req, params: { path: seg.slice(1) } });
        default: return nf();
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    }
  }
};
