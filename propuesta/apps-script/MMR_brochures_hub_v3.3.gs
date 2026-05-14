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

function doPost(e) {
  var ss       = SpreadsheetApp.openById(SHEET_ID);
  var logSheet = ss.getSheetByName('LOGS') || ss.insertSheet('LOGS');

  try {
    // ── LOG INICIAL ──────────────────────────────────────────
    var rawBody = e.postData ? e.postData.contents : 'SIN BODY';
    logSheet.appendRow([new Date(), 'POST recibido', rawBody]);

    var data      = JSON.parse(e.postData.contents);
    var meta      = data._meta || {};
    var timestamp = new Date().toISOString();
    var phone     = (data.codigoPais || '') + (data.celular || '');
    var colegio   = meta.schoolName || data.idEscuela;
    var studentId = meta.student_id || 'N/A';

    // ── 1. GOOGLE SHEETS ──────────────────────────────────────
    var sheet = ss.getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Fecha','Colegio','Acudiente','Relación','Estudiante','Salón','WhatsApp','Paquete','Precio','Email','ID']);
      sheet.getRange(1, 1, 1, 11).setFontWeight('bold').setBackground('#f3f3f3');
    }
    sheet.appendRow([
      new Date(),
      colegio,
      data.nombre,
      data.relacion || 'N/A',
      data.nombreEstudiante,
      data.salon,
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
        People.ContactGroups.batchModifyContactMembers({
          resourceBundleKeys: [createdContact.resourceName],
          operations: 'ADD'
        }, targetGroup.resourceName);
      } catch (gErr) { logSheet.appendRow([new Date(), 'Group Warning', gErr.toString()]); }

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
