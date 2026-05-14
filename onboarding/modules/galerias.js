/**
 * MÓDULO DE GALERÍAS
 * ────────────────────────────────────────────────────────────
 * Lee la configuración de portafolio_inicio/medio/cierre desde
 * state.sections, prueba imágenes con new Image(), construye
 * <figure> y los inyecta en el DOM. Oculta secciones vacías.
 *
 * Dependencias: state (ya en window), seccionesModule (ya ejecutado)
 */

const galeriasModule = (() => {

  /**
   * Mapa de clave de state → IDs en el DOM
   */
  const GALERIAS = [
    { key: 'portafolio_inicio', containerId: 'galeria-inicio',  sectionId: 'portafolio-inicio', dividerId: 'divider-portafolio-inicio' },
    { key: 'portafolio_medio',  containerId: 'galeria-medio',   sectionId: 'portafolio-medio',  dividerId: 'divider-portafolio-medio' },
    { key: 'portafolio_cierre', containerId: 'galeria-cierre',  sectionId: 'portafolio-cierre', dividerId: 'divider-portafolio-cierre' },
  ];

  /**
   * Prueba si una imagen existe y detecta su orientación.
   * @param {string} src - URL de la imagen
   * @returns {Promise<{existe: boolean, isHorizontal: boolean}>}
   */
  function probarImagen(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload  = () => {
        const isHorizontal = img.naturalWidth > img.naturalHeight;
        resolve({ existe: true, isHorizontal });
      };
      img.onerror = () => resolve({ existe: false, isHorizontal: false });
      img.src = src;
    });
  }

  /**
   * Genera las URLs de imágenes para una galería y las prueba secuencialmente.
   * Continúa hasta que una imagen falle o llegue a 99.
   *
   * @param {object} cfg - { carpeta, prefijo, extension }
   * @returns {Promise<object[]>} - Array de objetos { src, isHorizontal }
   */
  async function descubrirImagenes(cfg) {
    const { carpeta, prefijo, extension } = cfg;
    const infoImagenes = [];

    for (let i = 1; i <= 99; i++) {
      const num = String(i).padStart(2, '0');
      const src = `${carpeta}/${prefijo}${num}.${extension}`;
      const { existe, isHorizontal } = await probarImagen(src);
      if (!existe) break;
      infoImagenes.push({ src, isHorizontal });
    }

    return infoImagenes;
  }

  /**
   * Construye el HTML de una figura de galería.
   * @param {object} imgInfo - { src, isHorizontal }
   * @param {number} index
   * @returns {string}
   */
  function buildFigure(imgInfo, index) {
    const { src, isHorizontal } = imgInfo;
    const horizontalClass = isHorizontal ? 'galeria-item--horizontal' : '';
    
    return `<figure class="galeria-item ${horizontalClass}">
      <img src="${src}" alt="Sesión de fotos Mi Mejor Retrato" loading="${index === 0 ? 'eager' : 'lazy'}">
    </figure>`;
  }

  /**
   * Procesa una galería individual.
   */
  async function procesarGaleria({ key, containerId, sectionId, dividerId }) {
    const sections = state.get('sections');

    if (!sections || !sections.secciones) return;

    const cfg = sections.secciones[key];

    // Si la sección no existe o está inactiva, ya seccionesModule la ocultó
    if (!cfg || !cfg.activo) return;

    const container = document.getElementById(containerId);
    const section   = document.getElementById(sectionId);
    const divider   = dividerId ? document.getElementById(dividerId) : null;

    if (!container) {
      console.warn(`[GALERIAS] Contenedor no encontrado: #${containerId}`);
      return;
    }

    const imagenes = await descubrirImagenes(cfg);

    if (imagenes.length === 0) {
      // No hay imágenes: ocultar sección y divider
      if (section)  section.style.display  = 'none';
      if (divider)  divider.style.display  = 'none';
      console.log(`[GALERIAS] ${key}: sin imágenes, sección oculta.`);
      return;
    }

    container.innerHTML = imagenes.map((img, i) => buildFigure(img, i)).join('');
    console.log(`[GALERIAS] ${key}: ${imagenes.length} imágenes cargadas.`);
  }

  /**
   * Inicializa todas las galerías en paralelo.
   */
  async function init() {
    await Promise.all(GALERIAS.map(g => procesarGaleria(g)));
    console.log('[GALERIAS] Inicialización completa.');
  }

  return { init };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = galeriasModule;
}
