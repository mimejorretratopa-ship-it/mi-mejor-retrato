/**
 * MÓDULO DE PAQUETES Y PRECIOS
 * La sección pública muestra una tabla comparativa (misma lógica que propuesta/app.js).
 * El selector del formulario usa radio buttons para la selección y envío.
 */

const paquetesModule = (() => {

  function renderTablaComparativa(paquetes) {
    const grid = document.getElementById('paquetes-grid');
    if (!grid) return;

    // El paquetes-grid es display:grid (diseñado para cards).
    // Para la tabla comparativa necesitamos que sea display:block
    // para que pricing-table-wrapper expanda al 100% del contenedor.
    grid.style.display = 'block';

    const tc = paquetes.map(p => p.tabla_comparativa);
    const hasTc = tc.every(t => t != null);
    const featClass = i => i === 1 ? ' pt-feat' : '';

    function cell(content, extra = '') {
      return `<div class="pt-cell${extra}" role="cell">${content}</div>`;
    }
    function labelCell(text, extra = '') {
      return `<div class="pt-cell pt-label${extra}" role="rowheader">${text}</div>`;
    }
    function boolCell(val, inverted = false) {
      if (!val) return `<span class="${inverted ? 'pt-no-inv' : 'pt-no'}">—</span>`;
      return `<span class="${inverted ? 'pt-ok-inv' : 'pt-ok'}">✓</span>`;
    }
    function textOrNull(val, inverted = false) {
      return val ? val : boolCell(false, inverted);
    }

    const header = paquetes.map((pkg, i) => `
      <div class="pt-cell pt-head${i === 1 ? ' pt-feat' : ''}" role="columnheader">
        ${i === 1 ? '<span class="pt-popular-badge">Popular</span>' : ''}
        <span class="pt-name">${pkg.nombre}</span>
        <span class="pt-price">$${pkg.precio}</span>
      </div>`).join('');

    let rows = '';
    if (hasTc) {
      rows = [
        labelCell('Fotos digitales') + tc.map((t, i) => cell(t.fotos_digitales, featClass(i))).join(''),
        labelCell('Foto grupal') + tc.map((t, i) => cell(boolCell(t.foto_grupal, i === 1), featClass(i))).join(''),
        labelCell('Impresiones') + tc.map((t, i) => cell(textOrNull(t.impresiones, i === 1), featClass(i) + (t.impresiones ? ' pt-sm' : ''))).join(''),
        labelCell('Foto enmarcada') + tc.map((t, i) => cell(textOrNull(t.foto_enmarcada, i === 1), featClass(i) + (t.foto_enmarcada ? ' pt-sm' : ''))).join(''),
        labelCell('Fotos familiares') + tc.map((t, i) => {
          const txt = t.fotos_familiares
            ? (i === 1 ? '<span class="pt-opt-inv">Incluidas</span>' : '<span class="pt-opt">Incluidas</span>')
            : boolCell(false, i === 1);
          return cell(txt, featClass(i));
        }).join(''),
        labelCell('Ideal para', ' pt-last') + tc.map((t, i) => cell(t.ideal_para, featClass(i) + ' pt-last pt-sm')).join(''),
      ].join('');
    }

    grid.innerHTML = `
      <div class="pricing-table-wrapper">
        <div class="pt-grid" role="table" aria-label="Comparación de paquetes">
          <div class="pt-cell pt-head pt-label" role="columnheader"></div>
          ${header}
          ${rows}
        </div>
      </div>`;
    grid.classList.remove('hidden');
  }

  function mostrarPaquetesEnFormulario(paquetes) {
    const elSelector = document.getElementById('paquete-selector');
    const elCampoPaq = document.getElementById('campo-paquete');
    const elSubmit   = document.getElementById('form-submit-area');

    if (!elSelector) return;

    elSelector.innerHTML = '';
    paquetes.forEach(pkg => {
      const option = document.createElement('label');
      option.className = 'paquete-option';
      option.setAttribute('for', `pkg-${pkg.id}`);
      option.innerHTML = `
        <input type="radio" id="pkg-${pkg.id}" name="pkg-radio" value="${pkg.id}">
        <div class="paquete-radio-dot"></div>
        <div class="paquete-option-info">
          <div class="paquete-option-nombre">${pkg.nombre}</div>
          <div class="paquete-option-desc">${pkg.descripcion}</div>
        </div>
        <div class="paquete-option-precio">$${pkg.precio}</div>`;

      option.addEventListener('click', () => {
        document.querySelectorAll('.paquete-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        const inputPaquete = document.getElementById('paquete');
        inputPaquete.value = pkg.id;
        inputPaquete.dispatchEvent(new Event('change'));

        document.getElementById('paqueteLabel').value = pkg.nombre + ' ' + pkg.descripcion;
        document.getElementById('precio').value       = String(pkg.precio);
        if (elCampoPaq) elCampoPaq.classList.remove('has-error');
      });

      elSelector.appendChild(option);
    });

    if (elCampoPaq) elCampoPaq.classList.remove('hidden');
    if (elSubmit)   elSubmit.classList.remove('hidden');
  }

  function mostrarPendienteEnFormulario() {
    const elSelector = document.getElementById('paquete-selector');
    if (elSelector) {
      elSelector.innerHTML = `
        <p style="font-size:.88rem;color:var(--bark);padding:14px 0;line-height:1.6;">
          Los precios aún no están definidos para tu institución.<br>
          Escríbenos y te informamos.
        </p>`;
    }

    const inputPaquete      = document.getElementById('paquete');
    const inputPaqueteLabel = document.getElementById('paqueteLabel');
    const inputPrecio       = document.getElementById('precio');

    if (inputPaquete)      inputPaquete.value      = 'pendiente';
    if (inputPaqueteLabel) inputPaqueteLabel.value  = 'Precio pendiente (consultar)';
    if (inputPrecio)       inputPrecio.value        = '0';

    const elCampoPaq = document.getElementById('campo-paquete');
    const elSubmit   = document.getElementById('form-submit-area');
    if (elCampoPaq) elCampoPaq.classList.remove('hidden');
    if (elSubmit)   elSubmit.classList.remove('hidden');
  }

  /**
   * Para no_publicar: preselecciona el primer paquete en los hidden fields
   * sin mostrar ningún selector al usuario.
   */
  function preseleccionarPaqueteSilencioso(paquetes) {
    const elSubmit = document.getElementById('form-submit-area');
    const inputPaquete      = document.getElementById('paquete');
    const inputPaqueteLabel = document.getElementById('paqueteLabel');
    const inputPrecio       = document.getElementById('precio');

    if (paquetes && paquetes.length > 0) {
      const pkg = paquetes[0];
      if (inputPaquete)      inputPaquete.value      = pkg.id;
      if (inputPaqueteLabel) inputPaqueteLabel.value  = pkg.nombre + ' ' + pkg.descripcion;
      if (inputPrecio)       inputPrecio.value        = String(pkg.precio);
    } else {
      if (inputPaquete)      inputPaquete.value      = 'generico';
      if (inputPaqueteLabel) inputPaqueteLabel.value  = 'Paquete por definir';
      if (inputPrecio)       inputPrecio.value        = '0';
    }

    if (elSubmit) elSubmit.classList.remove('hidden');
  }

  async function render() {
    const loading   = document.getElementById('paquetes-loading');
    const grid      = document.getElementById('paquetes-grid');
    const pendiente = document.getElementById('paquetes-pendiente');
    const divider   = document.getElementById('divider-paquetes');
    const section   = document.getElementById('paquetes');

    const pricing = state.helpers.getCurrentPricing();

    if (!pricing) {
      if (section) section.style.display = 'none';
      if (divider) divider.style.display = 'none';
      return;
    }

    const { visibilidad, paquetes } = pricing;

    if (loading) loading.classList.add('hidden');

    if (visibilidad === 'publicar' && paquetes && paquetes.length > 0) {
      // Sección pública: tabla comparativa
      renderTablaComparativa(paquetes);
      // Formulario: radio buttons de selección
      mostrarPaquetesEnFormulario(paquetes);

      const elSubmit = document.getElementById('form-submit-area');
      if (elSubmit) elSubmit.classList.remove('hidden');

    } else if (visibilidad === 'pendiente') {
      if (pendiente) pendiente.classList.remove('hidden');
      mostrarPendienteEnFormulario();

    } else {
      // no_publicar → ocultar sección pública
      if (section) section.style.display = 'none';
      if (divider) divider.style.display = 'none';
      preseleccionarPaqueteSilencioso(paquetes);
    }
  }

  return { render };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = paquetesModule;
}