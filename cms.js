/* Public-site connector for the admin area (Cloudflare). Safe by design: if the backend is not there
   (for example on a plain static host) or is unreachable, this does nothing and the site shows its
   normal built-in content. */
(function () {
  'use strict';
  var done, api = window.OscaCMS = { enabled: false, text: {}, ov: {}, extra: [], idx: {} };
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

  var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 5000);
  fetch('api/content', { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
    .then(function (r) { if (!r.ok || !/json/.test(r.headers.get('content-type') || '')) throw new Error('no backend'); return r.json(); })
    .then(function (d) { api.text = d.text || {}; api.ov = d.overrides || {}; api.extra = d.extra || []; api.idx = d.photos || {}; api.enabled = true; })
    .catch(function () {})
    .then(function () {
      clearTimeout(timer); done();
      if (!api.enabled) return;
      function go() { applyText(); scan(document); }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
      if (window.MutationObserver) new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n); }); }); }).observe(document.documentElement, { childList: true, subtree: true });
    });
})();
