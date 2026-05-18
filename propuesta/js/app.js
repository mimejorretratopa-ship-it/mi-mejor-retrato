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
    // 2. Cargar escuelas.json (reutilizando el del onboarding)
    const escRes = await fetch('../onboarding/data/escuelas.json');
    if (!escRes.ok) throw new Error("No se pudo cargar el catálogo de escuelas.");
    const escData = await escRes.json();
    schoolData = escData.schools.find(s => s.code === currentSchoolCode);

    if (!schoolData) {
      showErrorState("El link que usaste no corresponde a una propuesta formal armada. Por eso te pedimos que escribas directo a Mike para darte respuesta más rápido.");
      setupForm();
      return;
    }

    document.getElementById('school-name').textContent = "Propuesta preparada para: " + schoolData.name;

    // 3. Cargar contenido de la propuesta específica
    const propRes = await fetch(`./data/${currentSchoolCode}_propuesta.json`);
    if (!propRes.ok) throw new Error("Aún no hay una propuesta configurada para esta institución.");
    const propuesta = await propRes.json();

    if (propuesta.metadata) {
      if (propuesta.metadata.titulo_principal) {
        document.getElementById('propuesta-title').textContent = propuesta.metadata.titulo_principal;
      }
      if (propuesta.metadata.fecha_actualizacion) {
        document.getElementById('doc-date').textContent = "Última actualización: " + propuesta.metadata.fecha_actualizacion;
      }
    }

    // 4. Cargar precios
    const preRes = await fetch('../onboarding/data/precios.json');
    const preData = await preRes.json();
    const preciosEscuela = preData.escuelas.find(e => e.code === currentSchoolCode);

    // 5. Renderizar
    renderContent(propuesta, preciosEscuela);
    
    // 6. Inicializar Galería
    if (propuesta.galeria && propuesta.galeria.portafolio_id) {
      await initGaleria(propuesta.galeria.portafolio_id);
    } else {
      document.getElementById('gallery-title').style.display = 'none';
      document.getElementById('gallery-container').style.display = 'none';
    }
    
    // Formulario de contacto eliminado a favor del botón de WhatsApp directo.
    document.getElementById('content-wrapper').style.display = 'block';

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

  // D. Precios Dinámicos (inyectar en tabla)
  if (precios && precios.visibilidad === 'publicar' && precios.paquetes.length >= 3) {
    setSafeText('precio-esencial', '$' + precios.paquetes[0].precio);
    setSafeText('precio-familiar', '$' + precios.paquetes[1].precio);
    setSafeText('precio-premium', '$' + precios.paquetes[2].precio);
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
