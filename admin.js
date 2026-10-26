const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const show = (id, on) => $(id).classList.toggle('hide', !on);
let toastT = null;
function toast(t) { const el = $('#toast'); el.innerHTML = '<i>✓</i><span></span>'; el.lastChild.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 3200); }
const note = (el, cls, t) => { if (cls === 'ok' && t) { el.innerHTML = ''; toast(t); return; } el.innerHTML = t ? `<div class="msg ${cls}">${esc(t)}</div>` : ''; };
const skel = (n = 3) => '<div class="skel"></div>'.repeat(n);
const ICON = {
  dashboard: '<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>',
  requests: '<path d="M4 4h16v13H8l-4 4z"/><path d="M8 9h8M8 13h5"/>',
  products: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  text: '<path d="M4 6V4h16v2M9 20h6M12 4v16"/>',
  projects: '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1"/>',
  photos: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>'
};
const ico = (k, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
const friendly = (e) => e.auth ? 'Your login session ended. Reload this page to sign in again.' : (e.message || 'Something went wrong.');
const loginErr = (t) => { note($('#loginMsg'), 'err', t); };
async function api(path, o = {}) {
  let r; try { r = await fetch('api/admin/' + path, { method: o.method || 'GET', headers: { 'content-type': 'application/json', 'x-osca-admin': '1' }, body: o.body ? JSON.stringify(o.body) : undefined }); }
  catch (e) { throw new Error('Could not reach the server. Check your connection and try again.'); }
  if (r.status === 401) { showLogin('Your session ended. Please sign in again.'); throw Object.assign(new Error('Signed out'), { auth: true }); }
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Request failed'); return j;
}
function showLogin(msg) { show('#app', false); show('#setupView', false); show('#loginView', true); $('#btabs').classList.remove('on'); show('#outBtn', false); show('#siteLink', false); $('#pw').value = ''; note($('#loginMsg'), msg ? 'info' : '', msg || ''); }
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault(); $('#loginBtn').disabled = true; note($('#loginMsg'), '', '');
  try {
    const r = await fetch('api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: $('#pw').value }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { await boot(); } else loginErr(j.error || 'Could not sign in.');
  } catch (er) { loginErr('Could not reach the server. Check your connection.'); }
  $('#loginBtn').disabled = false;
});
$('#outBtn').addEventListener('click', async () => { try { await fetch('api/logout', { method: 'POST' }); } catch (e) {} location.reload(); });
async function boot() {
  let r; try { r = await fetch('api/admin/me'); } catch (e) { show('#setupView', true); return; }
  if (r.status === 401) { showLogin(); return; }
  if (!r.ok || !/json/.test(r.headers.get('content-type') || '')) { show('#setupView', true); return; }
  show('#loginView', false); show('#setupView', false); show('#app', true); show('#outBtn', true); show('#siteLink', true); started = false; start();
}

/* ---------- tabs ---------- */
const TABS = [['dashboard', 'Dashboard', 'Home'], ['requests', 'Requests', 'Requests'], ['products', 'Products & prices', 'Prices'], ['projects', 'Projects', 'Projects'], ['text', 'Page text', 'Text'], ['photos', 'Photos', 'Photos']];
let cur = 'dashboard', started = false, newCount = 0;
function start() { if (started) return; started = true; drawTabs(); go('dashboard'); }
function drawTabs() {
  const badge = (k) => (k === 'requests' && newCount ? `<span class="badge">${newCount}</span>` : '');
  $('#tabs').innerHTML = TABS.map(([k, l]) => `<button data-k="${k}" class="${k === cur ? 'on' : ''}">${ico(k)}<span>${l}</span>${badge(k)}</button>`).join('');
  $('#btabs').innerHTML = TABS.map(([k, , s]) => `<button data-k="${k}" class="${k === cur ? 'on' : ''}">${ico(k, 22)}<span>${s}</span>${badge(k)}</button>`).join('');
  $('#btabs').classList.add('on');
  document.querySelectorAll('#tabs button,#btabs button').forEach((b) => b.addEventListener('click', () => go(b.dataset.k)));
}
function go(k) { cur = k; drawTabs(); window.scrollTo(0, 0); ({ dashboard, requests, products, projects, text: pageText, photos })[k](); }

