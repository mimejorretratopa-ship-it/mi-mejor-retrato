/**
 * UTILIDADES COMPARTIDAS
 * ────────────────────────────────────────────────────────────
 * Funciones helpers reutilizables en toda la app.
 * Extraídas del código original para evitar duplicación.
 */

const utils = (() => {
  
  return {
    /**
     * Limpia un número de teléfono para WhatsApp
     * @param {string} code - Código de país (ej: '+507')
     * @param {string} number - Número local
     * @returns {string} - Número limpio (ej: '50760001234')
     */
    cleanPhone(code, number) {
      const c = String(code).replace(/\D/g, '');
      const n = String(number).replace(/\D/g, '');
      return c + n;
    },

    /**
     * Slugifica un texto (para nombres de archivo)
     * @param {string} text - Texto a slugificar
     * @returns {string} - Slug (ej: 'juan-perez')
     */
    slugify(text) {
      return String(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    },

    /**
     * Formatea un precio
     * @param {number} price - Precio numérico
     * @param {string} currency - Moneda (default: 'USD')
     * @returns {string} - Precio formateado (ej: '$45')
     */
    formatPrice(price, currency = 'USD') {
      const symbol = currency === 'USD' ? '$' : currency;
      return `${symbol}${price}`;
    },

    /**
     * Codifica texto para URL (útil para WhatsApp links)
     * @param {string} text - Texto a codificar
     * @returns {string}
     */
    encodeForURL(text) {
      return encodeURIComponent(String(text));
    },

    /**
     * Genera un timestamp legible
     * @param {Date} date - Fecha (default: ahora)
     * @returns {string} - Formato ISO simplificado
     */
    timestamp(date = new Date()) {
      return date.toISOString().replace(/[:.]/g, '-');
    },

    /**
     * Debounce (útil para búsquedas, validación mientras se escribe)
     * @param {Function} fn - Función a ejecutar
     * @param {number} delay - Delay en ms
     * @returns {Function}
     */
    debounce(fn, delay = 300) {
      let timeoutId;
      return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
      };
    },

    /**
     * Throttle (útil para scroll handlers)
     * @param {Function} fn - Función a ejecutar
     * @param {number} limit - Límite en ms
     * @returns {Function}
     */
    throttle(fn, limit = 100) {
      let inThrottle;
      return function (...args) {
        if (!inThrottle) {
          fn.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },

    /**
     * Espera un delay (útil para loading states)
     * @param {number} ms - Milisegundos
     * @returns {Promise}
     */
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Copia texto al clipboard
     * @param {string} text - Texto a copiar
     * @returns {Promise<boolean>}
     */
    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fallback para navegadores viejos
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
      }
    },

    /**
     * Escapa HTML para prevenir XSS
     * @param {string} text - Texto potencialmente inseguro
     * @returns {string}
     */
    escapeHTML(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    /**
     * Parsea query params de la URL
     * @returns {Object}
     */
    getQueryParams() {
      const params = {};
      const searchParams = new URLSearchParams(window.location.search);
      for (const [key, value] of searchParams) {
        params[key] = value;
      }
      return params;
    },

    /**
     * Detecta si estamos en móvil
     * @returns {boolean}
     */
    isMobile() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    },

    /**
     * Genera un ID único simple (para elementos del DOM)
     * @param {string} prefix - Prefijo opcional
     * @returns {string}
     */
    generateId(prefix = 'el') {
      return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Agrupa un array por una propiedad
     * @param {Array} array - Array a agrupar
     * @param {string|Function} key - Propiedad o función para agrupar
     * @returns {Object}
     */
    groupBy(array, key) {
      return array.reduce((result, item) => {
        const groupKey = typeof key === 'function' ? key(item) : item[key];
        if (!result[groupKey]) {
          result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
      }, {});
    },

    /**
     * Formatea una fecha de manera legible
     * @param {Date|string} date - Fecha
     * @param {string} locale - Locale (default: 'es-PA')
     * @returns {string}
     */
    formatDate(date, locale = 'es-PA') {
      const d = date instanceof Date ? date : new Date(date);
      return d.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },

    /**
     * Capitaliza la primera letra
     * @param {string} text
     * @returns {string}
     */
    capitalize(text) {
      return String(text).charAt(0).toUpperCase() + String(text).slice(1);
    },

    /**
     * Trunca texto con ellipsis
     * @param {string} text - Texto
     * @param {number} maxLength - Longitud máxima
     * @returns {string}
     */
    truncate(text, maxLength = 100) {
      if (String(text).length <= maxLength) return text;
      return String(text).substring(0, maxLength - 3) + '...';
    },

    /**
     * Reintenta una operación asíncrona
     * @param {Function} fn - Función async a ejecutar
     * @param {number} retries - Número de reintentos
     * @param {number} delay - Delay entre reintentos (ms)
     * @returns {Promise}
     */
    async retry(fn, retries = 3, delay = 1000) {
      try {
        return await fn();
      } catch (error) {
        if (retries === 0) throw error;
        await this.sleep(delay);
        return this.retry(fn, retries - 1, delay);
      }
    },

    /**
     * Manejo de errores consistente
     * @param {Error} error - Error capturado
     * @param {string} context - Contexto donde ocurrió
     */
    handleError(error, context = '') {
      const message = context 
        ? `[ERROR: ${context}] ${error.message}` 
        : `[ERROR] ${error.message}`;
      
      console.error(message, error);
      
      // En desarrollo: mostrar detalles
      if (window.location.hostname === 'localhost') {
        console.trace(error);
      }
      
      return {
        error: true,
        message: error.message,
        context
      };
    }
  };
})();

// ── EXPORTS ───────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = utils;
}
