/**
 * MÓDULO DE PAQUETES Y PRECIOS
 * Maneja la visualización en la sección Y el selector del formulario.
 */

const paquetesModule = (() => {

  function buildEntregables(paquete) {
    const items = [];
    const imp = (paquete.entregables && paquete.entregables.impresos) || [];
    imp.forEach(i => {
      items.push(`${i.cantidad} foto${i.cantidad > 1 ? 's' : ''} ${i.tamano} ${i.detalle}`);
    });
    return items;
  }

  function renderCardSeccion(pkg, index) {
    const destacado = index === 1;
    const items = buildEntregables(pkg);
    const card = document.createElement('div');
    card.className = 'paquete-card reveal' + (destacado ? ' destacado' : '');
    card.innerHTML = `
      <div class="paquete-header">
        <div class="paquete-nombre">${pkg.nombre}</div>
        <div class="paquete-precio"><sup>$</sup>${pkg.precio}</div>
      </div>
      <p class="paquete-desc">${pkg.descripcion}</p>
      <ul class="paquete-items">
        ${items.map(it => `<li>${it}</li>`).join('')}
      </ul>`;
    return card;
  }

  function mostrarPaquetesEnFormulario(paquetes) {
    const elSelector  = document.getElementById('paquete-selector');
    const elCampoPaq  = document.getElementById('campo-paquete');
    const elSubmit    = document.getElementById('form-submit-area');

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
    const elCampoPaq = document.getElementById('campo-paquete');
    const elSubmit   = document.getElementById('form-submit-area');
    if (elCampoPaq) elCampoPaq.classList.remove('hidden');
    if (elSubmit)   elSubmit.classList.remove('hidden');
  }

  async function render() {
    const loading   = document.getElementById('paquetes-loading');
    const grid      = document.getElementById('paquetes-grid');
    const pendiente = document.getElementById('paquetes-pendiente');
    const divider   = document.getElementById('divider-paquetes');
    const section   = document.getElementById('paquetes');

    const pricing = state.helpers.getCurrentPricing();

    if (!pricing) {
      if (section)  section.style.display  = 'none';
      if (divider)  divider.style.display  = 'none';
      return;
    }

    const { visibilidad, paquetes } = pricing;

    if (loading) loading.classList.add('hidden');

    if (visibilidad === 'publicar' && paquetes && paquetes.length > 0) {
      if (grid) {
        grid.innerHTML = '';
        paquetes.forEach((paq, i) => grid.appendChild(renderCardSeccion(paq, i)));
        grid.classList.remove('hidden');
      }
      mostrarPaquetesEnFormulario(paquetes);
    } else if (visibilidad === 'pendiente') {
      if (pendiente) pendiente.classList.remove('hidden');
      mostrarPendienteEnFormulario();
    } else {
      // no_publicar → ocultar sección
      if (section) section.style.display = 'none';
      if (divider) divider.style.display = 'none';
    }
  }

  return { render };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = paquetesModule;
}