/* ---------- dashboard ---------- */
async function dashboard() {
  const p = $('#panel'); p.innerHTML = '<h1 class="pt">Dashboard</h1><p class="ps">Welcome back. Here is how your website is doing.</p>' + skel(3);
  try {
    const [rq, pr, ph] = await Promise.all([api('requests'), api('products'), api('photos')]); let pj = { items: [] }; try { pj = await loadProj(); } catch (e) {}
    const items = rq.items || [], fresh = items.filter((i) => i.status === 'new');
    newCount = fresh.length; drawTabs();
    const prices = Object.keys(pr.overrides || {}).length + (pr.extra || []).length, photos = Object.keys(ph.ids || {}).length, ong = pj.items.filter((x) => x.status === 'ongoing').length, don = pj.items.length - ong;
    const kpi = (k, n, l, cls = '') => `<div class="kpi ${cls}"><div class="ic">${ico(k)}</div><b>${n}</b><span>${l}</span></div>`;
    const latest = items.slice(0, 5).map((i) => `<div class="mini"><div class="av">${esc((i.name || '?').trim().charAt(0).toUpperCase())}</div><div class="tx"><b>${esc(i.name || 'No name')}</b><span>${esc(String(i.message || '').replace(/\s+/g, ' ').slice(0, 90))}</span></div><span class="pill ${i.status === 'done' ? 'done' : 'new'}">${i.status === 'done' ? 'Handled' : 'New'}</span></div>`).join('');
    p.innerHTML = `<h1 class="pt">Dashboard</h1><p class="ps">Welcome back. Here is how your website is doing.</p>
      <div class="kpis">${kpi('requests', fresh.length, 'New requests', fresh.length ? 'alert' : 'good')}${kpi('requests', items.length, 'Total requests')}${kpi('projects', ong, 'Ongoing projects')}${kpi('projects', don, 'Completed projects', 'good')}${kpi('products', prices, 'Price changes')}${kpi('photos', photos, 'Uploaded photos')}</div>
      <div class="card"><div class="row" style="justify-content:space-between;margin-bottom:6px"><h3 style="margin:0">Latest requests</h3><button class="ghost s" data-go="requests" style="padding:7px 12px;font-size:13px">View all</button></div>${latest || '<div class="empty">No requests yet. Quote and contact requests from your website will show up here.</div>'}</div>
      <div class="card"><h3>Quick actions</h3><div class="row"><button data-go="products">${ico('products', 18)} Update prices</button><button class="ghost" data-go="photos">${ico('photos', 18)} Change a photo</button><button class="ghost" data-go="projects">${ico('projects', 18)} Manage projects</button><button class="ghost" data-go="text">${ico('text', 18)} Edit page text</button><a class="btn ghost" href="index.html" target="_blank" rel="noopener">View website</a></div></div>`;
    p.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
  } catch (e) { p.innerHTML = `<h1 class="pt">Dashboard</h1><div class="card"><div class="msg err">${esc(friendly(e))}</div></div>`; }
}

/* ---------- requests ---------- */
async function requests() {
  const p = $('#panel'); p.innerHTML = '<h1 class="pt">Requests</h1><p class="ps">Quote, contact and chat requests from your website.</p>' + skel(3);
  try {
    const items = (await api('requests')).items;
    newCount = items.filter((i) => i.status === 'new').length; drawTabs();
    if (!items.length) { p.innerHTML = '<h1 class="pt">Requests</h1><div class="card"><div class="empty">No requests yet.<br>Quote and contact requests from your website will appear here.</div></div>'; return; }
    p.innerHTML = '<h1 class="pt">Requests</h1><p class="ps">' + (newCount ? newCount + ' new · ' : '') + items.length + ' in total</p>' + items.map((i) => {
      const t = i.created ? new Date(i.created).toLocaleString() : '';
      const digits = String(i.phone || '').replace(/\D/g, '').replace(/^0/, '234');
      return `<div class="card req ${i.status === 'done' ? 'done' : ''}" data-id="${i.id}"><div class="top2"><div><h3><span class="tag">${esc(i.type)}</span> ${esc(i.name || 'No name')}</h3>
        <div class="meta">${esc(t)} · ${esc(i.phone || '')} ${i.email ? '· ' + esc(i.email) : ''}</div></div><span class="pill ${i.status === 'done' ? 'done' : 'new'}">${i.status === 'done' ? 'Handled' : 'New'}</span></div><pre>${esc(i.message)}</pre>
        <div class="row">${i.phone ? `<a class="btn s" href="tel:${esc(i.phone)}">Call</a><a class="btn s ghost" target="_blank" rel="noopener" href="https://wa.me/${digits}">WhatsApp</a>` : ''}
        <button class="ghost s" data-a="tog" style="padding:7px 12px;font-size:13px">${i.status === 'done' ? 'Mark as new' : 'Mark as handled'}</button><button class="ghost s" data-a="del" style="color:var(--bad);padding:7px 12px;font-size:13px">Delete</button></div></div>`;
    }).join('');
    p.querySelectorAll('.req').forEach((c) => {
      const id = c.dataset.id, it = items.find((x) => String(x.id) === id);
      c.querySelector('[data-a=tog]').addEventListener('click', async () => { await api('requests/' + id, { method: 'PATCH', body: { status: it.status === 'done' ? 'new' : 'done' } }); requests(); });
      c.querySelector('[data-a=del]').addEventListener('click', async () => { if (confirm('Delete this request for good?')) { await api('requests/' + id, { method: 'DELETE' }); requests(); } });
    });
  } catch (e) { p.innerHTML = `<div class="card"><div class="msg err">${esc(friendly(e))}</div></div>`; }
}

