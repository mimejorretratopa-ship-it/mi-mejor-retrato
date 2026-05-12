/**
 * VALIDADORES PUROS
 * ────────────────────────────────────────────────────────────
 * Funciones de validación SIN dependencia del DOM.
 * 
 * ANTES:
 *   function validarFormulario(d) {
 *     const campoEl = document.getElementById('campo-nombre');
 *     // ... lógica mezclada con DOM
 *   }
 * 
 * DESPUÉS:
 *   const errors = validators.validateFormData(data, schema);
 *   if (errors.length > 0) { ... }
 * 
 * VENTAJAS:
 * - Testeable sin browser
 * - Reutilizable en backend
 * - Sin efectos secundarios
 * - Validación declarativa
 */

const validators = (() => {
  
  // ── VALIDADORES BÁSICOS ───────────────────────────────────────

  const rules = {
    /**
     * Valida que el valor no esté vacío
     */
    required(value) {
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      return value !== null && value !== undefined && value !== '';
    },

    /**
     * Valida longitud mínima
     */
    minLength(value, min) {
      return String(value).length >= min;
    },

    /**
     * Valida formato de email
     */
    email(value) {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(String(value).trim());
    },

    /**
     * Valida número de teléfono (solo dígitos)
     */
    phone(value) {
      const digits = String(value).replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15;
    },

    /**
     * Valida que sea una opción de un select
     */
    select(value) {
      return value !== '' && value !== '— Selecciona —' && value !== null;
    },

    /**
     * Valida URL
     */
    url(value) {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Valida número
     */
    number(value) {
      return !isNaN(parseFloat(value)) && isFinite(value);
    }
  };

  // ── MENSAJES DE ERROR PREDETERMINADOS ─────────────────────────

  const defaultMessages = {
    required: 'Este campo es requerido',
    minLength: 'Debe tener al menos {min} caracteres',
    email: 'Debe ser un email válido',
    phone: 'Debe ser un número de teléfono válido',
    select: 'Debes seleccionar una opción',
    url: 'Debe ser una URL válida',
    number: 'Debe ser un número válido'
  };

  // ── FUNCIONES PÚBLICAS ────────────────────────────────────────

  return {
    /**
     * Valida un campo individual
     * @param {*} value - Valor a validar
     * @param {Object} fieldSchema - Esquema del campo desde formulario.json
     * @returns {Object} - { valid: boolean, error: string|null }
     */
    validateField(value, fieldSchema) {
      const { id, label, tipo, requerido } = fieldSchema;

      // Si no es requerido y está vacío, es válido
      if (!requerido && !rules.required(value)) {
        return { valid: true, error: null };
      }

      // Validar según el tipo
      let valid = true;
      let error = null;

      // Required
      if (requerido && !rules.required(value)) {
        return {
          valid: false,
          error: `Por favor completa el campo "${label}"`
        };
      }

      // Email
      if (tipo === 'email' && rules.required(value) && !rules.email(value)) {
        return {
          valid: false,
          error: 'Por favor ingresa un correo válido'
        };
      }

      // Phone
      if (tipo === 'tel' && rules.required(value) && !rules.phone(value)) {
        return {
          valid: false,
          error: 'Por favor ingresa un número válido'
        };
      }

      // Select
      if (tipo === 'select' && requerido && !rules.select(value)) {
        return {
          valid: false,
          error: `Por favor selecciona una opción para "${label}"`
        };
      }

      // Min length para text
      if (tipo === 'text' && requerido && !rules.minLength(value, 2)) {
        return {
          valid: false,
          error: `"${label}" debe tener al menos 2 caracteres`
        };
      }

      return { valid: true, error: null };
    },

    /**
     * Valida un formulario completo
     * @param {Object} data - Datos del formulario
     * @param {Object} formDefinition - Definición desde formulario.json
     * @returns {Object} - { valid: boolean, errors: Object }
     */
    validateFormData(data, formDefinition) {
      const errors = {};
      const campos = formDefinition.formulario.campos || [];

      campos.forEach(campo => {
        // Omitir campos hidden y no requeridos vacíos
        if (campo.tipo === 'hidden') return;
        if (['codigoPais', 'paqueteLabel', 'precio'].includes(campo.id)) return;

        const value = data[campo.id];
        const result = this.validateField(value, campo);

        if (!result.valid) {
          errors[campo.id] = result.error;
        }
      });

      // Validar paquete solo si está presente en data
      if (data.hasOwnProperty('paquete')) {
        if (!data.paquete) {
          errors.paquete = 'Por favor selecciona un paquete';
        }
      }

      return {
        valid: Object.keys(errors).length === 0,
        errors
      };
    },

    /**
     * Sanitiza un valor (limpia espacios, etc.)
     */
    sanitize(value, tipo) {
      if (typeof value !== 'string') return value;

      let sanitized = value.trim();

      switch (tipo) {
        case 'email':
          sanitized = sanitized.toLowerCase();
          break;
        case 'tel':
          // Conserva formato pero elimina espacios múltiples
          sanitized = sanitized.replace(/\s+/g, ' ');
          break;
        case 'text':
        case 'textarea':
          // Elimina múltiples espacios
          sanitized = sanitized.replace(/\s+/g, ' ');
          break;
      }

      return sanitized;
    },

    /**
     * Sanitiza todos los campos de un formulario
     */
    sanitizeFormData(data, formDefinition) {
      const sanitized = {};
      const campos = formDefinition.formulario.campos || [];

      campos.forEach(campo => {
        if (data.hasOwnProperty(campo.id)) {
          sanitized[campo.id] = this.sanitize(data[campo.id], campo.tipo);
        }
      });

      // Copiar campos que no están en la definición
      Object.keys(data).forEach(key => {
        if (!sanitized.hasOwnProperty(key)) {
          sanitized[key] = data[key];
        }
      });

      return sanitized;
    },

    /**
     * Helpers de validación específicos del dominio
     */
    domain: {
      /**
       * Valida que el código de escuela exista
       */
      isValidSchoolCode(code, schools) {
        if (!schools || !schools.schools) return false;
        return schools.schools.some(s => s.code.toLowerCase() === code.toLowerCase());
      },

      /**
       * Valida ID de brochure (formato: xxxx-YY)
       */
      isValidBrochureId(id) {
        return /^[a-z]{4}-\d{2}$/.test(id);
      },

      /**
       * Valida que el paquete exista en los precios
       */
      isValidPackage(packageId, pricing, schoolCode) {
        if (!pricing || !pricing.escuelas) return false;
        
        const school = pricing.escuelas.find(e => 
          e.code.toLowerCase() === schoolCode.toLowerCase()
        );
        
        if (!school || !school.paquetes) return false;
        
        return school.paquetes.some(p => p.id === packageId);
      }
    }
  };
})();

// ── EXPORTS ───────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = validators;
}
