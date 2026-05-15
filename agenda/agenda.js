/**
 * MMR Agenda Logic
 * Handles schedule generation, breaks, extra slots, and assignment state per salon.
 */

// --- Global State ---
let agendas = {}; // { "clia_kinder": { config, breaks, extraSlots, assignments, unassignedStudents: [] }, ... }
let currentContext = null; // "clia_kinder"

// Default config for a new salon
const defaultConfig = {
  startTime: '08:00',
  endTime: '13:00',
  duration: 15,
  gap: 0
};

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

// --- Data Fetching (Context Setup) ---
async function loadContextData() {
  try {
    const res = await fetch('../onboarding/data/escuelas.json');
    if (!res.ok) throw new Error('Error cargando escuelas.json');
    const data = await res.json();
    
    const selEscuela = document.getElementById('sel-escuela');
    selEscuela.innerHTML = '<option value="">Selecciona una escuela...</option>';
    
    data.schools.forEach(school => {
      const option = document.createElement('option');
      option.value = school.code;
      option.textContent = school.name;
      selEscuela.appendChild(option);
    });

    selEscuela.addEventListener('change', handleEscuelaChange);
  } catch (error) {
    console.error('Failed to load schools:', error);
    document.getElementById('sel-escuela').innerHTML = '<option value="">Error cargando datos</option>';
  }
}

async function handleEscuelaChange(e) {
  const code = e.target.value;
  const selSalon = document.getElementById('sel-salon');
  
  if (!code) {
    selSalon.innerHTML = '<option value="">Selecciona escuela primero</option>';
    selSalon.disabled = true;
    switchContext(null);
    return;
  }

  try {
    selSalon.innerHTML = '<option value="">Cargando salones...</option>';
    selSalon.disabled = true;
    
    const res = await fetch(`../onboarding/data/${code}_secciones.json`);
    if (!res.ok) throw new Error(`Error cargando ${code}_secciones.json`);
    const data = await res.json();
    
    selSalon.innerHTML = '<option value="">Selecciona un salón...</option>';
    data.salones.forEach(salon => {
      const option = document.createElement('option');
      option.value = salon.valor;
      option.textContent = salon.label;
      selSalon.appendChild(option);
    });
    
    selSalon.disabled = false;
    
    if (!selSalon.dataset.listening) {
      selSalon.addEventListener('change', handleSalonChange);
      selSalon.dataset.listening = "true";
    }
    
    switchContext(null);
  } catch (error) {
    console.error('Failed to load salones:', error);
    selSalon.innerHTML = '<option value="">Error cargando salones</option>';
  }
}

function handleSalonChange(e) {
  const codeEscuela = document.getElementById('sel-escuela').value;
  const salon = e.target.value;
  
  if (!codeEscuela || !salon) {
    switchContext(null);
    return;
  }
  
  const ctx = `${codeEscuela}_${salon}`;
  switchContext(ctx, codeEscuela, salon);
}

// --- Context Management ---
async function switchContext(ctxId, codeEscuela, salon) {
  currentContext = ctxId;
  
  if (!ctxId) {
    toggleSidebarInputs(false);
    document.getElementById('schedule-list').innerHTML = `
      <div style="padding:40px; text-align:center; color:var(--text-muted);">
        Selecciona una escuela y salón para ver la agenda.
      </div>`;
    updateCounters(0, 0, 0);
    return;
  }
  
  toggleSidebarInputs(true);
  document.getElementById('schedule-list').innerHTML = `
    <div style="padding:40px; text-align:center; color:var(--text-muted);">
      ⏳ Cargando datos desde el servidor...
    </div>`;

  // Fetch from Hub if not in memory
  if (!agendas[ctxId]) {
    try {
      const result = await window.api.getAgenda(codeEscuela, salon);
      
      let agendaData = {
        config: { ...defaultConfig },
        breaks: [],
        extraSlots: [],
        assignments: {},
        scheduleSlots: [],
        unassignedStudents: []
      };

      if (result.ok) {
        if (result.data.agenda) {
           agendaData = Object.assign(agendaData, result.data.agenda);
        }
        
        // Filter students not assigned yet
        const allStudents = result.data.students || [];
        const assignedIds = Object.values(agendaData.assignments).map(a => a.id);
        agendaData.unassignedStudents = allStudents.filter(s => !assignedIds.includes(s.id));
      }

      agendas[ctxId] = agendaData;
    } catch (e) {
      console.error("Error fetching context from hub:", e);
      agendas[ctxId] = {
        config: { ...defaultConfig },
        breaks: [],
        extraSlots: [],
        assignments: {},
        scheduleSlots: [],
        unassignedStudents: []
      };
    }
  }

  // Load context config to UI
  const data = agendas[ctxId];
  document.getElementById('cfg-start').value = data.config.startTime;
  document.getElementById('cfg-end').value = data.config.endTime;
  document.getElementById('cfg-duration').value = data.config.duration;
  document.getElementById('cfg-gap').value = data.config.gap;

  renderBreaksConfig();
  
  if (!data.scheduleSlots || data.scheduleSlots.length === 0) {
    generateSchedule();
  } else {
    renderUI();
  }
}

