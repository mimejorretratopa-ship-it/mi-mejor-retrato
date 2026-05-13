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
        submit:  end.submitForm || '/api/submit-form',
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
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
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
        // PRODUCCIÓN: enviar al backend
        const result = await postToAPI(config.endpoints.submit, payload);
        
        return {
          success: true,
          id: result.id,
          payload
        };
      } catch (error) {
        console.error('[ERROR] No se pudo guardar submission:', error);
        
        // FALLBACK: guardar localmente como JSON descargable
        this.downloadJSON(payload, this._generateFilename(data));
        
        return {
          success: false,
          error: error.message,
          payload,
          fallback: 'local_download'
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
        return await postToAPI(config.endpoints.discord, { message });
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
