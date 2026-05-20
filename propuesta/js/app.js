document.addEventListener('DOMContentLoaded', initPropuesta);

let currentSchoolCode = '';
let schoolData = null;

async function initPropuesta() {
  // 1. Extraer slug
  const params = new URLSearchParams(window.location.search);
  let slug = params.get('brochure'); 
  
  if (!slug) {
    const match = window.location.pathname.match(/\/propuesta\/([a-z]{4}-\d{2})/);
    if (match) slug = match[1];
  }

  if (!slug) {
    showErrorState("El link que usaste no corresponde a una propuesta formal armada. Por eso te pedimos que escribas directo a Mike para darte respuesta más rápido.");
    setupForm();
    return;
  }

  currentSchoolCode = slug.split('-')[0];

  try {
    // 2. Cargar precios.json (fuente unificada)
    const escRes = await fetch('../onboarding/data/precios.json');
    if (!escRes.ok) throw new Error("No se pudo cargar el catálogo de escuelas.");
    const escData = await escRes.json();
    schoolData = escData.escuelas.find(s => s.code === currentSchoolCode);

    if (!schoolData) {
      showErrorState("El link que usaste no corresponde a una propuesta formal armada. Por eso te pedimos que escribas directo a Mike para darte respuesta más rápido.");
      setupForm();
      return;
    }

    document.getElementById('school-name').textContent = "Propuesta preparada para: " + schoolData.name;
    document.title = "Propuesta: " + schoolData.name;

    // Disparar Google Analytics AHORA con el título y código correcto
    if (typeof gtag === 'function') {
      gtag('config', 'G-6H4H52RL0T', {
        'page_title': document.title,
        'custom_map': { 'dimension1': 'school_id' },
        'school_id': currentSchoolCode
      });
    }

    // 3. Cargar contenido de la propuesta específica
    const propRes = await fetch(`./data/${currentSchoolCode}_propuesta.json`);
    if (!propRes.ok) throw new Error("Aún no hay una propuesta configurada para esta institución.");
    const propuesta = await propRes.json();

    if (propuesta.metadata && propuesta.metadata.titulo_principal) {
      document.getElementById('propuesta-title').textContent = propuesta.metadata.titulo_principal;
    } else {
      document.getElementById('propuesta-title').textContent = "Propuesta Fotográfica";
    }
    if (propuesta.metadata && propuesta.metadata.fecha_actualizacion) {
      document.getElementById('doc-date').textContent = "Última actualización: " + propuesta.metadata.fecha_actualizacion;
    }

    // 4. Renderizar (schoolData ya contiene los precios y paquetes)
    renderContent(propuesta, schoolData);
    
    // 6. Inicializar Galería
    if (propuesta.galeria && propuesta.galeria.portafolio_id) {
      await initGaleria(propuesta.galeria.portafolio_id);
    } else {
      document.getElementById('gallery-title').style.display = 'none';
      document.getElementById('gallery-container').style.display = 'none';
    }
    
    // Formulario de contacto eliminado a favor del botón de WhatsApp directo.
    document.getElementById('content-wrapper').style.display = 'block';
    const cta = document.querySelector('.cta-section');
    if (cta) cta.style.display = 'block';

  } catch (err) {
    console.error(err);
    showErrorState("El link que usaste no corresponde a una propuesta formal armada. Por eso te pedimos que escribas directo a Mike para darte respuesta más rápido.");
  }
}

function showErrorState(message) {
  document.getElementById('propuesta-title').textContent = "Enlace no válido";
  document.getElementById('school-name').textContent = message;
  document.getElementById('doc-date').style.display = 'none';
  document.getElementById('content-wrapper').style.display = 'none';
  const cta = document.querySelector('.cta-section');
  if (cta) cta.style.display = 'none';
}

function setSafeText(id, text) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = text;
  }
}

