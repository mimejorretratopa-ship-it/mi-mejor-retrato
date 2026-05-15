/**
 * MMR Agenda Public View Logic
 * Read-only fetch and render of salon schedules.
 */

// --- Utilities ---
function timeToMins(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minsToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function initView() {
  const params = new URLSearchParams(window.location.search);
  let sParam = params.get('s'); // Intento 1: ?s=clia_kinder

  // Intento 2: Si no hay ?s=, buscar en la ruta de la URL (ej: /agenda/clia_kinder)
  if (!sParam) {
    const pathParts = window.location.pathname.split('/');
    sParam = pathParts[pathParts.length - 1];
    if (sParam === 'view.html' || sParam === 'view') sParam = null;
  }

  // Normalizar: permitir guión o guión bajo
  if (sParam && sParam.includes('-')) sParam = sParam.replace('-', '_');

  if (!sParam || !sParam.includes('_')) {
    renderError("Enlace no válido. Por favor verifica el link de tu salón.");
    return;
  }

  const [schoolCode, salonValue] = sParam.split('_');

  try {
    // 1. Cargar nombres reales desde los JSONs de configuración para el título
    const schoolsRes = await fetch('../onboarding/data/escuelas.json');
    const schoolsData = await schoolsRes.json();
    const school = schoolsData.schools.find(s => s.code === schoolCode);
    
    const sectionsRes = await fetch(`../onboarding/data/${schoolCode}_secciones.json`);
    const sectionsData = await sectionsRes.json();
    const salon = sectionsData.salones.find(s => s.valor === salonValue);

    if (school && salon) {
      document.getElementById('view-title').textContent = school.name;
      document.getElementById('view-subtitle').textContent = `Agenda de Sesiones: ${salon.label}`;
    }

    // 2. Cargar datos de la Agenda desde el Hub
    const result = await window.api.getAgenda(schoolCode, salonValue);
    
    if (!result.ok || !result.data.agenda) {
      renderError("La agenda de este salón aún no ha sido configurada.");
      return;
    }

    renderSchedule(result.data.agenda);

  } catch (error) {
    console.error("Error loading view:", error);
    renderError("Hubo un problema al conectar con el servidor.");
  }
}

function renderError(msg) {
  document.getElementById('view-title').textContent = "Atención";
  document.getElementById('view-subtitle').textContent = msg;
  document.getElementById('schedule-list').innerHTML = '';
  document.querySelector('.counters-grid').style.display = 'none';
}

function renderSchedule(agenda) {
  const container = document.getElementById('schedule-list');
  container.innerHTML = '';

  let assignedCount = 0;
  let freeCount = 0;

  // Re-procesar slots (Lógica simplificada de agenda.js)
  const slots = agenda.scheduleSlots || [];
  
  slots.forEach(slot => {
    const row = document.createElement('div');
    row.className = 'slot-row';

    if (slot.type === 'break') {
      row.innerHTML = `
        <div class="slot-time">${slot.time}</div>
        <div class="slot-status status-break">BREAK</div>
        <div class="slot-student" style="color:var(--text-muted)">Descanso</div>
      `;
    } else {
      const studentObj = agenda.assignments[slot.time];
      const isOcupado = !!studentObj;
      
      if (isOcupado) {
        assignedCount++;
        row.classList.add('is-ocupado');
      } else {
        freeCount++;
      }

      const statusHtml = isOcupado 
        ? '<span class="status-ocupado">Ocupado</span>'
        : '<span class="status-libre">Libre</span>';
        
      const studentHtml = isOcupado 
        ? studentObj.nombre 
        : '<span style="opacity:0.3">—</span>';
        
      const extraBadge = slot.isExtra ? '<span class="badge-extra">Extra</span>' : '';
      
      row.innerHTML = `
        <div class="slot-time">${slot.time} ${extraBadge}</div>
        <div class="slot-status">${statusHtml}</div>
        <div class="slot-student">${studentHtml}</div>
      `;
    }

    container.appendChild(row);
  });

  document.getElementById('count-assigned').textContent = assignedCount;
  document.getElementById('count-free').textContent = freeCount;
}

// Iniciar
initView();
