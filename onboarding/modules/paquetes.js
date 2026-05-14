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

    // Rellenar campos ocultos con 'pendiente' para pasar validación
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
   * sin mostrar ningún selector al usuario. El botón de enviar aparece normal.
   */
  function preseleccionarPaqueteSilencioso(paquetes) {
    const elSubmit = document.getElementById('form-submit-area');
    const inputPaquete      = document.getElementById('paquete');
    const inputPaqueteLabel = document.getElementById('paqueteLabel');
    const inputPrecio       = document.getElementById('precio');

    if (paquetes && paquetes.length > 0) {
      const pkg = paquetes[0]; // primer paquete = el acordado con la escuela
      if (inputPaquete)      inputPaquete.value      = pkg.id;
      if (inputPaqueteLabel) inputPaqueteLabel.value  = pkg.nombre + ' ' + pkg.descripcion;
      if (inputPrecio)       inputPrecio.value        = String(pkg.precio);
    } else {
      // Fallback si no hay paquetes pero se quiere permitir el envío
      if (inputPaquete)      inputPaquete.value      = 'generico';
      if (inputPaqueteLabel) inputPaqueteLabel.value  = 'Paquete por definir';
      if (inputPrecio)       inputPrecio.value        = '0';
    }

    // campo-paquete permanece hidden (el usuario no ve nada)
    // solo mostramos el botón de enviar
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
      // Muestra sección pública + selector en formulario
      if (grid) {
        grid.innerHTML = '';
        paquetes.forEach((paq, i) => grid.appendChild(renderCardSeccion(paq, i)));
        grid.classList.remove('hidden');
      }
      mostrarPaquetesEnFormulario(paquetes);

      // Asegurar que el botón de envío sea visible
      const elSubmit = document.getElementById('form-submit-area');
      if (elSubmit) elSubmit.classList.remove('hidden');

    } else if (visibilidad === 'pendiente') {
      // Muestra aviso pendiente en sección pública + aviso en formulario
      if (pendiente) pendiente.classList.remove('hidden');
      mostrarPendienteEnFormulario();

    } else {
      // no_publicar → ocultar sección pública de precios
      if (section) section.style.display = 'none';
      if (divider) divider.style.display = 'none';

      // Preseleccionar paquete en hidden fields, sin mostrarlo al usuario
      preseleccionarPaqueteSilencioso(paquetes);
    }
  }

  return { render };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = paquetesModule;
}