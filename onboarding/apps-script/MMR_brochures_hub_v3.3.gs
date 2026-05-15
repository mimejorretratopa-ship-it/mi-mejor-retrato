/**
 * MMR BACKEND v3.5 — HUB FINAL (People API + Logs)
 * Archivo: MMR_brochures_260514
 * Destinos: Google Sheets + Google Contacts (People API) + Airtable
 *
 * NOTA DE SEGURIDAD: Los tokens y IDs reales deben pegarse directamente
 * en el editor de Apps Script. Este archivo en el repo usa placeholders.
 */

var SHEET_ID   = 'VER_APPS_SCRIPT';   // Google Sheet ID
var AT_BASE_ID = 'appVXT9GPLoKT15YJ'; // Airtable Base ID
var AT_TABLE   = 'Leads';
var AT_TOKEN   = 'VER_APPS_SCRIPT';   // Airtable Personal Access Token

function doGet(e) {
  var action = e.parameter.action;
  var sid = e.parameter.sid;
  
  if (action === 'getStudent' && sid) {
    try {
      var ss = SpreadsheetApp.openById(SHEET_ID);
      var sheet = ss.getSheets()[0]; // La primera hoja asume ser la de Leads
      if (!sheet) throw new Error("Hoja no encontrada");
      
      var data = sheet.getDataRange().getValues();
      if (data.length < 2) throw new Error("Base de datos vacía");
      
      var headers = data[0];
      var idIndex = headers.indexOf('ID');
      if (idIndex === -1) throw new Error("Columna ID no encontrada en DB");
      
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
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Estudiante no encontrado en la base de datos' })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Acción inválida' })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss       = SpreadsheetApp.openById(SHEET_ID);
  var logSheet = ss.getSheetByName('LOGS') || ss.insertSheet('LOGS');

  try {
    // ── LOG INICIAL ──────────────────────────────────────────
    var rawBody = e.postData ? e.postData.contents : 'SIN BODY';
    logSheet.appendRow([new Date(), 'POST recibido', rawBody]);

    var data      = JSON.parse(e.postData.contents);
    var action    = data.action || 'saveLead';
    var meta      = data._meta || {};
    var timestamp = new Date().toISOString();
    var phone     = data.celular ? '507' + data.celular : ''; // hardcoded 507
    var colegio   = meta.schoolName || data.idEscuela;
    var studentId = meta.student_id || data.sid || 'N/A';
    var genero    = data.genero || '';

    // ── 0. HANDSHAKE (getStudent vía POST) ────────────────────
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

    // ── 0. CUESTIONARIOS ──────────────────────────────────────
    if (action === 'saveQuestionnaire') {
      var qSheet = ss.getSheetByName('Cuestionarios') || ss.insertSheet('Cuestionarios');
      if (qSheet.getLastRow() === 0) {
        qSheet.appendRow(['Fecha', 'ID Estudiante', 'Nombre', 'Colegio', 'Salón', 'Respuestas JSON']);
        qSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#f3f3f3');
      }
      
      delete data.action;
      delete data._meta;
      
      qSheet.appendRow([
        new Date(),
        studentId,
        meta.nombre_estudiante || '',
        meta.escuela || '',
        meta.salon || '',
        JSON.stringify(data)
      ]);
      
      logSheet.appendRow([new Date(), 'Cuestionario guardado', studentId]);

      // ── ACTUALIZAR AIRTABLE (Opción A: Checkbox) ────────────
      try {
        var atSearchUrl = 'https://api.airtable.com/v0/' + AT_BASE_ID + '/' + encodeURIComponent(AT_TABLE) + 
                          '?filterByFormula=' + encodeURIComponent('{ID}="' + studentId + '"');
        var searchResp = UrlFetchApp.fetch(atSearchUrl, { 
          method: 'get', 
          headers: { 'Authorization': 'Bearer ' + AT_TOKEN } 
        });
        var searchData = JSON.parse(searchResp.getContentText());
        
        if (searchData.records && searchData.records.length > 0) {
          var recordId = searchData.records[0].id;
          var atUpdateUrl = 'https://api.airtable.com/v0/' + AT_BASE_ID + '/' + encodeURIComponent(AT_TABLE) + '/' + recordId;
          UrlFetchApp.fetch(atUpdateUrl, {
            method: 'patch',
            headers: { 'Authorization': 'Bearer ' + AT_TOKEN, 'Content-Type': 'application/json' },
            payload: JSON.stringify({
              fields: { 'Q_onboarding': true }
            })
          });
          logSheet.appendRow([new Date(), 'Airtable Checkbox OK', studentId]);
        }
      } catch (atErr) {
        logSheet.appendRow([new Date(), 'Airtable Checkbox Error', atErr.toString()]);
      }

      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── 0. AGENDA (getAgenda / saveAgenda) ────────────────────
    if (action === 'getAgenda') {
      var idSalon = data.id_salon; // ej. clia_kinder
      var school = data.school;
      var salon = data.salon;
      
      var agendaData = null;
      var students = [];

      // 1. Leer configuración de la Agenda desde Sheets
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

      // 2. Buscar estudiantes en Airtable
      try {
        var atSearchUrl = 'https://api.airtable.com/v0/' + AT_BASE_ID + '/' + encodeURIComponent(AT_TABLE) + 
                          '?filterByFormula=' + encodeURIComponent('AND({Colegio}="' + school + '", {Salon}="' + salon + '")');
        var searchResp = UrlFetchApp.fetch(atSearchUrl, { 
          method: 'get', 
          headers: { 'Authorization': 'Bearer ' + AT_TOKEN } 
        });
        var searchData = JSON.parse(searchResp.getContentText());
        if (searchData.records) {
          students = searchData.records.map(function(r) {
            return {
              id: r.fields.ID || r.id,
              nombre: r.fields.Estudiante,
              hora_sesion: r.fields.Hora_Sesion || null
            };
          });
        }
      } catch (atErr) {
        logSheet.appendRow([new Date(), 'Airtable GetAgenda Error', atErr.toString()]);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        agenda: agendaData,
        students: students
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'saveAgenda') {
      var idSalon = data.id_salon;
      var agendaData = data.agenda_data;
      var assignments = agendaData.assignments || {};

      var aSheet = ss.getSheetByName('Agendas') || ss.insertSheet('Agendas');
      if (aSheet.getLastRow() === 0) {
        aSheet.appendRow(['ID_Salon', 'Config_JSON']);
        aSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
      }

      var aRows = aSheet.getDataRange().getValues();
      var foundRow = -1;
      for (var k = 1; k < aRows.length; k++) {
        if (aRows[k][0] === idSalon) {
          foundRow = k + 1;
          break;
        }
      }

      if (foundRow > -1) {
        aSheet.getRange(foundRow, 2).setValue(JSON.stringify(agendaData));
      } else {
        aSheet.appendRow([idSalon, JSON.stringify(agendaData)]);
      }

      // Actualizar Airtable con las asignaciones (muy básico, por nombre de estudiante o ID)
      // En este caso, el assignment key es la HORA, el value es el ID del estudiante (o nombre)
      try {
        var keys = Object.keys(assignments);
        for(var m=0; m < keys.length; m++) {
           var hora = keys[m];
           var recordId = assignments[hora].id; // Asumiendo que guardamos el record ID de Airtable
           if (recordId && recordId.indexOf('rec') === 0) {
             var atUpdateUrl = 'https://api.airtable.com/v0/' + AT_BASE_ID + '/' + encodeURIComponent(AT_TABLE) + '/' + recordId;
             UrlFetchApp.fetch(atUpdateUrl, {
               method: 'patch',
               headers: { 'Authorization': 'Bearer ' + AT_TOKEN, 'Content-Type': 'application/json' },
               payload: JSON.stringify({ fields: { 'Hora_Sesion': hora } })
             });
           }
        }
      } catch(atErr2) {
        logSheet.appendRow([new Date(), 'Airtable SaveAgenda Error', atErr2.toString()]);
      }

      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── 1. GOOGLE SHEETS ──────────────────────────────────────
    var sheet = ss.getSheets()[0]; // Forzar uso de la primera hoja
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Fecha','Colegio','Acudiente','Relación','Estudiante','Salón','Género','WhatsApp','Paquete','Precio','Email','ID']);
      sheet.getRange(1, 1, 1, 12).setFontWeight('bold').setBackground('#f3f3f3');
    }
    sheet.appendRow([
      new Date(),
      colegio,
      data.nombre,
      data.relacion || 'N/A',
      data.nombreEstudiante,
      data.salon,
      genero,
      phone,
      data.paqueteLabel || data.paquete || 'N/A',
      data.precio || 0,
      data.email || '',
      studentId
    ]);
    logSheet.appendRow([new Date(), 'Sheets OK', '']);

    // ── 2. GOOGLE CONTACTS (People API) ───────────────────────
    try {
      var schoolCode = (data.idEscuela || 'MMR').toUpperCase();
      var salonCorto = (meta.salon_corto || '').toUpperCase();
      var nombreContacto = data.nombre + ' : ' + data.nombreEstudiante + ' - ' + schoolCode + ' ' + salonCorto;

      var person = {
        names: [{ 
          givenName: data.nombre + ' : ' + data.nombreEstudiante, 
          familyName: ' - ' + schoolCode + (salonCorto ? ' ' + salonCorto : '') 
        }],
        phoneNumbers: [{ value: phone, type: 'mobile' }],
        biographies: [{ value: 'Estudiante: ' + data.nombreEstudiante + '\nRelación: ' + data.relacion + '\nColegio: ' + colegio + '\nFormato: ' + nombreContacto }]
      };
      if (data.email) { person.emailAddresses = [{ value: data.email }]; }

      var createdContact = People.People.createContact(person);
      
      // Intentar agregar al grupo
      try {
        var groups = People.ContactGroups.list().contactGroups || [];
        var targetGroup = groups.find(g => g.name === 'MMR Leads 2026');
        if (!targetGroup) {
          targetGroup = People.ContactGroups.create({ contactGroup: { name: 'MMR Leads 2026' } });
        }
        People.ContactGroups.Members.modify({
          resourceNamesToAdd: [createdContact.resourceName]
        }, targetGroup.resourceName);
      } catch (gErr) { logSheet.appendRow([new Date(), 'Label Warning', gErr.toString()]); }

      logSheet.appendRow([new Date(), 'Contacts OK (People API)', nombreContacto]);
    } catch (err) {
      logSheet.appendRow([new Date(), 'Contacts ERROR', err.toString()]);
    }

    // ── 3. AIRTABLE ───────────────────────────────────────────
    try {
      var atUrl = 'https://api.airtable.com/v0/' + AT_BASE_ID + '/' + encodeURIComponent(AT_TABLE);
      var atResp = UrlFetchApp.fetch(atUrl, {
        method: 'post',
        muteHttpExceptions: true,
        headers: { 'Authorization': 'Bearer ' + AT_TOKEN, 'Content-Type': 'application/json' },
        payload: JSON.stringify({
          fields: {
            'Fecha'     : timestamp,
            'Colegio'   : colegio,
            'Acudiente' : data.nombre,
            'Relacion'  : data.relacion || '',
            'Estudiante': data.nombreEstudiante,
            'Salon'     : data.salon,
            'Genero'    : genero,
            'WhatsApp'  : phone,
            'Paquete'   : data.paqueteLabel || data.paquete || '',
            'Precio'    : Number(data.precio) || 0,
            'Email'     : data.email || '',
            'ID'        : studentId
          }
        })
      });
      logSheet.appendRow([new Date(), 'Airtable HTTP ' + atResp.getResponseCode(), atResp.getContentText()]);
    } catch (err) {
      logSheet.appendRow([new Date(), 'Airtable ERROR', err.toString()]);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logSheet.appendRow([new Date(), 'doPost FATAL', error.toString()]);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function pedirPermisos() {
  UrlFetchApp.fetch("https://google.com");
  People.ContactGroups.list();
}
