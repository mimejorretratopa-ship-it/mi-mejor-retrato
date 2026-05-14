/**
 * CAPA DE ABSTRACCIÓN DE PERSISTENCIA
 * ────────────────────────────────────────────────────────────
 * Centraliza TODAS las operaciones de lectura/escritura.
 * 
 * VENTAJAS:
 * - Cambiar de localStorage → Netlify Functions requiere editar SOLO este archivo
 * - Tests unitarios más fáciles (puedes mockear storage completo)
 * - Cache automático para evitar fetch duplicados
 * - Manejo de errores consistente
 * 
 * USO:
 *   const data = await storage.loadJSON('precios.json');
 *   await storage.saveSubmission(formData);
 * 
 * MIGRACIÓN FUTURA:
 *   Solo cambias las funciones fetchFromAPI() y postToAPI()
 *   El resto de tu app sigue funcionando sin cambios.
 */

const storage = (() => {
  // ── CACHE EN MEMORIA ──────────────────────────────────────────
  // Evita cargar el mismo JSON múltiples veces en una sesión
  const cache = new Map();

  // ── CONFIGURACIÓN ─────────────────────────────────────────────
  const config = {
    baseURL: '.',

    // Tiempo de vida del cache (5 minutos)
    cacheTTL: 5 * 60 * 1000,

    // Endpoints — fuente única de verdad en brochure-config.js (window.config.endpoints)
    get endpoints() {
      const cfg = window.config || {};
      const end = cfg.endpoints || {};
      return {
        submit: end.submitForm || '/api/submit-form',
        contact: end.createContact || '/api/create-contact',
        discord: end.notifyDiscord || '/api/notify-discord'
      };
    }
  };

  // ── FUNCIONES PRIVADAS ────────────────────────────────────────

  /**
   * Carga un JSON estático (precios, escuelas, formulario, etc.)
   * ACTUAL: fetch del archivo local
   * FUTURO: fetch de API o CDN
   */
  async function fetchFromAPI(filename) {
    const url = `${config.baseURL}/data/${filename}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${filename}`);
    }

    return await response.json();
  }

  /**
   * Envía datos al backend
   * ACTUAL: localStorage + download manual
   * FUTURO: POST a Netlify Function o Supabase
   */
  function isLocalDev() {
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '' || h.endsWith('.local');
  }

  async function postToAPI(endpoint, data) {
    // Si no hay endpoint, saltamos (modo offline/local)
    if (!endpoint || endpoint === '' || endpoint.includes('null')) {
      return { success: false, skipped: true };
    }

    // DESARROLLO: simula guardado exitoso
    if (isLocalDev()) {
      console.log('[DEV] Guardado simulado:', endpoint, data);
      await new Promise(r => setTimeout(r, 800)); // Simular latencia
      return { ok: true, id: Date.now() };
    }

    // PRODUCCIÓN: envía al endpoint real con TIMEOUT
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos de espera

    try {
      const isGoogleScript = endpoint.includes('script.google.com');

      // Google Scripts: Usamos text/plain para evitar el "preflight request" (CORS)
      // Esto hace que sea una "Simple Request" y no necesita validación OPTIONS previa.
      const contentType = isGoogleScript ? 'text/plain' : 'application/json';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': contentType },
        body: JSON.stringify(data),
        signal: controller.signal,
        mode: isGoogleScript ? 'no-cors' : 'cors'
      });

      clearTimeout(timeoutId);

      // Si es Google Script con no-cors, el status será 0 (opaco). 
      // Si llegamos aquí sin que fetch lance un error, es que se envió.
      if (isGoogleScript) {
        return { success: true, message: 'Enviado en modo no-cors' };
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Manejo de respuestas vacías (como Discord que devuelve 204 No Content)
      const text = await response.text();
      try {
        return text ? JSON.parse(text) : { success: true };
      } catch (e) {
        // Si no es JSON pero el status es OK, lo damos por bueno (ej. Discord)
        return { success: true, raw: text };
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('El servidor tardó demasiado en responder (Timeout)');
      }
      throw error;
    }
  }

  // ── API PÚBLICA ───────────────────────────────────────────────

  return {
    /**
     * Carga un JSON con cache automático
     * @param {string} filename - Nombre del archivo (ej: 'precios.json')
     * @param {boolean} forceRefresh - Ignora cache y recarga
     * @returns {Promise<Object>}
     */
    async loadJSON(filename, forceRefresh = false) {
      const cacheKey = `json:${filename}`;

      // Verificar cache
      if (!forceRefresh && cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        const age = Date.now() - cached.timestamp;

        if (age < config.cacheTTL) {
          console.log(`[CACHE HIT] ${filename}`);
          return cached.data;
        }
      }

      // Cargar desde servidor
      try {
        console.log(`[FETCH] ${filename}`);
        const data = await fetchFromAPI(filename);

        // Guardar en cache
        cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });

        return data;
      } catch (error) {
        console.error(`[ERROR] No se pudo cargar ${filename}:`, error);

        // Fallback: retornar cache viejo si existe
        if (cache.has(cacheKey)) {
          console.warn(`[FALLBACK] Usando cache expirado de ${filename}`);
          return cache.get(cacheKey).data;
        }

        throw error;
      }
    },

    /**
     * Guarda una submission del formulario
     * ACTUAL: descarga JSON + intenta enviar a backend
     * FUTURO: solo envía a backend, sin descarga local
     */
    async saveSubmission(data, metadata = {}) {
      const payload = {
        ...data,
        _meta: {
          timestamp: new Date().toISOString(),
          ...metadata
        }
      };

      try {
        const result = await postToAPI(config.endpoints.submit, payload);

        if (result.success || result.ok) {
          return { success: true, id: result.id };
        } else {
          throw new Error(result.error || 'API rejected submission');
        }
      } catch (error) {
        console.error('[STORAGE] Error al guardar submission:', error);

        // Ya no descargamos JSON automáticamente para evitar spam en la PC del usuario.
        // La notificación de Discord (que se lanza después) sirve como respaldo.

        return {
          success: false,
          error: error.message,
          message: 'No se pudo sincronizar con la base de datos, pero la notificación de Discord se intentará enviar.'
        };
      }
    },

    /**
     * Crea/actualiza contacto en Google Contacts
     * FUTURO: Netlify Function que llama a Google Contacts API
     */
    async createContact(contactData) {
      try {
        return await postToAPI(config.endpoints.contact, contactData);
      } catch (error) {
        console.error('[ERROR] No se pudo crear contacto:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Envía notificación a Discord
     * FUTURO: Netlify Function con webhook de Discord
     */
    async notifyDiscord(message) {
      try {
        const endpoint = config.endpoints.discord;
        const isDirectWebhook = endpoint.includes('discord.com/api/webhooks');

        // Si es webhook directo, Discord espera { content: "..." }
        // Si es nuestra API, espera { message: "..." }
        const payload = isDirectWebhook ? { content: message } : { message };

        return await postToAPI(endpoint, payload);
      } catch (error) {
        console.error('[ERROR] No se pudo enviar a Discord:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Descarga un objeto como JSON (fallback manual)
     */
    downloadJSON(data, filename) {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      console.log(`[DOWNLOAD] ${filename}`);
    },

    /**
     * Limpia el cache (útil para testing)
     */
    clearCache() {
      cache.clear();
      console.log('[CACHE] Limpiado');
    },

    /**
     * Helpers privados expuestos para reutilización
     */
    _generateFilename(data) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const slug = (data.nombre || 'contacto')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      return `${data.idEscuela}_${ts}_${slug}.json`;
    }
  };
})();

// ── EXPORTS ───────────────────────────────────────────────────
// Para compatibilidad con módulos ES6 (si decides usarlos después)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = storage;
}
