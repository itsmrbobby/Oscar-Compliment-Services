/**
 * Osca Assistant — a site-wide chat guide that runs entirely in the browser (no server).
 * It can search the product list, build a quote list, take a quote request, give the
 * address / phone / map, guide people to the right page, and hand over to a person on WhatsApp.
 * It is an automated assistant and says so. It never invents prices, stock, delivery, brands
 * or opening hours — anything it does not know goes to the team.
 * All text is rendered with textContent (never innerHTML) so nothing typed or loaded can inject markup.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./catalog.js'));
  else root.OscaAssistant = factory(root.OscaCatalog);
})(typeof self !== 'undefined' ? self : this, function (Cat) {
  'use strict';

  /* =====================================================
     BRAIN (pure, unit-tested in node)
     ===================================================== */
  var STOP = {};
  ('i a an the of for to you your do does did have has any need want get buy price prices cost how much is are what which can could would please pls abeg wetin dey sell selling show me looking look in on with my some quote order supply supplier available stock bag bags carton cartons kg pieces piece and or am im we us our there it this that where when will be at from so just also tell about give list all many purchase like interested info information hi hello hey good morning afternoon evening thanks thank help find search needs wanna ok okay yes no products product items item category categories section range things unit')
    .split(' ').forEach(function (w) { STOP[w] = 1; });

  var SYN = [
    [/\bpure water\b/g, 'sachet water'], [/\bzinc\b/g, 'roofing sheet'], [/\bfridge\b/g, 'refrigerator'],
    [/\bnylon\b/g, 'polythene'], [/\bgen\b/g, 'generator'], [/\bchicken wing\b/g, 'chicken wings']
  ];

  function tokenize(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9.\-\/\s]/g, ' ').split(/\s+/).filter(Boolean); }
  function expand(t) { var s = String(t || '').toLowerCase(); SYN.forEach(function (r) { s = s.replace(r[0], r[1]); }); return s; }
  function norm(t) { return t.replace(/ies$/, 'y').replace(/s$/, ''); }

  function lev(a, b) {
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) { d[i] = [i]; }
    for (j = 1; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }

  var _vocabKey = '', _vocab = [];
  function vocabOf(products) {
    var key = products.length + ':' + (products[0] ? products[0].sku : '') + ':' + (products[products.length - 1] ? products[products.length - 1].sku : '');
    if (key === _vocabKey) return _vocab;
    var seen = {}, out = [];
    products.forEach(function (p) {
      tokenize(p.name + ' ' + p.category + ' ' + p.unit).forEach(function (w) {
        w = w.replace(/^[\-.\/]+|[\-.\/]+$/g, '');
        if (w.length >= 2 && !seen[w]) { seen[w] = 1; out.push(w); }
      });
    });
    _vocabKey = key; _vocab = out; return out;
  }
  function hasWord(vocab, t) {
    if (t.length < 3) return vocab.indexOf(t) > -1;
    return vocab.some(function (w) { return w.indexOf(t) > -1; });
  }
  function nearest(vocab, t) {
    var best = null, bd = 99, max = t.length >= 8 ? 2 : 1;
    vocab.forEach(function (w) {
      if (w.length < 4 || w.charAt(0) !== t.charAt(0) || Math.abs(w.length - t.length) > max) return;
      var d = lev(t, w); if (d <= max && d < bd) { bd = d; best = w; }
    });
    return best;
  }

  function search(q, products) {
    var vocab = vocabOf(products), toks = tokenize(expand(q)).filter(function (t) { return !STOP[t]; });
    var known = [], corrected = false;
    toks.forEach(function (t) {
      if (hasWord(vocab, t)) { known.push(t); return; }
      var s = norm(t);
      if (s.length >= 3 && hasWord(vocab, s)) { known.push(s); return; }
      if (t.length >= 5) { var fix = nearest(vocab, t); if (fix) { known.push(fix); corrected = true; } }
    });
    if (!known.length) return { tokens: [], items: [], byName: false, corrected: false };
    var items = Cat.filterProducts(products, { query: known.join(' ') });
    var byName = items.length > 0 && items.every(function (p) {
      var h = (p.name + ' ' + p.sku).toLowerCase(); return known.every(function (w) { return h.indexOf(w) > -1; });
    });
    return { tokens: known, items: items, byName: byName, corrected: corrected };
  }

  function taxonomy(products) {
    var units = [], cats = [], su = {}, sc = {};
    products.forEach(function (p) {
      if (!su[p.unitSlug]) { su[p.unitSlug] = { type: 'unit', slug: p.unitSlug, name: p.unit, count: 0, cats: [] }; units.push(su[p.unitSlug]); }
      su[p.unitSlug].count++;
      var k = p.unitSlug + '|' + p.category;
      if (!sc[k]) { sc[k] = { type: 'cat', unit: p.unitSlug, unitName: p.unit, name: p.category, slug: Cat.slugify(p.category), count: 0 }; cats.push(sc[k]); su[p.unitSlug].cats.push(sc[k]); }
      sc[k].count++;
    });
    return { units: units, cats: cats };
  }
  function matchTaxonomy(text, products) {
    var qt = tokenize(expand(text)).filter(function (t) { return !STOP[t]; }).map(norm);
    if (!qt.length) return null;
    var tx = taxonomy(products), best = null, bs = 99;
    tx.cats.concat(tx.units).forEach(function (e) {
      var et = tokenize(e.name.replace(/&/g, ' ')).map(norm);
      if (!qt.every(function (t) { return et.indexOf(t) > -1; })) return;
      var score = et.length - qt.length + (e.type === 'unit' ? 0.5 : 0);
      if (score < bs) { bs = score; best = e; }
    });
    return best ? { entry: best, exact: bs < 0.5 } : null;
  }

  function compact(p) {
    return { sku: p.sku, name: p.name, soldBy: p.soldBy, unit: p.unit, unitSlug: p.unitSlug, priceText: Cat.priceText(p), status: p.status };
  }

  /* ---------- message builders ---------- */
  function T(text) { return { from: 'bot', kind: 'text', text: text }; }
  function CH(list) { return { from: 'bot', kind: 'chips', chips: list.map(function (c) { return { label: c[0], say: c[1] }; }) }; }
  function CARD(title, lines, actions) { return { from: 'bot', kind: 'card', title: title, lines: lines || [], actions: actions || [] }; }
  function link(label, href, ext) { return { label: label, href: href, ext: !!ext }; }
  function act(label, say) { return { label: label, say: say }; }

  var PAGES = {
    home: ['index.html', 'Home'], about: ['about.html', 'About us'], projects: ['projects.html', 'Projects'],
    contact: ['contact.html', 'Contact'], products: ['products.html', 'Products & Prices'], quote: ['quote.html', 'Quote form'],
    distribution: ['distribution.html', 'General Distribution'], engineering: ['engineering.html', 'Engineering & Construction'],
    water: ['water.html', 'Water Purification'], materials: ['materials.html', 'Building Materials'],
    realestate: ['realestate.html', 'Real Estate & Land Sales'], frozen: ['frozen.html', 'Frozen Food Distribution']
  };

  function waLink(cfg, text) {
    var d = cfg && cfg.whatsappDigits; return d ? 'https://wa.me/' + d + '?text=' + encodeURIComponent(text) : '';
  }
  function bizName(cfg) { return (cfg && cfg.business && cfg.business.name) || 'Osca Complement Services'; }
  function handoffText(cfg, state, quote) {
    var p = ['Hello ' + bizName(cfg) + ', I was chatting with your website assistant.'];
    if (state && state.lastNeed) p.push('I was asking about: ' + state.lastNeed + '.');
    if (quote && quote.length) p.push('My quote list:\n' + Cat.quoteLines(quote).join('\n'));
    return p.join('\n');
  }
  function humanActions(cfg, state, quote) {
    var a = [], wa = waLink(cfg, handoffText(cfg, state, quote));
    if (wa) a.push(link('Chat on WhatsApp', wa, true));
    if (cfg && cfg.phoneTel) a.push(link('Call ' + cfg.phoneDisplay, 'tel:' + cfg.phoneTel));
    if (!a.length) a.push(link('Open contact page', 'contact.html'));
    return a;
  }

  function pageCtx(page) {
    var talk = ['Talk to a person', 'talk to a person'], quote = ['Get a quote', '__start_lead'];
    var map = {
      index: { nudge: 'Looking for a product or a price? Ask me.', chips: [['Find a product', 'find a product'], quote, ['Our location', 'where are you located'], talk] },
      frozen: { nudge: 'Need frozen food prices? I can help.', line: 'You are on the Frozen Food page.', chips: [['Browse frozen food', 'frozen food'], ['Do you deliver?', 'do you deliver'], quote, talk] },
      materials: { nudge: 'Need cement or steel prices? Ask me.', line: 'You are on the Building Materials page.', chips: [['Browse building materials', 'building materials'], ['Cement', 'cement'], quote, talk] },
      water: { nudge: 'Need a water system? I can help you choose.', line: 'You are on the Water Purification page.', chips: [['Browse water equipment', 'water purification'], quote, talk] },
      realestate: { nudge: 'Looking for land or property? Ask me.', line: 'You are on the Real Estate page.', chips: [['Properties for sale', 'properties for sale'], quote, talk] },
      engineering: { nudge: 'Planning a build? Tell me about it.', line: 'You are on the Engineering page.', chips: [['Start a project enquiry', '__start_lead'], ['See our projects', 'projects'], talk] },
      distribution: { nudge: 'Need something supplied? Ask me.', line: 'You are on the General Distribution page.', chips: [['Browse general supplies', 'general supplies'], quote, talk] },
      products: { nudge: 'Can’t find an item? Type it and I will search.', line: 'You are on the price list.', chips: [['Help me find a product', 'find a product'], ['My quote list', 'my quote list'], quote] },
      quote: { nudge: 'I can take your quote request right here in chat.', line: 'You are on the quote page.', chips: [['Get a quote in chat', '__start_lead'], ['Find a product', 'find a product'], talk] },
      contact: { nudge: 'Need directions or a quick answer?', line: 'You are on the contact page.', chips: [['Our location', 'where are you located'], ['Call or WhatsApp', 'phone number'], talk] },
      about: { nudge: 'Questions about what we do? Ask me.', chips: [['What do you sell?', 'what do you sell'], quote, talk] },
      projects: { nudge: 'Want to discuss a project like these?', chips: [['Start a project enquiry', '__start_lead'], ['Engineering services', 'engineering'], talk] }
    };
    return map[page] || { nudge: 'Need help? Ask me anything about our products or services.', chips: [['Find a product', 'find a product'], quote, talk] };
  }

  function greeting(env) {
    var cfg = env.cfg || {}, ctx = pageCtx(env.page), q = env.quote || [];
    var chips = ctx.chips.slice();
    if (q.length) chips.splice(1, 0, ['My quote list (' + q.length + ')', 'my quote list']);
    return [
      T('Hello, I am the ' + ((cfg.assistant && cfg.assistant.name) || 'Osca Assistant') + ', an automated guide to this website. I can find products, build a quote list, share our location and contact details, or connect you with our team.' + (ctx.line ? ' ' + ctx.line : '')),
      CH(chips)
    ];
  }

  function menu(env, lead) {
    var ctx = pageCtx(env.page);
    return [T(lead || 'Here is what I can do. Pick one, or just type what you need.'), CH(ctx.chips)];
  }

  function validPhone(t) { var d = String(t).replace(/\D/g, ''); return d.length >= 10 && d.length <= 14; }

  function leadSummary(state, env) {
    var L = state.lead, cfg = env.cfg || {}, q = env.quote || [];
    var need = L.need + (q.length && /quote list/i.test(L.need) ? ':\n' + Cat.quoteLines(q).join('\n') : '');
    var msg = ['Hello ' + bizName(cfg) + ', I would like a quote.', 'Name: ' + L.name, 'Phone: ' + L.phone, 'Need: ' + need].join('\n');
    var actions = [];
    if (cfg.formEndpoint) actions.push(act('Send to our team', '__send_lead'));
    var wa = waLink(cfg, msg); if (wa) actions.push(link('Send on WhatsApp', wa, true));
    actions.push(act('Cancel', 'cancel'));
    return CARD('Please check your request', ['Name: ' + L.name, 'Phone: ' + L.phone, 'Need: ' + (q.length && /quote list/i.test(L.need) ? L.need : L.need)], actions);
  }

  function leadDone(state, ok, env) {
    var L = state.lead || {}, cfg = env.cfg || {};
    if (ok) {
      state.lead = null;
      return [T('Thank you' + (L.name ? ', ' + L.name.split(/\s+/)[0] : '') + '. Your request has been sent and our team will contact you within 24 hours.'),
        CH([['Find another product', 'find a product'], ['Our location', 'where are you located']])];
    }
    return [T('Sorry, I could not send that just now. You can send the same details to our team on WhatsApp instead.'),
      CARD('Contact our team', [], humanActions(cfg, state, env.quote || []))];
  }

  function addedReply(item, count) {
    return [T('Added ' + item.name + ' to your quote list. You now have ' + count + (count === 1 ? ' item.' : ' items.')),
      CH([['My quote list (' + count + ')', 'my quote list'], ['Find another product', 'find a product'], ['Get a quote', '__start_lead']])];
  }

  function respond(state, raw, env) {
    state = state || {};
    env = env || {};
    var out = { messages: [], effects: [], state: state, fallback: false };
    var cfg = env.cfg || {}, products = env.products || [], quote = env.quote || [];
    var text = String(raw || '').trim().slice(0, 300), low = text.toLowerCase();
    function say(t) { out.messages.push(T(t)); }
    function add(m) { out.messages.push(m); }
    function human(lead) {
      say(lead || 'Our team can help directly. Choose how you would like to reach them.');
      add(CARD('Talk to our team', ['Messages and calls are answered by our staff.'], humanActions(cfg, state, quote)));
    }

    // ---- lead (quote request) flow ----
    if (state.lead) {
      var L = state.lead;
      if (/^(cancel|stop|never ?mind|exit|quit|restart)\b/.test(low)) { state.lead = null; say('No problem, I have cancelled that.'); add(CH([['Find a product', 'find a product'], ['Talk to a person', 'talk to a person']])); return out; }
      if (low === '__send_lead' && L.step === 'confirm') {
        out.effects.push({ type: 'send-lead', payload: { name: L.name, phone: L.phone, need: L.need, items: quote.map(function (i) { return i.name; }) } });
        say('Sending your request…'); return out;
      }
      if (L.step === 'need') { L.need = text; L.step = 'name'; state.lastNeed = text.slice(0, 100); say('Thanks. What is your name?'); add(CH([['Cancel', 'cancel']])); return out; }
      if (L.step === 'name') { L.name = text.slice(0, 60); L.step = 'phone'; say('Thanks, ' + L.name.split(/\s+/)[0] + '. What is the best phone number to reach you? A WhatsApp number is fine.'); add(CH([['Cancel', 'cancel']])); return out; }
      if (L.step === 'phone') {
        if (!validPhone(text)) { say('That does not look like a phone number. Please type digits only, for example 0803 123 4567.'); add(CH([['Cancel', 'cancel']])); return out; }
        L.phone = text.slice(0, 20); L.step = 'confirm'; add(leadSummary(state, env)); return out;
      }
      if (L.step === 'confirm') { add(leadSummary(state, env)); return out; }
    }

    // ---- internal commands from buttons ----
    if (low === '__start_lead') {
      state.lead = { step: quote.length ? 'name' : 'need', need: quote.length ? 'Items on my quote list (' + quote.length + ')' : '', name: '', phone: '' };
      say(quote.length ? 'Happy to help. I will use the ' + quote.length + (quote.length === 1 ? ' item' : ' items') + ' on your quote list. What is your name?' : 'Happy to help with a quote. What do you need? Mention the product, the quantity and where it is going.');
      add(CH([['Cancel', 'cancel']])); return out;
    }
    if (low === '__clear_list') { out.effects.push({ type: 'clear-quote' }); say('Your quote list is now empty.'); add(CH([['Find a product', 'find a product']])); return out; }
    if (!low || /^(help|menu|options|what can you do|start)\??$/.test(low)) { out.messages = menu(env); return out; }

    // ---- small talk ----
    var toks = tokenize(low);
    if (/\b(thanks?|thank you|thx|appreciate)\b/.test(low) && toks.length <= 6) { say('You are welcome. Is there anything else I can help with?'); add(CH(pageCtx(env.page).chips)); return out; }
    if (/\b(bye|goodbye|see you|good night)\b/.test(low) && toks.length <= 5) { say('Goodbye. We are here whenever you need us.'); return out; }
    if (/^(hi|hello|hey|hiya|howdy|yo|good (morning|afternoon|evening)|how far|sup)\b/.test(low) && toks.length <= 4) { out.messages = greeting(env); return out; }

    // ---- people ----
    if (/\b(human|real person|agent|representative|staff|someone|a person|talk to|speak to|speak with|customer (care|service|support)|manager|call me|call back|callback)\b/.test(low)) { human(); return out; }

    // ---- going to a page ----
    var nav = low.match(/\b(go to|take me to|open|show me the|navigate to|visit the)\b.*\b(home|about|projects?|contact|products?|prices?|quote|distribution|engineering|water|building materials|materials|real ?estate|frozen)\b/);
    if (nav) {
      var w = nav[2], key = /^project/.test(w) ? 'projects' : /^product|^price/.test(w) ? 'products' : /building|materials/.test(w) ? 'materials' : /real/.test(w) ? 'realestate' : w;
      var pg = PAGES[key];
      if (pg) { say('Here you go.'); add(CARD(pg[1], [], [link('Open ' + pg[1], pg[0])])); return out; }
    }

    // ---- strong intents that must beat product matching ----
    if (/\b(real ?estate|land|plots?|propert(y|ies)|apartments?|duplex|bungalow|for sale)\b/.test(low) && !/\b(construct|contractor)\w*/.test(low)) {
      say('We sell residential and commercial plots, developed properties and investment opportunities.');
      add(CARD('Real Estate & Land Sales', ['Land titles are verified and documentation is explained before you commit.', 'Availability, pricing and payment terms vary by property.'],
        [link('See available properties', 'realestate.html#listings'), act('Enquire about a property', '__start_lead')].concat(humanActions(cfg, state, quote).slice(0, 1))));
      state.lastNeed = 'real estate'; return out;
    }
    if (/\b(construct\w*|contractor|architect\w*|engineer\w*|civil works?|foundation|renovat\w*|roads? and drainage|land clearing)\b/.test(low) || /\bbuild(ing)? (a|my|me|house|home|an)\b/.test(low)) {
      say('Our engineering unit handles projects from bare land to finished building.');
      add(CARD('Engineering & Construction', ['Land clearing and preparation', 'Foundation and structural works', 'Roads and drainage', 'Residential and commercial construction', 'Project management'],
        [link('Engineering page', 'engineering.html'), link('See our projects', 'projects.html'), act('Start a project enquiry', '__start_lead')]));
      state.lastNeed = 'construction project'; return out;
    }
    if (/\b(address|located|location|directions?|find you|office|visit|your shop|your store|warehouse|where (are|is) (you|your|the)|where do you)\b|^where\b.*\b(you|based)\b/.test(low) && !/\bbuy\b/.test(low)) {
      say('We are in Ota, Ogun State.');
      var loc = [];
      if (cfg.mapsUrl) loc.push(link('Open in Google Maps', cfg.mapsUrl, true));
      if (cfg.directionsUrl) loc.push(link('Get directions', cfg.directionsUrl, true));
      add(CARD('Our office', (cfg.business && cfg.business.addressLines) || [cfg.addressFull || 'Ota, Ogun State'], loc.concat([link('Contact page', 'contact.html')])));
      return out;
    }
    if (/\b(phone|call you|call us|whatsapp|contact|reach you|reach us|email|e-mail|your number|phone number)\b/.test(low)) {
      say('Here is how to reach our team.');
      add(CARD('Contact', [cfg.phoneDisplay ? 'Phone and WhatsApp: ' + cfg.phoneDisplay : 'See the contact page for our details'], humanActions(cfg, state, quote).concat(cfg.business && cfg.business.email ? [link('Email us', 'mailto:' + cfg.business.email)] : [])));
      return out;
    }
    if (/\b(hours?|opening|open on|opens?|closes?|closing|weekend|saturday|sunday|what time)\b/.test(low) && !/\b(open (the|a) )/.test(low)) {
      say('I do not have confirmed opening hours to share here. Please call us, or check our Google Maps listing for the current hours.');
      add(CARD('Opening hours', [], humanActions(cfg, state, quote).slice(1).concat(cfg.mapsUrl ? [link('Google Maps listing', cfg.mapsUrl, true)] : [])));
      return out;
    }

    // ---- my quote list ----
    if (/\b(my|view|see|check|show)\b.*\b(quote|list|cart|basket|items)\b/.test(low) && !/\bprice list\b/.test(low)) {
      state.lastNeed = state.lastNeed || 'my quote list';
      if (!quote.length) { say('Your quote list is empty. Search for a product and tap Add to quote.'); add(CH([['Find a product', 'find a product'], ['Get a quote', '__start_lead']])); return out; }
      var qa = [link('Review and request quote', 'quote.html'), act('Get a quote in chat', '__start_lead')];
      var wl = waLink(cfg, 'Hello ' + bizName(cfg) + ', I would like a quote for:\n' + Cat.quoteLines(quote).join('\n'));
      if (wl) qa.splice(1, 0, link('Send list on WhatsApp', wl, true));
      qa.push(act('Clear list', '__clear_list'));
      say('You have ' + quote.length + (quote.length === 1 ? ' item' : ' items') + ' on your quote list.');
      add(CARD('Your quote list', quote.map(function (i) { return i.name + (i.soldBy ? ' — ' + i.soldBy : ''); }), qa));
      return out;
    }

    // ---- find a product / browse units ----
    if (/^(find|browse|search)( for)?( a| another)? ?products?$|^help me find( a)? product$|^search another product$|^what are you looking for/.test(low)) {
      var tx = taxonomy(products);
      say('What are you looking for? Type a product name, or choose a section.');
      add(CH(tx.units.map(function (u) { return [u.name, u.name.toLowerCase()]; })));
      return out;
    }
    if (/\b(what do you (sell|do|offer|supply)|what you (sell|do)|wetin you (dey )?sell|your services|services do you|your products|what products)\b/.test(low) || /^(services?|products?)$/.test(low)) {
      say('We work across six areas. Tap one to see more.');
      add(CARD('What we do', ['Frozen food distribution', 'Building materials', 'Water purification', 'Engineering and construction', 'Real estate and land sales', 'General supplies and distribution'],
        [link('Open the price list', 'products.html'), link('Our services', 'distribution.html')]));
      add(CH([['Frozen food', 'frozen food'], ['Building materials', 'building materials'], ['Water purification', 'water purification'], ['General supplies', 'general supplies']]));
      return out;
    }

    // ---- products ----
    if (products.length) {
      var res = search(text, products);
      var tm = matchTaxonomy(text, products);
      if (res.items.length && (res.byName || !tm)) {
        var shown = res.items.slice(0, 5).map(compact), q0 = res.tokens.join(' ');
        say((res.corrected ? 'Showing results for “' + q0 + '”. ' : '') + 'I found ' + res.items.length + (res.items.length === 1 ? ' product' : ' products') + ' for “' + q0 + '”' + (res.items.length > 5 ? '. Here are the first 5.' : '.'));
        add({ from: 'bot', kind: 'products', items: shown, total: res.items.length, browseHref: 'products.html?q=' + encodeURIComponent(q0.slice(0, 60)) });
        if (!res.items.some(function (p) { return p.price.kind !== 'none'; })) say('Prices are confirmed on your quote. Tap Add to quote and I will build your list.');
        if (/\b(deliver\w*|shipping|dispatch)\b/.test(low)) say('Delivery depends on what you order and where it is going. Our team confirms cost and timing on your quote.');
        add(CH([['Get a quote', '__start_lead'], ['Find another product', 'find a product']].concat(tm && tm.exact ? [['Browse ' + tm.entry.name, tm.entry.name.toLowerCase()]] : [])));
        state.lastNeed = text.slice(0, 100); return out;
      }
      if (tm) {
        var e = tm.entry;
        if (e.type === 'unit') {
          say(e.name + ' has ' + e.count + ' products in ' + e.cats.length + ' categories.');
          add(CARD(e.name, e.cats.slice(0, 8).map(function (c) { return c.name + ' (' + c.count + ')'; }), [link('Browse ' + e.name, 'products.html?unit=' + e.slug)]));
          add(CH(e.cats.slice(0, 6).map(function (c) { return [c.name, c.name.toLowerCase()]; })));
        } else {
          var list = products.filter(function (p) { return p.unitSlug === e.unit && p.category === e.name; });
          say(e.name + ' has ' + e.count + (e.count === 1 ? ' product.' : ' products.') + (e.count > 4 ? ' Here are the first 4.' : ''));
          add({ from: 'bot', kind: 'products', items: list.slice(0, 4).map(compact), total: list.length, browseHref: 'products.html?unit=' + e.unit + '&cat=' + e.slug });
          add(CH([['Get a quote', '__start_lead'], ['Find another product', 'find a product']]));
        }
        state.lastNeed = e.name; return out;
      }
    }

    // ---- topics I can only answer honestly in general ----
    if (/\b(deliver\w*|shipping|dispatch|transport|logistics)\b/.test(low)) {
      say('Delivery depends on what you order and where it is going. Tell me the items and your location, and our team will confirm cost and timing on your quote.');
      add(CH([['Get a quote', '__start_lead'], ['Talk to a person', 'talk to a person']])); return out;
    }
    if (/\b(bulk|wholesale|discount|cheaper|negotiat\w*|moq|minimum order)\b/.test(low)) {
      say('We supply any quantity, from single units to bulk orders, and offer contractor pricing on building materials. Tell me the items and quantities and our team will quote.');
      add(CH([['Get a quote', '__start_lead'], ['Find a product', 'find a product']])); return out;
    }
    if (/\b(pay|payment|transfer|instal+ment|credit|deposit|invoice|receipt)\b/.test(low)) { human('Payment terms are agreed per order and confirmed on your quote. I cannot confirm them here, so please speak with our team.'); return out; }
    if (/\b(brand|original|genuine|certif\w*|warranty|guarantee|quality)\b/.test(low)) { human('I cannot confirm brands, warranty or certifications here. Tell our team what you need and they will confirm when quoting.'); return out; }
    if (/\b(project|portfolio|past work|completed)\b/.test(low)) { say('You can see examples of our completed and ongoing work here.'); add(CARD('Projects', [], [link('View projects', 'projects.html'), act('Start a project enquiry', '__start_lead')])); return out; }
    if (/\b(who are you|about you|about the company|your company|about osca)\b/.test(low)) { say('We are Osca Complement Services, a distributor, engineer and developer based in Ota, Ogun State.'); add(CARD('About us', [], [link('About us', 'about.html'), link('What we do', 'products.html')])); return out; }
    if (/\b(quote|quotation|order|buy|purchase|price)\b/.test(low)) { out.messages = []; return respond(state, '__start_lead', env); }

    // ---- fallback ----
    out.fallback = true;
    say('I am not sure I understood that. I can search products, build a quote list, share our address and contact details, or connect you with our team.');
    add(CH([['Find a product', 'find a product'], ['Get a quote', '__start_lead'], ['Talk to a person', 'talk to a person']]));
    return out;
  }

  var Brain = { respond: respond, search: search, tokenize: tokenize, expand: expand, greeting: greeting, menu: menu, pageCtx: pageCtx,
    handoffText: handoffText, waLink: waLink, leadDone: leadDone, addedReply: addedReply, humanActions: humanActions, matchTaxonomy: matchTaxonomy };

  if (typeof document === 'undefined') return { Brain: Brain };

  /* =====================================================
     WIDGET (browser)
     ===================================================== */
  var KEY = 'osca_bot_v1';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  var LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="none" stroke="#e4b43a" stroke-width="1.8"/><path d="M16,2 A14,14 0 0,1 16,30 A7,7 0 0,1 16,16 A7,7 0 0,0 16,2 Z" fill="#e4b43a"/><circle cx="16" cy="9" r="2.6" fill="#0b1226"/><circle cx="16" cy="23" r="2.6" fill="#0b1226"/></svg>';
  var SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
  var CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5c0-1 1-2 2-2h2l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v2c0 1-1 2-2 2A16 16 0 0 1 4 5z"/></svg>';

  function init() {
    var cfg = window.OSCA_CONFIG || {}, A = cfg.assistant || {};
    if (A.enabled === false || document.getElementById('oscaBot')) return;
    window.__oscaBotActive = true;
    var page = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
    var store = { open: false, msgs: [], state: {}, nudged: false };
    try { var saved = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (saved && Array.isArray(saved.msgs)) store = saved; } catch (e) {}
    var state = store.state || {}, busy = false;
    var delay = A.typingDelay != null ? A.typingDelay : 450;

    function save() {
      store.state = state; store.msgs = store.msgs.slice(-40);
      try { sessionStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
    }

    // ---- DOM ----
    var root = el('div', 'bot'); root.id = 'oscaBot';
    var nudge = el('div', 'bot-nudge'); nudge.hidden = true;
    var nudgeText = el('button', 'bot-nudge-text'); nudgeText.type = 'button';
    var nudgeX = el('button', 'bot-nudge-x'); nudgeX.type = 'button'; nudgeX.setAttribute('aria-label', 'Dismiss'); nudgeX.innerHTML = CLOSE;
    nudge.append(nudgeText, nudgeX);

    var panel = el('section', 'bot-panel'); panel.id = 'botPanel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', A.name || 'Osca Assistant');
    var head = el('header', 'bot-head');
    var avatar = el('span', 'bot-avatar'); avatar.innerHTML = LOGO;
    var title = el('div', 'bot-title'); title.append(el('strong', null, A.name || 'Osca Assistant'), el('span', null, 'Automated guide · replies instantly'));
    var human = el('a', 'bot-human'); human.target = '_blank'; human.rel = 'noopener'; human.innerHTML = PHONE; human.append(el('span', null, 'Talk to a person'));
    var closeBtn = el('button', 'bot-close'); closeBtn.type = 'button'; closeBtn.setAttribute('aria-label', 'Close chat'); closeBtn.innerHTML = CLOSE;
    head.append(avatar, title, human, closeBtn);
    var log = el('div', 'bot-log'); log.setAttribute('role', 'log'); log.setAttribute('aria-live', 'polite');
    var form = el('form', 'bot-form');
    var lab = el('label', 'sr-only', 'Type your message'); lab.setAttribute('for', 'botInput');
    var input = el('input'); input.id = 'botInput'; input.type = 'text'; input.maxLength = 300; input.autocomplete = 'off';
    input.placeholder = 'Ask about a product, price or quote…';
    var sendBtn = el('button', 'bot-send'); sendBtn.type = 'submit'; sendBtn.setAttribute('aria-label', 'Send message'); sendBtn.innerHTML = SEND;
    form.append(lab, input, sendBtn);
    var foot = el('p', 'bot-foot', 'Automated assistant. Your chat stays in this browser.');
    panel.append(head, log, form, foot);

    var launcher = el('button', 'bot-launcher'); launcher.type = 'button';
    launcher.setAttribute('aria-label', 'Open chat with ' + (A.name || 'Osca Assistant')); launcher.setAttribute('aria-expanded', 'false'); launcher.setAttribute('aria-controls', 'botPanel');
    var lico = el('span', 'bot-launcher-ico'); lico.innerHTML = LOGO; launcher.append(lico, el('span', 'bot-launcher-label', 'Ask Osca'));
    root.append(nudge, panel, launcher); document.body.appendChild(root);

    // ---- rendering ----
    function env() { return { products: _products, cfg: cfg, quote: Cat.getQuote(), page: page }; }
    var _products = [];

    function linkNode(a) {
      var n = el('a', 'bot-btn', a.label); n.href = a.href;
      if (a.ext) { n.target = '_blank'; n.rel = 'noopener'; }
      return n;
    }
    function actionNode(a) {
      if (a.href) return linkNode(a);
      var b = el('button', 'bot-btn', a.label); b.type = 'button';
      b.addEventListener('click', function () { send(a.say, a.label); }); return b;
    }
    function paintAdd(btn, item) {
      var on = Cat.inQuote(item.sku);
      btn.textContent = item.status === 'out' ? 'Unavailable' : on ? 'Added ✓' : 'Add to quote';
      btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    function renderMsg(m) {
      var wrap;
      if (m.from === 'user') { wrap = el('div', 'bot-msg user'); wrap.appendChild(el('div', 'bubble', m.text)); return wrap; }
      wrap = el('div', 'bot-msg bot');
      if (m.kind === 'text') wrap.appendChild(el('div', 'bubble', m.text));
      else if (m.kind === 'chips') {
        wrap.className = 'bot-msg bot chips';
        var row = el('div', 'bot-chips');
        m.chips.forEach(function (c) {
          var b = el('button', 'bot-chip', c.label); b.type = 'button';
          b.addEventListener('click', function () { send(c.say, c.label); }); row.appendChild(b);
        });
        wrap.appendChild(row);
      } else if (m.kind === 'card') {
        var card = el('div', 'bot-card'); card.appendChild(el('strong', 'bot-card-title', m.title));
        if (m.lines && m.lines.length) { var ul = el('ul'); m.lines.forEach(function (l) { ul.appendChild(el('li', null, l)); }); card.appendChild(ul); }
        if (m.actions && m.actions.length) { var ac = el('div', 'bot-actions'); m.actions.forEach(function (a) { ac.appendChild(actionNode(a)); }); card.appendChild(ac); }
        wrap.appendChild(card);
      } else if (m.kind === 'products') {
        var box = el('div', 'bot-prods');
        m.items.forEach(function (it) {
          var r = el('div', 'bot-prod'), info = el('div', 'bot-prod-info');
          info.appendChild(el('strong', null, it.name));
          info.appendChild(el('span', null, (it.soldBy ? it.soldBy + ' · ' : '') + it.priceText));
          var add = el('button', 'bot-add'); add.type = 'button'; add.setAttribute('data-sku', it.sku);
          add.setAttribute('aria-label', 'Add ' + it.name + ' to quote list'); paintAdd(add, it);
          if (it.status !== 'out') add.addEventListener('click', function () {
            var was = Cat.inQuote(it.sku); Cat.toggleQuote(it);
            if (!was) pushBot(addedReply(it, Cat.getQuote().length));
          }); else add.disabled = true;
          r.append(info, add); box.appendChild(r);
        });
        if (m.total > m.items.length || m.browseHref) {
          var more = el('a', 'bot-more', m.total > m.items.length ? 'See all ' + m.total + ' on the price list →' : 'Open the price list →'); more.href = m.browseHref || 'products.html';
          box.appendChild(more);
        }
        wrap.appendChild(box);
      }
      return wrap;
    }
    function scrollDown() { log.scrollTop = log.scrollHeight; }
    function append(m, persist) {
      if (m.kind !== 'chips') Array.prototype.forEach.call(log.querySelectorAll('.bot-msg.chips'), function (n) { n.remove(); });
      else Array.prototype.forEach.call(log.querySelectorAll('.bot-msg.chips'), function (n) { n.remove(); });
      log.appendChild(renderMsg(m)); scrollDown();
      if (persist !== false) { store.msgs.push(m); save(); }
    }
    function typing() {
      var t = el('div', 'bot-msg bot typing'); var b = el('div', 'bubble');
      for (var i = 0; i < 3; i++) b.appendChild(el('span', 'dot'));
      t.appendChild(b); t.setAttribute('aria-label', 'Assistant is typing'); log.appendChild(t); scrollDown(); return t;
    }
    function pushBot(list, done) {
      var i = 0;
      (function next() {
        if (i >= list.length) { busy = false; updateHuman(); if (done) done(); return; }
        var m = list[i++], t = (m.kind === 'chips' || delay === 0) ? null : typing();
        setTimeout(function () { if (t) t.remove(); append(m); next(); }, t ? Math.min(delay + (m.kind === 'text' ? m.text.length * 4 : 0), 1400) : 0);
      })();
      busy = true;
    }
    function updateHuman() {
      var wa = waLink(cfg, handoffText(cfg, state, Cat.getQuote()));
      human.href = wa || 'contact.html'; if (wa) { human.target = '_blank'; }
    }

    // ---- sending ----
    function aiFallback(text, res) {
      if (!A.endpoint) return Promise.resolve(null);
      var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, 8000) : null;
      var history = store.msgs.filter(function (m) { return m.kind === 'text'; }).slice(-8).map(function (m) { return { role: m.from === 'user' ? 'user' : 'assistant', text: m.text }; });
      return fetch(A.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, page: page, history: history }), signal: ctl ? ctl.signal : undefined })
        .then(function (r) { if (timer) clearTimeout(timer); if (!r.ok) throw new Error('bad'); return r.json(); })
        .then(function (j) { return j && typeof j.reply === 'string' && j.reply.trim() ? j.reply.trim().slice(0, 800) : null; })
        .catch(function () { if (timer) clearTimeout(timer); return null; });
    }
    function sendLead(payload) {
      var ep = cfg.formEndpoint; if (!ep) return Promise.reject(new Error('no endpoint'));
      var fd = new FormData();
      fd.append('name', payload.name); fd.append('phone', payload.phone); fd.append('need', payload.need);
      fd.append('selected_items', payload.items.join('\n')); fd.append('source', 'Osca Assistant (website chat)');
      fd.append('_subject', 'Chat quote request — ' + payload.name);
      return fetch(ep, { method: 'POST', body: fd, headers: { Accept: 'application/json' } }).then(function (r) { if (!r.ok) throw new Error('bad'); });
    }
    function send(text, label) {
      text = String(text || '').trim(); if (!text || busy) return;
      if (label || text.charAt(0) !== '_') append({ from: 'user', kind: 'text', text: (label || text).slice(0, 300) });
      busy = true;
      Cat.loadProducts().catch(function () { return []; }).then(function (products) {
        _products = products;
        var e = env(), res = respond(state, text, e); state = res.state;
        function run(msgs) {
          pushBot(msgs, function () {
            res.effects.forEach(function (fx) {
              if (fx.type === 'clear-quote') Cat.clearQuote();
              if (fx.type === 'send-lead') {
                busy = true;
                sendLead(fx.payload).then(function () { if (/quote list/i.test(fx.payload.need)) Cat.clearQuote(); return true; }, function () { return false; })
                  .then(function (ok) { pushBot(leadDone(state, ok, env())); });
              }
            });
          });
        }
        if (res.fallback && A.endpoint) {
          aiFallback(text, res).then(function (reply) { run(reply ? [T(reply), CH([['Get a quote', '__start_lead'], ['Talk to a person', 'talk to a person']])] : res.messages); });
        } else run(res.messages);
      });
    }

    // ---- open / close ----
    function open() {
      panel.hidden = false; root.classList.add('open'); launcher.setAttribute('aria-expanded', 'true'); nudge.hidden = true;
      store.open = true; store.nudged = true; save();
      Cat.loadProducts().then(function (p) { _products = p; }, function () {});
      if (!log.children.length) { store.msgs = []; pushBot(greeting(env())); }
      updateHuman(); setTimeout(function () { input.focus(); }, 30);
    }
    function close() {
      panel.hidden = true; root.classList.remove('open'); launcher.setAttribute('aria-expanded', 'false');
      store.open = false; save(); launcher.focus();
    }
    launcher.addEventListener('click', function () { panel.hidden ? open() : close(); });
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(); });
    form.addEventListener('submit', function (e) { e.preventDefault(); var v = input.value; input.value = ''; send(v); });
    nudgeText.addEventListener('click', open);
    nudgeX.addEventListener('click', function () { nudge.hidden = true; store.nudged = true; save(); });
    window.addEventListener('osca:quote-changed', function () {
      Array.prototype.forEach.call(log.querySelectorAll('.bot-add[data-sku]'), function (b) {
        var sku = b.getAttribute('data-sku'), on = Cat.inQuote(sku);
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = on ? 'Added ✓' : 'Add to quote';
      }); updateHuman();
    });

    // ---- restore previous conversation (so the guide follows the visitor across pages) ----
    store.msgs.forEach(function (m) { log.appendChild(renderMsg(m)); });
    var lastChips = log.querySelectorAll('.bot-msg.chips'); Array.prototype.forEach.call(lastChips, function (n, i) { if (i < lastChips.length - 1) n.remove(); });
    scrollDown(); updateHuman();
    if (store.open) { panel.hidden = false; root.classList.add('open'); launcher.setAttribute('aria-expanded', 'true'); }
    else if (!store.nudged && A.nudge !== false) {
      setTimeout(function () {
        if (!panel.hidden || store.nudged) return;
        nudgeText.textContent = pageCtx(page).nudge; nudge.hidden = false;
        setTimeout(function () { nudge.hidden = true; }, 14000);
      }, A.nudgeDelay != null ? A.nudgeDelay : 7000);
    }
    root.api = { open: open, close: close, send: send };
    window.OscaBot = root.api;
  }

  document.addEventListener('DOMContentLoaded', init);
  return { Brain: Brain, init: init };
});
