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

  if (currentSchoolCode !== 'lasa') {
    document.getElementById('content-wrapper').style.display = 'none';
  }

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
    
    // Configurar form
    setupForm();

    document.getElementById('content-wrapper').style.display = 'block';

  } catch (err) {
    console.error(err);
    showErrorState("El link que usaste no corresponde a una propuesta formal armada. Por eso te pedimos que escribas directo a Mike para darte respuesta más rápido.");
    setupForm();
  }
}

function showErrorState(message) {
  document.getElementById('propuesta-title').textContent = "Enlace no válido";
  document.getElementById('school-name').textContent = message;
  document.getElementById('doc-date').style.display = 'none';
  document.getElementById('content-wrapper').style.display = 'none';
}

function renderContent(prop, precios) {
  // A. Diferenciadores
  document.getElementById('txt-trato').textContent = prop.diferenciadores.trato_nino;
  document.getElementById('txt-fotos').textContent = prop.diferenciadores.fotos_autenticas;
  document.getElementById('txt-entregables').textContent = prop.diferenciadores.entregables;

  // B. Logística
  const ubs = prop.logistica.ubicacion.opciones_activas.map(u => u.texto_display).join(" / ");
  document.getElementById('txt-ubicaciones').textContent = ubs;
  document.getElementById('txt-capas').textContent = prop.logistica.capas_birretes.texto;
  document.getElementById('txt-mascotas').textContent = prop.logistica.solicitudes_especiales.mascotas ? 'Sí' : 'No';
  document.getElementById('txt-familiares').textContent = prop.logistica.solicitudes_especiales.familiares;

  // C. Entregas y Políticas
  const ul = document.getElementById('list-entregas');
  prop.entrega_y_pagos.metodo_entrega.forEach(m => {
    const li = document.createElement('li');
    li.textContent = m.texto;
    ul.appendChild(li);
  });
  document.getElementById('txt-tiempo').textContent = prop.entrega_y_pagos.tiempo_entrega_semanas;
  
  document.getElementById('txt-inasistencia').textContent = prop.politicas.inasistencia.opcion_multiples_salones;
  document.getElementById('txt-hermanos').textContent = prop.politicas.descuento_hermanos.texto;
  document.getElementById('txt-dinero').textContent = prop.entrega_y_pagos.recoleccion_dinero.explicacion;

  // D. Precios
  const cont = document.getElementById('pricing-container');
  if (precios && precios.visibilidad === 'publicar' && precios.paquetes.length > 0) {
    precios.paquetes.forEach(p => {
      let entregablesHTML = '';
      if (p.entregables) {
        entregablesHTML += '<ul class="price-details">';
        if (p.entregables.impresos) {
          p.entregables.impresos.forEach(imp => {
            entregablesHTML += `<li>${imp.cantidad} foto(s) ${imp.tamano} ${imp.detalle || ''}</li>`;
          });
        }
        if (p.entregables.digitales && p.entregables.digitales.plataforma) {
          entregablesHTML += `<li>Acceso a ${p.entregables.digitales.plataforma}</li>`;
        }
        entregablesHTML += '</ul>';
      }

      const card = document.createElement('div');
      card.className = 'price-card';
      card.innerHTML = `
        <h4>${p.nombre}</h4>
        <div class="price-val">$${p.precio}</div>
        <div class="price-desc">${p.descripcion}</div>
        ${entregablesHTML}
      `;
      cont.appendChild(card);
    });
  } else {
    cont.innerHTML = '<p>Los precios están pendientes de confirmación para esta institución.</p>';
  }
}

function setupForm() {
  const form = document.getElementById('propuesta-form');
  const btn = document.getElementById('btn-submit');
  const msg = document.getElementById('form-msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    msg.className = 'msg-hidden';
    
    const data = {
      tipo: 'Lead_Propuesta',
      escuela: schoolData ? schoolData.name : 'Escuela Desconocida / Link Inválido',
      code: currentSchoolCode || 'none',
      nombre: document.getElementById('f_nombre').value,
      whatsapp: document.getElementById('f_whatsapp').value,
      email: document.getElementById('f_email').value,
      salon: document.getElementById('f_salon').value,
      tema: document.getElementById('f_tema').value
    };

    try {
      // Usar Api.notificarDiscord (cargada via js/core/api.js)
      const escName = schoolData ? schoolData.name : 'Escuela Desconocida';
      const discordPayload = {
        title: `📄 Nuevo Lead Exploratorio (${escName})`,
        description: "Un tomador de decisión (Director/Delegado) está solicitando ampliación de detalles.",
        fields: [
          { name: '👤 Nombre', value: data.nombre, inline: true },
          { name: '🏫 Cargo / Salón', value: data.salon, inline: true },
          { name: '📱 WhatsApp', value: data.whatsapp, inline: true },
          { name: '✉️ Email', value: data.email, inline: true },
          { name: '💬 "Mike, dame más detalles de:"', value: data.tema, inline: false }
        ]
      };
      
      if (window.api && typeof window.api.notificarDiscord === 'function') {
        await window.api.notificarDiscord(discordPayload, true);
      } else {
        console.warn("API de Discord no está disponible. No se envió la notificación.");
      }

      msg.textContent = '¡Mensaje enviado exitosamente! Mike le contactará pronto.';
      msg.className = 'msg-success msg-hidden'; // quitamos msg-hidden abajo
      msg.classList.remove('msg-hidden');
      form.reset();
    } catch (err) {
      msg.textContent = 'Hubo un error al enviar. Por favor contáctenos directamente.';
      msg.className = 'msg-error msg-hidden';
      msg.classList.remove('msg-hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enviar mensaje a Mike';
    }
  });
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
