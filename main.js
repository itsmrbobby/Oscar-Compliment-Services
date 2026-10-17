/**
 * Osca Complement Services — Main JavaScript
 * Professional, Lively, Responsive
 */

(function() {
  'use strict';

  /* ============================================
     MOBILE MENU
     ============================================ */
  const mobileToggle = document.getElementById('mobileToggle');
  const navLinks = document.getElementById('navLinks');
  const nav = document.querySelector('.nav');
  let menuOpen = false;

  function toggleMenu() {
    menuOpen = !menuOpen;
    navLinks.classList.toggle('open', menuOpen);
    mobileToggle.classList.toggle('active', menuOpen);
    mobileToggle.setAttribute('aria-expanded', String(menuOpen));
    document.body.style.overflow = menuOpen ? 'hidden' : '';
  }

  if (mobileToggle) {
    mobileToggle.addEventListener('click', toggleMenu);
  }

  // Close menu when clicking a link
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      if (menuOpen) toggleMenu();
    });
  });

  // Close menu on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) toggleMenu();
  });

  /* ============================================
     NAVBAR SCROLL BEHAVIOR
     ============================================ */
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    // Add/remove scrolled class for shadow
    if (currentScroll > 30) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
  }, { passive: true });

  /* ============================================
     SMOOTH SCROLL FOR ANCHOR LINKS
     ============================================ */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const offset = nav.offsetHeight + 20;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  /* ============================================
     SCROLL REVEAL ANIMATION
     ============================================ */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');

        // Also trigger stagger children if this is a stagger container
        if (entry.target.classList.contains('stagger-children')) {
          entry.target.classList.add('visible');
        }

        // Unobserve after revealing (optional: remove for re-animation)
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -60px 0px'
  });

  document.querySelectorAll('.reveal, .stagger-children').forEach(el => {
    revealObserver.observe(el);
  });

  /* ============================================
     COUNT-UP ANIMATION FOR STATS
     ============================================ */
  const countUpObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const text = el.textContent.trim();
        const numMatch = text.match(/[\d,]+/);

        if (numMatch) {
          const targetNum = parseInt(numMatch[0].replace(/,/g, ''), 10);
          const suffix = text.replace(numMatch[0], '');
          const duration = 2000;
          const startTime = performance.now();

          function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(easeOut * targetNum);

            el.textContent = current.toLocaleString() + suffix;

            if (progress < 1) {
              requestAnimationFrame(update);
            } else {
              el.textContent = targetNum.toLocaleString() + suffix;
            }
          }

          requestAnimationFrame(update);
        }

        countUpObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat-number').forEach(el => {
    countUpObserver.observe(el);
  });

  /* ============================================
     FLIP CARDS — TAP + KEYBOARD SUPPORT
     ============================================ */
  const flipCards = document.querySelectorAll('.flip-card');

  flipCards.forEach(card => {
    card.addEventListener('click', function(e) {
      // On mobile/tablet (<=900px), toggle flip on tap
      if (window.innerWidth <= 900) {
        // Don't flip if clicking a button/link on the back
        if (e.target.closest('.btn-small')) return;

        // Close other flipped cards
        flipCards.forEach(other => {
          if (other !== card) other.classList.remove('flipped');
        });

        this.classList.toggle('flipped');
      }
    });

    // Keyboard support: the HTML gives these cards tabindex="0" and
    // role="button", so Enter/Space must actually do something or that
    // accessibility markup is just decoration. Desktop mouse users still
    // get the CSS hover-flip; this covers keyboard-only navigation at
    // any screen width, since a keyboard user can't "hover".
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        if (e.target.closest('.btn-small')) return;
        e.preventDefault();
        flipCards.forEach(other => {
          if (other !== card) other.classList.remove('flipped');
        });
        this.classList.toggle('flipped');
      }
    });
  });

  // Close flipped cards when clicking outside
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 900) {
      if (!e.target.closest('.flip-card')) {
        flipCards.forEach(card => card.classList.remove('flipped'));
      }
    }
  });

  /* ============================================
     FORM HANDLING + TOAST
     ============================================
     Forms only report success when the request really succeeds.
     To connect a form, set its data-endpoint attribute to a form
     service URL (e.g. Formspree: https://formspree.io/f/xxxx).
     With no endpoint set, visitors are told to contact you directly
     instead of being shown a false "Sent" message.
     ============================================ */
  function showToast(message, type) {
    const isError = type === 'error';
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.setAttribute('role', isError ? 'alert' : 'status');

    const box = document.createElement('div');
    box.style.cssText = [
      'position:fixed', 'bottom:30px', 'left:50%',
      'transform:translateX(-50%) translateY(100px)',
      'background:' + (isError ? 'linear-gradient(135deg,#7f1d1d,#b91c1c)' : 'linear-gradient(135deg,var(--primary),#1a2d5c)'),
      'color:#fff', 'padding:16px 32px', 'border-radius:12px',
      'font-size:14px', 'font-weight:600',
      'box-shadow:0 12px 40px rgba(0,0,0,0.2)',
      'border:1px solid rgba(255,255,255,0.1)', 'z-index:10000',
      'display:flex', 'align-items:center', 'gap:10px',
      'transition:transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
      'max-width:90vw', 'text-align:center'
    ].join(';');

    const icon = document.createElement('span');
    icon.style.fontSize = '18px';
    icon.textContent = isError ? '!' : '✓';
    const text = document.createElement('span');
    text.textContent = message;
    box.append(icon, text);
    toast.appendChild(box);
    document.body.appendChild(toast);

    requestAnimationFrame(() => { box.style.transform = 'translateX(-50%) translateY(0)'; });
    setTimeout(() => {
      box.style.transform = 'translateX(-50%) translateY(100px)';
      setTimeout(() => toast.remove(), 500);
    }, isError ? 5500 : 3500);
  }

  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('button[type="submit"]');
      if (!btn) return;

      const C = window.OSCA_CONFIG || {};
      const endpoint = (this.dataset.endpoint || C.formEndpoint || '').trim();
      if (!endpoint) {
        // No form service connected yet: hand the message to the visitor's email app.
        const to = (C.business && C.business.email) || '';
        if (!to) {
          showToast('Our online form is being connected. Please call or email us directly for now.', 'error');
          return;
        }
        const lines = [];
        new FormData(this).forEach(function (v, k) {
          if (k.charAt(0) === '_' || !String(v).trim()) return;
          lines.push(k.replace(/[-_]/g, ' ') + ': ' + v);
        });
        const subject = (document.title.split('—')[0] || 'Enquiry').trim() + ' - website enquiry';
        window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(lines.join('\n'));
        showToast('Opening your email app. Press send there to deliver your message.');
        return;
      }

      const originalText = btn.textContent;
      btn.style.width = btn.offsetWidth + 'px';
      btn.textContent = 'Sending...';
      btn.disabled = true;
      btn.style.opacity = '0.8';
      btn.style.cursor = 'wait';

      const restore = () => {
        btn.textContent = originalText;
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.style.width = '';
        btn.style.background = '';
      };

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          body: new FormData(this),
          headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) throw new Error('Request failed: ' + res.status);
        btn.textContent = 'Sent ✓';
        btn.style.background = 'linear-gradient(135deg, #10b981, #34d399)';
        this.reset();
        window.dispatchEvent(new CustomEvent('osca:form-sent'));
        showToast('Thank you! We will respond within 24 hours.');
        setTimeout(restore, 1800);
      } catch (err) {
        restore();
        showToast('Sorry, your message could not be sent. Please try again or contact us directly.', 'error');
      }
    });
  });

  /* ============================================
     CONTACT SYNC — single source: config.js
     Every element marked data-sync="..." is linked to the business
     details in config.js, so changing them there updates every page.
     ============================================ */
  (function syncContact() {
    var C = window.OSCA_CONFIG;
    if (!C || !C.business) return;
    var B = C.business;
    function each(key, fn) { document.querySelectorAll('[data-sync="' + key + '"]').forEach(fn); }
    function ext(a, href) { a.href = href; a.target = '_blank'; a.rel = 'noopener'; }
    var waText = encodeURIComponent('Hello ' + (B.name || '') + ', I would like to make an enquiry.');

    if (C.phoneTel) each('phone', function (a) { a.href = 'tel:' + C.phoneTel; a.textContent = C.phoneDisplay; });
    if (C.whatsappDigits) each('whatsapp', function (a) { ext(a, 'https://wa.me/' + C.whatsappDigits + '?text=' + waText); });
    if (B.email) each('email', function (a) { a.href = 'mailto:' + B.email; a.textContent = B.email; });
    if (C.mapsUrl) each('maps', function (a) { ext(a, C.mapsUrl); });
    if (C.directionsUrl) each('directions', function (a) { ext(a, C.directionsUrl); });
    if (B.addressShort) each('address-short', function (n) { n.textContent = B.addressShort; });
    if (B.addressLines && B.addressLines.length) each('address-full-static', function (n) {
      n.textContent = '';
      B.addressLines.forEach(function (line, i) {
        if (i) n.appendChild(document.createElement('br'));
        n.appendChild(document.createTextNode(line));
      });
    });
    if (C.mapsEmbed) each('map-embed', function (f) { if (f.getAttribute('src') !== C.mapsEmbed) f.setAttribute('src', C.mapsEmbed); });

    // Floating WhatsApp button on every page (only when a number is configured)
    if (C.whatsappDigits && !document.querySelector('.wa-float')) {
      var a = document.createElement('a');
      a.className = 'wa-float';
      a.href = 'https://wa.me/' + C.whatsappDigits + '?text=' + waText;
      a.target = '_blank'; a.rel = 'noopener';
      a.setAttribute('aria-label', 'Chat with us on WhatsApp');
      a.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9.5L5 21v-4H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/></svg><span class="wa-float-label">WhatsApp</span>';
      document.body.appendChild(a);
    }
  })();

  /* ============================================
     PARALLAX HERO EFFECT (subtle)
     ============================================ */
  const hero = document.querySelector('.hero');
  if (hero && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      const rate = scrolled * 0.15;
      const heroInner = hero.querySelector('.hero-inner');
      if (heroInner && scrolled < hero.offsetHeight) {
        heroInner.style.transform = `translateY(${rate * 0.3}px)`;
        heroInner.style.opacity = 1 - (scrolled / (hero.offsetHeight * 0.8));
      }
    }, { passive: true });
  }

})();

