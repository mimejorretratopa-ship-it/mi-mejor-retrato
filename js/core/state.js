/**
 * state.js — Estado global de la app (Observable store)
 * ──────────────────────────────────────────────────────────────
 * Centraliza el estado compartido entre el Website y el Onboarding.
 */

const state = (() => {
  // Estado inicial unificado
  const _state = {
    // ── Website State (Homepage) ──
    website: {
      formStatus: 'idle', // 'idle' | 'sending' | 'sent' | 'error'
      navVisible: true,
      activeSection: null
    },

    // ── Onboarding State (Brochures) ──
    onboarding: {
      brochure: null,   // { code, year, id, schoolName, gaId }
      form: null,       // definición (formulario.json)
      pricing: null,    // precios (precios.json)
      sections: null,   // visibilidad ({code}_secciones.json)
      schools: null,    // catálogo (escuelas.json)
      ui: {
        loading: false,
        error: null
      }
    },

    // ── Shared UI State ──
    ui: {
      theme: 'light',
      isMobile: false
    }
  };

  const _listeners = {};

  /**
   * Lee un valor del estado por ruta: 'onboarding.brochure.schoolName'
   */
  function get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], _state);
  }

  /**
   * Actualiza un valor y notifica suscriptores
   */
  function set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, k) => {
      if (!obj[k]) obj[k] = {}; // Auto-creación de objetos si no existen
      return obj[k];
    }, _state);

    if (target[lastKey] === value) return; // No hay cambio

    target[lastKey] = value;

    // Notificar
    (_listeners[path] || []).forEach(fn => fn(value));

    if (window.config?.features?.debug) {
      console.log(`[STATE] ${path} ←`, value);
    }
  }

  /**
   * Suscribirse a cambios
   */
  function on(path, fn) {
    if (!_listeners[path]) _listeners[path] = [];
    _listeners[path].push(fn);
    return () => {
      _listeners[path] = _listeners[path].filter(l => l !== fn);
    };
  }

  return { get, set, on };
})();

// Exponer globalmente
window.state = state;

// Compatibilidad con código viejo (Website buscaba window.State con S mayúscula)
window.State = state;
