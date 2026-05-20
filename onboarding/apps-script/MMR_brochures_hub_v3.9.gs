/**
 * MMR BACKEND v3.9 — HUB + FIX SEARCH AIRTABLE
 * Archivo: MMR_brochures_260515_v3.9
 *
 * CAMBIOS v3.9:
 * - Fix Airtable Search: Ahora usa SEARCH() sobre la columna "Colegio"
 *   para que "ebrv" coincida con "ebrv-26".
 * - Salon: Búsqueda exacta por la columna "Salon".
 */

var SHEET_ID   = 'VER_APPS_SCRIPT'; 
var AT_BASE_ID = 'appVXT9GPLoKT15YJ'; 
var AT_TABLE   = 'Leads';
var AT_TOKEN   = 'VER_APPS_SCRIPT'; 
var DISCORD_WEBHOOK = 'VER_APPS_SCRIPT';
var SITE_URL = 'https://mimejorretrato.com';
var DISCOVERY_DELAY_DAYS = 3;

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

function doGet(e) {
  var action = e.parameter.action;
  var sid = e.parameter.sid;

  // ── GET STUDENT (individual, para cuestionario) ────────────
  if (action === 'getStudent' && sid) {
    try {
      var data = SpreadsheetApp.openById(SHEET_ID).getSheets()[0].getDataRange().getValues();
      var headers = data[0];
      var idIdx = headers.indexOf('ID');
      for (var i = 1; i < data.length; i++) {
        if (data[i][idIdx] === sid) {
          return ContentService.createTextOutput(JSON.stringify({ success: true, data: { nombre: data[i][headers.indexOf('Estudiante')], colegio: data[i][headers.indexOf('Colegio')], salon: data[i][headers.indexOf('Salón')] } })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    } catch (e) {}
  }

  // ── GET STUDENTS (para Dashboard local) ───────────────────
  if (action === 'getStudents') {
    try {
      var ss = SpreadsheetApp.openById(SHEET_ID);
      var sheet = ss.getSheets()[0];
      var rows = sheet.getDataRange().getValues();
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

      var result = [];
      var filterSchool = e.parameter.school || 'TODOS';

      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        var idVal = String(row[idx.id] || '').trim();
        var schoolVal = String(row[idx.colegio] || '').trim();

        if (!idVal || idVal === 'N/A' || idVal === '') continue; // Saltar vacíos y fantasmas

        if (filterSchool && filterSchool !== 'TODOS') {
          var cleanFilter = filterSchool.toLowerCase().split('-')[0];
          var cleanSchool = schoolVal.toLowerCase().split('-')[0];
          if (cleanSchool !== cleanFilter) continue;
        }

        var dateVal = row[idx.fecha];
        var timestamp = (dateVal instanceof Date) ? dateVal.toISOString() : new Date().toISOString();

        var phoneVal = String(row[idx.whatsapp] || '').trim();
        var celular = phoneVal;
        if (phoneVal.indexOf('507') === 0) celular = phoneVal.substring(3);
        else if (phoneVal.indexOf('+507') === 0) celular = phoneVal.substring(4);

        var schoolCode = schoolVal.split('-')[0];

        result.push({
          student_id: idVal,
          acudiente: {
            nombre:   String(row[idx.acudiente] || '').trim(),
            relacion: String(row[idx.relacion]  || '').trim(),
            whatsapp: phoneVal,
            codigoPais: '+507',
            celular:  celular,
            email:    String(row[idx.email] || '').trim()
          },
          estudiante: {
            nombre:        String(row[idx.estudiante] || '').trim(),
            salon:         String(row[idx.salon]      || '').trim(),
            escuela_code:  schoolCode,
            escuela_nombre: schoolCode.toUpperCase()
          },
          reserva: {
            propuesta: schoolVal,
            paquete:   String(row[idx.paquete] || '').trim(),
            precio:    parseFloat(row[idx.precio]) || 0,
            timestamp: timestamp
          }
        });
      }

      return ContentService.createTextOutput(JSON.stringify({ success: true, estudiantes: result })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var logSheet = ss.getSheetByName('LOGS') || ss.insertSheet('LOGS');
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || 'saveLead';
    var meta = data._meta || {};
    var studentId = meta.student_id || data.sid || 'N/A';

    // ── GET AGENDA (BÚSQUEDA CORREGIDA) ───────────────────────
    if (action === 'getAgenda') {
      var idSalonKey = data.id_salon || (data.school + '_' + data.salon);
      var agendaData = null;
      var aSheet = ss.getSheetByName('Agendas');
      if (aSheet) {
        var aRows = aSheet.getDataRange().getValues();
        for (var j = 1; j < aRows.length; j++) {
          if (aRows[j][0] === idSalonKey) {
            try { agendaData = JSON.parse(aRows[j][1]); } catch(e) {}
            break;
          }
        }
      }
      
      var students = [];
      try {
        // FÓRMULA: El salón debe ser exacto Y el código de escuela debe estar contenido en la columna Colegio
        var filter = 'AND({Salon}="' + data.salon + '", SEARCH("' + data.school + '", {Colegio}))';
        var atUrl = 'https://api.airtable.com/v0/' + AT_BASE_ID + '/' + encodeURIComponent(AT_TABLE) + '?filterByFormula=' + encodeURIComponent(filter);
        
        var res = UrlFetchApp.fetch(atUrl, { headers: { 'Authorization': 'Bearer ' + AT_TOKEN }, muteHttpExceptions: true });
        var atData = JSON.parse(res.getContentText());
        
        if (atData.records && atData.records.length > 0) {
          students = atData.records.map(function(r) {
            return { id: r.fields.ID || r.id, nombre: r.fields.Estudiante, hora_sesion: r.fields.Hora_Sesion || null };
          });
        } else {
          // Fallback: Si no encuentra con escuela, intenta solo por salón para diagnóstico
          logSheet.appendRow([new Date(), 'Airtable 0 records with school filter', filter]);
        }
      } catch (e) { logSheet.appendRow([new Date(), 'Airtable Search Error', e.toString()]); }

      return ContentService.createTextOutput(JSON.stringify({ success: true, agenda: agendaData, students: students })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── SAVE AGENDA ───────────────────────────────────────────
    if (action === 'saveAgenda') {
      var idSalon = data.id_salon;
      var agendaData = data.agenda_data;
      var aSheet = ss.getSheetByName('Agendas') || ss.insertSheet('Agendas');
      if (aSheet.getLastRow() === 0) aSheet.appendRow(['ID_Salon', 'Config_JSON']);
      var aRows = aSheet.getDataRange().getValues();
      var fRow = -1;
      for (var k = 1; k < aRows.length; k++) { if (aRows[k][0] === idSalon) { fRow = k + 1; break; } }
      if (fRow > -1) aSheet.getRange(fRow, 2).setValue(JSON.stringify(agendaData));
      else aSheet.appendRow([idSalon, JSON.stringify(agendaData)]);

      // Sync Airtable
      try {
        var assignments = agendaData.assignments || {};
        for (var hora in assignments) {
          var rid = assignments[hora].id;
          if (rid && rid.indexOf('rec') === 0) {
            UrlFetchApp.fetch('https://api.airtable.com/v0/' + AT_BASE_ID + '/' + encodeURIComponent(AT_TABLE) + '/' + rid, {
              method: 'patch', headers: { 'Authorization': 'Bearer ' + AT_TOKEN, 'Content-Type': 'application/json' },
              payload: JSON.stringify({ fields: { 'Hora_Sesion': hora } })
            });
          }
        }
      } catch(e) {}
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── SAVE DISCOVERY ────────────────────────────────────────
    if (action === 'saveQuestionnaire') {
      var qSheet = ss.getSheetByName('Cuestionarios') || ss.insertSheet('Cuestionarios');
      qSheet.appendRow([new Date(), studentId, meta.nombre_estudiante, meta.escuela, meta.salon, JSON.stringify(data)]);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── GET STUDENTS (FOR DASHBOARD) ──────────────────────────
    if (action === 'getStudents') {
      var sheet = ss.getSheets()[0];
      var rows = sheet.getDataRange().getValues();
      var headers = rows[0];
      
      var idx = {
        fecha: headers.indexOf('Fecha'),
        colegio: headers.indexOf('Colegio'),
        acudiente: headers.indexOf('Acudiente'),
        relacion: headers.indexOf('Relación'),
        estudiante: headers.indexOf('Estudiante'),
        salon: headers.indexOf('Salón'),
        whatsapp: headers.indexOf('WhatsApp'),
        paquete: headers.indexOf('Paquete'),
        precio: headers.indexOf('Precio'),
        email: headers.indexOf('Email'),
        id: headers.indexOf('ID')
      };
      
      var result = [];
      var filterSchool = data.school; // Opcional (ej: "lasa-26" o "lasa")
      
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        var idVal = String(row[idx.id] || '').trim();
        var schoolVal = String(row[idx.colegio] || '').trim();
        
        if (!idVal) continue; // Saltar vacíos
        
        // El filtro de colegio puede ser exacto o parcial (ej: "lasa" coincide con "lasa-26")
        if (filterSchool && filterSchool !== 'TODOS') {
          var cleanFilter = filterSchool.toLowerCase().split('-')[0];
          var cleanSchool = schoolVal.toLowerCase().split('-')[0];
          if (cleanSchool !== cleanFilter) continue;
        }
        
        var dateVal = row[idx.fecha];
        var timestamp = (dateVal instanceof Date) ? dateVal.toISOString() : new Date().toISOString();
        
        var phoneVal = String(row[idx.whatsapp] || '').trim();
        var codigoPais = "+507";
        var celular = phoneVal;
        if (phoneVal.indexOf('507') === 0) {
          celular = phoneVal.substring(3);
        } else if (phoneVal.indexOf('+507') === 0) {
          celular = phoneVal.substring(4);
        }
        
        var schoolCode = schoolVal.split('-')[0];
        
        result.push({
          student_id: idVal,
          acudiente: {
            nombre: String(row[idx.acudiente] || '').trim(),
            relacion: String(row[idx.relacion] || '').trim(),
            whatsapp: phoneVal,
            codigoPais: codigoPais,
            celular: celular,
            email: String(row[idx.email] || '').trim()
          },
          estudiante: {
            nombre: String(row[idx.estudiante] || '').trim(),
            salon: String(row[idx.salon] || '').trim(),
            escuela_code: schoolCode,
            escuela_nombre: schoolCode.toUpperCase()
          },
          reserva: {
            propuesta: schoolVal,
            paquete: String(row[idx.paquete] || '').trim(),
            precio: parseFloat(row[idx.precio]) || 0,
            timestamp: timestamp
          }
        });
      }
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, estudiantes: result })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── SAVE LEAD (ONBOARDING) ────────────────────────────────
    var phone = data.celular ? '507' + data.celular : '';
    var schoolCode = (data.idEscuela || 'mmr').toLowerCase();
    var linkQ = buildWhatsAppDiscoveryLink(phone, data.nombreEstudiante, studentId);
    var linkA = buildWhatsAppAgendaLink(phone, data.nombreEstudiante, schoolCode, data.salon);
    var fechaQ = new Date(); fechaQ.setDate(fechaQ.getDate() + DISCOVERY_DELAY_DAYS);

    // Sheets
    var sheet = ss.getSheets()[0];
    sheet.appendRow([new Date(), meta.schoolName||data.idEscuela, data.nombre, data.relacion, data.nombreEstudiante, data.salon, data.genero, phone, data.paqueteLabel, data.precio, data.email, studentId, linkQ, linkA, fechaQ, '']);

    // Airtable
    try {
      UrlFetchApp.fetch('https://api.airtable.com/v0/' + AT_BASE_ID + '/' + encodeURIComponent(AT_TABLE), {
        method: 'post', headers: { 'Authorization': 'Bearer ' + AT_TOKEN, 'Content-Type': 'application/json' },
        payload: JSON.stringify({
          fields: {
            'Fecha': new Date().toISOString(), 'Colegio': meta.schoolName||data.idEscuela, 
            'Acudiente': data.nombre, 'Estudiante': data.nombreEstudiante, 'Salon': data.salon, 'WhatsApp': phone,
            'ID': studentId, 'Link_WhatsApp_Q': linkQ, 'Link_WhatsApp_Agenda': linkA
          }
        })
      });
    } catch(e) {}

    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) { return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON); }
}

function dailyDiscoveryReminder() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var colFQ = headers.indexOf('Fecha_Envio_Q');
  var colQE = headers.indexOf('Q_Enviado');
  var hoy = new Date(); hoy.setHours(0,0,0,0);
  for (var i = 1; i < data.length; i++) {
    if (data[i][colFQ] && !data[i][colQE] && hoy >= new Date(data[i][colFQ])) {
      var payload = { username: 'MMR', embeds: [{ title: '⏰ Recordatorio Discovery: ' + data[i][headers.indexOf('Estudiante')], description: '[Enviar WhatsApp →](' + data[i][headers.indexOf('Link_WA_Discovery')] + ')' }] };
      UrlFetchApp.fetch(DISCORD_WEBHOOK, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload) });
      sheet.getRange(i + 1, colQE + 1).setValue('✅ ' + new Date().toLocaleDateString());
    }
  }
}

function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) { if (t.getHandlerFunction() === 'dailyDiscoveryReminder') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('dailyDiscoveryReminder').timeBased().everyDays(1).atHour(8).create();
}

// =======================================================================
// EXPORTADOR CSV PARA PULSO CRM
// =======================================================================

/**
 * Crea el menú personalizado al abrir la hoja
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Mi Mejor Retrato')
      .addItem('📤 Exportar para Pulso', 'abrirExportadorPulso')
      .addToUi();
}

/**
 * Abre el diálogo de exportación
 */
function abrirExportadorPulso() {
  var html = HtmlService.createHtmlOutputFromFile('pulso_export_ui')
      .setWidth(400)
      .setHeight(350);
  SpreadsheetApp.getUi().showModalDialog(html, 'Exportar CSV para Pulso');
}

/**
 * Lee la hoja principal ("Respuestas" o Sheet1) y extrae Colegios y Salones únicos
 * para poblar los selectores del UI.
 */
function getOpcionesFiltro() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var colColegio = headers.indexOf('Colegio');
  var colSalon = headers.indexOf('Salón');
  
  if (colColegio === -1 || colSalon === -1) {
    throw new Error('No se encontraron las columnas "Colegio" o "Salón".');
  }
  
  var colegios = {};
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var col = row[colColegio];
    var sal = row[colSalon];
    
    if (!col) continue; // Saltar filas vacías
    
    col = String(col).trim();
    sal = String(sal).trim() || 'Sin Salón';
    
    if (!colegios[col]) {
      colegios[col] = [];
    }
    
    if (colegios[col].indexOf(sal) === -1) {
      colegios[col].push(sal);
    }
  }
  
  // Ordenar salones alfabéticamente
  for (var key in colegios) {
    colegios[key].sort();
  }
  
  return colegios;
}

