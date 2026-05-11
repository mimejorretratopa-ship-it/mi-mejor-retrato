/**
 * state.js — Estado global de la app (mini state manager)
 * ──────────────────────────────────────────────────────────────
 * PATRÓN: Observable store simplificado.
 * Centraliza el estado que necesita compartirse entre módulos.
 *
 * POR QUÉ un state manager aunque sea simple:
 *   Evita variables globales sueltas y estado duplicado entre módulos.
 *   Si form.js cambia algo, ui.js lo puede leer sin acoplarse directamente.
 *
 * USO:
 *   State.get('form.status')          // → 'idle' | 'sending' | 'sent' | 'error'
 *   State.set('form.status', 'sent')  // actualiza + persiste si aplica
 *   State.on('form.status', fn)       // suscribirse a cambios
 *
 * IMPORTANTE:
 *   Este state es en memoria (session). Para persistencia entre recargas,
 *   los módulos llaman a Storage.set() explícitamente.
 *   No mezclar las dos responsabilidades aquí.
 */

const State = (() => {
  // Estado inicial — sólo lo que necesita compartirse entre módulos
  const _state = {
    form: {
      status: 'idle',    // 'idle' | 'sending' | 'sent' | 'error'
      draft:  null,      // último borrador del formulario
      errors: {},        // errores de validación por campo
    },
    ui: {
      navVisible: true,
      activeSection: null,
    },
  };

  // Suscriptores por clave
  const _listeners = {};

  /**
   * Lee un valor del estado por ruta con punto: 'form.status'
   * @param {string} path
   * @returns {*}
   */
  function get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], _state);
  }

  /**
   * Actualiza un valor por ruta con punto: 'form.status', 'sent'
   * Dispara suscriptores registrados para esa ruta.
   * @param {string} path
   * @param {*}      value
   */
  function set(path, value) {
    const keys    = path.split('.');
    const lastKey = keys.pop();
    const target  = keys.reduce((obj, k) => obj[k], _state);
    if (!target || !(lastKey in target)) {
      console.warn('[State] ruta desconocida:', path);
      return;
    }
    target[lastKey] = value;

    // Notificar suscriptores
    (_listeners[path] || []).forEach(fn => fn(value));

    if (window.APP_CONFIG?.DEBUG) {
      console.log('[State]', path, '←', value);
    }
  }

  /**
   * Suscribirse a cambios de una ruta específica.
   * Devuelve función para cancelar suscripción.
   * @param {string}   path
   * @param {Function} fn   callback(nuevoValor)
   * @returns {Function} unsubscribe
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

window.State = State;
