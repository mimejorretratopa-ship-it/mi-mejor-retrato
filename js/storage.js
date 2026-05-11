/**
 * storage.js — Capa de persistencia (Storage Adapter)
 * ──────────────────────────────────────────────────────────────
 * PATRÓN: Adapter. La UI nunca toca localStorage directamente.
 * Toda la app llama a Storage.get() / Storage.set() / Storage.remove()
 *
 * POR QUÉ:
 *   Si mañana migras a Supabase o IndexedDB, solo reescribes ESTE archivo.
 *   El resto de la app no cambia nada.
 *
 * TRANSICIÓN FUTURA a Supabase:
 *   Reemplaza el body de cada método con llamadas a tu cliente Supabase.
 *   La firma de las funciones permanece igual → cero cambios en ui.js / form.js
 *
 * USO:
 *   Storage.set('contacto_draft', { nombre: 'Ana' })
 *   Storage.get('contacto_draft')  // → { nombre: 'Ana' } | null
 *   Storage.remove('contacto_draft')
 *   Storage.list()                 // → ['contacto_draft', ...]
 */

const Storage = (() => {
  // Prefijo para aislar las keys de esta app
  const prefix = () => (window.APP_CONFIG?.STORAGE_PREFIX ?? 'app_');
  const key    = (name) => `${prefix()}${name}`;

  const log = (...args) => {
    if (window.APP_CONFIG?.DEBUG) console.log('[Storage]', ...args);
  };

  return {
    /**
     * Guarda un valor. Acepta cualquier tipo serializable.
     * @param {string} name  - nombre lógico (sin prefijo)
     * @param {*}      value - valor a guardar (se serializa a JSON)
     * @returns {boolean} true si tuvo éxito
     */
    set(name, value) {
      try {
        localStorage.setItem(key(name), JSON.stringify(value));
        log('set', name, value);
        return true;
      } catch (err) {
        console.warn('[Storage] set failed:', err);
        return false;
      }
    },

    /**
     * Lee un valor. Devuelve null si no existe o hay error.
     * @param {string} name
     * @returns {*} valor deserializado | null
     */
    get(name) {
      try {
        const raw = localStorage.getItem(key(name));
        if (raw === null) return null;
        const val = JSON.parse(raw);
        log('get', name, '→', val);
        return val;
      } catch (err) {
        console.warn('[Storage] get failed:', err);
        return null;
      }
    },

    /**
     * Elimina un valor.
     * @param {string} name
     */
    remove(name) {
      try {
        localStorage.removeItem(key(name));
        log('remove', name);
      } catch (err) {
        console.warn('[Storage] remove failed:', err);
      }
    },

    /**
     * Lista todas las keys de esta app (sin prefijo).
     * @returns {string[]}
     */
    list() {
      const p = prefix();
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(p)) keys.push(k.slice(p.length));
      }
      return keys;
    },

    /**
     * Limpia TODO el storage de esta app.
     * Útil para "cerrar sesión" o reset de desarrollo.
     */
    clear() {
      const p = prefix();
      const toDelete = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(p)) toDelete.push(k);
      }
      toDelete.forEach(k => localStorage.removeItem(k));
      log('clear — eliminadas', toDelete.length, 'keys');
    },
  };
})();

// Exponer globalmente
window.Storage = Storage;