function renderContent(prop, precios) {
  // A. Diferenciadores
  setSafeText('txt-trato', prop.diferenciadores.trato_nino);
  setSafeText('txt-fotos', prop.diferenciadores.fotos_autenticas);
  setSafeText('txt-entregables', prop.diferenciadores.entregables);

  // B. Logística
  const ubs = prop.logistica.ubicacion.opciones_activas.map(u => u.texto_display).join(" / ");
  setSafeText('txt-ubicaciones', ubs);
  setSafeText('txt-capas', prop.logistica.capas_birretes.texto);
  
  const mascEl = document.getElementById('txt-mascotas');
  if (mascEl) {
    mascEl.textContent = prop.logistica.solicitudes_especiales.mascotas ? 'Sí' : 'No';
  }
  setSafeText('txt-familiares', prop.logistica.solicitudes_especiales.familiares);

  // C. Entregas y Políticas
  const ul = document.getElementById('list-entregas');
  if (ul) {
    ul.innerHTML = ''; // Limpiar anterior
    prop.entrega_y_pagos.metodo_entrega.forEach(m => {
      const li = document.createElement('li');
      li.textContent = m.texto;
      ul.appendChild(li);
    });
  }
  setSafeText('txt-tiempo', prop.entrega_y_pagos.tiempo_entrega_semanas);
  
  setSafeText('txt-inasistencia', prop.politicas.inasistencia.opcion_multiples_salones);
  setSafeText('txt-hermanos', prop.politicas.descuento_hermanos.texto);
  setSafeText('txt-dinero', prop.entrega_y_pagos.recoleccion_dinero.explicacion);

  // D. Tabla Comparativa Dinámica (fuente única: precios.json)
  if (precios && precios.visibilidad === 'publicar' && precios.paquetes && precios.paquetes.length > 0) {
    const paquetes = precios.paquetes;
    const minPrecio = Math.min(...paquetes.map(p => p.precio));
    setSafeText('precio-desde', 'Desde $' + minPrecio);

    // Precios en header
    paquetes.forEach((pkg, i) => {
      const ids = ['precio-esencial', 'precio-familiar', 'precio-premium'];
      if (ids[i]) setSafeText(ids[i], '$' + pkg.precio);
    });

    // Nombres en header
    paquetes.forEach((pkg, i) => {
      const ids = ['pt-nombre-0', 'pt-nombre-1', 'pt-nombre-2'];
      const el = document.getElementById(ids[i]);
      if (el) el.textContent = pkg.nombre;
    });

    // Filas del body: inyectadas como hijas directas de pt-grid (crítico para CSS Grid)
    const ptGrid = document.querySelector('.pt-grid');
    if (ptGrid && paquetes.every(p => p.tabla_comparativa)) {
      const tc = paquetes.map(p => p.tabla_comparativa);
      const featClass = i => i === 1 ? ' pt-feat' : '';
      const lastClass = ' pt-last';

      function cell(content, extra = '') {
        return `<div class="pt-cell${extra}" role="cell">${content}</div>`;
      }
      function labelCell(text, extra = '') {
        return `<div class="pt-cell pt-label${extra}" role="rowheader">${text}</div>`;
      }
      function boolCell(val, inverted = false) {
        if (val === null || val === false) {
          const cls = inverted ? 'pt-no-inv' : 'pt-no';
          return `<span class="${cls}">—</span>`;
        }
        const cls = inverted ? 'pt-ok-inv' : 'pt-ok';
        return `<span class="${cls}">✓</span>`;
      }
      function textOrNull(val, inverted = false) {
        if (!val) return boolCell(null, inverted);
        return val;
      }

      const rows = [
        // Fotos digitales
        labelCell('Fotos digitales') +
          tc.map((t, i) => cell(t.fotos_digitales, featClass(i))).join(''),
        // Foto grupal
        labelCell('Foto grupal') +
          tc.map((t, i) => cell(boolCell(t.foto_grupal, i === 1), featClass(i))).join(''),
        // Impresiones
        labelCell('Impresiones') +
          tc.map((t, i) => cell(textOrNull(t.impresiones, i === 1), featClass(i) + (t.impresiones ? ' pt-sm' : ''))).join(''),
        // Foto enmarcada
        labelCell('Foto enmarcada') +
          tc.map((t, i) => cell(textOrNull(t.foto_enmarcada, i === 1), featClass(i) + (t.foto_enmarcada ? ' pt-sm' : ''))).join(''),
        // Fotos familiares
        labelCell('Fotos familiares') +
          tc.map((t, i) => {
            const txt = t.fotos_familiares ? (i === 1 ? '<span class="pt-opt-inv">Incluidas</span>' : '<span class="pt-opt">Incluidas</span>') : boolCell(null, i === 1);
            return cell(txt, featClass(i));
          }).join(''),
        // Ideal para
        labelCell('Ideal para', lastClass) +
          tc.map((t, i) => cell(t.ideal_para, featClass(i) + lastClass + ' pt-sm')).join(''),
      ];

      ptGrid.insertAdjacentHTML('beforeend', rows.join(''));
    }

  } else {
    setSafeText('precio-desde', 'Precio pendiente');
    setSafeText('precio-esencial', 'Pendiente');
    setSafeText('precio-familiar', 'Pendiente');
    setSafeText('precio-premium', 'Pendiente');
  }
}

async function initGaleria(portafolioId) {
  try {
    const res = await fetch(`./portafolios/${portafolioId}/manifest.json`);
    if (!res.ok) throw new Error("No se pudo cargar el manifiesto de la galería.");
    const manifest = await res.json();
    
    if (manifest.titulo) {
      document.getElementById('gallery-title').textContent = manifest.titulo;
    }

    const container = document.getElementById('gallery-container');
    container.innerHTML = ''; // Limpiar anterior

    manifest.fotos.forEach(foto => {
      const item = document.createElement('div');
      // La orientación determina si ocupa 1 columna (vertical) o 3 (horizontal)
      const orientacionClass = foto.orientacion === 'horizontal' ? 'horizontal' : 'vertical';
      item.className = `gallery-item ${orientacionClass}`;

      // Ruta de la imagen relativa a la página propuesta/index.html
      const imgPath = `./portafolios/${portafolioId}/${foto.archivo}`;

      item.innerHTML = `
        <img src="${imgPath}" alt="${foto.alt || 'Fotografía escolar'}" loading="lazy">
        ${foto.caption ? `<p class="gallery-caption">${foto.caption}</p>` : ''}
      `;
      container.appendChild(item);
    });

  } catch (err) {
    console.warn("Error al cargar la galería:", err.message);
    document.getElementById('gallery-title').style.display = 'none';
    document.getElementById('gallery-container').style.display = 'none';
  }
}
