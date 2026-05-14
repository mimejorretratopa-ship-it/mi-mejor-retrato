/**
 * MMR BACKEND v3.5 — HUB CON LOGS + openById
 * Archivo: MMR_brochures_260513
 * Destinos: Google Sheets + Google Contacts + Airtable
 *
 * CAMPO schoolName / Colegio:
 *   Recibe el ID corto del brochure (ej: "clia-26"), NO el nombre largo.
 *   DISEÑO INTENCIONAL — permite filtrar/agrupar consistentemente.
 *   Ver: form-renderer.js → metadata.schoolName = brochure.id
 *
 * GOOGLE SHEET ID: ver Apps Script (no se sube al repo)
 * AIRTABLE Base ID: appVXT9GPLoKT15YJ  |  Tabla: Leads
 * AIRTABLE Token  : ver Apps Script (no se sube al repo — GitHub Secret Scanning)
 *
 * CAMBIOS v3.5:
 *   - openById() en lugar de getActiveSpreadsheet() (fix para script standalone)
 *   - Pestaña LOGS automática para diagnóstico de cada paso
 *   - Log de respuesta HTTP de Airtable (código + body)
 */

// ⚠️  Los valores reales viven SOLO en Apps Script, no en este archivo.
// GitHub Secret Scanning bloquea el push si detecta tokens en el código.
var SHEET_ID   = 'VER_APPS_SCRIPT';   // Google Sheet ID
var AT_BASE_ID = 'appVXT9GPLoKT15YJ'; // Airtable Base ID (no es secreto)
var AT_TABLE   = 'Leads';
var AT_TOKEN   = 'VER_APPS_SCRIPT';   // Airtable Personal Access Token

function doPost(e) {
  var ss       = SpreadsheetApp.openById(SHEET_ID);
  var logSheet = ss.getSheetByName('LOGS') || ss.insertSheet('LOGS');

  try {
    // ── LOG: confirmar que el POST llegó ──────────────────────
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
      data.relacion        || 'N/A',
      data.nombreEstudiante,
      data.salon,
      phone,
      data.paqueteLabel    || data.paquete || 'N/A',
      data.precio          || 0,
      data.email           || '',
      studentId
    ]);
    logSheet.appendRow([new Date(), 'Sheets OK', '']);

    // ── 2. GOOGLE CONTACTS ────────────────────────────────────
    try {
      var schoolCode     = (data.idEscuela || 'MMR').toUpperCase();
      var salonCorto     = (meta.salon_corto || '').toUpperCase();
      var nombreContacto = data.nombre + ' : ' + data.nombreEstudiante + ' - ' + schoolCode + ' ' + salonCorto;
      var contact = ContactsApp.createContact(data.nombre, data.nombreEstudiante, data.email || '');
      contact.setFullName(nombreContacto);
      contact.addPhone(ContactsApp.Field.MAIN_PHONE, phone);
      contact.setNotes('Estudiante: ' + data.nombreEstudiante + '\nRelación: ' + data.relacion + '\nColegio: ' + colegio);
      var group = ContactsApp.getContactGroup('MMR Leads 2026') || ContactsApp.createContactGroup('MMR Leads 2026');
      contact.addToGroup(group);
      logSheet.appendRow([new Date(), 'Contacts OK', nombreContacto]);
    } catch (err) {
      logSheet.appendRow([new Date(), 'Contacts ERROR', err.toString()]);
    }

    // ── 3. AIRTABLE ───────────────────────────────────────────
    try {
      var atUrl = 'https://api.airtable.com/v0/' + AT_BASE_ID + '/' + encodeURIComponent(AT_TABLE);
      var atPayload = {
        fields: {
          'Fecha'     : timestamp,
          'Colegio'   : colegio,
          'Acudiente' : data.nombre,
          'Relacion'  : data.relacion        || '',
          'Estudiante': data.nombreEstudiante,
          'Salon'     : data.salon,
          'WhatsApp'  : phone,
          'Paquete'   : data.paqueteLabel    || data.paquete || '',
          'Precio'    : Number(data.precio)  || 0,
          'Email'     : data.email           || '',
          'ID'        : studentId
        }
      };

      var atResp = UrlFetchApp.fetch(atUrl, {
        method            : 'post',
        muteHttpExceptions: true,
        headers: {
          'Authorization': 'Bearer ' + AT_TOKEN,
          'Content-Type' : 'application/json'
        },
        payload: JSON.stringify(atPayload)
      });

      logSheet.appendRow([new Date(), 'Airtable HTTP ' + atResp.getResponseCode(), atResp.getContentText()]);

    } catch (err) {
      logSheet.appendRow([new Date(), 'Airtable ERROR', err.toString()]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logSheet.appendRow([new Date(), 'doPost FATAL', error.toString()]);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
