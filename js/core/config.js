/**
 * config.js — Fuente de verdad única para constantes de toda la aplicación
 * ─────────────────────────────────────────────────────────────
 * Unifica la configuración del Website principal y el sistema de Onboarding.
 */

const config = (() => {

  // ── AMBIENTE ──────────────────────────────────────────────────
  const isDev = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  const isProd = !isDev;

  // ── IDENTIDAD ─────────────────────────────────────────────────
  const brand = {
    name:         'Mi Mejor Retrato',
    photographer: 'Mike Morelos',
    location:     'La Chorrera, Panamá',
    logo:         'https://i.imgur.com/4M34hi2.png' // cámara emoji como avatar
  };

  // ── ENDPOINTS (Unificados) ────────────────────────────────────
  const endpoints = {
    // Website (form-contacto)
    websiteContact: null, // null -> modo desarrollo (simula éxito)

    // Onboarding (form-reserva)
    onboardingHub: 'https://script.google.com/macros/s/AKfycbw1jWdPTcixFqhQc46GVesnB2qAyk9HS7qblUDljk9nywIC7yYQhLGbWsKyEoKbns07/exec',
    
    // Alertas (Discord)
    discord: 'https://discord.com/api/webhooks/1462342214784122910/Jb1xTH6lIgsvYFtNasSxHnpCmSD1FKh4b5MC2ql58L50qfccKxRLc5W4V4pPeOSs3nVN'
  };

  // ── WHATSAPP ──────────────────────────────────────────────────
  const whatsapp = {
    photographerNumber: '50767438951', // Era 'number'
    number: '50767438951',             // Duplicado para compatibilidad website
    messageTemplate: (nombre, schoolName) =>
      `¡Hola ${nombre}! 👋 Soy Mike de Mi Mejor Retrato. Gracias por reservar tu espacio para la sesión de fotos de ${schoolName}. Te escribo para coordinar.`,
    templates: {
      onboarding: (nombre, schoolName) =>
        `¡Hola ${nombre}! 👋 Soy Mike de Mi Mejor Retrato. Gracias por reservar tu espacio para la sesión de fotos de ${schoolName}. Te escribo para coordinar.`,
      website: (nombre) =>
        `¡Hola ${nombre}! 👋 Soy Mike de Mi Mejor Retrato. Vi que te interesa saber más sobre las sesiones de fotografía. ¿Tienes un momento para conversar?`
    }
  };

  // ── UI ────────────────────────────────────────────────────────
  const ui = {
    revealThreshold: 0.1,
    animationDuration: 600,
    minLoadingDelay: 300
  };

  // ── STORAGE ───────────────────────────────────────────────────
  const storage = {
    prefix: 'mmr_',
    cacheTTL: 5 * 60 * 1000 // 5 minutos
  };

  // ── FEATURES FLAGS ────────────────────────────────────────────
  const features = {
    debug: isDev,
    localDownload: isDev,
    discordNotifications: true, // Siempre activo para no perder leads
    googleContacts: isProd,
    analytics: isProd
  };

  return {
    isDev,
    isProd,
    brand,
    endpoints,
    whatsapp,
    ui,
    storage,
    features,
    
    debug() {
      console.group('[CONFIG]');
      console.log('Ambiente:', isDev ? 'Development' : 'Production');
      console.log('Features:', features);
      console.groupEnd();
    }
  };
})();

// Exponer globalmente
window.config = config;

// Compatibilidad con código viejo que busca window.APP_CONFIG
window.APP_CONFIG = {
  ...config,
  WHATSAPP_NUMBER: config.whatsapp.number,
  DISCORD_WEBHOOK: config.endpoints.discord,
  FORM_ENDPOINT: config.endpoints.websiteContact,
  STORAGE_PREFIX: config.storage.prefix,
  DEBUG: config.features.debug
};
