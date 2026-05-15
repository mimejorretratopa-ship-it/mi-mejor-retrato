/**
 * MMR Agenda Logic
 * Handles schedule generation, breaks, extra slots, and assignment state.
 */

// --- State ---
let config = {
  startTime: '08:00',
  endTime: '13:00',
  duration: 15,
  gap: 0
};

let breaks = [
  { time: '10:00', duration: 20 }
];

let extraSlots = []; // Array of time strings ['14:00']

// State of the schedule. Key: time 'HH:MM', Value: { studentName: string | null, isExtra: boolean }
let assignments = {}; 

// Computed schedule
let scheduleSlots = []; 

// --- Utilities ---

// Convert 'HH:MM' to minutes since 00:00
function timeToMins(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Convert minutes since 00:00 to 'HH:MM'
function minsToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Check if a given slot overlaps with any break
function getOverlappingBreak(slotStartMins, slotDuration) {
  const slotEndMins = slotStartMins + slotDuration;
  
  for (let b of breaks) {
    const breakStartMins = timeToMins(b.time);
    const breakEndMins = breakStartMins + b.duration;
    
    // Overlap condition: start < end2 && end > start2
    if (slotStartMins < breakEndMins && slotEndMins > breakStartMins) {
      return b;
    }
  }
  return null;
}

// --- Core Logic ---

function generateSchedule() {
  scheduleSlots = [];
  
  const startMins = timeToMins(config.startTime);
  const endMins = timeToMins(config.endTime);
  const dur = config.duration;
  const gap = config.gap;
  
  let currentMins = startMins;

  // 1. Generate standard slots and interleave breaks
  while (currentMins + dur <= endMins) {
    const overlappingBreak = getOverlappingBreak(currentMins, dur);
    
    if (overlappingBreak) {
      // If there's an overlap, push the break (if not already added)
      const bTime = overlappingBreak.time;
      if (!scheduleSlots.some(s => s.time === bTime && s.type === 'break')) {
        scheduleSlots.push({
          time: bTime,
          type: 'break',
          duration: overlappingBreak.duration,
          mins: timeToMins(bTime)
        });
      }
      // Jump time to the end of the break
      currentMins = timeToMins(bTime) + overlappingBreak.duration;
    } else {
      // Valid standard slot
      const t = minsToTime(currentMins);
      scheduleSlots.push({
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
  for (let eTime of extraSlots) {
    const eMins = timeToMins(eTime);
    // Check collision with existing slots or breaks
    const collision = scheduleSlots.some(s => {
      const sEnd = s.mins + s.duration;
      return (eMins < sEnd && (eMins + dur) > s.mins);
    });

    if (!collision) {
      scheduleSlots.push({
        time: eTime,
        type: 'slot',
        isExtra: true,
        duration: dur,
        mins: eMins
      });
    } else {
      console.warn(`Slot extra en ${eTime} descartado por choque.`);
    }
  }

  // 3. Sort chronologically
  scheduleSlots.sort((a, b) => a.mins - b.mins);
  
  renderUI();
}

function handleGenerateClick() {
  // Check if we have extras and ask for confirmation (Regenerar con confirmación)
  if (extraSlots.length > 0) {
    const confirm = window.confirm("¿Regenerar horario? Se mantendrán las asignaciones y slots extra válidos.");
    if (!confirm) return;
  }
  
  config.startTime = document.getElementById('cfg-start').value;
  config.endTime = document.getElementById('cfg-end').value;
  config.duration = parseInt(document.getElementById('cfg-duration').value, 10);
  config.gap = parseInt(document.getElementById('cfg-gap').value, 10);

  generateSchedule();
}

// --- UI Actions ---

function addBreak() {
  const time = document.getElementById('add-break-time').value;
  const dur = parseInt(document.getElementById('add-break-duration').value, 10);
  if (!time || isNaN(dur)) return;
  
  breaks.push({ time, duration: dur });
  renderBreaksConfig();
  generateSchedule(); // Auto-update
}

function removeBreak(index) {
  breaks.splice(index, 1);
  renderBreaksConfig();
  generateSchedule();
}

function addExtraSlot() {
  const time = document.getElementById('add-extra-time').value;
  if (!time) return;
  
  if (!extraSlots.includes(time)) {
    extraSlots.push(time);
    generateSchedule(); // Auto-update
  }
}

function removeExtraSlot(time) {
  extraSlots = extraSlots.filter(t => t !== time);
  // Also remove assignment if any
  if (assignments[time]) delete assignments[time];
  generateSchedule();
}

function toggleAssignment(time) {
  if (assignments[time]) {
    // Unassign
    delete assignments[time];
  } else {
    // Mock Assign
    const name = prompt("Nombre del estudiante:");
    if (name) {
      assignments[time] = name;
    }
  }
  renderUI(); // Update just UI, no need to regenerate full layout
}

// --- Renderers ---

function renderBreaksConfig() {
  const list = document.getElementById('breaks-list');
  list.innerHTML = '';
  breaks.forEach((b, i) => {
    const div = document.createElement('div');
    div.className = 'break-item';
    div.innerHTML = `
      <span>${b.time} (${b.duration}m)</span>
      <button class="btn btn-danger" onclick="removeBreak(${i})">✕</button>
    `;
    list.appendChild(div);
  });
}

function renderUI() {
  const container = document.getElementById('schedule-list');
  container.innerHTML = '';

  let assignedCount = 0;
  let freeCount = 0;
  let totalCount = 0;

  scheduleSlots.forEach(slot => {
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
      const student = assignments[slot.time];
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
      
      // Botón ✕ en cada slot extra no asignado (Eliminar slots extra)
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

  // Update counters
  document.getElementById('count-assigned').innerText = assignedCount;
  document.getElementById('count-free').innerText = freeCount;
  document.getElementById('count-total').innerText = totalCount;
}

// --- Initialization ---
document.getElementById('btn-generate').addEventListener('click', handleGenerateClick);
document.getElementById('btn-add-break').addEventListener('click', addBreak);
document.getElementById('btn-add-extra').addEventListener('click', addExtraSlot);

// Sync initial config values to inputs
document.getElementById('cfg-start').value = config.startTime;
document.getElementById('cfg-end').value = config.endTime;
document.getElementById('cfg-duration').value = config.duration;
document.getElementById('cfg-gap').value = config.gap;

// Initial render
renderBreaksConfig();
generateSchedule();
