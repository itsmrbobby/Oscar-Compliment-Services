/**
 * Osca Complement Services — product catalog, property listings, quote list.
 * Reads a CSV (a published Google Sheet, or the bundled data/*.csv fallback),
 * so prices can be changed by editing a spreadsheet — no server needed.
 * All sheet content is rendered with textContent (never innerHTML).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OscaCatalog = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- pure helpers (unit-tested in node) ---------- */

  function parseCSV(text) {
    text = String(text == null ? '' : text).replace(/^\uFEFF/, '');
    var rows = [], row = [], field = '', inQ = false, i = 0, c;
    while (i < text.length) {
      c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { inQ = true; i++; continue; }
      if (c === ',') { row.push(field); field = ''; i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += c; i++;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (v) { return String(v).trim() !== ''; }); });
  }

  function normKey(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function rowsToObjects(rows) {
    if (!rows.length) return [];
    var keys = rows[0].map(normKey);
    return rows.slice(1).map(function (r) {
      var o = {};
      keys.forEach(function (k, i) { if (k) o[k] = (r[i] == null ? '' : String(r[i])).trim(); });
      return o;
    });
  }

  function parsePrice(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return { kind: 'none' };
    var m = s.match(/^(?:₦|NGN|N)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:naira)?$/i);
    if (m) {
      var n = parseFloat(m[1].replace(/,/g, ''));
      return n > 0 ? { kind: 'number', value: n } : { kind: 'none' };
    }
    return { kind: 'text', text: s.slice(0, 40) };
  }

  function formatNaira(n) {
    return '₦' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function parseDate(raw) {
    var s = String(raw == null ? '' : raw).trim(), m, d;
    if (!s) return null;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    else if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/))) d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])); // day first (Nigeria)
    else if (/^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}$/.test(s)) {
      var t = Date.parse(s + ' UTC'); d = isNaN(t) ? null : new Date(t);
    } else return null;
    return d && !isNaN(d.getTime()) && d.getUTCFullYear() > 2000 ? d : null;
  }
  function formatDate(d) { return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }

  function unitSlug(name) {
    var n = String(name || '').toLowerCase();
    if (n.indexOf('frozen') > -1) return 'frozen';
    if (n.indexOf('building') > -1 || n.indexOf('material') > -1) return 'materials';
    if (n.indexOf('water') > -1) return 'water';
    if (n.indexOf('general') > -1 || n.indexOf('suppl') > -1) return 'general';
    return n.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'other';
  }

  function normStatus(s) {
    s = String(s || '').trim().toLowerCase();
    if (/^(hidden|hide|no|inactive|off)$/.test(s)) return 'hidden';
    if (/out|sold ?out|unavailable/.test(s)) return 'out';
    if (/limited|low/.test(s)) return 'limited';
    return 'available';
  }

  function normaliseProducts(objs) {
    var out = [];
    objs.forEach(function (o) {
      var name = o.product || o.productname || o.name;
      if (!name) return;
      var status = normStatus(o.status);
      if (status === 'hidden') return;
      var p = parsePrice(o.price);
      out.push({
        sku: o.sku || '', unit: o.businessunit || 'Other', unitSlug: unitSlug(o.businessunit),
        category: o.category || 'Other', name: name, soldBy: o.soldby || '',
        price: p, pricePer: o.priceper || '', status: status, updated: parseDate(o.updated)
      });
    });
    return out;
  }

  function normaliseListings(objs) {
    var out = [];
    objs.forEach(function (o) {
      if (!o.title) return;
      var status = normStatus(o.status);
      if (status === 'hidden') return;
      var raw = String(o.status || '').trim().toLowerCase();
      out.push({
        id: o.id || '', title: o.title, type: o.type || '', location: o.location || '', size: o.size || '',
        price: parsePrice(o.price), details: o.details || '',
        state: /reserved/.test(raw) ? 'reserved' : /sold/.test(raw) ? 'sold' : 'available',
        updated: parseDate(o.updated)
      });
    });
    var rank = { available: 0, reserved: 1, sold: 2 };
    return out.sort(function (a, b) { return rank[a.state] - rank[b.state]; });
  }

  function filterProducts(items, f) {
    var words = String(f.query || '').toLowerCase().split(/\s+/).filter(Boolean);
    var base = items.filter(function (p) {
      if (f.unit && p.unitSlug !== f.unit) return false;
      if (f.category && p.category !== f.category) return false;
      return true;
    });
    if (!words.length) return base;
    function all(p, extra) {
      var hay = (p.name + ' ' + p.sku + (extra ? ' ' + p.category + ' ' + p.unit : '')).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) > -1; });
    }
    // Prefer products whose NAME matches; only fall back to category/unit text
    // when nothing matches by name (so "iron rod" doesn't return angle iron).
    var byName = base.filter(function (p) { return all(p, false); });
    return byName.length ? byName : base.filter(function (p) { return all(p, true); });
  }

  function uniqueInOrder(arr) {
    var seen = {}, out = [];
    arr.forEach(function (v) { if (!seen[v]) { seen[v] = 1; out.push(v); } });
    return out;
  }

  function quoteLines(items) {
    return items.map(function (it, i) {
      return (i + 1) + '. ' + it.name + (it.soldBy ? ' (' + it.soldBy + ')' : '');
    });
  }

  function whatsappUrl(number, items) {
    var digits = String(number || '').replace(/\D/g, '');
    if (!digits) return '';
    var text = 'Hello Osca Complement Services, I would like a quote for:\n' + quoteLines(items).join('\n');
    return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(text);
  }


  function slugify(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  // Line icons shown on a category tile until its photo exists (constant markup, never sheet data).
  var ICONS = {
    droplet: '<path d="M12 2.5C12 2.5 5.5 11 5.5 15.5a6.5 6.5 0 0 0 13 0C18.5 11 12 2.5 12 2.5z"/><path d="M8.8 15.5a3.2 3.2 0 0 0 3.2 3.2"/>',
    brick: '<rect x="2.5" y="4" width="7" height="5"/><rect x="14.5" y="4" width="7" height="5"/><rect x="2.5" y="15" width="7" height="5"/><rect x="14.5" y="15" width="7" height="5"/><line x1="9.5" y1="6.5" x2="14.5" y2="6.5"/><line x1="9.5" y1="17.5" x2="14.5" y2="17.5"/>',
    crane: '<line x1="4.5" y1="21" x2="4.5" y2="4"/><line x1="4.5" y1="4" x2="18" y2="4"/><line x1="4.5" y1="9" x2="10.5" y2="4"/><line x1="18" y1="4" x2="18" y2="10.5"/><line x1="18" y1="10.5" x2="13.5" y2="10.5"/><line x1="13.5" y1="10.5" x2="13.5" y2="15"/>',
    house: '<path d="M3 11l9-7.5 9 7.5"/><path d="M5 10v10.5h14V10"/><path d="M9.5 20.5v-6.5h5v6.5"/>',
    snow: '<line x1="12" y1="3" x2="12" y2="21"/><line x1="5" y1="7.5" x2="19" y2="16.5"/><line x1="19" y1="7.5" x2="5" y2="16.5"/>',
    box: '<path d="M3 8l9-5 9 5-9 5-9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    warehouse: '<rect x="3" y="9" width="18" height="11"/><path d="M3 9l9-5 9 5"/><line x1="9" y1="13" x2="9" y2="20"/><line x1="15" y1="13" x2="15" y2="20"/>',
    shield: '<path d="M12 2l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V5z"/><path d="M8.5 12l2.5 2.5L16 9.5"/>',
    clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 2h6v3H9z"/><path d="M8 11.5l1.5 1.5L14 9"/><line x1="8" y1="17" x2="16" y2="17"/>',
    office: '<rect x="5" y="3" width="14" height="18"/><line x1="8.5" y1="7" x2="8.5" y2="7.01"/><line x1="12" y1="7" x2="12" y2="7.01"/><line x1="15.5" y1="7" x2="15.5" y2="7.01"/><line x1="8.5" y1="11.5" x2="8.5" y2="11.51"/><line x1="12" y1="11.5" x2="12" y2="11.51"/><line x1="15.5" y1="11.5" x2="15.5" y2="11.51"/><line x1="8.5" y1="16" x2="8.5" y2="16.01"/><line x1="12" y1="16" x2="12" y2="16.01"/><line x1="15.5" y1="16" x2="15.5" y2="16.01"/>',
    terrain: '<path d="M2.5,20.5 L8.5,8.5 L12.5,14.5 L15.5,10 L21.5,20.5 Z"/>',
    truck: '<rect x="1.5" y="7" width="12.5" height="9"/><path d="M14 10h4l3.5 3.2V16H14z"/><circle cx="6" cy="18" r="1.7"/><circle cx="17" cy="18" r="1.7"/>'
  };
  var ICON_RULES = [
    [/fish|seafood|prawn|shrimp|water filter|beverage|plumbing|waterproof/, 'droplet'],
    [/uv|disinfect/, 'shield'],
    [/sand|aggregate|vegetable|fruit|potato/, 'terrain'],
    [/block|paver|cement|concrete|timber|board/, 'brick'],
    [/iron|steel|industrial/, 'crane'],
    [/roof|household|personal/, 'house'],
    [/door|window|ceiling|tile|floor/, 'office'],
    [/tank|pump|kitchen|packag|pastr|ready|processed/, 'warehouse'],
    [/electric|hardware|tool|ro\b|electronic|appliance|paint|finish/, 'gear'],
    [/part|consumable/, 'clip'],
    [/chicken|turkey|beef|offal|goat|sheep|pork|meat|grocer|staple/, 'box']
  ];
  var UNIT_ICON = { frozen: 'snow', materials: 'brick', water: 'droplet', general: 'box' };
  function iconFor(unitSlug, category) {
    var c = String(category || '').toLowerCase();
    for (var i = 0; i < ICON_RULES.length; i++) if (ICON_RULES[i][0].test(c)) return ICON_RULES[i][1];
    return UNIT_ICON[unitSlug] || 'box';
  }
  function iconSvg(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.box) + '</svg>';
  }

  var UNIT_TO_QUOTE_OPTION = {
    'Frozen Food': 'Frozen Food Distribution', 'General Supplies': 'General Distribution',
    'Water Purification': 'Water Purification', 'Building Materials': 'Building Materials'
  };
  var SLUG_TO_QUOTE_OPTION = {
    frozen: 'Frozen Food Distribution', general: 'General Distribution', water: 'Water Purification',
    materials: 'Building Materials', realestate: 'Real Estate', engineering: 'Engineering & Construction'
  };

  var api = {
    parseCSV: parseCSV, rowsToObjects: rowsToObjects, parsePrice: parsePrice, formatNaira: formatNaira,
    parseDate: parseDate, formatDate: formatDate, unitSlug: unitSlug, normStatus: normStatus,
    normaliseProducts: normaliseProducts, normaliseListings: normaliseListings,
    filterProducts: filterProducts, uniqueInOrder: uniqueInOrder, quoteLines: quoteLines,
    whatsappUrl: whatsappUrl, slugify: slugify, iconFor: iconFor, iconSvg: iconSvg, UNIT_TO_QUOTE_OPTION: UNIT_TO_QUOTE_OPTION, SLUG_TO_QUOTE_OPTION: SLUG_TO_QUOTE_OPTION
  };

  /* ---------- browser behaviour ---------- */
  if (typeof document === 'undefined') return api;

  var CFG = window.OSCA_CONFIG || {};
  var KEY = 'osca_quote_v1';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // --- quote list storage (localStorage, fails safe) ---
  function getQuote() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function setQuote(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }
  function inQuote(sku) { return getQuote().some(function (i) { return i.sku === sku; }); }
  function toggleQuote(p) {
    var list = getQuote(), idx = -1;
    list.forEach(function (i, n) { if (i.sku === p.sku) idx = n; });
    if (idx > -1) list.splice(idx, 1);
    else list.push({ sku: p.sku, name: p.name, soldBy: p.soldBy, unit: p.unit });
    setQuote(list); return list;
  }

  // --- data loading: live sheet first, bundled CSV as a safe fallback ---
  function fetchText(url, ms) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, ms) : null;
    return fetch(url, ctl ? { signal: ctl.signal, cache: 'no-store' } : { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (t) { if (timer) clearTimeout(timer); return t; },
            function (e) { if (timer) clearTimeout(timer); throw e; });
  }
  function loadObjects(remote, local, mustHave) {
    function tryUrl(url, ms) {
      return fetchText(url, ms).then(function (t) {
        var objs = rowsToObjects(parseCSV(t));
        if (!objs.length || !objs.some(function (o) { return o[mustHave] !== undefined; })) throw new Error('Unexpected data');
        return objs;
      });
    }
    if (remote) return tryUrl(remote, 8000).catch(function () { return tryUrl(local, 8000); });
    return tryUrl(local, 8000);
  }

  function priceNode(p) {
    var wrap = el('div', 'product-price');
    if (p.price.kind === 'number') {
      wrap.appendChild(el('strong', null, formatNaira(p.price.value)));
      if (p.pricePer) wrap.appendChild(el('small', null, ' per ' + p.pricePer));
    } else if (p.price.kind === 'text') {
      wrap.appendChild(el('strong', 'price-text', p.price.text));
    } else {
      wrap.appendChild(el('span', 'price-request', 'Price on request'));
    }
    return wrap;
  }

  /* ---------- products page: category picture grid -> product list ---------- */
  function initCatalog(app) {
    var tabsEl = document.getElementById('unitTabs'), chipsEl = document.getElementById('catChips'),
        gridEl = document.getElementById('catGrid'), crumbsEl = document.getElementById('catCrumbs'),
        listEl = document.getElementById('catList'), metaEl = document.getElementById('catMeta'),
        noteEl = document.getElementById('catNote'), searchEl = document.getElementById('catSearch'),
        bar = document.getElementById('quoteBar'), barCount = document.getElementById('quoteBarCount'),
        barWa = document.getElementById('quoteBarWa'), barClear = document.getElementById('quoteBarClear');
    var items = [], units = [];
    var state = { unit: '', cat: '', all: false, query: '' };

    function refreshBar() {
      var q = getQuote();
      bar.hidden = q.length === 0;
      document.body.classList.toggle('has-quote-bar', q.length > 0);
      barCount.textContent = q.length + (q.length === 1 ? ' item selected' : ' items selected');
      var wa = whatsappUrl(CFG.whatsappDigits, q);
      barWa.hidden = !wa; if (wa) barWa.href = wa;
    }

    function catsOf(unit) { return uniqueInOrder(items.filter(function (p) { return p.unitSlug === unit; }).map(function (p) { return p.category; })); }
    function catBySlug(unit, slug) { var r = ''; catsOf(unit).forEach(function (c) { if (slugify(c) === slug) r = c; }); return r; }

    function urlFor(st) {
      var q = new URLSearchParams();
      if (st.unit) q.set('unit', st.unit);
      if (st.cat) q.set('cat', slugify(st.cat));
      if (st.all) q.set('all', '1');
      var qs = q.toString(); return qs ? '?' + qs : location.pathname;
    }
    function go(next, replace) {
      state.unit = next.unit != null ? next.unit : state.unit;
      state.cat = next.cat || ''; state.all = !!next.all;
      try { history[replace ? 'replaceState' : 'pushState'](null, '', urlFor(state)); } catch (e) {}
      render(); window.scrollTo && window.scrollTo(0, app.getBoundingClientRect().top + window.pageYOffset - 100);
    }
    function readURL() {
      var p = new URLSearchParams(location.search), slugs = units.map(function (u) { return u.slug; });
      var u = p.get('unit');
      state.unit = slugs.indexOf(u) > -1 ? u : slugs[0];
      state.cat = catBySlug(state.unit, p.get('cat') || '');
      state.all = !state.cat && p.get('all') === '1';
    }
    function link(text, st, cls) {
      var a = el('a', cls, text); a.href = urlFor(Object.assign({ unit: state.unit }, st));
      a.addEventListener('click', function (e) { e.preventDefault(); go(st); });
      return a;
    }

    function renderTabs() {
      tabsEl.textContent = '';
      units.forEach(function (u) {
        var on = state.unit === u.slug && !state.query.trim();
        var b = el('button', 'tab' + (on ? ' active' : ''), u.name);
        b.type = 'button'; b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.addEventListener('click', function () { searchEl.value = ''; state.query = ''; go({ unit: u.slug }); });
        tabsEl.appendChild(b);
      });
    }
    function renderChips() {
      chipsEl.textContent = '';
      var all = el('button', 'chip' + (state.all ? ' active' : ''), 'All'); all.type = 'button';
      all.setAttribute('aria-pressed', state.all ? 'true' : 'false');
      all.addEventListener('click', function () { go({ all: true }); });
      chipsEl.appendChild(all);
      catsOf(state.unit).forEach(function (c) {
        var on = state.cat === c, b = el('button', 'chip' + (on ? ' active' : ''), c); b.type = 'button';
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.addEventListener('click', function () { go({ cat: c }); });
        chipsEl.appendChild(b);
      });
    }
    function tile(c) {
      var count = items.filter(function (p) { return p.unitSlug === state.unit && p.category === c; }).length;
      var a = el('a', 'cat-tile'); a.href = urlFor({ unit: state.unit, cat: c });
      a.setAttribute('aria-label', c + ', ' + count + (count === 1 ? ' product' : ' products'));
      a.addEventListener('click', function (e) { e.preventDefault(); go({ cat: c }); });
      var media = el('div', 'cat-media');
      var fb = el('div', 'cat-fallback'); fb.innerHTML = iconSvg(iconFor(state.unit, c)); media.appendChild(fb);
      var img = document.createElement('img');
      img.alt = ''; img.loading = 'lazy'; img.width = 400; img.height = 300;
      img.src = 'images/categories/' + state.unit + '/' + slugify(c) + '.jpg';
      img.addEventListener('error', function () { img.remove(); });
      media.appendChild(img); a.appendChild(media);
      var body = el('div', 'cat-body');
      body.appendChild(el('span', 'cat-name', c));
      body.appendChild(el('span', 'cat-count', count + (count === 1 ? ' product' : ' products')));
      a.appendChild(body); return a;
    }
    function row(p) {
      var r = el('div', 'product-row' + (p.status === 'out' ? ' is-out' : ''));
      var info = el('div', 'product-info');
      // Photo: images/products/<SKU>.jpg, else the category photo, else nothing.
      var thumb = document.createElement('img');
      thumb.alt = ''; thumb.loading = 'lazy'; thumb.width = 64; thumb.height = 48; thumb.className = 'product-thumb';
      var tried = 0;
      thumb.addEventListener('error', function () {
        tried++;
        if (tried === 1) thumb.src = 'images/categories/' + p.unitSlug + '/' + slugify(p.category) + '.jpg';
        else { var ph = el('div', 'product-thumb ph', (p.name || '?').charAt(0).toUpperCase()); if (thumb.parentNode) thumb.parentNode.replaceChild(ph, thumb); }
      });
      thumb.src = p.sku ? 'images/products/' + encodeURIComponent(p.sku) + '.jpg' : 'images/categories/' + p.unitSlug + '/' + slugify(p.category) + '.jpg';
      info.appendChild(thumb);
      var text = el('div', 'product-text');
      text.appendChild(el('span', 'product-name', p.name));
      if (p.soldBy) text.appendChild(el('span', 'product-sold', 'Sold by: ' + p.soldBy));
      info.appendChild(text);
      r.appendChild(info);
      r.appendChild(priceNode(p));
      r.appendChild(el('span', 'badge ' + p.status, p.status === 'out' ? 'Out of stock' : p.status === 'limited' ? 'Limited stock' : 'Available'));
      var add = el('button', 'btn-add'); add.type = 'button';
      function paint() {
        var on = inQuote(p.sku);
        add.textContent = p.status === 'out' ? 'Unavailable' : on ? 'Added ✓' : 'Add to quote';
        add.setAttribute('aria-pressed', on ? 'true' : 'false'); add.classList.toggle('on', on);
        add.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + p.name + (on ? ' from' : ' to') + ' quote list');
      }
      add.disabled = p.status === 'out'; paint();
      add.addEventListener('click', function () { toggleQuote(p); paint(); refreshBar(); });
      r.appendChild(add); return r;
    }

    function render() {
      var searching = state.query.trim() !== '';
      var unitName = (units.filter(function (u) { return u.slug === state.unit; })[0] || {}).name || '';
      renderTabs();
      gridEl.textContent = ''; listEl.textContent = ''; crumbsEl.textContent = '';
      var showGrid = !searching && !state.cat && !state.all;
      gridEl.hidden = !showGrid; chipsEl.hidden = showGrid || searching; crumbsEl.hidden = showGrid || searching;

      if (showGrid) {
        var cats = catsOf(state.unit), frag = document.createDocumentFragment();
        cats.forEach(function (c) { frag.appendChild(tile(c)); });
        gridEl.appendChild(frag);
        metaEl.textContent = cats.length + ' categories in ' + unitName + ' · ';
        metaEl.appendChild(link('View all ' + unitName + ' products', { all: true }, 'catalog-viewall'));
        return;
      }
      if (!searching) {
        renderChips();
        crumbsEl.appendChild(link('All categories', {}, 'crumb-back'));
        crumbsEl.appendChild(el('span', 'crumb-sep', '›'));
        crumbsEl.appendChild(el('span', 'crumb-now', state.cat ? unitName + ' · ' + state.cat : unitName + ' · All products'));
      }
      var shown = filterProducts(items, { unit: searching ? '' : state.unit, category: searching ? '' : state.cat, query: state.query });
      var frag2 = document.createDocumentFragment();
      if (!shown.length) {
        frag2.appendChild(el('p', 'catalog-empty', 'No products match your search. Try a different word, or request any product — we source it for you.'));
      } else {
        var last = null;
        shown.forEach(function (p) {
          var head = searching ? p.unit + ' · ' + p.category : p.category;
          if ((searching || !state.cat) && head !== last) { frag2.appendChild(el('h3', 'catalog-cat', head)); last = head; }
          frag2.appendChild(row(p));
        });
      }
      listEl.appendChild(frag2);
      metaEl.textContent = shown.length + (shown.length === 1 ? ' product' : ' products') + (searching ? ' found across all categories' : '');
    }

    loadObjects(CFG.priceSheetCsv, 'data/products.csv', 'product').then(function (objs) {
      items = normaliseProducts(objs);
      if (!items.length) throw new Error('empty');
      var seen = {}; units = [];
      items.forEach(function (p) { if (!seen[p.unitSlug]) { seen[p.unitSlug] = 1; units.push({ slug: p.unitSlug, name: p.unit }); } });
      var priced = items.filter(function (p) { return p.price.kind !== 'none'; });
      var dates = items.map(function (p) { return p.updated; }).filter(Boolean).sort(function (a, b) { return b - a; });
      noteEl.textContent = priced.length
        ? 'Prices are in Nigerian Naira (₦) and may change with market conditions. Your final price and availability are confirmed in your quote.' + (dates.length ? ' Prices last updated ' + formatDate(dates[0]) + '.' : '')
        : 'Our price list is being finalised. Add the items you need to your quote list and we will send you current prices within 24 hours.';
      readURL(); render(); refreshBar();
      window.addEventListener('popstate', function () { readURL(); render(); });
    }).catch(function () {
      metaEl.textContent = '';
      listEl.textContent = '';
      listEl.appendChild(el('p', 'catalog-empty', 'The product list could not be loaded right now. Please request a quote and tell us what you need — we will respond within 24 hours.'));
    });

    var t; searchEl.addEventListener('input', function () {
      clearTimeout(t); t = setTimeout(function () { state.query = searchEl.value; if (items.length) render(); }, 120);
    });
    barClear.addEventListener('click', function () { setQuote([]); if (items.length) render(); refreshBar(); });
  }

  /* ---------- quote page: show selected items, prefill ---------- */
  function initQuotePage(box) {
    var list = getQuote(), ul = document.getElementById('quoteItemsList'),
        count = document.getElementById('quoteItemsCount'),
        hidden = document.getElementById('f-selected_items'),
        product = document.getElementById('f-product'), unitSel = document.getElementById('f-unit');
    var qs = new URLSearchParams(location.search);

    function sync() {
      list = getQuote(); ul.textContent = '';
      box.hidden = list.length === 0;
      count.textContent = '(' + list.length + ')';
      list.forEach(function (it) {
        var li = el('li', null);
        li.appendChild(el('span', null, it.name + (it.soldBy ? ' — ' + it.soldBy : '')));
        var rm = el('button', 'quote-remove', 'Remove'); rm.type = 'button';
        rm.setAttribute('aria-label', 'Remove ' + it.name);
        rm.addEventListener('click', function () { setQuote(getQuote().filter(function (x) { return x.sku !== it.sku; })); sync(); });
        li.appendChild(rm); ul.appendChild(li);
      });
      hidden.value = quoteLines(list).join('\n');
      if (list.length && !product.value.trim()) product.value = 'Items from price list (see selected items)';
      var units = uniqueInOrder(list.map(function (i) { return i.unit; }));
      if (units.length === 1 && UNIT_TO_QUOTE_OPTION[units[0]] && !unitSel.value) unitSel.value = UNIT_TO_QUOTE_OPTION[units[0]];
    }
    var item = qs.get('item'), u = qs.get('unit');
    if (item && !product.value.trim()) product.value = item.slice(0, 200);
    if (u && SLUG_TO_QUOTE_OPTION[u] && !unitSel.value) unitSel.value = SLUG_TO_QUOTE_OPTION[u];
    sync();
    window.addEventListener('osca:form-sent', function () { setQuote([]); sync(); });
  }

  /* ---------- real estate listings ---------- */
  function initListings(app) {
    var out = document.getElementById('listingsList'), empty = document.getElementById('listingsEmpty');
    loadObjects(CFG.listingsSheetCsv, 'data/listings.csv', 'title').then(function (objs) {
      var list = normaliseListings(objs);
      if (!list.length) return;
      empty.hidden = true; out.textContent = '';
      list.forEach(function (p) {
        var c = el('article', 'property-card' + (p.state === 'sold' ? ' is-sold' : ''));
        var top = el('div', 'property-top');
        if (p.type) top.appendChild(el('span', 'listing-tag', p.type));
        top.appendChild(el('span', 'badge ' + (p.state === 'available' ? 'available' : p.state === 'reserved' ? 'limited' : 'out'),
          p.state === 'available' ? 'Available' : p.state === 'reserved' ? 'Reserved' : 'Sold'));
        c.appendChild(top);
        c.appendChild(el('h3', null, p.title));
        var meta = [p.location, p.size].filter(Boolean).join(' · ');
        if (meta) c.appendChild(el('p', 'property-meta', meta));
        if (p.details) c.appendChild(el('p', 'property-details', p.details));
        var foot = el('div', 'property-foot');
        foot.appendChild(el('strong', 'property-price', p.price.kind === 'number' ? formatNaira(p.price.value) : p.price.kind === 'text' ? p.price.text : 'Price on request'));
        if (p.state !== 'sold') {
          var a = el('a', 'btn-small', 'Enquire');
          a.href = 'quote.html?unit=realestate&item=' + encodeURIComponent(p.title);
          foot.appendChild(a);
        }
        c.appendChild(foot); out.appendChild(c);
      });
    }).catch(function () {});
  }

  document.addEventListener('DOMContentLoaded', function () {
    var a;
    if ((a = document.getElementById('catalogApp'))) initCatalog(a);
    if ((a = document.getElementById('quoteItems'))) initQuotePage(a);
    if ((a = document.getElementById('listingsApp'))) initListings(a);
  });

  return api;
});
