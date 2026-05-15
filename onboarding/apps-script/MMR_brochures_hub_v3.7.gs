/**
 * MMR BACKEND v3.7 — HUB + PIPELINE FULL COMUNICACIÓN
 * Archivo: MMR_brochures_260515_v3.7
 * Destinos: Google Sheets + Google Contacts (People API) + Airtable
 *
 * CAMBIOS v3.7:
 * - Link_WA_Discovery (B1): Generado al onboarding.
 * - Link_WA_Agenda (NUEVO): Link de WhatsApp para enviar la agenda pública al papá.
 * - Automatización D2: Recordatorio diario a los 3 días vía Discord.
 */

var SHEET_ID   = 'VER_APPS_SCRIPT';   // Google Sheet ID
var AT_BASE_ID = 'appVXT9GPLoKT15YJ'; // Airtable Base ID
var AT_TABLE   = 'Leads';
var AT_TOKEN   = 'VER_APPS_SCRIPT';   // Airtable Personal Access Token

// ── DISCORD WEBHOOK ─────────────────────────────────────────────
var DISCORD_WEBHOOK = 'VER_APPS_SCRIPT'; // Discord webhook URL para recordatorios

// ── CONFIGURACIÓN DE MENSAJES ───────────────────────────────────
var SITE_URL = 'https://mimejorretrato.com';
var DISCOVERY_DELAY_DAYS = 3;

/**
 * Genera el link de WhatsApp para el Discovery (cuestionario)
 */
function buildWhatsAppDiscoveryLink(phone, nombreEstudiante, studentId) {
  var cuestionarioUrl = SITE_URL + '/onboarding/cuestionario.html?sid=' + studentId;
  var mensaje = '¡Hola! Para preparar la mejor sesión de fotos de ' + nombreEstudiante + 
                ', necesitamos conocer sus gustos. 🎨\n\n' +
                'Por favor llena este formulario corto (menos de 2 min):\n' + 
                cuestionarioUrl + '\n\n' +
                '¡Gracias! — Mike, Mi Mejor Retrato 📸';
  return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(mensaje);
}

/**
 * Genera el link de WhatsApp para la Agenda (coordinación de cita)
 */
function buildWhatsAppAgendaLink(phone, nombreEstudiante, schoolCode, salonValue) {
  var slug = (schoolCode + '_' + salonValue).toLowerCase().replace(/\s+/g, '_');
  var agendaUrl = SITE_URL + '/agenda/' + slug;
  
  var mensaje = '¡Hola! Aquí puedes ver los espacios disponibles para la sesión de fotos de ' + nombreEstudiante + 
                '. 📅\n\n' +
                'Por favor revisa el horario y dime qué espacio te queda mejor para asignarlo:\n' + 
                agendaUrl + '\n\n' +
                '¡Quedo atento! — Mike, Mi Mejor Retrato';
  
  return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(mensaje);
}

