/**
 * utils.js — Utilidades compartidas
 * ────────────────────────────────────────────────────────────
 * Versión completa para compatibilidad con Website y Onboarding.
 */

const utils = (() => {
  return {
    cleanPhone(code, number) {
      const c = String(code).replace(/\D/g, '');
      const n = String(number).replace(/\D/g, '');
      return c + n;
    },

    slugify(text) {
      return String(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    },

    formatPrice(price, currency = '$') {
      return `${currency}${price}`;
    },

    encodeForURL(text) {
      return encodeURIComponent(String(text));
    },

    timestamp(date = new Date()) {
      return date.toISOString().replace(/[:.]/g, '-');
    },

    debounce(fn, delay = 300) {
      let timeoutId;
      return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
      };
    },

    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    copyToClipboard(text) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
      } catch { return false; }
    }
  };
})();

window.utils = utils;
