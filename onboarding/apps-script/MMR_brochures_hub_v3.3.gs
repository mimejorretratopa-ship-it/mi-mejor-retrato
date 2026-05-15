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
    var studentId = meta.student_id || 'N/A';
    var genero    = data.genero || '';

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
