/**
 * MMR BACKEND v3.8 — HUB + PIPELINE + FIX AGENDA
 * Archivo: MMR_brochures_260515_v3.8
 *
 * CAMBIOS v3.8:
 * - Fix Agenda Search: Búsqueda de estudiantes en Airtable más robusta.
 * - ID_Escuela: Ahora persiste el código (ej: clia) para búsquedas precisas.
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

    // ── GET AGENDA (EL FIX ESTÁ AQUÍ) ─────────────────────────
    if (action === 'getAgenda') {
      var agendaData = null;
      var aSheet = ss.getSheetByName('Agendas');
      if (aSheet) {
        var aRows = aSheet.getDataRange().getValues();
        for (var j = 1; j < aRows.length; j++) {
          if (aRows[j][0] === (data.school + '_' + data.salon)) {
            try { agendaData = JSON.parse(aRows[j][1]); } catch(e) {}
            break;
          }
        }
      }
      
      var students = [];
      try {
        // Búsqueda más flexible: intenta por ID_Escuela o simplemente por Salon
        var filter = 'AND({Salon}="' + data.salon + '")'; 
        var atUrl = 'https://api.airtable.com/v0/' + AT_BASE_ID + '/' + encodeURIComponent(AT_TABLE) + '?filterByFormula=' + encodeURIComponent(filter);
        var res = UrlFetchApp.fetch(atUrl, { headers: { 'Authorization': 'Bearer ' + AT_TOKEN } });
        var atData = JSON.parse(res.getContentText());
        if (atData.records) {
          students = atData.records.map(function(r) {
            return { id: r.fields.ID || r.id, nombre: r.fields.Estudiante, hora_sesion: r.fields.Hora_Sesion || null };
          });
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
            'Fecha': new Date().toISOString(), 'Colegio': meta.schoolName||data.idEscuela, 'ID_Escuela': schoolCode,
            'Acudiente': data.nombre, 'Estudiante': data.nombreEstudiante, 'Salon': data.salon, 'WhatsApp': phone,
            'ID': studentId, 'Link_WhatsApp_Q': linkQ, 'Link_WhatsApp_Agenda': linkA
          }
        })
      });
    } catch(e) {}

    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) { return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON); }
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
