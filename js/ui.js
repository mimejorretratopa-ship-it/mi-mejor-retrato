/**
 * ui.js — Interacciones de UI (sin lógica de negocio)
 * ──────────────────────────────────────────────────────────────
 * RESPONSABILIDADES:
 *   1. Scroll reveal con IntersectionObserver
 *   2. Toggle de ícono en FAQ
 *   3. Cualquier interacción visual futura (tabs, accordions, etc.)
 *
 * REGLA: este módulo NO sabe nada del formulario, del storage,
 * ni de la API. Solo orquesta lo que se ve en pantalla.
 *
 * Si un día agregas un lightbox de galería o un slider de testimonios,
 * van aquí, en su propia función init aislada.
 */

(function initUI() {

  // ── Scroll Reveal ─────────────────────────────────────────
  // Aplica clase 'visible' cuando un elemento entra al viewport.
  // El CSS de styles.css tiene las transiciones asociadas.
  (function initReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // ejecutar una sola vez
        }
      });
    }, {
      threshold:  0.08,
      rootMargin: '0px 0px -40px 0px',
    });

    elements.forEach(el => observer.observe(el));
  })();

  // ── FAQ Toggle Icon ───────────────────────────────────────
  // Cambia el ícono + → × cuando se abre un detalle del FAQ.
  (function initFaq() {
    document.querySelectorAll('.faq-item').forEach(item => {
      item.addEventListener('toggle', () => {
        const icon = item.querySelector('.faq-icon');
        if (icon) icon.textContent = item.open ? '×' : '+';
      });
    });
  })();

  // ── Aquí van futuras interacciones de UI ──────────────────
  // Ejemplo: initGalleryLightbox(), initTestimoniosSlider(), etc.
  // Cada una como función autocontenida nombrada claramente.

})();
