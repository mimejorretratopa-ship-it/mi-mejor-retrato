/**
 * MÓDULO DE GOOGLE ANALYTICS
 * ────────────────────────────────────────────────────────────
 * Maneja inicialización de GA y tracking de eventos.
 * EXTRAÍDO DE: líneas 600-650 del HTML original
 */

const analyticsModule = (() => {
  
  let initialized = false;

  function init(gaId) {
    if (!config.features.analytics || !gaId) {
      console.log('[GA] Analytics deshabilitado');
      return;
    }

    if (initialized) {
      console.warn('[GA] Ya inicializado');
      return;
    }

    // Inyectar script de GA
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script1);

    // Inicializar gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', gaId);

    initialized = true;
    console.log(`[GA] Inicializado: ${gaId}`);
  }

  function trackEvent(eventName, params = {}) {
    if (!initialized || !window.gtag) {
      console.log('[GA] Evento no trackeado (GA no inicializado):', eventName);
      return;
    }

    window.gtag('event', eventName, params);
    console.log('[GA] Evento:', eventName, params);
  }

  return {
    init,
    trackEvent
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = analyticsModule;
}