function doGet(e) {
  var action = e.parameter.action;
  var sid = e.parameter.sid;
  if (action === 'getStudent' && sid) {
    try {
      var ss = SpreadsheetApp.openById(SHEET_ID);
      var sheet = ss.getSheets()[0];
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var idIndex = headers.indexOf('ID');
      for (var i = 1; i < data.length; i++) {
        if (data[i][idIndex] === sid) {
          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            data: {
              nombre: data[i][headers.indexOf('Estudiante')] || '',
              colegio: data[i][headers.indexOf('Colegio')] || '',
              salon: data[i][headers.indexOf('Salón')] || '',
              genero: headers.indexOf('Género') !== -1 ? data[i][headers.indexOf('Género')] : ''
            }
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'No encontrado' })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) { return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON); }
  }
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Acción inválida' })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss       = SpreadsheetApp.openById(SHEET_ID);
  var logSheet = ss.getSheetByName('LOGS') || ss.insertSheet('LOGS');
  try {
    var data      = JSON.parse(e.postData.contents);
    var action    = data.action || 'saveLead';
    var meta      = data._meta || {};
    var timestamp = new Date().toISOString();
    var phone     = data.celular ? '507' + data.celular : '';
    var colegio   = meta.schoolName || data.idEscuela;
    var studentId = meta.student_id || data.sid || 'N/A';
    var genero    = data.genero || '';

    // ── 0. HANDSHAKE ──────────────────────────────────────────
    if (action === 'getStudent') {
       var sid = data.sid;
       var sheet = ss.getSheets()[0];
       var rows = sheet.getDataRange().getValues();
       var headers = rows[0];
       var idIndex = headers.indexOf('ID');
       for (var i = 1; i < rows.length; i++) {
         if (rows[i][idIndex] === sid) {
           return ContentService.createTextOutput(JSON.stringify({
             success: true,
             data: {
               nombre: rows[i][headers.indexOf('Estudiante')] || '',
               colegio: rows[i][headers.indexOf('Colegio')] || '',
               salon: rows[i][headers.indexOf('Salón')] || '',
               genero: headers.indexOf('Género') !== -1 ? rows[i][headers.indexOf('Género')] : ''
             }
           })).setMimeType(ContentService.MimeType.JSON);
         }
       }
       return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'No encontrado' })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── 0. SAVE DISCOVERY (CUESTIONARIO) ───────────────────────
    if (action === 'saveQuestionnaire') {
      var qSheet = ss.getSheetByName('Cuestionarios') || ss.insertSheet('Cuestionarios');
      if (qSheet.getLastRow() === 0) {
        qSheet.appendRow(['Fecha', 'ID Estudiante', 'Nombre', 'Colegio', 'Salón', 'Respuestas JSON']);
      }
      qSheet.appendRow([new Date(), studentId, meta.nombre_estudiante || '', meta.escuela || '', meta.salon || '', JSON.stringify(data)]);
      
      // Marcar Airtable
      try {
        var atSearchUrl = 'https://api.airtable.com/v0/' + AT_BASE_ID + '/' + encodeURIComponent(AT_TABLE) + '?filterByFormula=' + encodeURIComponent('{ID}="' + studentId + '"');
        var searchResp = UrlFetchApp.fetch(atSearchUrl, { headers: { 'Authorization': 'Bearer ' + AT_TOKEN } });
        var searchData = JSON.parse(searchResp.getContentText());
        if (searchData.records && searchData.records.length > 0) {
          var recordId = searchData.records[0].id;
          UrlFetchApp.fetch('https://api.airtable.com/v0/' + AT_BASE_ID + '/' + encodeURIComponent(AT_TABLE) + '/' + recordId, {
            method: 'patch',
            headers: { 'Authorization': 'Bearer ' + AT_TOKEN, 'Content-Type': 'application/json' },
            payload: JSON.stringify({ fields: { 'Q_onboarding': true } })
          });
        }
      } catch (atErr) {}
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── 0. AGENDA (get/save) ──────────────────────────────────
    if (action === 'getAgenda' || action === 'saveAgenda') {
      // (Lógica de agenda se mantiene igual que v3.6...)
      var idSalon = data.id_salon;
      if (action === 'getAgenda') {
        var agendaData = null;
        var aSheet = ss.getSheetByName('Agendas');
        if (aSheet) {
          var aRows = aSheet.getDataRange().getValues();
          for (var j = 1; j < aRows.length; j++) {
            if (aRows[j][0] === idSalon) {
              try { agendaData = JSON.parse(aRows[j][1]); } catch(e) {}
              break;
            }
          }
        }
        var students = [];
        try {
          var atSearchUrl = 'https://api.airtable.com/v0/' + AT_BASE_ID + '/' + encodeURIComponent(AT_TABLE) + '?filterByFormula=' + encodeURIComponent('AND(SEARCH("' + data.school + '", {Colegio}), {Salon}="' + data.salon + '")');
          var searchData = JSON.parse(UrlFetchApp.fetch(atSearchUrl, { headers: { 'Authorization': 'Bearer ' + AT_TOKEN } }).getContentText());
          if (searchData.records) {
            students = searchData.records.map(function(r) { return { id: r.fields.ID || r.id, nombre: r.fields.Estudiante, hora_sesion: r.fields.Hora_Sesion || null }; });
          }
        } catch (e) {}
        return ContentService.createTextOutput(JSON.stringify({ success: true, agenda: agendaData, students: students })).setMimeType(ContentService.MimeType.JSON);
      }
      
      if (action === 'saveAgenda') {
        var agendaData = data.agenda_data;
        var aSheet = ss.getSheetByName('Agendas') || ss.insertSheet('Agendas');
        if (aSheet.getLastRow() === 0) aSheet.appendRow(['ID_Salon', 'Config_JSON']);
        var aRows = aSheet.getDataRange().getValues();
        var foundRow = -1;
        for (var k = 1; k < aRows.length; k++) { if (aRows[k][0] === idSalon) { foundRow = k + 1; break; } }
        if (foundRow > -1) aSheet.getRange(foundRow, 2).setValue(JSON.stringify(agendaData));
        else aSheet.appendRow([idSalon, JSON.stringify(agendaData)]);
        
        // Actualizar Airtable (Hora_Sesion)
        try {
          var assignments = agendaData.assignments || {};
          var keys = Object.keys(assignments);
          for(var m=0; m < keys.length; m++) {
             var hora = keys[m];
             var recordId = assignments[hora].id;
             if (recordId && recordId.indexOf('rec') === 0) {
               UrlFetchApp.fetch('https://api.airtable.com/v0/' + AT_BASE_ID + '/' + encodeURIComponent(AT_TABLE) + '/' + recordId, {
                 method: 'patch',
                 headers: { 'Authorization': 'Bearer ' + AT_TOKEN, 'Content-Type': 'application/json' },
                 payload: JSON.stringify({ fields: { 'Hora_Sesion': hora } })
               });
             }
          }
        } catch(e) {}
        return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // ══════════════════════════════════════════════════════════════
    // ── SAVE LEAD (ONBOARDING) ───────────────────────────────────
    // ══════════════════════════════════════════════════════════════
    
    // ── GENERAR LINKS WHATSAPP ───────────────────────────────────
    var linkWADiscovery = '';
    var linkWAAgenda = '';
    if (phone && data.nombreEstudiante && studentId !== 'N/A') {
      var schoolCode = (data.idEscuela || 'mmr').toLowerCase();
      var salonValue = (data.salon || '').toLowerCase();
      
      linkWADiscovery = buildWhatsAppDiscoveryLink(phone, data.nombreEstudiante, studentId);
      linkWAAgenda    = buildWhatsAppAgendaLink(phone, data.nombreEstudiante, schoolCode, salonValue);
    }

    var fechaEnvioQ = new Date();
    fechaEnvioQ.setDate(fechaEnvioQ.getDate() + DISCOVERY_DELAY_DAYS);

    // ── 1. GOOGLE SHEETS ──────────────────────────────────────
    var sheet = ss.getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Fecha','Colegio','Acudiente','Relación','Estudiante','Salón','Género','WhatsApp','Paquete','Precio','Email','ID','Link_WA_Discovery','Link_WA_Agenda','Fecha_Envio_Q','Q_Enviado']);
      sheet.getRange(1,1,1,16).setFontWeight('bold');
    }
    sheet.appendRow([new Date(), colegio, data.nombre, data.relacion||'N/A', data.nombreEstudiante, data.salon, genero, phone, data.paqueteLabel||data.paquete||'N/A', data.precio||0, data.email||'', studentId, linkWADiscovery, linkWAAgenda, fechaEnvioQ, '']);

    // ── 2. GOOGLE CONTACTS ────────────────────────────────────
    try {
      var schoolCode = (data.idEscuela || 'MMR').toUpperCase();
      var salonCorto = (meta.salon_corto || '').toUpperCase();
      var person = {
        names: [{ givenName: data.nombre + ' : ' + data.nombreEstudiante, familyName: ' - ' + schoolCode + (salonCorto ? ' ' + salonCorto : '') }],
        phoneNumbers: [{ value: phone, type: 'mobile' }],
        biographies: [{ value: 'Estudiante: ' + data.nombreEstudiante + '\nColegio: ' + colegio }]
      };
      var createdContact = People.People.createContact(person);
      try {
        var groups = People.ContactGroups.list().contactGroups || [];
        var targetGroup = groups.find(function(g) { return g.name === 'MMR Leads 2026'; }) || People.ContactGroups.create({ contactGroup: { name: 'MMR Leads 2026' } });
        People.ContactGroups.Members.modify({ resourceNamesToAdd: [createdContact.resourceName] }, targetGroup.resourceName);
      } catch(e) {}
    } catch(e) {}

    // ── 3. AIRTABLE ───────────────────────────────────────────
    try {
      UrlFetchApp.fetch('https://api.airtable.com/v0/' + AT_BASE_ID + '/' + encodeURIComponent(AT_TABLE), {
        method: 'post',
        headers: { 'Authorization': 'Bearer ' + AT_TOKEN, 'Content-Type': 'application/json' },
        payload: JSON.stringify({
          fields: {
            'Fecha': timestamp, 'Colegio': colegio, 'Acudiente': data.nombre, 'Relacion': data.relacion||'', 'Estudiante': data.nombreEstudiante,
            'Salon': data.salon, 'Genero': genero, 'WhatsApp': phone, 'Paquete': data.paqueteLabel||data.paquete||'', 'Precio': Number(data.precio)||0,
            'Email': data.email||'', 'ID': studentId, 
            'Link_WhatsApp_Q': linkWADiscovery,
            'Link_WhatsApp_Agenda': linkWAAgenda // Nuevo campo
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
  if (data.length < 2) return;
  var headers = data[0];
  var colFechaEnvio = headers.indexOf('Fecha_Envio_Q');
  var colQEnviado = headers.indexOf('Q_Enviado');
  var hoy = new Date(); hoy.setHours(0,0,0,0);
  for (var i = 1; i < data.length; i++) {
    var fechaEnvio = data[i][colFechaEnvio];
    if (!fechaEnvio || data[i][colQEnviado]) continue;
    if (hoy >= new Date(fechaEnvio)) {
      var lead = { estudiante: data[i][headers.indexOf('Estudiante')], acudiente: data[i][headers.indexOf('Acudiente')], colegio: data[i][headers.indexOf('Colegio')], salon: data[i][headers.indexOf('Salón')], linkWA: data[i][headers.indexOf('Link_WA_Discovery')], id: data[i][headers.indexOf('ID')] };
      var payload = { username: 'Mi Mejor Retrato · Recordatorio', embeds: [{ color: 0x5865F2, title: '⏰ Enviar Discovery a ' + lead.estudiante, fields: [{ name: '👤 Acudiente', value: lead.acudiente, inline: true }, { name: '🏫 Colegio', value: lead.colegio + ' — ' + lead.salon, inline: true }, { name: '📲 WhatsApp', value: '[Enviar Discovery →](' + lead.linkWA + ')', inline: false }], timestamp: new Date().toISOString() }] };
      UrlFetchApp.fetch(DISCORD_WEBHOOK, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload) });
      sheet.getRange(i + 1, colQEnviado + 1).setValue('✅ ' + new Date().toLocaleDateString());
    }
  }
}

function setupDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) { if (triggers[i].getHandlerFunction() === 'dailyDiscoveryReminder') ScriptApp.deleteTrigger(triggers[i]); }
  ScriptApp.newTrigger('dailyDiscoveryReminder').timeBased().everyDays(1).atHour(8).create();
}

function pedirPermisos() { UrlFetchApp.fetch("https://google.com"); People.ContactGroups.list(); }
