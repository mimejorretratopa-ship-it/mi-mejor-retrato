/**
 * CONFIGURACIÓN ESTÁTICA
 * ────────────────────────────────────────────────────────────
 * Todas las constantes y configuraciones en un solo lugar.
 * 
 * VENTAJAS:
 * - Un solo lugar para cambiar endpoints, URLs, etc.
 * - Fácil de mantener
 * - Fácil de sobrescribir por ambiente (dev/prod)
 */

const config = (() => {

  // ── AMBIENTE ──────────────────────────────────────────────────
  const isDev = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  const isProd = !isDev;

  // ── ENDPOINTS ─────────────────────────────────────────────────
  const endpoints = {
    submitForm: '/api/submit-form',
    createContact: '/api/create-contact',
    notifyDiscord: 'https://discord.com/api/webhooks/1462342214784122910/Jb1xTH6lIgsvYFtNasSxHnpCmSD1FKh4b5MC2ql58L50qfccKxRLc5W4V4pPeOSs3nVN'
  };

  // ── WHATSAPP ──────────────────────────────────────────────────
  const whatsapp = {
    // Número del fotógrafo
    photographerNumber: '50767438951',

    // Template de mensaje inicial
    messageTemplate: (nombre, schoolName) =>
      `Hola ${nombre}, gracias por reservar tu espacio para la sesión de fotos de ${schoolName}. Mike te escribe para coordinar.`
  };

  // ── GOOGLE ANALYTICS ──────────────────────────────────────────
  const analytics = {
    // El GA ID viene de registro.json en initAnalytics()
    events: {
      formSubmit: 'form_submit',
      packageSelect: 'package_select',
      whatsappClick: 'whatsapp_click',
      galleryView: 'gallery_view'
    }
  };

  // ── UI ────────────────────────────────────────────────────────
  const ui = {
    // Duración de animaciones
    animationDuration: 600,

    // Delay para loading states (evitar flashes)
    minLoadingDelay: 300,

    // Intersection Observer threshold
    revealThreshold: 0.1,

    // Tamaños de imágenes
    imageSizes: {
      thumbnail: 400,
      preview: 800,
      full: 1200
    }
  };

  // ── VALIDACIÓN ────────────────────────────────────────────────
  const validation = {
    phone: {
      minLength: 7,
      maxLength: 15
    },
    name: {
      minLength: 2,
      maxLength: 100
    },
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    }
  };

  // ── CACHE ─────────────────────────────────────────────────────
  const cache = {
    // TTL para JSONs estáticos (5 minutos)
    jsonTTL: 5 * 60 * 1000,

    // TTL para imágenes (1 hora)
    imageTTL: 60 * 60 * 1000
  };

  // ── FEATURES FLAGS ────────────────────────────────────────────
  const features = {
    // Descarga local de JSON como fallback (solo desarrollo)
    localDownload: isDev,

    // Notificaciones Discord (activo en producción vía Netlify Function)
    discordNotifications: isProd,

    // Google Contacts (activo en producción vía Netlify Function)
    googleContacts: isProd,

    // Google Analytics (activo en producción)
    analytics: isProd,

    // Debugging avanzado
    debug: isDev
  };

  // ── TEXTOS ────────────────────────────────────────────────────
  const messages = {
    errors: {
      loadJSON: 'No se pudieron cargar los datos. Por favor recarga la página.',
      submitForm: 'Hubo un error al enviar el formulario. Por favor intenta de nuevo.',
      network: 'Error de conexión. Verifica tu internet e intenta de nuevo.',
      generic: 'Algo salió mal. Por favor intenta de nuevo.'
    },
    success: {
      formSubmit: 'Mike te escribe en un momento por WhatsApp para coordinar.',
      contactCreated: 'Contacto creado exitosamente.'
    },
    loading: {
      form: 'Cargando formulario...',
      pricing: 'Cargando precios...',
      sections: 'Cargando contenido...'
    }
  };

  // ── RETORNAR CONFIGURACIÓN ────────────────────────────────────
  const configObj = {
    // Ambiente
    isDev,
    isProd,

    // Módulos
    endpoints,
    whatsapp,
    analytics,
    ui,
    validation,
    cache,
    features,
    messages,

    /**
     * Sobrescribe configuración (útil para testing)
     */
    override(overrides) {
      Object.assign(this, overrides);
    },

    /**
     * Debug: muestra configuración actual
     */
    debug() {
      console.group('[CONFIG]');
      console.log('Ambiente:', isDev ? 'Development' : 'Production');
      console.log('Features:', features);
      console.groupEnd();
    }
  };

  // Exponer a window para que otros scripts (lib/*.js) puedan acceder
  window.config = configObj;

  return configObj;
})();

// ── EXPORTS ───────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = config;
}