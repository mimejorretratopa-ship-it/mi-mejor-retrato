/**
 * MÓDULO DE FORMULARIO
 * ────────────────────────────────────────────────────────────
 * Maneja todo el ciclo de vida del formulario:
 * - Renderizado dinámico desde JSON
 * - Validación
 * - Envío
 * - Estados de carga/éxito/error
 * 
 * EXTRAÍDO DE: líneas 900-1242 del HTML original
 */

const formModule = (() => {

  // ── REFERENCIAS DOM (se inicializan en init) ──────────────────
  let form = null;
  let contenedorCampos = null;
  let submitButton = null;
  let successMessage = null;
  let errorMessage = null;

  // ── RENDERIZADO DE CAMPOS ─────────────────────────────────────

  /**
   * Renderiza un campo individual según su tipo
   */
  function renderField(fieldDef) {
    const { id, label, tipo, placeholder, opciones, requerido } = fieldDef;

    // Crear contenedor
    const wrapper = document.createElement('div');
    wrapper.className = 'campo';
    wrapper.id = `campo-${id}`;

    // Label
    const labelEl = document.createElement('label');
    labelEl.htmlFor = id;
    labelEl.className = 'form-label';
    labelEl.innerHTML = label + (requerido ? ' <span class="required">*</span>' : '');
    wrapper.appendChild(labelEl);

    // Input según tipo
    let inputEl;

    switch (tipo) {
      case 'select':
        inputEl = document.createElement('select');
        inputEl.className = 'form-select';

        // Opción placeholder
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = '— Selecciona —';
        inputEl.appendChild(placeholderOption);

        // Opciones
        if (opciones && Array.isArray(opciones)) {
          opciones.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.valor;
            option.textContent = opt.label;
            inputEl.appendChild(option);
          });
        }
        break;

      case 'textarea':
        inputEl = document.createElement('textarea');
        inputEl.className = 'form-textarea';
        inputEl.rows = 4;
        break;

      default:
        inputEl = document.createElement('input');
        inputEl.className = 'form-input';
        inputEl.type = tipo;
    }

    inputEl.id = id;
    inputEl.name = id;
    if (placeholder) inputEl.placeholder = placeholder;
    if (requerido) inputEl.required = true;

    wrapper.appendChild(inputEl);

    // Error container
    const errorEl = document.createElement('p');
    errorEl.className = 'campo-error-msg hidden';
    errorEl.id = `error-${id}`;
    wrapper.appendChild(errorEl);

    return wrapper;
  }

  /**
   * Renderiza el campo especial de teléfono (código + número)
   */
  function renderPhoneField(codigoDef, celularDef) {
    const wrapper = document.createElement('div');
    wrapper.className = 'campo';
    wrapper.id = 'campo-celular';

    // Label
    const label = document.createElement('label');
    label.className = 'form-label';
    label.innerHTML = celularDef.label + ' <span class="required">*</span>';
    wrapper.appendChild(label);

    // Container para código + número
    const phoneContainer = document.createElement('div');
    phoneContainer.className = 'phone-input-group';

    // Select de código de país
    const selectCodigo = document.createElement('select');
    selectCodigo.id = 'codigoPais';
    selectCodigo.name = 'codigoPais';
    selectCodigo.className = 'form-select phone-code';

    codigoDef.opciones.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.valor;
      option.textContent = opt.label;
      if (opt.valor === codigoDef.default) {
        option.selected = true;
      }
      selectCodigo.appendChild(option);
    });

    // Input de número
    const inputCelular = document.createElement('input');
    inputCelular.type = 'tel';
    inputCelular.id = 'celular';
    inputCelular.name = 'celular';
    inputCelular.className = 'form-input phone-number';
    inputCelular.placeholder = celularDef.placeholder || '6000-0000';
    inputCelular.required = true;

    phoneContainer.appendChild(selectCodigo);
    phoneContainer.appendChild(inputCelular);
    wrapper.appendChild(phoneContainer);

    // Error container
    const errorEl = document.createElement('p');
    errorEl.className = 'campo-error-msg hidden';
    errorEl.id = 'error-celular';
    wrapper.appendChild(errorEl);

    return wrapper;
  }

  /**
   * Inicializa las opciones del selector de salón
   * (carga desde SECCIONES_DATA que ya fue inicializado)
   */
  function initSalonOptions() {
    const salonSelect = document.getElementById('salon');
    if (!salonSelect) return;

    const sections = state.get('sections');
    if (!sections || !sections.salones) {
      console.warn('[FORM] No hay opciones de salón en secciones.json');
      return;
    }

    // Limpiar opciones existentes excepto placeholder
    while (salonSelect.options.length > 1) {
      salonSelect.remove(1);
    }

    // Agregar opciones
    sections.salones.forEach(salon => {
      const option = document.createElement('option');
      option.value = salon.valor;
      option.textContent = salon.label;
      salonSelect.appendChild(option);
    });
  }

  // ── VALIDACIÓN ────────────────────────────────────────────────

  /**
   * Muestra/oculta error en un campo
   */
  function showFieldError(fieldId, message) {
    const campo = document.getElementById(`campo-${fieldId}`);
    const errorEl = document.getElementById(`error-${fieldId}`);
    const inputEl = document.getElementById(fieldId);

    if (!campo || !errorEl || !inputEl) return;

    campo.classList.add('has-error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden'); // por si acaso
    // El CSS ya hace display: block si tiene .has-error
  }

  /**
   * Limpia el error de un campo
   */
  function clearFieldError(fieldId) {
    const campo = document.getElementById(`campo-${fieldId}`);
    const errorEl = document.getElementById(`error-${fieldId}`);
    const inputEl = document.getElementById(fieldId);

    if (!campo || !errorEl || !inputEl) return;

    campo.classList.remove('has-error');
    errorEl.classList.add('hidden');
  }

  /**
   * Recopila los datos del formulario
   */
  function collectFormData() {
    const data = {
      idEscuela: document.getElementById('idEscuela').value
    };

    const formDef = state.get('form');
    if (!formDef) return data;

    // Recopilar todos los campos
    formDef.formulario.campos.forEach(campo => {
      const el = document.getElementById(campo.id);
      if (el) {
        data[campo.id] = el.value;
      }
    });

    return data;
  }

  /**
   * Valida y sanitiza los datos del formulario
   */
  function validateForm() {
    const data = collectFormData();
    const formDef = state.get('form');

    if (!formDef) {
      console.error('[FORM] Definición de formulario no cargada');
      return { valid: false, data: null };
    }

    // Sanitizar
    const sanitized = validators.sanitizeFormData(data, formDef);

    // Validar
    const validation = validators.validateFormData(sanitized, formDef);

    // Limpiar errores previos
    formDef.formulario.campos.forEach(campo => {
      clearFieldError(campo.id);
    });

    // Mostrar errores
    if (!validation.valid) {
      Object.keys(validation.errors).forEach(fieldId => {
        showFieldError(fieldId, validation.errors[fieldId]);
      });
    }

    return {
      valid: validation.valid,
      data: sanitized
    };
  }

  // ── ENVÍO DEL FORMULARIO ──────────────────────────────────────

  /**
   * Maneja el envío del formulario
   */
  async function handleSubmit(e) {
    e.preventDefault();

    const validation = validateForm();
    if (!validation.valid) {
      return;
    }

    // Deshabilitar botón
    submitButton.textContent = 'Enviando...';
    submitButton.disabled = true;

    try {
      // Preparar metadata
      const brochure = state.get('brochure');
      const sections = state.get('sections');
      const salonData = (sections?.salones || []).find(s => s.valor === validation.data.salon);

      const metadata = {
        propuesta: brochure.id,
        // DISEÑO INTENCIONAL: se envía el ID corto "clia-26", no el nombre largo.
        // Esto hace que la columna Colegio en Sheets/Airtable sea filtrable y consistente.
        // Ver MIGRATION-GUIDE.md § "Campo Colegio — diseño intencional"
        schoolName: brochure.id,
        salon_corto: salonData?.corto || '',
        whatsapp_limpio: utils.cleanPhone(
          validation.data.codigoPais,
          validation.data.celular
        ),
        student_id: generateStudentId(validation.data)
      };

      // Guardar submission
      const result = await storage.saveSubmission(validation.data, metadata);

      // ── NOTIFICACIONES (SILENCIOSAS — se intentan siempre) ───────

      // Leer template desde formulario.json y reemplazar variables
      const formDef = state.get('form');
      const rawTemplate = formDef?.flujos?.discord?.mensaje_template || '';
      const nombre_encoded = encodeURIComponent(validation.data.nombre);
      const school_name_encoded = encodeURIComponent(brochure.schoolName);

      const discordMsg = rawTemplate
        .replace('{nombre}', validation.data.nombre)
        .replace('{relacion}', validation.data.relacion)
        .replace('{nombreEstudiante}', validation.data.nombreEstudiante)
        .replace('{salon}', validation.data.salon)
        .replace('{school_name}', brochure.schoolName)
        .replace('{codigoPais}', validation.data.codigoPais)
        .replace('{celular}', validation.data.celular)
        .replace('{paqueteLabel}', validation.data.paqueteLabel)
        .replace('{precio}', validation.data.precio)
        .replace('{whatsapp_limpio}', metadata.whatsapp_limpio)
        .replace('{nombre_encoded}', nombre_encoded)
        .replace('{school_name_encoded}', school_name_encoded)
        || `👤 ${validation.data.nombre} | 🎓 ${validation.data.nombreEstudiante} | 📱 ${metadata.whatsapp_limpio}`;

      if (config.features.discordNotifications) storage.notifyDiscord(discordMsg);
      if (config.features.googleContacts) storage.createContact(validation.data);

      if (result.success || result.fallback === 'local_download') {
        // success: API respondió OK
        // fallback: API falló pero el JSON se descargó localmente — igual mostramos éxito
        if (!result.success) {
          console.warn('[FORM] API no disponible; datos guardados como descarga local.');
        }
        showSuccess(validation.data);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('[FORM] Error al enviar:', error);
      showError();
    }
  }

  /**
   * Genera el student_id único
   */
  function generateStudentId(data) {
    const whatsapp = utils.cleanPhone(data.codigoPais, data.celular);
    const nombreSlug = utils.slugify(data.nombreEstudiante);
    const salonSlug = utils.slugify(data.salon);
    return `${whatsapp}_${nombreSlug}_${salonSlug}`;
  }

  /**
   * Muestra mensaje de éxito
   */
  function showSuccess(data) {
    form.style.display = 'none';
    errorMessage.style.display = 'none';
    successMessage.style.display = 'block';

    const brochure = state.get('brochure');
    const photographerNum = config.whatsapp.photographerNumber;
    const msg = utils.encodeForURL(
      config.whatsapp.messageTemplate(data.nombre, brochure.schoolName)
    );

    const successText = document.getElementById('msg-exito-texto');
    if (successText) {
      successText.innerHTML = `
        Mike te escribe en un momento por WhatsApp para coordinar.<br>
        Si prefieres escribirle directo:<br>
        <a href="https://wa.me/${photographerNum}?text=${msg}" target="_blank">
          +${photographerNum.substring(0, 3)} ${photographerNum.substring(3)}
        </a>
      `;
    }

    // Track evento en analytics
    if (config.features.analytics && window.gtag) {
      window.gtag('event', config.analytics.events.formSubmit, {
        school_code: brochure.code,
        package: data.paquete
      });
    }
  }

  /**
   * Muestra mensaje de error
   */
  function showError() {
    errorMessage.style.display = 'block';
    submitButton.textContent = 'Enviar formulario';
    submitButton.disabled = false;
  }

  // ── INICIALIZACIÓN ────────────────────────────────────────────

  /**
   * Renderiza el formulario completo
   */
  async function render() {
    const formDef = state.get('form');
    if (!formDef) {
      console.error('[FORM] No se pudo cargar la definición del formulario');
      return;
    }

    contenedorCampos.innerHTML = '';

    // Renderizar campos
    const omitir = new Set(['codigoPais', 'paquete', 'paqueteLabel', 'precio']);
    const codigoDef = formDef.formulario.campos.find(c => c.id === 'codigoPais');
    const celularDef = formDef.formulario.campos.find(c => c.id === 'celular');

    let phoneRendered = false;

    formDef.formulario.campos.forEach(campo => {
      if (campo.tipo === 'hidden' || omitir.has(campo.id)) return;

      // Renderizar campo especial de teléfono
      if (campo.id === 'celular' && !phoneRendered) {
        const phoneField = renderPhoneField(codigoDef, celularDef);
        contenedorCampos.appendChild(phoneField);
        phoneRendered = true;
        return;
      }

      if (campo.id === 'codigoPais') return; // Ya se renderizó con celular

      const fieldEl = renderField(campo);
      if (fieldEl) contenedorCampos.appendChild(fieldEl);
    });

    // Inicializar opciones de salón
    initSalonOptions();

    // Nota: campo-paquete y form-submit-area los controla paquetes.js
    // según la visibilidad configurada en precios.json
  }

  /**
   * Inicializa el módulo
   */
  async function init() {
    // Obtener referencias DOM
    form = document.getElementById('form-reserva');
    contenedorCampos = document.getElementById('form-campos-dinamicos');
    submitButton = document.getElementById('btn-enviar');
    successMessage = document.getElementById('msg-exito');
    errorMessage = document.getElementById('msg-error-form');

    if (!form || !contenedorCampos) {
      console.error('[FORM] Elementos del DOM no encontrados');
      return;
    }

    // Listener de submit
    form.addEventListener('submit', handleSubmit);

    // Renderizar
    await render();
  }

  // ── API PÚBLICA ───────────────────────────────────────────────

  return {
    init
  };
})();

// ── EXPORTS ───────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = formModule;
}