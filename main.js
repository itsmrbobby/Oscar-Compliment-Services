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
     FORM HANDLING
     ============================================
     NOTE: this currently fakes a successful submission
     (preventDefault + setTimeout) without sending data anywhere.
     Left unchanged pending Formspree vs. mailto: decision — see
     conversation. Do not treat "Sent ✓" as proof of real delivery
     until this block is rewired.
     ============================================ */
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const btn = this.querySelector('button[type="submit"]');
      if (!btn) return;

      const originalText = btn.textContent;
      const originalWidth = btn.offsetWidth;

      btn.style.width = originalWidth + 'px';
      btn.textContent = 'Sending...';
      btn.disabled = true;
      btn.style.opacity = '0.8';
      btn.style.cursor = 'wait';

      // Simulate send
      setTimeout(() => {
        btn.textContent = 'Sent ✓';
        btn.style.background = 'linear-gradient(135deg, #10b981, #34d399)';

        setTimeout(() => {
          btn.textContent = originalText;
          btn.disabled = false;
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
          btn.style.width = '';
          btn.style.background = '';
          this.reset();

          // Show toast notification instead of alert
          showToast('Thank you! We will respond within 24 hours.');
        }, 1500);
      }, 1200);
    });
  });

  /* ============================================
     TOAST NOTIFICATION
     ============================================ */
  function showToast(message) {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
      <div style="
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: linear-gradient(135deg, var(--primary), #1a2d5c);
        color: #fff;
        padding: 16px 32px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 12px 40px rgba(0,0,0,0.2);
        border: 1px solid rgba(255,255,255,0.1);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        backdrop-filter: blur(12px);
        transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        max-width: 90vw;
        text-align: center;
      ">
        <span style="font-size: 18px;">✓</span>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.firstElementChild.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      toast.firstElementChild.style.transform = 'translateX(-50%) translateY(100px)';
      setTimeout(() => toast.remove(), 500);
    }, 3500);
  }

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
