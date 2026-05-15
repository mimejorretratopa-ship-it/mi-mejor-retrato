/**
 * MMR Agenda Logic
 * Handles schedule generation, breaks, extra slots, and assignment state per salon.
 */

// --- Global State ---
let agendas = {}; // { "clia_kinder": { config, breaks, extraSlots, assignments }, ... }
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
    
    // Solo asignar el listener si no lo tiene
    if (!selSalon.dataset.listening) {
      selSalon.addEventListener('change', handleSalonChange);
      selSalon.dataset.listening = "true";
    }
    
    switchContext(null); // Clear until salon is selected
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
  switchContext(ctx);
}

// --- Context Management ---
function switchContext(ctxId) {
  currentContext = ctxId;
  
  if (!ctxId) {
    // Disable inputs
    toggleSidebarInputs(false);
    document.getElementById('schedule-list').innerHTML = `
      <div style="padding:40px; text-align:center; color:var(--text-muted);">
        Selecciona una escuela y salón para ver la agenda.
      </div>`;
    updateCounters(0, 0, 0);
    return;
  }
  
  // Enable inputs
  toggleSidebarInputs(true);

  // Initialize context in memory if not exists
  if (!agendas[ctxId]) {
    agendas[ctxId] = {
      config: { ...defaultConfig },
      breaks: [],
      extraSlots: [],
      assignments: {},
      scheduleSlots: []
    };
  }

  // Load context config to UI
  const data = agendas[ctxId];
  document.getElementById('cfg-start').value = data.config.startTime;
  document.getElementById('cfg-end').value = data.config.endTime;
  document.getElementById('cfg-duration').value = data.config.duration;
  document.getElementById('cfg-gap').value = data.config.gap;

  renderBreaksConfig();
  
  // Generate or render existing
  if (data.scheduleSlots.length === 0) {
    generateSchedule();
  } else {
    renderUI();
  }
}

function toggleSidebarInputs(enabled) {
  const els = document.querySelectorAll('.sidebar input, .sidebar button:not(#sel-escuela):not(#sel-salon)');
  els.forEach(el => el.disabled = !enabled);
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
    delete agenda.assignments[time];
  } else {
    const name = prompt("Nombre del estudiante:");
    if (name) {
      agenda.assignments[time] = name;
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
      const student = agenda.assignments[slot.time];
      const isOcupado = !!student;
      
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
        ? student 
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
        <div class="slot-actions">${actionsHtml}</div>
      `;
    }

    container.appendChild(row);
  });

  updateCounters(assignedCount, freeCount, totalCount);
}

// --- Initialization ---
document.getElementById('btn-generate').addEventListener('click', handleGenerateClick);
document.getElementById('btn-add-break').addEventListener('click', addBreak);
document.getElementById('btn-add-extra').addEventListener('click', addExtraSlot);

// Start app
switchContext(null); // Initialize in disabled state
loadContextData(); // Fetch schools
