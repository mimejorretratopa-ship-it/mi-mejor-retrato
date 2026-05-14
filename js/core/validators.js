/**
 * validators.js — Validadores puros para toda la app
 */

const validators = (() => {
  const rules = {
    required: v => v !== null && v !== undefined && String(v).trim().length > 0,
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()),
    phone: v => String(v).replace(/\D/g, '').length >= 7
  };

  return {
    validateField(value, type, isRequired = true) {
      if (isRequired && !rules.required(value)) return { valid: false, error: 'Requerido' };
      if (type === 'email' && value && !rules.email(value)) return { valid: false, error: 'Email inválido' };
      if (type === 'tel' && value && !rules.phone(value)) return { valid: false, error: 'Número inválido' };
      return { valid: true };
    }
  };
})();

window.validators = validators;
