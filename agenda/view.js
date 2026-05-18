/**
 * MMR Agenda Public View Logic
 * Read-only fetch, compute and render of salon schedules.
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
  let sParam = params.get('s');

  if (!sParam) {
    const pathParts = window.location.pathname.split('/');
    sParam = pathParts[pathParts.length - 1];
    if (sParam === 'view.html' || sParam === 'view') sParam = null;
  }

  if (sParam && sParam.includes('-')) sParam = sParam.replace('-', '_');

  if (!sParam || !sParam.includes('_')) {
    renderError("Enlace no válido. Por favor verifica el link de tu salón.");
    return;
  }

  const [schoolCode, salonValue] = sParam.split('_');

  try {
    const schoolsRes = await fetch('../onboarding/data/precios.json');
    const schoolsData = await schoolsRes.json();
    const school = schoolsData.escuelas.find(s => s.code === schoolCode);
    
    const sectionsRes = await fetch(`../onboarding/data/${schoolCode}_secciones.json`);
    const sectionsData = await sectionsRes.json();
    const salon = sectionsData.salones.find(s => s.valor === salonValue);

    if (school && salon) {
      document.getElementById('view-title').textContent = school.name;
      document.getElementById('view-subtitle').textContent = `Agenda de Sesiones: ${salon.label}`;
    }

    const result = await window.api.getAgenda(schoolCode, salonValue);
    
    if (!result.ok || !result.data.agenda) {
      renderError("La agenda de este salón aún no ha sido configurada.");
      return;
    }

    // --- Motor de Generación (Local) ---
    const agenda = result.data.agenda;
    const computedSlots = computeSchedule(agenda);
    renderSchedule(computedSlots, agenda.assignments || {});

  } catch (error) {
    console.error("Error loading view:", error);
    renderError("Hubo un problema al conectar con el servidor.");
  }
}

function computeSchedule(agenda) {
  const slots = [];
  const config = agenda.config;
  const breaks = agenda.breaks || [];
  const extraSlots = agenda.extraSlots || [];

  const startMins = timeToMins(config.startTime);
  const endMins = timeToMins(config.endTime);
  const dur = config.duration;
  const gap = config.gap;
  
  let currentMins = startMins;

  while (currentMins + dur <= endMins) {
    // Buscar si choca con un break
    const overlappingBreak = breaks.find(b => {
        const bStart = timeToMins(b.time);
        const bEnd = bStart + b.duration;
        return currentMins < bEnd && (currentMins + dur) > bStart;
    });
    
    if (overlappingBreak) {
      const bTime = overlappingBreak.time;
      if (!slots.some(s => s.time === bTime && s.type === 'break')) {
        slots.push({
          time: bTime,
          type: 'break',
          duration: overlappingBreak.duration,
          mins: timeToMins(bTime)
        });
      }
      currentMins = timeToMins(bTime) + overlappingBreak.duration;
    } else {
      slots.push({
        time: minsToTime(currentMins),
        type: 'slot',
        isExtra: false,
        duration: dur,
        mins: currentMins
      });
      currentMins += dur + gap;
    }
  }

  // Inyectar extras
  extraSlots.forEach(eTime => {
    const eMins = timeToMins(eTime);
    const collision = slots.some(s => {
      const sEnd = s.mins + (s.duration || dur);
      return (eMins < sEnd && (eMins + dur) > s.mins);
    });

    if (!collision) {
      slots.push({
        time: eTime,
        type: 'slot',
        isExtra: true,
        duration: dur,
        mins: eMins
      });
    }
  });

  return slots.sort((a, b) => a.mins - b.mins);
}

function renderError(msg) {
  document.getElementById('view-title').textContent = "Atención";
  document.getElementById('view-subtitle').textContent = msg;
  document.getElementById('schedule-list').innerHTML = '';
  document.querySelector('.counters-grid').style.display = 'none';
}

function renderSchedule(slots, assignments) {
  const container = document.getElementById('schedule-list');
  container.innerHTML = '';

  let assignedCount = 0;
  let freeCount = 0;

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
      const studentObj = assignments[slot.time];
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

initView();
