/**
 * MÓDULO DE UBICACIONES
 * ────────────────────────────────────────────────────────────
 * Renderiza la sección de ubicación según configuración.
 * EXTRAÍDO DE: líneas 850-900 del HTML original
 */

const ubicacionModule = (() => {

  function renderUbicacion(ubicacion, escuelas) {
    const ubic = escuelas.ubicaciones_catalogo.find(u => u.id === ubicacion);
    if (!ubic) return '';

    return `
      <div class="ubicacion-card">
        <img src="${ubic.imagen}" alt="${ubic.nombre}" loading="lazy">
        <h3>${ubic.nombre}</h3>
      </div>
    `;
  }

  async function render() {
    const sections = state.get('sections');
    const schools = state.get('schools');
    const contenedor = document.getElementById('ubicacion-contenido');
    const section = document.getElementById('ubicacion');
    const divider = document.getElementById('divider-ubicacion');

    if (!sections || !sections.secciones.ubicacion || !sections.secciones.ubicacion.activo) {
      section.style.display = 'none';
      divider.style.display = 'none';
      return;
    }

    const { estado, ubicaciones, mensaje } = sections.secciones.ubicacion;

    if (estado === 'pendiente') {
      contenedor.innerHTML = `
        <div class="ubicacion-pendiente">
          <p>La ubicación se confirmará próximamente.</p>
        </div>
      `;
    } else if (estado === 'texto') {
      contenedor.innerHTML = `
        <div class="ubicacion-pendiente">
          <p>${mensaje || 'La ubicación se confirmará próximamente.'}</p>
        </div>
      `;
    } else if (estado === 'colegio') {
      contenedor.innerHTML = `
        <div class="ubicaciones-grid">
          <div class="ubicacion-card">
            <img src="ubicaciones/escuela.jpg" alt="Instalaciones del colegio" loading="lazy">
            <p>Las fotos se harán en la escuela</p>
          </div>
        </div>
      `;
    } else if ((estado === 'definido' || estado === 'estudios') && ubicaciones && ubicaciones.length > 0) {
      contenedor.innerHTML = `
        <div class="ubicaciones-grid">
          ${ubicaciones.map(u => renderUbicacion(u, schools)).join('')}
        </div>
      `;
    }
  }

  return { render };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ubicacionModule;
}
