// Mobile menu toggle
function toggleMenu() {
  const nav = document.getElementById('navLinks');
  nav.classList.toggle('open');
}

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    document.getElementById('navLinks').classList.remove('open');
  });
});

// Scroll reveal animation
const revealElements = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, {
  threshold: 0.1,
  rootMargin: '0px 0px -40px 0px'
});

revealElements.forEach(el => revealObserver.observe(el));

// Navbar shadow on scroll
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    nav.style.boxShadow = '0 4px 30px rgba(0,0,0,0.15)';
  } else {
    nav.style.boxShadow = 'none';
  }
});

// Form submission handler
document.querySelectorAll('form').forEach(form => {
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Sent!';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
      btn.style.opacity = '1';
      this.reset();
      alert('Thank you! We will respond within 24 hours.');
    }, 2000);
  });
});

// Flip card tap support for mobile
document.querySelectorAll('.flip-card').forEach(card => {
  card.addEventListener('click', function(e) {
    if (window.innerWidth <= 900) {
      // Don't flip if clicking the button on the back
      if (e.target.closest('.btn-small')) return;
      this.classList.toggle('flipped');
    }
  });
});
