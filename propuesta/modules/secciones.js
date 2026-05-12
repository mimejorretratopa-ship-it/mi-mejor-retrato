/**
 * MÓDULO DE SECCIONES
 * ────────────────────────────────────────────────────────────
 * Carga {code}_secciones.json desde state y oculta/muestra
 * secciones del DOM según la clave activo: true/false.
 *
 * Dependencias: state (ya en window)
 * Debe ejecutarse DESPUÉS de initBrochure() y loadAppData().
 */

const seccionesModule = (() => {

  /**
   * Mapa de clave JSON → ID de sección HTML (y divider asociado).
   * Separamos las galerías porque tienen lógica propia (galerias.js).
   */
  const SECCIONES_MAP = {
    la_diferencia:    { sectionId: 'la-diferencia',       dividerId: null },
    como_funciona:    { sectionId: 'como-funciona',       dividerId: null },
    sobre_mike:       { sectionId: 'sobre-mike',          dividerId: null },
    faq:              { sectionId: 'preguntas',           dividerId: null },
    mascotas:         { sectionId: 'mascotas',            dividerId: null },
    fondos:           { sectionId: 'fondos',              dividerId: null },
    direccion_estudio:{ sectionId: 'direccion-estudio',   dividerId: null },
    // Galerías: galerias.js las maneja internamente, pero las ocultamos aquí
    // si activo: false para que ni el divider aparezca.
    portafolio_inicio:{ sectionId: 'portafolio-inicio',   dividerId: 'divider-portafolio-inicio' },
    portafolio_medio: { sectionId: 'portafolio-medio',    dividerId: 'divider-portafolio-medio' },
    portafolio_cierre:{ sectionId: 'portafolio-cierre',   dividerId: 'divider-portafolio-cierre' },
    reserva:          { sectionId: 'reserva',             dividerId: null },
  };

  /**
   * Oculta o muestra una sección y su divider.
   */
  function applyVisibility(key, activo) {
    const mapping = SECCIONES_MAP[key];
    if (!mapping) return; // sección sin elemento DOM (ej: hero)

    const section = document.getElementById(mapping.sectionId);
    if (section) {
      section.style.display = activo ? '' : 'none';
    }

    if (mapping.dividerId) {
      const divider = document.getElementById(mapping.dividerId);
      if (divider) {
        divider.style.display = activo ? '' : 'none';
      }
    }
  }

  /**
   * Inicializa el módulo.
   * Lee state.sections (ya cargado por loadAppData) y aplica visibilidad.
   */
  function init() {
    const sections = state.get('sections');

    if (!sections || !sections.secciones) {
      console.warn('[SECCIONES] No hay datos de secciones en el state.');
      return;
    }

    const secciones = sections.secciones;

    Object.keys(secciones).forEach(key => {
      const seccion = secciones[key];
      if (typeof seccion.activo === 'boolean') {
        applyVisibility(key, seccion.activo);
        if (!seccion.activo) {
          console.log(`[SECCIONES] Oculta: ${key}`);
        }
      }
    });

    console.log('[SECCIONES] Visibilidad aplicada.');
  }

  return { init };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = seccionesModule;
}
