document.addEventListener('DOMContentLoaded', initPropuesta);

let currentSchoolCode = '';
let schoolData = null;

async function initPropuesta() {
  // 1. Extraer slug
  const params = new URLSearchParams(window.location.search);
  let slug = params.get('brochure'); 
  
  if (!slug) {
    const match = window.location.pathname.match(/\/(?:propuesta|familias)\/([a-z]{4}-\d{2})/);
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
    const escRes = await fetch('/onboarding/data/precios.json');
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
    const propRes = await fetch(`/propuesta/data/${currentSchoolCode}_propuesta.json`);
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
    
    // 5. Link dinámico al onboarding (usa el slug de la URL, ej: lasa-26)
    renderOnboardingLink(slug);

    // 6. Inicializar Galería
    if (propuesta.galeria && propuesta.galeria.portafolio_id) {
      await initGaleria(propuesta.galeria.portafolio_id);
    } else {
      document.getElementById('gallery-title').style.display = 'none';
      document.getElementById('gallery-container').style.display = 'none';
    }
    
    // 7. Sección Regalo Kinder: solo visible en propuestas institucionales
    const audiencia = propuesta.metadata && propuesta.metadata.audiencia;
    const kinderSection = document.getElementById('kinder-gift-section');
    if (kinderSection) {
      kinderSection.style.display = (audiencia === 'institucional') ? 'block' : 'none';
    }

    document.getElementById('content-wrapper').style.display = 'block';
    const cta = document.querySelector('.cta-section');
    if (cta) cta.style.display = 'block';

    // 8. Inicializar mini-formulario B2B
    setupB2bForm(schoolData);

  } catch (err) {
    console.error(err);
    showErrorState("El link que usaste no corresponde a una propuesta formal armada. Por eso te pedimos que escribas directo a Mike para darte respuesta más rápido.");
  }
}

// ── MINI-FORMULARIO B2B (CTA Final) ──────────────────────────────────
function setupB2bForm(schoolData) {
  const form = document.getElementById('form-b2b-cta');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('btn-submit-b2b');
    const msgExito = document.getElementById('b2b-msg-exito');

    const nombre   = document.getElementById('b2b-nombre').value.trim();
    const whatsapp = document.getElementById('b2b-whatsapp').value.trim();
    const email    = document.getElementById('b2b-email').value.trim();
    const escuela  = document.getElementById('b2b-escuela').value.trim();

    btn.textContent = 'Enviando...';
    btn.disabled = true;

    try {
      // Notificar Discord con el lead B2B
      if (window.Api && typeof window.Api.notificarDiscord === 'function') {
        const wa_clean = whatsapp.replace(/\D/g, '');
        const waLink = `https://wa.me/507${wa_clean}?text=Hola+${encodeURIComponent(nombre)}%2C+gracias+por+tu+inter%C3%A9s.+Te+prepararemos+una+propuesta+personalizada.`;

        await window.Api.notificarDiscord({
          title: '🏫 Nuevo Lead B2B — Propuesta Institucional',
          fields: [
            { name: '👤 Nombre',   value: nombre,   inline: true  },
            { name: '📱 WhatsApp', value: wa_clean ? `507 ${wa_clean}` : whatsapp, inline: true  },
            { name: '📧 Correo',   value: email || 'No indicado',  inline: false },
            { name: '🏫 Escuela',  value: escuela,  inline: false },
            { name: '📄 Propuesta vista', value: schoolData ? schoolData.name : currentSchoolCode, inline: false },
            { name: '📲 Responder', value: `[WhatsApp →](${waLink})`, inline: false }
          ]
        });
      }

      // Mostrar éxito
      form.style.display = 'none';
      msgExito.style.display = 'block';

    } catch (err) {
      console.error('[B2B Form] Error:', err);
      btn.textContent = 'Solicitar Propuesta';
      btn.disabled = false;
      alert('Hubo un error al enviar. Por favor intenta de nuevo o escríbenos directamente.');
    }
  });
}

// ── LINK DINÁMICO AL ONBOARDING ──────────────────────────────────────
function renderOnboardingLink(slug) {
  // Busca todos los elementos con data-onboarding-link y actualiza su href
  document.querySelectorAll('[data-onboarding-link]').forEach(el => {
    const base = el.getAttribute('data-onboarding-base') || '/onboarding/';
    el.href = base + slug;
  });
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
      
      // Ajuste dinámico de columnas si hay menos de 3 paquetes
      if (paquetes.length < 3) {
        // Ajustar el grid CSS (1 label + N paquetes)
        ptGrid.style.gridTemplateColumns = `36% ${Array(paquetes.length).fill('1fr').join(' ')}`;
        
        // Ocultar cabeceras sobrantes
        for (let i = paquetes.length; i < 3; i++) {
          const ids = ['precio-esencial', 'precio-familiar', 'precio-premium'];
          const priceEl = document.getElementById(ids[i]);
          if (priceEl && priceEl.parentElement) {
            priceEl.parentElement.style.display = 'none';
          }
        }
      }

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

      const hasValidValue = (key) => {
        return tc.some(t => {
          const val = t[key];
          return val !== null && val !== false && val !== 0 && val !== "0" && val !== "";
        });
      };

      const rows = [];
      
      // Fotos digitales (siempre se muestra)
      rows.push(labelCell('Fotos digitales') + tc.map((t, i) => cell(t.fotos_digitales, featClass(i))).join(''));

      // Foto grupal
      if (hasValidValue('foto_grupal')) {
        rows.push(labelCell('Foto grupal') + tc.map((t, i) => cell(boolCell(t.foto_grupal, i === 1), featClass(i))).join(''));
      }

      // Impresiones
      if (hasValidValue('impresiones')) {
        rows.push(labelCell('Impresiones') + tc.map((t, i) => cell(textOrNull(t.impresiones, i === 1), featClass(i) + (t.impresiones ? ' pt-sm' : ''))).join(''));
      }

      // Foto enmarcada
      if (hasValidValue('foto_enmarcada')) {
        rows.push(labelCell('Foto enmarcada') + tc.map((t, i) => cell(textOrNull(t.foto_enmarcada, i === 1), featClass(i) + (t.foto_enmarcada ? ' pt-sm' : ''))).join(''));
      }

      // Fotos familiares
      if (hasValidValue('fotos_familiares')) {
        rows.push(labelCell('Fotos familiares') + tc.map((t, i) => {
          const txt = t.fotos_familiares ? (i === 1 ? '<span class="pt-opt-inv">Incluidas</span>' : '<span class="pt-opt">Incluidas</span>') : boolCell(null, i === 1);
          return cell(txt, featClass(i));
        }).join(''));
      }

      // Ideal para (siempre se muestra y lleva el lastClass)
      rows.push(labelCell('Ideal para', lastClass) + tc.map((t, i) => cell(t.ideal_para, featClass(i) + lastClass + ' pt-sm')).join(''));

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
    const res = await fetch(`/propuesta/portafolios/${portafolioId}/manifest.json`);
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
      const imgPath = `/propuesta/portafolios/${portafolioId}/${foto.archivo}`;

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
