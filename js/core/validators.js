/**
 * validators.js — Validadores puros
 * ────────────────────────────────────────────────────────────
 * Versión completa para compatibilidad con Website y Onboarding.
 */

const validators = (() => {
  
  const rules = {
    required(value) {
      if (typeof value === 'string') return value.trim().length > 0;
      return value !== null && value !== undefined && value !== '';
    },
    minLength(value, min) {
      return String(value).length >= min;
    },
    email(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
    },
    phone(value) {
      const digits = String(value).replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15;
    },
    select(value) {
      return value !== '' && value !== '— Selecciona —' && value !== null;
    }
  };

  return {
    validateField(value, fieldSchema) {
      const { label, tipo, requerido } = fieldSchema;

      if (!requerido && !rules.required(value)) return { valid: true, error: null };

      if (requerido && !rules.required(value)) {
        return { valid: false, error: `Por favor completa el campo "${label}"` };
      }

      if (tipo === 'email' && rules.required(value) && !rules.email(value)) {
        return { valid: false, error: 'Por favor ingresa un correo válido' };
      }

      if (tipo === 'tel' && rules.required(value) && !rules.phone(value)) {
        return { valid: false, error: 'Por favor ingresa un número válido' };
      }

      if (tipo === 'select' && requerido && !rules.select(value)) {
        return { valid: false, error: `Por favor selecciona una opción para "${label}"` };
      }

      return { valid: true, error: null };
    },

    validateFormData(data, formDefinition) {
      const errors = {};
      const campos = formDefinition.formulario.campos || [];

      campos.forEach(campo => {
        if (campo.tipo === 'hidden') return;
        if (['codigoPais', 'paqueteLabel', 'precio'].includes(campo.id)) return;

        const value = data[campo.id];
        const result = this.validateField(value, campo);

        if (!result.valid) {
          errors[campo.id] = result.error;
        }
      });

      if (data.hasOwnProperty('paquete') && !data.paquete) {
        errors.paquete = 'Por favor selecciona un paquete';
      }

      return {
        valid: Object.keys(errors).length === 0,
        errors
      };
    },

    sanitize(value, tipo) {
      if (typeof value !== 'string') return value;
      let sanitized = value.trim();
      if (tipo === 'email') sanitized = sanitized.toLowerCase();
      if (['tel', 'text', 'textarea'].includes(tipo)) sanitized = sanitized.replace(/\s+/g, ' ');
      return sanitized;
    },

    sanitizeFormData(data, formDefinition) {
      const sanitized = {};
      const campos = formDefinition.formulario.campos || [];

      campos.forEach(campo => {
        if (data.hasOwnProperty(campo.id)) {
          sanitized[campo.id] = this.sanitize(data[campo.id], campo.tipo);
        }
      });

      Object.keys(data).forEach(key => {
        if (!sanitized.hasOwnProperty(key)) {
          sanitized[key] = data[key];
        }
      });

      return sanitized;
    }
  };
})();

window.validators = validators;