function toggleSidebarInputs(enabled) {
  const els = document.querySelectorAll('.sidebar input, .sidebar button:not(#sel-escuela):not(#sel-salon)');
  els.forEach(el => el.disabled = !enabled);
  
  // Caso especial para el botón de refresco
  document.getElementById('btn-refresh-students').disabled = !enabled;

  if (!enabled) {
    document.getElementById('breaks-list').innerHTML = '';
  }
}

function getCurrentAgenda() {
  if (!currentContext) return null;
  return agendas[currentContext];
}

// --- Core Logic ---

function getOverlappingBreak(slotStartMins, slotDuration, contextBreaks) {
  const slotEndMins = slotStartMins + slotDuration;
  
  for (let b of contextBreaks) {
    const breakStartMins = timeToMins(b.time);
    const breakEndMins = breakStartMins + b.duration;
    
    if (slotStartMins < breakEndMins && slotEndMins > breakStartMins) {
      return b;
    }
  }
  return null;
}

function generateSchedule() {
  const agenda = getCurrentAgenda();
  if (!agenda) return;

  agenda.scheduleSlots = [];
  
  const startMins = timeToMins(agenda.config.startTime);
  const endMins = timeToMins(agenda.config.endTime);
  const dur = agenda.config.duration;
  const gap = agenda.config.gap;
  
  let currentMins = startMins;

  // 1. Generate standard slots and interleave breaks
  while (currentMins + dur <= endMins) {
    const overlappingBreak = getOverlappingBreak(currentMins, dur, agenda.breaks);
    
    if (overlappingBreak) {
      const bTime = overlappingBreak.time;
      if (!agenda.scheduleSlots.some(s => s.time === bTime && s.type === 'break')) {
        agenda.scheduleSlots.push({
          time: bTime,
          type: 'break',
          duration: overlappingBreak.duration,
          mins: timeToMins(bTime)
        });
      }
      currentMins = timeToMins(bTime) + overlappingBreak.duration;
    } else {
      const t = minsToTime(currentMins);
      agenda.scheduleSlots.push({
        time: t,
        type: 'slot',
        isExtra: false,
        duration: dur,
        mins: currentMins
      });
      currentMins += dur + gap;
    }
  }

  // 2. Inject extra slots
  for (let eTime of agenda.extraSlots) {
    const eMins = timeToMins(eTime);
    const collision = agenda.scheduleSlots.some(s => {
      const sEnd = s.mins + s.duration;
      return (eMins < sEnd && (eMins + dur) > s.mins);
    });

    if (!collision) {
      agenda.scheduleSlots.push({
        time: eTime,
        type: 'slot',
        isExtra: true,
        duration: dur,
        mins: eMins
      });
    } else {
      console.warn(`[${currentContext}] Slot extra en ${eTime} descartado por choque.`);
    }
  }

  // 3. Sort chronologically
  agenda.scheduleSlots.sort((a, b) => a.mins - b.mins);
  
  renderUI();
}

