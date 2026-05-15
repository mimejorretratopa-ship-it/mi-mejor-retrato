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

    // Header (tipo especial)
    if (tipo === 'section_header') {
      const header = document.createElement('h3');
      header.className = 'form-section-header';
      header.innerHTML = label;
      wrapper.classList.add('campo-header');
      wrapper.appendChild(header);
      return wrapper;
    }

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

      case 'checkbox':
        const group = document.createElement('div');
        group.className = 'checkbox-group';
        const max = fieldDef.max_selecciones || 0;

        opciones.forEach(opt => {
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          const optVal = typeof opt === 'string' ? opt : opt.valor;

          const item = document.createElement('label');
          item.className = 'checkbox-item';
          
          const chk = document.createElement('input');
          chk.type = 'checkbox';
          chk.name = id;
          chk.value = optVal;
          chk.className = 'form-checkbox';
          
          if (max > 0) {
            chk.dataset.max = max;
            chk.addEventListener('change', () => {
              const checked = group.querySelectorAll('input:checked');
              if (checked.length > max) {
                chk.checked = false;
                alert(`Solo puedes seleccionar hasta ${max} opciones.`);
              }
            });
          }

          item.appendChild(chk);
          item.appendChild(document.createTextNode(optLabel));
          group.appendChild(item);
        });
        inputEl = group;
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

  // Special phone rendering removed as requested.
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
    const data = {};
    const idEscuelaEl = document.getElementById('idEscuela');
    if (idEscuelaEl) data.idEscuela = idEscuelaEl.value;

    const formDef = state.get('form');
    if (!formDef) return data;

    // Recopilar todos los campos (incluyendo hiddens)
    const campos = formDef.formulario?.campos || formDef;
    const allInputs = form.querySelectorAll('input, select, textarea');
    
    allInputs.forEach(input => {
      if (input.name) {
        if (input.type === 'checkbox') {
          if (input.checked) {
            if (!data[input.name]) data[input.name] = [];
            data[input.name].push(input.value);
          }
        } else {
          data[input.name] = input.value;
        }
      }
    });

    // Convertir arrays de checkboxes a string separado por comas para Sheets
    Object.keys(data).forEach(key => {
      if (Array.isArray(data[key])) {
        data[key] = data[key].join(', ');
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
    const campos = formDef.formulario?.campos || formDef;
    if (Array.isArray(campos)) {
      campos.forEach(campo => {
        clearFieldError(campo.id);
      });
    }

    // Mostrar errores
    if (!validation.valid) {
      Object.keys(validation.errors).forEach(fieldId => {
        showFieldError(fieldId, validation.errors[fieldId]);
      });
      
      // Auto-scroll al primer error
      const firstError = form.querySelector('.form-field.error, .campo.has-error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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
      const isCuestionario = form.id === 'form-cuestionario';
      let result;

      if (isCuestionario) {
        // LÓGICA CUESTIONARIO
        const metadata = {
          student_id: validation.data.student_id,
          nombre_estudiante: validation.data.nombre_estudiante,
          escuela: validation.data.escuela,
          salon: validation.data.salon
        };
        result = await storage.saveQuestionnaire(validation.data, metadata);
        
        // Notificación Discord simplificada para cuestionario
        if (config.features.discordNotifications) {
          storage.notifyDiscord(`📝 **Cuestionario Recibido**\nEstudiante: ${validation.data.nombre_estudiante}\nEscuela: ${validation.data.escuela}\nID: ${validation.data.student_id}`);
        }
      } else {
        // LÓGICA RESERVA (EXISTENTE)
        const brochure = state.get('brochure');
        const sections = state.get('sections');
        const salonData = (sections?.salones || []).find(s => s.valor === validation.data.salon);

        const metadata = {
          propuesta: brochure.id,
          schoolName: brochure.id,
          salon_corto: salonData?.corto || '',
          whatsapp_limpio: utils.cleanPhone(
            '507',
            validation.data.celular
          ),
          student_id: generateStudentId(validation.data)
        };

        result = await storage.saveSubmission(validation.data, metadata);

        // Notificación Discord con template
        const formDef = state.get('form');
        const rawTemplate = formDef?.flujos?.discord?.mensaje_template || '';
        const nombre_encoded = encodeURIComponent(validation.data.nombre);
        const school_name_encoded = encodeURIComponent(brochure.schoolName);
        const generoLabel = validation.data.genero === 'm' ? 'Niño' : (validation.data.genero === 'f' ? 'Niña' : '');

        const discordMsg = rawTemplate
          .replace('{nombre}', validation.data.nombre)
          .replace('{relacion}', validation.data.relacion)
          .replace('{nombreEstudiante}', validation.data.nombreEstudiante)
          .replace('{salon}', validation.data.salon)
          .replace('{genero}', generoLabel)
          .replace('{school_name}', brochure.schoolName)
          .replace('{codigoPais}', '507')
          .replace('{celular}', validation.data.celular)
          .replace('{paqueteLabel}', validation.data.paqueteLabel)
          .replace('{precio}', validation.data.precio)
          .replace('{whatsapp_limpio}', metadata.whatsapp_limpio)
          .replace('{nombre_encoded}', nombre_encoded)
          .replace('{school_name_encoded}', school_name_encoded)
          || `👤 ${validation.data.nombre} | 🎓 ${validation.data.nombreEstudiante} | 📱 ${metadata.whatsapp_limpio}`;

        if (config.features.discordNotifications) storage.notifyDiscord(discordMsg);
      }

      if (result.success) {
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
    const whatsapp = utils.cleanPhone('507', data.celular);
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
    const campos = formDef.formulario?.campos || formDef;
    if (!Array.isArray(campos)) return;

    const omitir = new Set(['paquete', 'paqueteLabel', 'precio']);

    campos.forEach(campo => {
      if (campo.tipo === 'hidden' || omitir.has(campo.id)) return;

      const fieldEl = renderField(campo);
      if (fieldEl) contenedorCampos.appendChild(fieldEl);
    });

    // Inicializar opciones de salón (solo si existe el selector desplegable)
    const salonEl = document.getElementById('salon');
    if (salonEl && salonEl.tagName === 'SELECT') {
      initSalonOptions();
    }

    // Nota: campo-paquete y form-submit-area los controla paquetes.js
    // según la visibilidad configurada en precios.json
  }

  /**
   * Inicializa el módulo
   */
  async function init(options = {}) {
    const {
      formId = 'form-reserva',
      fieldsContainerId = 'form-campos-dinamicos',
      submitBtnId = 'btn-enviar',
      successId = 'msg-exito',
      errorId = 'msg-error-form'
    } = options;

    // Obtener referencias DOM
    form = document.getElementById(formId);
    contenedorCampos = document.getElementById(fieldsContainerId);
    submitButton = document.getElementById(submitBtnId);
    successMessage = document.getElementById(successId);
    errorMessage = document.getElementById(errorId);

    if (!form || !contenedorCampos) {
      console.warn(`[FORM] Elementos no encontrados para el form "${formId}"`);
      return;
    }

    // Listener de submit
    form.addEventListener('submit', handleSubmit);

    // Renderizar
    await render();

    // Mostrar área de submit si estaba oculta
    const submitArea = document.getElementById('form-submit-area');
    if (submitArea) submitArea.classList.remove('hidden');
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