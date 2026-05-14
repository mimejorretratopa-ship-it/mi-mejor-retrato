/**
 * utils.js — Utilidades compartidas para Website y Onboarding
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

    debounce(fn, delay = 300) {
      let timeoutId;
      return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
      };
    },

    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  };
})();

window.utils = utils;