function handleGenerateClick() {
  const agenda = getCurrentAgenda();
  if (!agenda) return;

  if (agenda.extraSlots.length > 0) {
    const confirm = window.confirm("¿Regenerar horario? Se mantendrán las asignaciones y slots extra válidos.");
    if (!confirm) return;
  }
  
  agenda.config.startTime = document.getElementById('cfg-start').value;
  agenda.config.endTime = document.getElementById('cfg-end').value;
  agenda.config.duration = parseInt(document.getElementById('cfg-duration').value, 10);
  agenda.config.gap = parseInt(document.getElementById('cfg-gap').value, 10);

  generateSchedule();
}

async function handleSyncClick() {
  const agenda = getCurrentAgenda();
  if (!agenda) return;
  
  const codeEscuela = document.getElementById('sel-escuela').value;
  const salon = document.getElementById('sel-salon').value;
  const btn = document.getElementById('btn-sync');
  
  btn.textContent = '⏳ Sincronizando...';
  btn.disabled = true;

  // We only send config, breaks, extraSlots, assignments
  const dataToSave = {
    config: agenda.config,
    breaks: agenda.breaks,
    extraSlots: agenda.extraSlots,
    assignments: agenda.assignments
  };

  const res = await window.api.saveAgenda(codeEscuela, salon, dataToSave);
  
  btn.disabled = false;
  if (res.ok) {
    btn.textContent = '✅ Sincronizado';
    setTimeout(() => btn.textContent = 'Guardar / Sincronizar', 3000);
  } else {
    btn.textContent = '❌ Error';
    alert("Error al sincronizar con el servidor.");
    setTimeout(() => btn.textContent = 'Guardar / Sincronizar', 3000);
  }
}

// --- UI Actions ---

function addBreak() {
  const agenda = getCurrentAgenda();
  if (!agenda) return;

  const time = document.getElementById('add-break-time').value;
  const dur = parseInt(document.getElementById('add-break-duration').value, 10);
  if (!time || isNaN(dur)) return;
  
  agenda.breaks.push({ time, duration: dur });
  renderBreaksConfig();
  generateSchedule();
}

function removeBreak(index) {
  const agenda = getCurrentAgenda();
  if (!agenda) return;

  agenda.breaks.splice(index, 1);
  renderBreaksConfig();
  generateSchedule();
}

function addExtraSlot() {
  const agenda = getCurrentAgenda();
  if (!agenda) return;

  const time = document.getElementById('add-extra-time').value;
  if (!time) return;
  
  if (!agenda.extraSlots.includes(time)) {
    agenda.extraSlots.push(time);
    generateSchedule();
  }
}

function removeExtraSlot(time) {
  const agenda = getCurrentAgenda();
  if (!agenda) return;

  agenda.extraSlots = agenda.extraSlots.filter(t => t !== time);
  if (agenda.assignments[time]) delete agenda.assignments[time];
  generateSchedule();
}

function toggleAssignment(time) {
  const agenda = getCurrentAgenda();
  if (!agenda) return;

  if (agenda.assignments[time]) {
    // Liberar
    const student = agenda.assignments[time];
    agenda.unassignedStudents.push(student); // Devolver a pendientes
    delete agenda.assignments[time];
    renderUI();
  } else {
    // Asignar
    if (agenda.unassignedStudents.length === 0) {
      alert("No hay estudiantes pendientes por agendar para este salón en Airtable. Por favor, asegúrate de que los registros existan en Airtable y pertenezcan a este salón.");
      return;
    }

    // Modal rudimentario para seleccionar estudiante
    const selectHtml = agenda.unassignedStudents.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
    
    // Inyectamos temporalmente un selector en la fila en lugar de un prompt
    const rowId = `slot-actions-${time.replace(':','-')}`;
    const actionsContainer = document.getElementById(rowId);
    
    actionsContainer.innerHTML = `
      <select id="sel-student-${time.replace(':','-')}" style="max-width:120px;">
        <option value="">Selecciona...</option>
        ${selectHtml}
      </select>
      <button class="btn btn-primary" onclick="confirmAssignment('${time}')">OK</button>
      <button class="btn" onclick="renderUI()">Cancelar</button>
    `;
  }
}

