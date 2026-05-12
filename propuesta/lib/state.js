/**
 * ESTADO GLOBAL CENTRALIZADO
 * ────────────────────────────────────────────────────────────
 * Reemplaza variables globales sueltas con un store centralizado.
 * 
 * ANTES:
 *   let BROCHURE_CONFIG = {};
 *   let FORM_DEF = null;
 *   let SECCIONES_DATA = null;
 * 
 * DESPUÉS:
 *   state.set('brochure', config);
 *   const config = state.get('brochure');
 * 
 * VENTAJAS:
 * - Un solo lugar donde vive el estado
 * - Debugging más fácil (state.debug() muestra todo)
 * - Validación centralizada
 * - Suscripción a cambios (para features futuras)
 */

const state = (() => {
  // ── ESTADO PRIVADO ────────────────────────────────────────────
  const store = {
    // Configuración del brochure actual
    brochure: {
      code: null,          // ej: 'ebrv'
      year: null,          // ej: 26
      id: null,            // ej: 'ebrv-26'
      schoolName: null,    // ej: 'Escuela Bilingüe...'
      gaId: null          // Google Analytics ID
    },
    
    // Definición del formulario (desde formulario.json)
    form: null,
    
    // Secciones activas/inactivas (desde {code}_secciones.json)
    sections: null,
    
    // Precios y paquetes (desde precios.json)
    pricing: null,
    
    // Escuelas disponibles (desde escuelas.json)
    schools: null,
    
    // Estado de UI temporal
    ui: {
      formLoading: false,
      pricingLoading: false,
      sectionsLoading: false
    }
  };

  // Listeners para cambios (para reactivity futura)
  const listeners = new Map();

  // ── FUNCIONES PRIVADAS ────────────────────────────────────────

  function validateKey(key) {
    if (!store.hasOwnProperty(key)) {
      throw new Error(`[STATE] Clave inválida: ${key}`);
    }
  }

  function notifyListeners(key, value) {
    if (listeners.has(key)) {
      listeners.get(key).forEach(callback => callback(value));
    }
  }

  // ── API PÚBLICA ───────────────────────────────────────────────

  return {
    /**
     * Obtiene un valor del estado
     * @param {string} key - Clave del estado
     * @returns {*}
     */
    get(key) {
      validateKey(key);
      return store[key];
    },

    /**
     * Actualiza un valor del estado
     * @param {string} key - Clave del estado
     * @param {*} value - Nuevo valor
     */
    set(key, value) {
      validateKey(key);
      
      // Deep merge para objetos
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        store[key] = { ...store[key], ...value };
      } else {
        store[key] = value;
      }
      
      notifyListeners(key, store[key]);
    },

    /**
     * Resetea una clave a su valor inicial
     * @param {string} key
     */
    reset(key) {
      validateKey(key);
      
      const defaults = {
        brochure: { code: null, year: null, id: null, schoolName: null, gaId: null },
        form: null,
        sections: null,
        pricing: null,
        schools: null,
        ui: { formLoading: false, pricingLoading: false, sectionsLoading: false }
      };
      
      store[key] = defaults[key];
      notifyListeners(key, store[key]);
    },

    /**
     * Resetea todo el estado
     */
    resetAll() {
      Object.keys(store).forEach(key => this.reset(key));
    },

    /**
     * Suscribe un callback a cambios en una clave
     * @param {string} key
     * @param {Function} callback
     * @returns {Function} - Función para desuscribirse
     */
    subscribe(key, callback) {
      validateKey(key);
      
      if (!listeners.has(key)) {
        listeners.set(key, new Set());
      }
      
      listeners.get(key).add(callback);
      
      // Retorna función para desuscribirse
      return () => {
        listeners.get(key).delete(callback);
      };
    },

    /**
     * Debugging: muestra el estado completo
     */
    debug() {
      console.group('[STATE DEBUG]');
      Object.keys(store).forEach(key => {
        console.log(`${key}:`, store[key]);
      });
      console.groupEnd();
    },

    /**
     * Exporta el estado completo como JSON
     * Útil para debugging o persistencia
     */
    export() {
      return JSON.parse(JSON.stringify(store));
    },

    /**
     * Helpers específicos del dominio
     * (funciones que encapsulan lógica común)
     */
    helpers: {
      /**
       * Extrae code y year del ID del brochure
       * ej: 'ebrv-26' → { code: 'ebrv', year: 26 }
       */
      parseBrochureId(id) {
        const match = id.match(/^([a-z]{4})-(\d{2})$/i);
        if (!match) {
          throw new Error(`[STATE] ID de brochure inválido: ${id}`);
        }
        return {
          code: match[1].toLowerCase(),
          year: parseInt(match[2], 10),
          id: id.toLowerCase()
        };
      },

      /**
       * Busca una escuela por código
       */
      getSchoolByCode(code) {
        const schools = store.schools;
        if (!schools) {
          console.warn('[STATE] Escuelas no cargadas aún');
          return null;
        }
        return schools.schools.find(s => s.code.toLowerCase() === code.toLowerCase());
      },

      /**
       * Obtiene la configuración de precios para la escuela actual
       */
      getCurrentPricing() {
        const pricing = store.pricing;
        const code = store.brochure.code;
        
        if (!pricing || !code) return null;
        
        return pricing.escuelas.find(e => e.code.toLowerCase() === code.toLowerCase());
      },

      /**
       * Verifica si los precios están visibles para la escuela actual
       */
      arePricesVisible() {
        const config = this.getCurrentPricing();
        return config && config.visibilidad === 'publicar';
      }
    }
  };
})();

// ── EXPORTS ───────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = state;
}
