/**
 * storage.js — Capa de persistencia (Storage Adapter)
 * ──────────────────────────────────────────────────────────────
 * Maneja localStorage y carga de JSONs estáticos.
 */

const storage = (() => {
  const prefix = () => (window.config?.storage?.prefix ?? 'app_');
  const key = (name) => `${prefix()}${name}`;

  const log = (...args) => {
    if (window.config?.features?.debug) console.log('[STORAGE]', ...args);
  };

  const cache = new Map();

  return {
    // ── LOCAL STORAGE (Key-Value) ──
    set(name, value) {
      try {
        localStorage.setItem(key(name), JSON.stringify(value));
        log('set', name, value);
        return true;
      } catch (err) {
        console.warn('[STORAGE] set failed:', err);
        return false;
      }
    },

    get(name) {
      try {
        const raw = localStorage.getItem(key(name));
        if (raw === null) return null;
        const val = JSON.parse(raw);
        log('get', name, '→', val);
        return val;
      } catch (err) {
        console.warn('[STORAGE] get failed:', err);
        return null;
      }
    },

    remove(name) {
      localStorage.removeItem(key(name));
      log('remove', name);
    },

    // ── JSON LOADER (Static Data) ──
    async loadJSON(filename, useCache = true) {
      // 1. Verificar cache en memoria
      if (useCache && cache.has(filename)) {
        return cache.get(filename);
      }

      const path = filename.includes('/') ? filename : `data/${filename}`;
      
      try {
        log(`Cargando JSON: ${path}`);
        const response = await fetch(path);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (useCache) {
          cache.set(filename, data);
        }
        
        return data;
      } catch (error) {
        console.error(`[STORAGE] Error cargando ${path}:`, error);
        throw error;
      }
    },

    clearCache() {
      cache.clear();
      log('Cache limpiado');
    },

    // ── MÉTODOS DE NEGOCIO (Onboarding Legacy) ──
    // Se mantienen para compatibilidad con modules/form-renderer.js
    
    async saveSubmission(data, metadata) {
      try {
        const payload = { 
          ...data, 
          _meta: metadata, // IMPORTANTE: El Hub espera los metadatos en _meta
          timestamp: new Date().toISOString() 
        };
        
        // 1. Respaldo local inmediato
        this.set(`submission_${metadata.propuesta}`, payload);
        
        // 2. Envío "dispara y olvida" (fire-and-forget) para máxima velocidad
        // No usamos 'await' aquí para que la UI responda instantáneamente
        window.api.enviarReserva(payload).then(result => {
          log('Envío en segundo plano finalizado:', result.ok ? 'OK' : 'Error');
        });

        // Retornamos éxito inmediato confiando en el respaldo local
        return { success: true };
      } catch (error) {
        console.error('[STORAGE] saveSubmission failed:', error);
        return { success: false, error: error.message };
      }
    },

    async notifyDiscord(message) {
      // Enviamos el string directo para que api.js lo maneje como 'content'
      await window.api.notificarDiscord(message);
    },

    async createContact(data) {
      // Este método antes llamaba a un endpoint específico. 
      // El nuevo Hub ya maneja la creación de contactos, pero dejamos el log.
      log('createContact (delegado al Hub):', data.nombre);
    }
  };
})();

// Exponer globalmente
window.storage = storage;

// Compatibilidad con código viejo (Website buscaba window.Storage con S mayúscula)
window.Storage = storage;