// Global confirm function for the inline selector
window.confirmAssignment = function(time) {
  const agenda = getCurrentAgenda();
  if (!agenda) return;

  const selectId = `sel-student-${time.replace(':','-')}`;
  const selectEl = document.getElementById(selectId);
  const studentId = selectEl.value;

  if (studentId) {
    const studentIdx = agenda.unassignedStudents.findIndex(s => s.id === studentId);
    if (studentIdx > -1) {
      agenda.assignments[time] = agenda.unassignedStudents[studentIdx];
      agenda.unassignedStudents.splice(studentIdx, 1); // Quitar de pendientes
    }
  }
  renderUI();
}

// --- Renderers ---

function renderBreaksConfig() {
  const agenda = getCurrentAgenda();
  const list = document.getElementById('breaks-list');
  list.innerHTML = '';
  
  if (!agenda) return;

  agenda.breaks.forEach((b, i) => {
    const div = document.createElement('div');
    div.className = 'break-item';
    div.innerHTML = `
      <span>${b.time} (${b.duration}m)</span>
      <button class="btn btn-danger" onclick="removeBreak(${i})">✕</button>
    `;
    list.appendChild(div);
  });
}

function updateCounters(assigned, free, total) {
  document.getElementById('count-assigned').innerText = assigned;
  document.getElementById('count-free').innerText = free;
  document.getElementById('count-total').innerText = total;
}

function renderUI() {
  const agenda = getCurrentAgenda();
  const container = document.getElementById('schedule-list');
  container.innerHTML = '';

  if (!agenda) return;

  let assignedCount = 0;
  let freeCount = 0;
  let totalCount = 0;

  agenda.scheduleSlots.forEach(slot => {
    const row = document.createElement('div');
    row.className = 'slot-row';

    if (slot.type === 'break') {
      row.innerHTML = `
        <div class="slot-time">${slot.time}</div>
        <div class="slot-status status-break">BREAK</div>
        <div class="slot-student" style="color:var(--text-muted)">${slot.duration} minutos</div>
        <div></div>
      `;
    } else {
      totalCount++;
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
      
      let actionsHtml = `<button class="btn" onclick="toggleAssignment('${slot.time}')">${isOcupado ? 'Liberar' : 'Asignar'}</button>`;
      
      if (slot.isExtra && !isOcupado) {
        actionsHtml += `<button class="btn btn-danger" style="padding:4px 8px;" onclick="removeExtraSlot('${slot.time}')">✕</button>`;
      }

      row.innerHTML = `
        <div class="slot-time">${slot.time} ${extraBadge}</div>
        <div class="slot-status">${statusHtml}</div>
        <div class="slot-student">${studentHtml}</div>
        <div class="slot-actions" id="slot-actions-${slot.time.replace(':','-')}">${actionsHtml}</div>
      `;
    }

    container.appendChild(row);
  });

  // Mostrar un resumen de estudiantes pendientes si hay
  if (agenda.unassignedStudents.length > 0) {
    const pendingDiv = document.createElement('div');
    pendingDiv.style.padding = '12px 24px';
    pendingDiv.style.background = 'var(--surface-alt)';
    pendingDiv.style.borderTop = '1px solid var(--border)';
    pendingDiv.style.fontSize = '0.85rem';
    pendingDiv.style.color = 'var(--text-muted)';
    pendingDiv.innerHTML = `🔔 Tienes <b>${agenda.unassignedStudents.length}</b> estudiantes pendientes por asignar de Airtable.`;
    container.appendChild(pendingDiv);
  }

  updateCounters(assignedCount, freeCount, totalCount);
}

// --- Initialization ---
document.getElementById('btn-generate').addEventListener('click', handleGenerateClick);
document.getElementById('btn-sync').addEventListener('click', handleSyncClick);
document.getElementById('btn-add-break').addEventListener('click', addBreak);
document.getElementById('btn-add-extra').addEventListener('click', addExtraSlot);
document.getElementById('btn-refresh-students').addEventListener('click', async () => {
  const codeEscuela = document.getElementById('sel-escuela').value;
  const salon = document.getElementById('sel-salon').value;
  if (!codeEscuela || !salon) return;
  
  const ctxId = `${codeEscuela}_${salon}`;
  // Forzar recarga borrando la memoria caché local de ese salón
  delete agendas[ctxId]; 
  switchContext(ctxId, codeEscuela, salon);
});

// Start app
switchContext(null); // Initialize in disabled state
loadContextData(); // Fetch schools
