/**
 * MMR BACKEND v4.2 — HUB + TRACKER + SECUENCIA + BUGFIX
 * Archivo: MMR_brochures_hub_v4.0.gs
 *
 * CAMBIOS v4.2:
 * - BUGFIX CRITICO: El bloque `saveLead` en `doPost` ahora tiene un guard
 *   `if (action !== 'saveLead')` que retorna error para cualquier acción
 *   desconocida. Antes, cualquier llamada POST con una acción no capturada
 *   (como `getStudent`) creaba silenciosamente una fila vacía en la Hoja.
 * - getStudent en doPost: nuevo bloque que busca al estudiante por su `sid`
 *   en la hoja principal. Permite que `api.getStudent()` use POST (evitando
 *   CORS preflight) sin riesgo de crear filas fantasma.
 *
 * HEREDA DE v4.0 (sin cambios):
 * - doGet(), doPost(), getOpcionesFiltro(), generarCSVPulso(),
 *   dailyDiscoveryReminder(), setupDailyTrigger(),
 *   buildWhatsAppDiscoveryLink(), buildWhatsAppAgendaLink(),
 *   setupPropostasSheet(), marcarEnviadaHoy(), verificarSeguimientos(),
 *   setupTrackerTrigger(), onOpen()
 */

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN GLOBAL
// ═══════════════════════════════════════════════════════════════════════

var SHEET_ID            = 'VER_APPS_SCRIPT';  // ← Tu ID de Google Sheet
var AT_BASE_ID          = 'appVXT9GPLoKT15YJ';
var AT_TABLE            = 'Leads';
var AT_TOKEN            = 'VER_APPS_SCRIPT';  // ← Tu token de Airtable
var DISCORD_WEBHOOK     = 'VER_APPS_SCRIPT';  // ← Tu webhook de Discord
var SITE_URL            = 'https://mimejorretrato.com';
var DISCOVERY_DELAY_DAYS = 3;
var TRACKER_SHEET_NAME  = 'Propuestas';       // Nombre de la pestaña del tracker


// ═══════════════════════════════════════════════════════════════════════
// HELPERS WHATSAPP
// ═══════════════════════════════════════════════════════════════════════

function buildWhatsAppDiscoveryLink(phone, nombreEstudiante, studentId) {
  var url = SITE_URL + '/onboarding/cuestionario.html?sid=' + studentId;
  var msg = '¡Hola! Para preparar la mejor sesión de fotos de ' + nombreEstudiante + ', necesitamos conocer sus gustos. 🎨\n\nLlena este formulario corto:\n' + url;
  return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);
}

function buildWhatsAppAgendaLink(phone, nombreEstudiante, schoolCode, salonValue) {
  var slug = (schoolCode + '_' + salonValue).toLowerCase().replace(/\s+/g, '_');
  var url = SITE_URL + '/agenda/' + slug;
  var msg = '¡Hola! Aquí puedes ver los espacios disponibles para ' + nombreEstudiante + '. 📅\nDime qué espacio te queda mejor:\n' + url;
  return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);
}


// ═══════════════════════════════════════════════════════════════════════
// MENÚ PRINCIPAL (actualizado v4.0)
// ═══════════════════════════════════════════════════════════════════════

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('📸 Mi Mejor Retrato')
    .addItem('📤 Exportar para Pulso',            'abrirExportadorPulso')
    .addSeparator()
    .addItem('📋 Inicializar hoja Propuestas',    'setupPropostasSheet')
    .addItem('✅ Marcar fila como Enviada hoy',   'marcarEnviadaHoy')
    .addItem('🔔 Verificar seguimientos ahora',   'verificarSeguimientos')
    .addToUi();
}


// ═══════════════════════════════════════════════════════════════════════
// doGet — Endpoints GET
// ═══════════════════════════════════════════════════════════════════════

