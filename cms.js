/* Public-site connector for the admin area (Cloudflare). Safe by design: if the backend is not there
   (for example on a plain static host) or is unreachable, this does nothing and the site shows its
   normal built-in content. */
(function () {
  'use strict';
  var done, api = window.OscaCMS = { enabled: false, text: {}, ov: {}, extra: [], idx: {}, projects: null };
  api.ready = new Promise(function (r) { done = r; });
  api.applyProducts = function (objs) {
    if (!api.enabled) return objs;
    objs = objs.map(function (o) {
      var x = api.ov[o.sku]; if (!x) return o;
      var n = {}; for (var k in o) n[k] = o[k];
      if (x.price !== undefined) n.price = x.price;
      if (x.priceper !== undefined) n.priceper = x.priceper;
      if (x.status) n.status = x.status;
      return n;
    });
    return objs.concat(api.extra);
  };
  api.saveRequest = function (type, f) {
    if (!api.enabled) return Promise.resolve(false);
    return fetch('api/request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      type: type, page: f.page || '', name: f.name || '', phone: f.phone || '', email: f.email || '', message: f.message || '' }) })
      .then(function (r) { return r.ok; }, function () { return false; });
  };

  function applyText() {
    document.querySelectorAll('[data-cms]').forEach(function (el) { var v = api.text[el.getAttribute('data-cms')]; if (v) el.textContent = v; });
  }
  function photoFor(img) {
    var s = img.getAttribute('src') || '', m = s.match(/^images\/(.+?)\.(?:jpg|jpeg|png|webp)$/i);
    if (!m) return; var id = m[1].replace(/\//g, '__');
    if (!api.idx[id] || img.dataset.cmsDone === id) return;
    img.dataset.cmsDone = id; img.style.display = ''; img.src = 'api/photo/' + id + '?v=' + api.idx[id];
  }
  function scan(root) { (root.querySelectorAll ? root.querySelectorAll('img') : []).forEach(photoFor); if (root.tagName === 'IMG') photoFor(root); }


  function renderProjects() {
    if (!api.projects) return;
    document.querySelectorAll('[data-projects]').forEach(function (box) {
      var lim = parseInt(box.getAttribute('data-limit'), 10) || 999, list = api.projects.slice(0, lim);
      box.innerHTML = '';
      list.forEach(function (p) {
        var card = document.createElement('div'); card.className = 'listing-card'; card.setAttribute('data-status', p.status);
        var wrap = document.createElement('div'); wrap.className = 'listing-img';
        var src = api.idx['project-' + p.id] ? 'api/photo/project-' + p.id + '?v=' + api.idx['project-' + p.id] : (p.image || '');
        if (src) { var im = document.createElement('img'); im.src = src; im.alt = p.title; im.loading = 'lazy'; im.width = 600; im.height = 400; im.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0;'; wrap.appendChild(im); }
        var body = document.createElement('div'); body.className = 'listing-body';
        var h = document.createElement('h4'); h.textContent = p.title; var t = document.createElement('p'); t.textContent = p.text;
        var meta = document.createElement('div'); meta.className = 'listing-meta';
        var tag = document.createElement('span'); tag.className = 'listing-tag'; tag.textContent = p.tag;
        var st = document.createElement('span'); st.className = 'listing-price ' + p.status; st.textContent = (p.status === 'ongoing' ? 'Ongoing' : 'Completed') + (p.when ? ' ' + p.when : '');
        meta.appendChild(tag); meta.appendChild(st); body.appendChild(h); body.appendChild(t); body.appendChild(meta); card.appendChild(wrap); card.appendChild(body); box.appendChild(card);
      });
      if (!list.length) { var e = document.createElement('p'); e.className = 'proj-empty'; e.textContent = 'Projects will be listed here soon.'; box.appendChild(e); }
      document.dispatchEvent(new CustomEvent('osca:projects'));
    });
  }

  var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 5000);
  fetch('api/content', { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
    .then(function (r) { if (!r.ok || !/json/.test(r.headers.get('content-type') || '')) throw new Error('no backend'); return r.json(); })
    .then(function (d) { api.text = d.text || {}; api.ov = d.overrides || {}; api.extra = d.extra || []; api.idx = d.photos || {}; api.projects = Array.isArray(d.projects) ? d.projects : null; api.enabled = true; })
    .catch(function () {})
    .then(function () {
      clearTimeout(timer); done();
      if (!api.enabled) return;
      function go() { applyText(); renderProjects(); scan(document); }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
      if (window.MutationObserver) new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n); }); }); }).observe(document.documentElement, { childList: true, subtree: true });
    });
})();