/* ---------- products & prices ---------- */
function parseCSV(t) { const rows = []; let r = [], f = '', q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; } else if (c === '"') q = true; else if (c === ',') { r.push(f); f = ''; } else if (c === '\n') { r.push(f); rows.push(r); r = []; f = ''; } else if (c !== '\r') f += c; } if (f || r.length) { r.push(f); rows.push(r); } return rows.filter((x) => x.some((v) => v.trim())); }
let PROD = null;
async function loadProd() {
  if (PROD) return PROD;
  const csv = parseCSV(await (await fetch('data/products.csv', { cache: 'no-store' })).text()); csv.shift();
  const d = await api('products');
  PROD = { base: csv.map((r) => ({ sku: r[0], unit: r[1], category: r[2], name: r[3], soldby: r[4], price: r[5] || '', per: r[6] || '', status: r[7] || 'Available' })), ov: d.overrides || {}, extra: d.extra || [], dirty: false };
  return PROD;
}
async function products() {
  const p = $('#panel'); p.innerHTML = '<h1 class="pt">Products &amp; prices</h1>' + skel(3);
  let P; try { P = await loadProd(); } catch (e) { p.innerHTML = `<div class="card"><div class="msg err">${esc(friendly(e))}</div></div>`; return; }
  const units = [...new Set(P.base.map((r) => r.unit))];
  p.innerHTML = `<h1 class="pt">Products &amp; prices</h1><p class="ps">Change a price or availability, then tap Save. The website updates straight away.</p><div class="card"><div class="row"><input class="grow" id="q" placeholder="Search products…"><select class="grow" id="u"><option value="">All units</option>${units.map((u) => `<option>${esc(u)}</option>`).join('')}</select><button id="addBtn" class="ghost" style="color:var(--ink)">+ New product</button></div>
    <div id="addBox" class="hide" style="margin-top:12px"><div class="row"><select class="grow" id="nu">${units.map((u) => `<option>${esc(u)}</option>`).join('')}</select><input class="grow" id="nc" placeholder="Category (e.g. Fish)"></div>
    <div class="row" style="margin-top:8px"><input class="grow" id="nn" placeholder="Product name"><input class="grow" id="ns" placeholder="Sold by (e.g. kg, bag)"></div><div class="row" style="margin-top:8px"><button id="nsv">Add product</button></div></div></div>
    <div id="msg"></div><div class="card" id="list"></div><div class="save"><button id="saveBtn" disabled>Save changes</button></div>`;
  const eff = (r) => ({ ...r, ...(P.ov[r.sku] || {}) });
  const rowsAll = () => [...P.base.map((r) => ({ ...eff(r), src: 'csv' })), ...P.extra.map((r, i) => ({ sku: r.sku, unit: r.businessunit, category: r.category, name: r.product, soldby: r.soldby, price: r.price || '', per: r.priceper || '', status: r.status || 'Available', src: 'extra', i }))];
  function draw() {
    const q = $('#q').value.toLowerCase(), u = $('#u').value, rows = rowsAll().filter((r) => (!u || r.unit === u) && (!q || (r.name + ' ' + r.category).toLowerCase().includes(q))).slice(0, 80);
    $('#list').innerHTML = (rows.length ? rows.map((r) => `<div class="prod ${P.ov[r.sku] ? 'chg' : ''}" data-sku="${esc(r.sku)}"><div><div class="n">${esc(r.name)} ${r.src === 'extra' ? '<span class="tag">new</span>' : ''}</div><div class="c">${esc(r.unit)} · ${esc(r.category)} · ${esc(r.soldby)}</div></div>
      <div class="f"><input data-f="price" inputmode="decimal" placeholder="Price ₦" value="${esc(r.price)}"><input data-f="per" placeholder="per (kg, bag…)" value="${esc(r.per)}"><select data-f="status">${['Available', 'Limited', 'Out of stock', 'Hidden'].map((s) => `<option ${s.toLowerCase() === String(r.status).toLowerCase() ? 'selected' : ''}>${s}</option>`).join('')}</select></div>${r.src === 'extra' ? `<button class="ghost danger" data-del="${r.i}" style="grid-column:1/-1;justify-self:start;color:#fff">Remove</button>` : ''}</div>`).join('') : '<p class="mut">No products match.</p>') + (rowsAll().length > 80 ? '<p class="mut">Showing the first 80 matches. Use search or pick a unit to find others.</p>' : '');
    $('#list').querySelectorAll('.prod').forEach((el) => {
      const sku = el.dataset.sku;
      el.querySelectorAll('[data-f]').forEach((inp) => inp.addEventListener('change', () => {
        const f = inp.dataset.f, v = inp.value.trim(), ex = P.extra.find((x) => x.sku === sku);
        if (ex) { if (f === 'price') ex.price = v; else if (f === 'per') ex.priceper = v; else ex.status = v; }
        else { const o = P.ov[sku] || (P.ov[sku] = {}); if (f === 'price') o.price = v; else if (f === 'per') o.priceper = v; else o.status = v; el.classList.add('chg'); }
        P.dirty = true; $('#saveBtn').disabled = false;
      }));
    });
    $('#list').querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { if (confirm('Remove this product?')) { P.extra.splice(+b.dataset.del, 1); P.dirty = true; $('#saveBtn').disabled = false; draw(); } }));
  }
  $('#q').addEventListener('input', draw); $('#u').addEventListener('change', draw); draw();
  $('#addBtn').addEventListener('click', () => $('#addBox').classList.toggle('hide'));
  $('#nsv').addEventListener('click', () => {
    const name = $('#nn').value.trim(); if (!name) { note($('#msg'), 'err', 'Type the product name first.'); return; }
    P.extra.push({ sku: 'X' + Date.now().toString(36), businessunit: $('#nu').value, category: $('#nc').value.trim() || 'Other', product: name, soldby: $('#ns').value.trim(), price: '', priceper: '', status: 'Available' });
    $('#nn').value = ''; $('#ns').value = ''; P.dirty = true; $('#saveBtn').disabled = false; $('#q').value = name; note($('#msg'), 'info', 'Added. Set its price below, then tap Save changes.'); draw();
  });
  $('#saveBtn').addEventListener('click', async () => {
    $('#saveBtn').disabled = true;
    try { await api('products', { method: 'PUT', body: { overrides: P.ov, extra: P.extra } }); P.dirty = false; note($('#msg'), 'ok', 'Saved. The website now shows these prices.'); }
    catch (e) { note($('#msg'), 'err', friendly(e)); $('#saveBtn').disabled = false; }
  });
}