/**
 * Genera el string CSV basado en los filtros y lo devuelve al frontend para descargar
 */
function generarCSVPulso(filtroColegio, filtroSalon) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  // Índices de columnas
  var idx = {
    acudiente: headers.indexOf('Acudiente'),
    relacion: headers.indexOf('Relación'),
    whatsapp: headers.indexOf('WhatsApp'),
    estudiante: headers.indexOf('Estudiante'),
    salon: headers.indexOf('Salón'),
    colegio: headers.indexOf('Colegio')
  };
  
  // Validar
  if (idx.acudiente === -1 || idx.whatsapp === -1 || idx.estudiante === -1) {
    throw new Error('Faltan columnas obligatorias (Acudiente, WhatsApp, Estudiante).');
  }
  
  var csvData = [];
  // Encabezado exacto para Pulso
  csvData.push(['Acudiente', 'Relación', 'Teléfono', 'Estudiante', 'Salón', 'Escuela', 'Link_Fotos'].join(','));
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    
    var colVal = String(row[idx.colegio] || '').trim();
    var salVal = String(row[idx.salon] || '').trim();
    var phoneVal = String(row[idx.whatsapp] || '').trim();
    
    // Filtros
    if (!phoneVal) continue; // Ignorar sin teléfono
    if (filtroColegio && colVal !== filtroColegio) continue;
    if (filtroSalon && filtroSalon !== 'TODOS' && salVal !== filtroSalon) continue;
    
    // Formateo
    var acudiente = String(row[idx.acudiente] || '').trim();
    var relacion = String(row[idx.relacion] || 'acudiente').trim();
    var estudiante = String(row[idx.estudiante] || '').trim();
    
    // Pulso espera el teléfono con +, se lo ponemos si es solo números
    var telefono = phoneVal;
    if (/^\d+$/.test(telefono)) {
      telefono = '+' + telefono;
    }
    
    // Quitar año del colegio (ej: "lasa-26" -> "lasa")
    var escuelaLimpia = colVal.split('-')[0];
    
    // Escapar comas en los textos para CSV
    var wrapStr = function(str) { return '"' + str.replace(/"/g, '""') + '"'; };
    
    var fila = [
      wrapStr(acudiente),
      wrapStr(relacion),
      wrapStr(telefono),
      wrapStr(estudiante),
      wrapStr(salVal),
      wrapStr(escuelaLimpia),
      '' // Link_Fotos vacío por defecto
    ];
    
    csvData.push(fila.join(','));
  }
  
  // Crear nombre de archivo
  var d = new Date();
  var fechaStr = d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
  var colSlug = (filtroColegio || 'todos').split('-')[0];
  var salSlug = (filtroSalon || 'todos').replace(/\s+/g, '-').toLowerCase();
  
  var fileName = colSlug + '_' + salSlug + '_' + fechaStr + '.csv';
  
  return {
    filename: fileName,
    content: csvData.join('\n'),
    count: csvData.length - 1 // Restar encabezado
  };
}
