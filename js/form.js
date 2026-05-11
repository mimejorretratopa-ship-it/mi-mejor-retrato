/**
 * form.js — Módulo de formulario de contacto
 * ──────────────────────────────────────────────────────────────
 * RESPONSABILIDADES:
 *   1. Validar campos antes de enviar
 *   2. Salvar borrador en localStorage mientras el usuario escribe
 *   3. Llamar a Api.enviarContacto() (nunca a fetch directamente)
 *   4. Actualizar State.form.status
 *   5. Mostrar/ocultar estados de UI del formulario
 *
 * DEPENDENCIAS (deben cargarse antes en index.html):
 *   config.js → window.APP_CONFIG
 *   storage.js → window.Storage
 *   state.js   → window.State
 *   api.js     → window.Api
 *
 * NO HACER AQUÍ:
 *   - Lógica de scroll reveal (está en ui.js)
 *   - Lógica del FAQ (está en ui.js)
 *   - Acceder a localStorage directamente (usar Storage)
 *   - Llamar a fetch directamente (usar Api)
 */

(function initForm() {
  // ── Elementos DOM ─────────────────────────────────────────
  const form      = document.getElementById('form-contacto');
  const msgExito  = document.getElementById('msg-exito');
  const msgError  = document.getElementById('msg-error');

  // Salida temprana si el formulario no existe en esta página
  if (!form) return;

  const btn = form.querySelector('.btn-enviar');

  // ── Borrador persistente ──────────────────────────────────
  // Restaura el borrador si el usuario recargó la página sin enviar
  const draft = window.Storage.get('contacto_draft');
  if (draft) {
    if (draft.nombre)  form.nombre.value  = draft.nombre;
    if (draft.celular) form.celular.value = draft.celular;
    if (draft.escuela) form.escuela.value = draft.escuela;
    if (draft.mensaje) form.mensaje.value = draft.mensaje;
  }

  // Guarda borrador mientras el usuario escribe (debounce leve)
  let _draftTimer;
  form.addEventListener('input', () => {
    clearTimeout(_draftTimer);
    _draftTimer = setTimeout(() => {
      window.Storage.set('contacto_draft', _leerCampos());
    }, 600);
  });

  // ── Validación ────────────────────────────────────────────
  function _validar(data) {
    const errors = {};
    if (!data.nombre)  errors.nombre  = 'Tu nombre es requerido';
    if (!data.celular) errors.celular = 'Tu celular es requerido';
    return errors; // {} si todo ok
  }

  function _mostrarErrores(errors) {
    // Limpia errores previos
    form.querySelectorAll('.campo-error').forEach(el => el.remove());
    form.querySelectorAll('.campo input, .campo textarea').forEach(el => {
      el.style.borderColor = '';
    });

    Object.entries(errors).forEach(([campo, msg]) => {
      const input = form.querySelector(`#${campo}`);
      if (!input) return;
      input.style.borderColor = 'rgba(240,112,48,.7)';

      const err = document.createElement('p');
      err.className   = 'campo-error';
      err.textContent = msg;
      err.style.cssText = 'font-size:.78rem;color:#F07030;margin-top:4px;';
      input.parentNode.appendChild(err);
    });

    // Foco en el primer campo con error
    const primero = Object.keys(errors)[0];
    if (primero) form.querySelector(`#${primero}`)?.focus();
  }

  // ── Leer campos ───────────────────────────────────────────
  function _leerCampos() {
    return {
      nombre:  form.nombre.value.trim(),
      celular: form.celular.value.trim(),
      escuela: form.escuela.value.trim(),
      mensaje: form.mensaje.value.trim(),
    };
  }

  // ── Estados de UI del formulario ──────────────────────────
  function _setEstado(estado) {
    window.State.set('form.status', estado);

    const estados = {
      idle: () => {
        btn.textContent = 'Enviar mensaje';
        btn.disabled    = false;
        msgExito.style.display = 'none';
        msgError.style.display = 'none';
        form.style.display     = '';
      },
      sending: () => {
        btn.textContent = 'Enviando…';
        btn.disabled    = true;
        msgError.style.display = 'none';
      },
      sent: () => {
        form.style.display     = 'none';
        msgExito.style.display = 'block';
        msgError.style.display = 'none';
        // Limpiar borrador al enviar exitosamente
        window.Storage.remove('contacto_draft');
      },
      error: () => {
        btn.textContent = 'Enviar mensaje';
        btn.disabled    = false;
        msgError.style.display = 'block';
      },
    };

    estados[estado]?.();
  }

  // ── Submit ────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data   = _leerCampos();
    const errors = _validar(data);

    if (Object.keys(errors).length > 0) {
      _mostrarErrores(errors);
      return;
    }

    _setEstado('sending');

    // La lógica de "¿hay endpoint o no?" vive en api.js, no aquí
    const result = await window.Api.enviarContacto(data);

    if (result.ok) {
      _setEstado('sent');

      // En desarrollo, avisar en consola que fue simulado
      if (result.dev && window.APP_CONFIG?.DEBUG) {
        console.info(
          '[Form] Modo DEV: el formulario se "envió" a localStorage.\n' +
          'Para envío real, configura FORM_ENDPOINT en config.js'
        );
      }
    } else {
      _setEstado('error');
    }
  });

})();