let IDX = null;
/* ---------- projects (ongoing / completed) ---------- */
const PTYPES = ['Construction', 'Engineering', 'Real Estate', 'Renovation', 'Consultancy', 'Other'];
let PROJ = null;
async function loadProj() {
  if (PROJ) return PROJ;
  const r = await api('projects'); let items = r.items, fromSite = false;
  if (!Array.isArray(items)) { // first time: start from the projects already on the website
    fromSite = true;
    try {
      const d = new DOMParser().parseFromString(await (await fetch('projects.html', { cache: 'no-store' })).text(), 'text/html');
      items = [...d.querySelectorAll('[data-projects] .listing-card')].map((c, i) => ({ id: 'p' + (i + 1), title: (c.querySelector('h4') || {}).textContent?.trim() || '', text: (c.querySelector('p') || {}).textContent?.trim() || '', tag: (c.querySelector('.listing-tag') || {}).textContent?.trim() || 'Construction', status: c.dataset.status === 'ongoing' ? 'ongoing' : 'completed', when: '', image: (c.querySelector('img') || {}).getAttribute?.('src') || '' }));
    } catch (e) { items = []; }
  }
  PROJ = { items, dirty: false, fromSite, filter: 'all', edit: null }; return PROJ;
}
async function compress(file) {
  const bmp = await new Promise((ok, no) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = u; });
  let w = bmp.naturalWidth, h = bmp.naturalHeight; const m = Math.max(w, h) > 1400 ? 1400 / Math.max(w, h) : 1; w = Math.round(w * m); h = Math.round(h * m);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(bmp, 0, 0, w, h);
  let q = 0.84, data = cv.toDataURL('image/jpeg', q); while (data.length > 900000 && q > 0.4) { q -= 0.08; data = cv.toDataURL('image/jpeg', q); }
  if (data.length > 950000) throw new Error('That photo is too large even after shrinking. Try a smaller one.'); return data;
}
async function projects() {
  const p = $('#panel'); p.innerHTML = '<h1 class="pt">Projects</h1>' + skel(3);
  let P; try { P = await loadProj(); if (!IDX) IDX = (await api('photos')).ids || {}; } catch (e) { p.innerHTML = `<h1 class="pt">Projects</h1><div class="card"><div class="msg err">${esc(friendly(e))}</div></div>`; return; }
  const thumb = (x) => (IDX['project-' + x.id] ? 'api/photo/project-' + x.id + '?v=' + IDX['project-' + x.id] : x.image || '');
  const count = (s) => P.items.filter((x) => s === 'all' || x.status === s).length;
  function draw() {
    const list = P.items.filter((x) => P.filter === 'all' || x.status === P.filter), e = P.edit;
    p.innerHTML = `<h1 class="pt">Projects</h1><p class="ps">Add your projects and mark each one Ongoing or Completed. The website updates when you tap Save.</p><div id="msg"></div>
      ${P.fromSite && !P.saved ? '<div class="msg info">These are the sample projects currently on your website. Edit or replace them with your real projects, then tap Save projects.</div>' : ''}
      <div class="row" style="margin-bottom:14px"><div class="seg" id="flt">${[['all', 'All'], ['ongoing', 'Ongoing'], ['completed', 'Completed']].map(([k, l]) => `<button data-f="${k}" class="${P.filter === k ? 'on' : ''}">${l} <span class="cnt">${count(k)}</span></button>`).join('')}</div><span class="sp"></span><button id="addP">+ Add project</button></div>
      ${e ? `<div class="card" id="pform"><h3>${e.isNew ? 'New project' : 'Edit project'}</h3>
        <label>Project title</label><input id="pjTitle" value="${esc(e.title)}" placeholder="e.g. 12-unit residential estate">
        <label>Short description</label><textarea id="pjText" placeholder="What is the project about?">${esc(e.text)}</textarea>
        <div class="row" style="align-items:flex-start"><div class="grow"><label>Type</label><select id="pjType">${PTYPES.map((t) => `<option ${t === e.tag ? 'selected' : ''}>${t}</option>`).join('')}${PTYPES.includes(e.tag) ? '' : `<option selected>${esc(e.tag)}</option>`}</select></div>
        <div class="grow"><label>Year or date (optional)</label><input id="pjWhen" value="${esc(e.when)}" placeholder="2025, or Expected Dec 2026"></div></div>
        <label>Status</label><div class="seg" id="pst"><button type="button" data-s="ongoing" class="${e.status === 'ongoing' ? 'on' : ''}">Ongoing</button><button type="button" data-s="completed" class="${e.status === 'completed' ? 'on' : ''}">Completed</button></div>
        <label>Photo</label><div class="row"><div class="nop thumb">${thumb(e) ? `<img src="${esc(thumb(e))}" alt="" onerror="this.replaceWith(document.createTextNode('No photo'))">` : 'No photo'}</div><label class="btn s ghost" style="margin:0;color:var(--ink)">Choose photo<input type="file" accept="image/*" class="hide" id="pfile"></label></div>
        <div class="row" style="margin-top:16px"><button id="pok">${e.isNew ? 'Add project' : 'Apply changes'}</button><button class="ghost" id="pcancel">Cancel</button></div></div>` : ''}
      ${list.length ? list.map((x) => `<div class="card pj" data-id="${esc(x.id)}"><div class="pjrow"><div class="thumb">${thumb(x) ? `<img src="${esc(thumb(x))}" alt="" onerror="this.replaceWith(document.createTextNode('No photo'))">` : '<span>No photo</span>'}</div>
        <div class="pjmain"><h3>${esc(x.title)}</h3><div class="meta"><span class="tag">${esc(x.tag)}</span> ${x.when ? esc(x.when) : ''}</div><p class="mut">${esc(x.text)}</p></div></div>
        <div class="row" style="margin-top:12px"><div class="seg sm" data-st>${['ongoing', 'completed'].map((s) => `<button data-s="${s}" class="${x.status === s ? 'on ' + s : ''}">${s === 'ongoing' ? 'Ongoing' : 'Completed'}</button>`).join('')}</div><span class="sp"></span>
        <button class="ghost s" data-a="up" title="Move up" style="padding:7px 10px">▲</button><button class="ghost s" data-a="down" title="Move down" style="padding:7px 10px">▼</button><button class="ghost s" data-a="edit" style="padding:7px 12px;font-size:13px">Edit</button><button class="ghost s" data-a="del" style="color:var(--bad);padding:7px 12px;font-size:13px">Delete</button></div></div>`).join('') : '<div class="card"><div class="empty">No projects here yet. Tap “+ Add project”.</div></div>'}
      <div class="save"><button id="saveBtn" ${P.dirty ? '' : 'disabled'}>Save projects</button></div>`;
    p.querySelectorAll('#flt button').forEach((b) => b.addEventListener('click', () => { P.filter = b.dataset.f; draw(); }));
    $('#addP').addEventListener('click', () => { P.edit = { id: 'n' + Date.now().toString(36), title: '', text: '', tag: 'Construction', status: 'ongoing', when: '', image: '', isNew: true }; draw(); $('#pform').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    if (e) {
      p.querySelectorAll('#pst button').forEach((b) => b.addEventListener('click', () => { e.status = b.dataset.s; p.querySelectorAll('#pst button').forEach((x) => x.classList.toggle('on', x === b)); }));
      $('#pcancel').addEventListener('click', () => { P.edit = null; draw(); });
      const grab = () => { e.title = $('#pjTitle').value.trim(); e.text = $('#pjText').value.trim(); e.tag = $('#pjType').value; e.when = $('#pjWhen').value.trim(); };
      $('#pfile').addEventListener('change', async (ev) => { const f = ev.target.files[0]; if (!f) return; grab(); try { note($('#msg'), 'info', 'Uploading photo…'); const data = await compress(f); const up = await api('photos/project-' + e.id, { method: 'PUT', body: { data } }); IDX['project-' + e.id] = up.updated; note($('#msg'), 'ok', 'Photo saved.'); draw(); } catch (er) { note($('#msg'), 'err', friendly(er)); } });
      $('#pok').addEventListener('click', () => { grab(); if (!e.title) { note($('#msg'), 'err', 'Please type the project title.'); $('#pjTitle').focus(); return; } const { isNew, ...clean } = e; if (isNew) P.items.unshift(clean); else P.items = P.items.map((x) => (x.id === clean.id ? clean : x)); P.edit = null; P.dirty = true; draw(); });
    }
    p.querySelectorAll('.pj').forEach((c) => {
      const id = c.dataset.id, i = P.items.findIndex((x) => x.id === id), it = P.items[i];
      c.querySelectorAll('[data-st] button').forEach((b) => b.addEventListener('click', () => { if (it.status === b.dataset.s) return; it.status = b.dataset.s; P.dirty = true; draw(); }));
      c.querySelector('[data-a=edit]').addEventListener('click', () => { P.edit = { ...it }; draw(); $('#pform').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
      c.querySelector('[data-a=del]').addEventListener('click', async () => { if (!confirm('Delete “' + it.title + '”?')) return; P.items.splice(i, 1); P.dirty = true; if (IDX['project-' + id]) { try { await api('photos/project-' + id, { method: 'DELETE' }); delete IDX['project-' + id]; } catch (er) {} } draw(); });
      c.querySelector('[data-a=up]').addEventListener('click', () => { if (i > 0) { [P.items[i - 1], P.items[i]] = [P.items[i], P.items[i - 1]]; P.dirty = true; draw(); } });
      c.querySelector('[data-a=down]').addEventListener('click', () => { if (i < P.items.length - 1) { [P.items[i + 1], P.items[i]] = [P.items[i], P.items[i + 1]]; P.dirty = true; draw(); } });
    });
    $('#saveBtn').addEventListener('click', async () => { $('#saveBtn').disabled = true; try { const r = await api('projects', { method: 'PUT', body: { items: P.items } }); P.items = r.items; P.dirty = false; P.fromSite = false; note($('#msg'), 'ok', 'Saved. Your website now shows these projects.'); draw(); } catch (er) { note($('#msg'), 'err', friendly(er)); $('#saveBtn').disabled = false; } });
  }
  draw();
}

/* ---------- page text ---------- */
const PAGES = ['index', 'about', 'projects', 'consulting', 'laundry'];
let TXT = null;
async function loadText() {
  if (TXT) return TXT;
  const f = [];
  for (const pg of PAGES) { try { const h = await (await fetch(pg + '.html', { cache: 'no-store' })).text(); const d = new DOMParser().parseFromString(h, 'text/html'); d.querySelectorAll('[data-cms]').forEach((el) => f.push({ key: el.dataset.cms, label: el.dataset.cmsLabel || el.dataset.cms, page: pg, def: el.textContent.trim().replace(/\s+/g, ' ') })); } catch (e) {} }
  TXT = { fields: f, vals: (await api('text')).vals || {} }; return TXT;
}
async function pageText() {
  const p = $('#panel'); p.innerHTML = skel(3);
  let T; try { T = await loadText(); } catch (e) { p.innerHTML = `<div class="card"><div class="msg err">${esc(friendly(e))}</div></div>`; return; }
  const names = { index: 'Home page', about: 'About page', projects: 'Projects page', consulting: 'Building Consultancy page', laundry: 'Dry Cleaning & Laundry page' };
  p.innerHTML = `<h1 class="pt">Page text</h1><p class="ps">Change the wording on your pages. Leave a box empty to go back to the original text.</p><div id="msg"></div>` +
    PAGES.map((pg) => { const fs = T.fields.filter((x) => x.page === pg); return fs.length ? `<div class="card"><h3 style="margin-top:0">${names[pg]}</h3>${fs.map((x) => `<label>${esc(x.label)}</label><textarea data-k="${esc(x.key)}" placeholder="${esc(x.def)}">${esc(T.vals[x.key] || '')}</textarea>`).join('')}</div>` : ''; }).join('') +
    '<div class="save"><button id="saveBtn">Save text</button></div>';
  $('#saveBtn').addEventListener('click', async () => {
    const vals = {}; p.querySelectorAll('textarea').forEach((t) => { const v = t.value.trim(); if (v) vals[t.dataset.k] = v; });
    try { await api('text', { method: 'PUT', body: { vals } }); T.vals = vals; note($('#msg'), 'ok', 'Saved. The website now shows your wording.'); window.scrollTo(0, 0); } catch (e) { note($('#msg'), 'err', friendly(e)); }
  });
}

/* ---------- photos ---------- */
const SLOTS = [['Homepage cards', [['water', 'Water Purification'], ['materials', 'Building Materials'], ['engineering', 'Engineering'], ['realestate', 'Real Estate'], ['frozen', 'Frozen Food'], ['distribution', 'Distribution'], ['consulting', 'Building Consultancy'], ['laundry', 'Dry Cleaning & Laundry']]],
  ['Homepage & About', [['team', 'Homepage team photo'], ['about', 'About page photo'], ['ceo', 'Founder & CEO']]],
  ['Projects', [['project1', 'Project 1'], ['project2', 'Project 2'], ['project3', 'Project 3'], ['project4', 'Project 4'], ['project5', 'Project 5'], ['project6', 'Project 6'], ['team-equipment', 'Projects team / equipment']]],
  ['Service pages', [['construction-process', 'Engineering page'], ['consulting-process', 'Consultancy page'], ['laundry-process', 'Laundry page'], ['fleet', 'Distribution page'], ['water-feature', 'Water page'], ['materials-feature', 'Materials page'], ['realestate-feature', 'Real estate page'], ['frozen-feature', 'Frozen food page']]]];
async function photos() {
  const p = $('#panel'); p.innerHTML = skel(3);
  try { if (!IDX) IDX = (await api('photos')).ids || {}; } catch (e) { p.innerHTML = `<div class="card"><div class="msg err">${esc(friendly(e))}</div></div>`; return; }
  const id = (path) => path.replace(/\//g, '__');
  const row = ([path, label]) => `<div class="ph" data-path="${esc(path)}"><div class="nop"><span>Loading</span></div><div class="grow" style="flex:1"><b>${esc(label)}</b><div class="mut" style="font-size:12px">images/${esc(path)}.jpg ${IDX[id(path)] ? '· <span style="color:var(--ok)">uploaded here</span>' : ''}</div>
    <div class="row" style="margin-top:6px"><label class="btn" style="margin:0;padding:7px 12px">Choose photo<input type="file" accept="image/*" class="hide"></label>${IDX[id(path)] ? '<button class="ghost danger" data-rm style="color:#fff;padding:7px 12px">Remove</button>' : ''}</div></div></div>`;
  p.innerHTML = '<h1 class="pt">Photos</h1><p class="ps">Choose a photo and it replaces the one on the website. Pictures are shrunk automatically so pages stay fast.</p><div id="msg"></div>' +
    SLOTS.map(([g, items]) => `<div class="card"><h3 style="margin-top:0">${g}</h3>${items.map(row).join('')}</div>`).join('') +
    `<div class="card"><h3 style="margin-top:0">Other photo (advanced)</h3><p class="mut" style="margin-top:0">For product category pictures, type the path, e.g. <b>categories/frozen/fish</b></p><div class="row"><input class="grow" id="cp" placeholder="categories/frozen/fish"><label class="btn" style="margin:0">Choose photo<input type="file" accept="image/*" class="hide" id="cf"></label></div></div>`;
  p.querySelectorAll('.ph').forEach(async (el) => {
    const path = el.dataset.path, box = el.querySelector('.nop');
    try { const src = IDX[id(path)] ? 'api/photo/' + id(path) + '?v=' + IDX[id(path)] : 'images/' + path + '.jpg'; const im = new Image(); im.onload = () => box.replaceWith(im); im.onerror = () => { box.innerHTML = '<span>No photo yet</span>'; }; im.src = src; } catch (e) { box.innerHTML = '<span>—</span>'; }
    el.querySelector('input[type=file]').addEventListener('change', (e) => upload(path, e.target.files[0]));
    const rm = el.querySelector('[data-rm]'); if (rm) rm.addEventListener('click', async () => { if (!confirm('Remove the uploaded photo? The website goes back to the file in the images folder.')) return; try { await api('photos/' + id(path), { method: 'DELETE' }); delete IDX[id(path)]; photos(); } catch (er) { note($('#msg'), 'err', friendly(er)); } });
  });
  $('#cf').addEventListener('change', (e) => { const v = $('#cp').value.trim().replace(/^\/+|\.[a-z]+$/gi, ''); if (!/^[a-z0-9\-_/]+$/i.test(v)) { note($('#msg'), 'err', 'Type the photo path first, using letters, numbers and dashes only.'); return; } upload(v, e.target.files[0]); });
  async function upload(path, file) {
    if (!file) return; note($('#msg'), 'info', 'Uploading…');
    try {
      const bmp = await new Promise((ok, no) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = u; });
      let w = bmp.naturalWidth, h = bmp.naturalHeight; const m = Math.max(w, h) > 1400 ? 1400 / Math.max(w, h) : 1; w = Math.round(w * m); h = Math.round(h * m);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(bmp, 0, 0, w, h);
      let q = 0.84, data = cv.toDataURL('image/jpeg', q); while (data.length > 900000 && q > 0.4) { q -= 0.08; data = cv.toDataURL('image/jpeg', q); }
      if (data.length > 950000) throw new Error('That photo is too large even after shrinking. Try a smaller one.');
      const up = await api('photos/' + id(path), { method: 'PUT', body: { data } }); IDX[id(path)] = up.updated;
      note($('#msg'), 'ok', 'Photo saved. The website now uses it.'); photos();
    } catch (er) { note($('#msg'), 'err', friendly(er)); }
  }
}
boot();