/* Footer "Follow us" links, from data/settings.json (edited in the admin dashboard). Only filled-in ones show. */
(function () {
  function url(v, base) { v = String(v || '').trim(); if (!v) return ''; if (/^https?:\/\//i.test(v)) return v; return base ? base + encodeURIComponent(v.replace(/^@/, '')) : ''; }
  fetch('data/settings.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (s) {
    var links = [
      ['TikTok', url(s.tiktok, 'https://www.tiktok.com/@')],
      ['Instagram', url(s.instagram, 'https://www.instagram.com/')],
      ['Facebook', url(s.facebook, 'https://www.facebook.com/')],
      ['WhatsApp channel \u2014 get price updates', url(s.whatsappChannel, '')]
    ].filter(function (l) { return l[1]; });
    var grid = document.querySelector('.footer-grid');
    if (!links.length || !grid) return;
    var col = document.createElement('div'); col.className = 'footer-col';
    var h = document.createElement('h4'); h.textContent = 'Follow us'; col.appendChild(h);
    var ul = document.createElement('ul');
    links.forEach(function (l) {
      var li = document.createElement('li'), a = document.createElement('a');
      a.href = l[1]; a.textContent = l[0]; a.target = '_blank'; a.rel = 'noopener';
      li.appendChild(a); ul.appendChild(li);
    });
    col.appendChild(ul); grid.appendChild(col);
  }).catch(function () {});
})();