function doGet(e) {
  var action = e.parameter.action;
  var sid    = e.parameter.sid;

  // ── GET STUDENT (individual, para cuestionario) ────────────
  if (action === 'getStudent' && sid) {
    try {
      var data    = SpreadsheetApp.openById(SHEET_ID).getSheets()[0].getDataRange().getValues();
      var headers = data[0];
      var idIdx   = headers.indexOf('ID');
      for (var i = 1; i < data.length; i++) {
        if (data[i][idIdx] === sid) {
          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            data: {
              nombre:  data[i][headers.indexOf('Estudiante')],
              colegio: data[i][headers.indexOf('Colegio')],
              salon:   data[i][headers.indexOf('Salón')]
            }
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    } catch (err) {}
  }

  // ── GET STUDENTS (para Dashboard local) ───────────────────
  if (action === 'getStudents') {
    try {
      var ss      = SpreadsheetApp.openById(SHEET_ID);
      var sheet   = ss.getSheets()[0];
      var rows    = sheet.getDataRange().getValues();
      var headers = rows[0];

      var idx = {
        fecha:      headers.indexOf('Fecha'),
        colegio:    headers.indexOf('Colegio'),
        acudiente:  headers.indexOf('Acudiente'),
        relacion:   headers.indexOf('Relación'),
        estudiante: headers.indexOf('Estudiante'),
        salon:      headers.indexOf('Salón'),
        whatsapp:   headers.indexOf('WhatsApp'),
        paquete:    headers.indexOf('Paquete'),
        precio:     headers.indexOf('Precio'),
        email:      headers.indexOf('Email'),
        id:         headers.indexOf('ID')
      };

      var result      = [];
      var filterSchool = e.parameter.school || 'TODOS';

      for (var i = 1; i < rows.length; i++) {
        var row      = rows[i];
        var idVal    = String(row[idx.id]     || '').trim();
        var schoolVal = String(row[idx.colegio] || '').trim();

        if (!idVal || idVal === 'N/A' || idVal === '') continue;

        if (filterSchool && filterSchool !== 'TODOS') {
          var cleanFilter = filterSchool.toLowerCase().split('-')[0];
          var cleanSchool = schoolVal.toLowerCase().split('-')[0];
          if (cleanSchool !== cleanFilter) continue;
        }

        var dateVal   = row[idx.fecha];
        var timestamp = (dateVal instanceof Date) ? dateVal.toISOString() : new Date().toISOString();
        var phoneVal  = String(row[idx.whatsapp] || '').trim();
        var celular   = phoneVal;
        if (phoneVal.indexOf('507') === 0)  celular = phoneVal.substring(3);
        else if (phoneVal.indexOf('+507') === 0) celular = phoneVal.substring(4);

        result.push({
          student_id: idVal,
          acudiente: {
            nombre:    String(row[idx.acudiente] || '').trim(),
            relacion:  String(row[idx.relacion]  || '').trim(),
            whatsapp:  phoneVal,
            codigoPais: '+507',
            celular:   celular,
            email:     String(row[idx.email] || '').trim()
          },
          estudiante: {
            nombre:         String(row[idx.estudiante] || '').trim(),
            salon:          String(row[idx.salon]      || '').trim(),
            escuela_code:   schoolVal.split('-')[0],
            escuela_nombre: schoolVal.split('-')[0].toUpperCase()
          },
          reserva: {
            propuesta: schoolVal,
            paquete:   String(row[idx.paquete] || '').trim(),
            precio:    parseFloat(row[idx.precio]) || 0,
            timestamp: timestamp
          }
        });
      }

      return ContentService.createTextOutput(JSON.stringify({ success: true, estudiantes: result }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false }))
    .setMimeType(ContentService.MimeType.JSON);
}


// ═══════════════════════════════════════════════════════════════════════
// doPost — Endpoints POST
// ═══════════════════════════════════════════════════════════════════════

function doPost(e) {
  var ss       = SpreadsheetApp.openById(SHEET_ID);
  var logSheet = ss.getSheetByName('LOGS') || ss.insertSheet('LOGS');
  try {
    var data      = JSON.parse(e.postData.contents);
    var action    = data.action || 'saveLead';
    var meta      = data._meta || {};
    var studentId = meta.student_id || data.sid || 'N/A';

    // ── GET AGENDA ─────────────────────────────────────────────
    if (action === 'getAgenda') {
      var idSalonKey = data.id_salon || (data.school + '_' + data.salon);
      var agendaData = null;
      var aSheet     = ss.getSheetByName('Agendas');
      if (aSheet) {
        var aRows = aSheet.getDataRange().getValues();
        for (var j = 1; j < aRows.length; j++) {
          if (aRows[j][0] === idSalonKey) {
            try { agendaData = JSON.parse(aRows[j][1]); } catch(err) {}
            break;
          }
        }
      }

      var students = [];
      try {
        var filter  = 'AND({Salon}="' + data.salon + '", SEARCH("' + data.school + '", {Colegio}))';
        var atUrl   = 'https://api.airtable.com/v0/' + AT_BASE_ID + '/' + encodeURIComponent(AT_TABLE) + '?filterByFormula=' + encodeURIComponent(filter);
        var res     = UrlFetchApp.fetch(atUrl, { headers: { 'Authorization': 'Bearer ' + AT_TOKEN }, muteHttpExceptions: true });
        var atData  = JSON.parse(res.getContentText());

        if (atData.records && atData.records.length > 0) {
          students = atData.records.map(function(r) {
            return {
              id: r.fields.ID || r.id,
              nombre: r.fields.Estudiante,
              hora_sesion: r.fields.Hora_Sesion || null,
              secuencia_dia: r.fields.Secuencia_Dia || null
            };
          });
        } else {
          logSheet.appendRow([new Date(), 'Airtable 0 records with school filter', filter]);
        }
      } catch (err) { logSheet.appendRow([new Date(), 'Airtable Search Error', err.toString()]); }

      return ContentService.createTextOutput(JSON.stringify({ success: true, agenda: agendaData, students: students }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── SAVE AGENDA ────────────────────────────────────────────
    if (action === 'saveAgenda') {
      var idSalon    = data.id_salon;
      var agendaData = data.agenda_data;
      var aSheet     = ss.getSheetByName('Agendas') || ss.insertSheet('Agendas');
      if (aSheet.getLastRow() === 0) aSheet.appendRow(['ID_Salon', 'Config_JSON']);
      var aRows = aSheet.getDataRange().getValues();
      var fRow  = -1;
      for (var k = 1; k < aRows.length; k++) { if (aRows[k][0] === idSalon) { fRow = k + 1; break; } }
      if (fRow > -1) aSheet.getRange(fRow, 2).setValue(JSON.stringify(agendaData));
      else           aSheet.appendRow([idSalon, JSON.stringify(agendaData)]);

      try {
        var assignments = agendaData.assignments || {};

        // Calcular orden cronológico de los slots asignados (1, 2, 3...)
        var horasAsignadas = Object.keys(assignments).sort();
        var secuencias = {};
        horasAsignadas.forEach(function(h, i) { secuencias[h] = i + 1; });

        for (var hora in assignments) {
          var rid = assignments[hora].id;
          if (rid && rid.indexOf('rec') === 0) {
            UrlFetchApp.fetch('https://api.airtable.com/v0/' + AT_BASE_ID + '/' + encodeURIComponent(AT_TABLE) + '/' + rid, {
              method: 'patch',
              headers: { 'Authorization': 'Bearer ' + AT_TOKEN, 'Content-Type': 'application/json' },
              payload: JSON.stringify({ fields: { 'Hora_Sesion': hora, 'Secuencia_Dia': secuencias[hora] } })
            });
          }
        }
      } catch(err) {}
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── SAVE DISCOVERY ─────────────────────────────────────────
    if (action === 'saveQuestionnaire') {
      var qSheet = ss.getSheetByName('Cuestionarios') || ss.insertSheet('Cuestionarios');
      qSheet.appendRow([new Date(), studentId, meta.nombre_estudiante, meta.escuela, meta.salon, JSON.stringify(data)]);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── GET CUESTIONARIOS ──────────────────────────────────────
    if (action === 'getCuestionarios') {
      var qSheet = ss.getSheetByName('Cuestionarios');
      var results = [];
      if (qSheet) {
        var rows = qSheet.getDataRange().getValues();
        // headers: [0: Fecha, 1: ID, 2: Nombre, 3: Escuela, 4: Salon, 5: JSON]
        for (var i = 1; i < rows.length; i++) {
          // Filtros
          if (data.school && rows[i][3] !== data.school) continue;
          if (data.salon && rows[i][4] !== data.salon) continue;
          
          try {
            results.push({
              id: rows[i][1],
              nombre: rows[i][2],
              escuela: rows[i][3],
              salon: rows[i][4],
              respuestas: JSON.parse(rows[i][5]),
              fecha: rows[i][0]
            });
          } catch(e) {}
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, cuestionarios: results }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── GET STUDENTS (para Dashboard) ──────────────────────────
    if (action === 'getStudents') {
      var sheet   = ss.getSheets()[0];
      var rows    = sheet.getDataRange().getValues();
      var headers = rows[0];

      var idx = {
        fecha:      headers.indexOf('Fecha'),
        colegio:    headers.indexOf('Colegio'),
        acudiente:  headers.indexOf('Acudiente'),
        relacion:   headers.indexOf('Relación'),
        estudiante: headers.indexOf('Estudiante'),
        salon:      headers.indexOf('Salón'),
        whatsapp:   headers.indexOf('WhatsApp'),
        paquete:    headers.indexOf('Paquete'),
        precio:     headers.indexOf('Precio'),
        email:      headers.indexOf('Email'),
        id:         headers.indexOf('ID')
      };

      var result      = [];
      var filterSchool = data.school;

      for (var i = 1; i < rows.length; i++) {
        var row      = rows[i];
        var idVal    = String(row[idx.id]      || '').trim();
        var schoolVal = String(row[idx.colegio] || '').trim();
        if (!idVal) continue;

        if (filterSchool && filterSchool !== 'TODOS') {
          var cleanFilter = filterSchool.toLowerCase().split('-')[0];
          var cleanSchool = schoolVal.toLowerCase().split('-')[0];
          if (cleanSchool !== cleanFilter) continue;
        }

        var dateVal   = row[idx.fecha];
        var timestamp = (dateVal instanceof Date) ? dateVal.toISOString() : new Date().toISOString();
        var phoneVal  = String(row[idx.whatsapp] || '').trim();
        var celular   = phoneVal;
        if (phoneVal.indexOf('507') === 0)  celular = phoneVal.substring(3);
        else if (phoneVal.indexOf('+507') === 0) celular = phoneVal.substring(4);

        result.push({
          student_id: idVal,
          acudiente: {
            nombre:    String(row[idx.acudiente] || '').trim(),
            relacion:  String(row[idx.relacion]  || '').trim(),
            whatsapp:  phoneVal,
            codigoPais: '+507',
            celular:   celular,
            email:     String(row[idx.email] || '').trim()
          },
          estudiante: {
            nombre:         String(row[idx.estudiante] || '').trim(),
            salon:          String(row[idx.salon]      || '').trim(),
            escuela_code:   schoolVal.split('-')[0],
            escuela_nombre: schoolVal.split('-')[0].toUpperCase()
          },
          reserva: {
            propuesta: schoolVal,
            paquete:   String(row[idx.paquete] || '').trim(),
            precio:    parseFloat(row[idx.precio]) || 0,
            timestamp: timestamp
          }
        });
      }

      return ContentService.createTextOutput(JSON.stringify({ success: true, estudiantes: result }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── GET STUDENT (Cuestionario) ───────────────────────────────
    // api.js llama a este endpoint vía POST (para evitar CORS preflight).
    if (action === 'getStudent') {
      var sid       = data.sid || '';
      var sheetData = ss.getSheets()[0].getDataRange().getValues();
      var headers   = sheetData[0];
      var idIdx     = headers.indexOf('ID');
      var estudIdx  = headers.indexOf('Estudiante');
      var colIdx    = headers.indexOf('Colegio');
      var salIdx    = headers.indexOf('Salón');
      var genIdx    = headers.indexOf('Género');

      for (var i = 1; i < sheetData.length; i++) {
        if (String(sheetData[i][idIdx]).trim() === sid) {
          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            data: {
              nombre:  String(sheetData[i][estudIdx] || '').trim(),
              colegio: String(sheetData[i][colIdx]   || '').trim(),
              salon:   String(sheetData[i][salIdx]   || '').trim(),
              genero:  String(sheetData[i][genIdx]   || '').trim()
            }
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Estudiante no encontrado' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── SAVE LEAD (ONBOARDING) ──────────────────────────────────
    // Guard explícito: SOLO corre si la acción es saveLead.
    if (action !== 'saveLead') {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Acción desconocida: ' + action }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var phone      = data.celular ? '507' + data.celular : '';
    var schoolCode = (data.idEscuela || 'mmr').toLowerCase();
    var linkQ      = buildWhatsAppDiscoveryLink(phone, data.nombreEstudiante, studentId);
    var linkA      = buildWhatsAppAgendaLink(phone, data.nombreEstudiante, schoolCode, data.salon);
    var fechaQ     = new Date(); fechaQ.setDate(fechaQ.getDate() + DISCOVERY_DELAY_DAYS);

    var sheet = ss.getSheets()[0];
    sheet.appendRow([
      new Date(), meta.schoolName || data.idEscuela, data.nombre, data.relacion,
      data.nombreEstudiante, data.salon, data.genero, phone,
      data.paqueteLabel, data.precio, data.email, studentId, linkQ, linkA, fechaQ, data.ubicacion || ''
    ]);

    try {
      UrlFetchApp.fetch('https://api.airtable.com/v0/' + AT_BASE_ID + '/' + encodeURIComponent(AT_TABLE), {
        method: 'post',
        headers: { 'Authorization': 'Bearer ' + AT_TOKEN, 'Content-Type': 'application/json' },
        payload: JSON.stringify({
          fields: {
            'Fecha':    new Date().toISOString(),
            'Colegio':  meta.schoolName || data.idEscuela,
            'Acudiente': data.nombre,
            'Estudiante': data.nombreEstudiante,
            'Salon':    data.salon,
            'WhatsApp': phone,
            'ID':       studentId,
            'Link_WhatsApp_Q':     linkQ,
            'Link_WhatsApp_Agenda': linkA,
            'Relacion':     data.relacion || '',
            'Paquete':      data.paqueteLabel || data.paquete || '',
            'Precio':       parseFloat(data.precio) || 0,
            'Genero':       data.genero || '',
            'Q_onboarding': false,
            'Estudio':      data.ubicacion || ''
          }
        })
      });
    } catch(err) {}

    try {
      logSheet.appendRow([
        new Date(),
        'saveLead OK',
        studentId,
        meta.schoolName || data.idEscuela,
        data.nombre,
        data.salon,
        data.paqueteLabel || '',
        data.precio || ''
      ]);
    } catch(err) {}

    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


// ═══════════════════════════════════════════════════════════════════════
// DISCOVERY REMINDER (sin cambios desde v3.9)
// ═══════════════════════════════════════════════════════════════════════

function dailyDiscoveryReminder() {
  var ss      = SpreadsheetApp.openById(SHEET_ID);
  var sheet   = ss.getSheets()[0];
  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var colFQ   = headers.indexOf('Fecha_Envio_Q');
  var colQE   = headers.indexOf('Q_Enviado');
  var hoy     = new Date(); hoy.setHours(0,0,0,0);

  for (var i = 1; i < data.length; i++) {
    if (data[i][colFQ] && !data[i][colQE] && hoy >= new Date(data[i][colFQ])) {
      var payload = {
        username: 'MMR',
        embeds: [{
          title: '⏰ Recordatorio Discovery: ' + data[i][headers.indexOf('Estudiante')],
          description: '[Enviar WhatsApp →](' + data[i][headers.indexOf('Link_WA_Discovery')] + ')'
        }]
      };
      UrlFetchApp.fetch(DISCORD_WEBHOOK, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload) });
      sheet.getRange(i + 1, colQE + 1).setValue('✅ ' + new Date().toLocaleDateString());
    }
  }
}

function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'dailyDiscoveryReminder') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dailyDiscoveryReminder').timeBased().everyDays(1).atHour(8).create();
}


// ═══════════════════════════════════════════════════════════════════════
// EXPORTADOR CSV PARA PULSO CRM (sin cambios desde v3.9)
// ═══════════════════════════════════════════════════════════════════════

function abrirExportadorPulso() {
  var html = HtmlService.createHtmlOutputFromFile('pulso_export_ui')
    .setWidth(400)
    .setHeight(350);
  SpreadsheetApp.getUi().showModalDialog(html, 'Exportar CSV para Pulso');
}

function getOpcionesFiltro() {
  var sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var colColegio = headers.indexOf('Colegio');
  var colSalon   = headers.indexOf('Salón');
  if (colColegio === -1 || colSalon === -1) throw new Error('No se encontraron las columnas "Colegio" o "Salón".');

  var colegios = {};
  for (var i = 1; i < data.length; i++) {
    var col = String(data[i][colColegio] || '').trim();
    var sal = String(data[i][colSalon]   || '').trim() || 'Sin Salón';
    if (!col) continue;
    if (!colegios[col]) colegios[col] = [];
    if (colegios[col].indexOf(sal) === -1) colegios[col].push(sal);
  }
  for (var key in colegios) colegios[key].sort();
  return colegios;
}

function generarCSVPulso(filtroColegio, filtroSalon) {
  var sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var idx = {
    acudiente: headers.indexOf('Acudiente'),
    relacion:  headers.indexOf('Relación'),
    whatsapp:  headers.indexOf('WhatsApp'),
    estudiante: headers.indexOf('Estudiante'),
    salon:     headers.indexOf('Salón'),
    colegio:   headers.indexOf('Colegio')
  };
  if (idx.acudiente === -1 || idx.whatsapp === -1 || idx.estudiante === -1) {
    throw new Error('Faltan columnas obligatorias (Acudiente, WhatsApp, Estudiante).');
  }

  var csvData = [['Acudiente', 'Relación', 'Teléfono', 'Estudiante', 'Salón', 'Escuela', 'Link_Fotos'].join(',')];
  var wrapStr = function(str) { return '"' + String(str).replace(/"/g, '""') + '"'; };

  for (var i = 1; i < data.length; i++) {
    var row      = data[i];
    var colVal   = String(row[idx.colegio]  || '').trim();
    var salVal   = String(row[idx.salon]    || '').trim();
    var phoneVal = String(row[idx.whatsapp] || '').trim();
    if (!phoneVal) continue;
    if (filtroColegio && colVal !== filtroColegio) continue;
    if (filtroSalon && filtroSalon !== 'TODOS' && salVal !== filtroSalon) continue;

    var telefono = /^\d+$/.test(phoneVal) ? '+' + phoneVal : phoneVal;
    csvData.push([
      wrapStr(row[idx.acudiente]  || ''),
      wrapStr(row[idx.relacion]   || 'acudiente'),
      wrapStr(telefono),
      wrapStr(row[idx.estudiante] || ''),
      wrapStr(salVal),
      wrapStr(colVal.split('-')[0]),
      ''
    ].join(','));
  }

  var d       = new Date();
  var fechaStr = d.getFullYear() + ('0'+(d.getMonth()+1)).slice(-2) + ('0'+d.getDate()).slice(-2);
  return {
    filename: (filtroColegio||'todos').split('-')[0] + '_' + (filtroSalon||'todos').replace(/\s+/g,'-').toLowerCase() + '_' + fechaStr + '.csv',
    content:  csvData.join('\n'),
    count:    csvData.length - 1
  };
}


// ═══════════════════════════════════════════════════════════════════════
// ██████████████████████████████████████████████████████████████████████
//  MÓDULO TRACKER DE PROPUESTAS — NUEVO EN v4.0
// ██████████████████████████████████████████████████████████████████████
// ═══════════════════════════════════════════════════════════════════════

/**
 * Columnas de la hoja "Propuestas":
 *  A  Escuela          — Nombre completo de la institución o propuesta
 *  B  Código           — Código corto (lasa, enda, port, indp...)
 *  C  Tipo             — B2B Institución | B2C Independiente
 *  D  Zona             — Panamá Ciudad | Panamá Oeste
 *  E  Modalidad sesión — En escuela | En estudio
 *  F  Grados           — Kinder / 6to / Pre-K+K+6to / Toda la escuela
 *  G  Contacto         — Nombre de la persona
 *  H  Cargo            — Director/a, Coordinador/a, Madre...
 *  I  WhatsApp         — Número directo
 *  J  Fecha envío      — Ingresada manualmente o vía "Marcar Enviada hoy"
 *  K  Fecha seguimiento— Fórmula: =J+7 (calculada por setupPropostasSheet)
 *  L  Estado           — Dropdown con emojis
 *  M  Probabilidad     — Alta | Media | Baja
 *  N  Notas            — Texto libre
 */

/**
 * Inicializa la hoja "Propuestas" con headers, validaciones y formato.
 * Ejecutar UNA SOLA VEZ desde el menú "📸 Mi Mejor Retrato".
 */
function setupPropostasSheet() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(TRACKER_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(TRACKER_SHEET_NAME);
  } else {
    // Sheet already exists; we'll just ensure headers are set without prompting.
    Logger.log('Sheet "' + TRACKER_SHEET_NAME + '" already exists; updating headers.');
  }

  // ── Encabezados ────────────────────────────────────────────
  var headers = [
    'Escuela', 'Código', 'Tipo', 'Zona', 'Modalidad sesión',
    'Grados', 'Contacto', 'Cargo', 'WhatsApp',
    'Fecha envío', 'Fecha seguimiento', 'Estado', 'Probabilidad', 'Notas'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // ── Estilo del encabezado ──────────────────────────────────
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#1A1A2E')
             .setFontColor('#FFFFFF')
             .setFontWeight('bold')
             .setFontSize(11);
  sheet.setFrozenRows(1);

  // ── Anchos de columna ──────────────────────────────────────
  var colWidths = [200, 80, 150, 140, 140, 160, 150, 130, 120, 110, 130, 160, 100, 250];
  colWidths.forEach(function(w, i) { sheet.setColumnWidth(i + 1, w); });

  // ── Validaciones dropdown ──────────────────────────────────
  var dataRange = sheet.getRange(2, 1, 200, headers.length);

  // Col C — Tipo
  sheet.getRange(2, 3, 200, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['B2B Institución', 'B2C Independiente'], true)
      .setAllowInvalid(false).build()
  );

  // Col D — Zona
  sheet.getRange(2, 4, 200, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Panamá Ciudad', 'Panamá Oeste'], true)
      .setAllowInvalid(false).build()
  );

  // Col E — Modalidad
  sheet.getRange(2, 5, 200, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['En escuela', 'En estudio', 'Mixta'], true)
      .setAllowInvalid(false).build()
  );

  // Col L — Estado
  sheet.getRange(2, 12, 200, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList([
        '🟡 Enviada',
        '👀 Vista',
        '💬 En negociación',
        '✅ Confirmada',
        '❌ Rechazada',
        '🔕 Sin respuesta',
        '⏸️ En pausa'
      ], true)
      .setAllowInvalid(false).build()
  );

  // Col M — Probabilidad
  sheet.getRange(2, 13, 200, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Alta', 'Media', 'Baja'], true)
      .setAllowInvalid(false).build()
  );

  // Col J — Formato fecha
  sheet.getRange(2, 10, 200, 1).setNumberFormat('dd/mm/yyyy');
  // Col K — Fecha seguimiento: fórmula automática
  sheet.getRange(2, 11, 200, 1).setNumberFormat('dd/mm/yyyy');

  // ── Nota en la celda K1 ────────────────────────────────────
  sheet.getRange(1, 11).setNote('Se calcula automáticamente: Fecha envío + 7 días.\nUsa "Marcar fila como Enviada hoy" del menú para llenar J y K juntos.');

  Logger.log('✅ Hoja "' + TRACKER_SHEET_NAME + '" lista. Próximo paso: ejecuta setupTrackerTrigger() para activar las alertas diarias.');
}


/**
 * Marca la fila actualmente seleccionada como enviada hoy.
 * Rellena: Fecha envío (J) = hoy, Fecha seguimiento (K) = hoy+7, Estado (L) = 🟡 Enviada.
 * Usar desde el menú "📸 Mi Mejor Retrato → ✅ Marcar fila como Enviada hoy".
 */
function marcarEnviadaHoy() {
  var sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TRACKER_SHEET_NAME);
  var ui      = SpreadsheetApp.getUi();

  if (!sheet) {
    ui.alert('❌ No se encontró la hoja "' + TRACKER_SHEET_NAME + '".\nEjecuta primero "Inicializar hoja Propuestas" desde el menú.');
    return;
  }

  var row = SpreadsheetApp.getActiveSheet().getActiveRange().getRow();
  if (row <= 1) {
    ui.alert('⚠️ Selecciona una fila de datos (no el encabezado).');
    return;
  }

  if (SpreadsheetApp.getActiveSheet().getName() !== TRACKER_SHEET_NAME) {
    ui.alert('⚠️ Asegúrate de tener seleccionada una fila en la hoja "' + TRACKER_SHEET_NAME + '".');
    return;
  }

  var hoy         = new Date();
  var seguimiento = new Date();
  seguimiento.setDate(hoy.getDate() + 7);

  sheet.getRange(row, 10).setValue(hoy);          // J — Fecha envío
  sheet.getRange(row, 11).setValue(seguimiento);   // K — Fecha seguimiento
  sheet.getRange(row, 12).setValue('🟡 Enviada'); // L — Estado

  // Quitar color de alerta si existía
  sheet.getRange(row, 1, 1, 14).setBackground('#FFFFFF');

  var escuela = sheet.getRange(row, 1).getValue() || 'esta fila';
  ui.alert('✅ "' + escuela + '" marcada como enviada.\nSeguimiento agendado para: ' + Utilities.formatDate(seguimiento, 'America/Panama', 'dd/MM/yyyy'));
}


/**
 * Verifica la hoja "Propuestas" y notifica seguimientos vencidos o próximos.
 * - Rojo: fecha seguimiento ya pasó (vencido)
 * - Amarillo: seguimiento es hoy o mañana
 * - Envía resumen a Discord si hay alertas.
 * Se ejecuta diariamente vía trigger (setupTrackerTrigger).
 */
function verificarSeguimientos() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(TRACKER_SHEET_NAME);

  if (!sheet || sheet.getLastRow() <= 1) return;

  var datos   = sheet.getDataRange().getValues();
  var alertas = { vencidos: [], proximos: [] };
  var hoy     = new Date(); hoy.setHours(0, 0, 0, 0);
  var manana  = new Date(hoy); manana.setDate(manana.getDate() + 1);

  for (var i = 1; i < datos.length; i++) {
    var fila            = datos[i];
    var escuela         = String(fila[0]  || '').trim();
    var estado          = String(fila[11] || '').trim();
    var fechaSeguimiento = fila[10];

    if (!escuela) continue;
    if (!fechaSeguimiento || !(fechaSeguimiento instanceof Date)) continue;
    if (estado === '✅ Confirmada' || estado === '❌ Rechazada') continue;

    var fSeg = new Date(fechaSeguimiento); fSeg.setHours(0, 0, 0, 0);
    var contacto = String(fila[6] || '—').trim();
    var rowRange = sheet.getRange(i + 1, 1, 1, 14);

    if (fSeg < hoy) {
      // VENCIDO
      rowRange.setBackground('#FFDEDE');
      alertas.vencidos.push({
        escuela:  escuela,
        contacto: contacto,
        fecha:    Utilities.formatDate(fSeg, 'America/Panama', 'dd/MM/yyyy'),
        estado:   estado
      });
    } else if (fSeg <= manana) {
      // HOY O MAÑANA
      rowRange.setBackground('#FFF9C4');
      alertas.proximos.push({
        escuela:  escuela,
        contacto: contacto,
        fecha:    Utilities.formatDate(fSeg, 'America/Panama', 'dd/MM/yyyy')
      });
    } else {
      // Sin alerta — limpiar color si tenía uno viejo
      var bg = rowRange.getBackground();
      if (bg === '#ffdede' || bg === '#fff9c4') {
        rowRange.setBackground('#FFFFFF');
      }
    }
  }

  var totalAlertas = alertas.vencidos.length + alertas.proximos.length;
  if (totalAlertas === 0) return;

  // ── Armar mensaje Discord ──────────────────────────────────
  var lineas = ['📸 **MMR — Seguimiento de Propuestas** · ' + Utilities.formatDate(new Date(), 'America/Panama', 'dd/MM/yyyy')];

  if (alertas.vencidos.length > 0) {
    lineas.push('\n🔴 **VENCIDAS (' + alertas.vencidos.length + ')** — Requieren acción inmediata:');
    alertas.vencidos.forEach(function(a) {
      lineas.push('  • **' + a.escuela + '** | Contacto: ' + a.contacto + ' | Desde: ' + a.fecha + ' | Estado: ' + a.estado);
    });
  }

  if (alertas.proximos.length > 0) {
    lineas.push('\n🟡 **HOY / MAÑANA (' + alertas.proximos.length + ')**:');
    alertas.proximos.forEach(function(a) {
      lineas.push('  • **' + a.escuela + '** | Contacto: ' + a.contacto + ' | Fecha: ' + a.fecha);
    });
  }

  var mensaje = lineas.join('\n');

  // ── Enviar a Discord ───────────────────────────────────────
  try {
    UrlFetchApp.fetch(DISCORD_WEBHOOK, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        username: '📸 MMR Tracker',
        content:  mensaje
      })
    });
  } catch (err) {
    // Si Discord falla, intentar email como respaldo
    try {
      MailApp.sendEmail({
        to:      Session.getActiveUser().getEmail(),
        subject: '📸 MMR — ' + totalAlertas + ' seguimiento(s) pendiente(s)',
        body:    mensaje.replace(/\*\*/g, '')
      });
    } catch (errMail) {}
  }
}


/**
 * Configura el trigger diario para verificarSeguimientos().
 * Ejecutar UNA SOLA VEZ desde el editor de Apps Script (Run → setupTrackerTrigger).
 */
function setupTrackerTrigger() {
  // Eliminar triggers anteriores del tracker para evitar duplicados
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'verificarSeguimientos') ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger('verificarSeguimientos')
    .timeBased()
    .everyDays(1)
    .atHour(8)     // 8am hora del proyecto (configurar zona horaria en App Script Settings → América/Panamá)
    .create();

  Logger.log('✅ Trigger activado. "verificarSeguimientos" correrá todos los días a las 8:00am y enviará alertas a Discord cuando haya seguimientos vencidos o próximos.');
}
