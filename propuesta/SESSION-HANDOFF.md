# Handoff de Sesión — 13 Mayo 2026

## Estado del Proyecto
El sistema de brochures ha sido migrado a una arquitectura de **Backend Hub** basada en Google Apps Script.

## Componentes Implementados

### 1. Frontend (Web)
- **`lib/storage.js`**: Refactorizado para enviar datos vía `fetch` con `mode: 'no-cors'`. Se eliminó la descarga local de JSON.
- **`modules/form-renderer.js`**: Ahora construye metadatos enriquecidos (ID de estudiante, nombre de escuela, salón corto).
- **`config/brochure-config.js`**: Centraliza los endpoints de Google Script, Discord y Analytics.

### 2. Backend (Google Apps Script)
- **Archivo:** `MMR_borchures_260513`
- **Versión Actual:** 3.4 (Modo Diagnóstico)
- **Funciones:**
    - Escribe en la primera pestaña de la hoja vinculada.
    - Crea/actualiza la pestaña **"LOGS"** para debug.
    - Crea contactos en **Google Contacts** (Grupo: "MMR Leads 2026").
    - Envía registros a **Airtable** (Base: `appVXT9GPLoKT15YJ`).

### 3. Integraciones Externas
- **Discord:** Webhook directo con supresión de previews en links.
- **Airtable:** Tabla `Leads` configurada con 11 columnas clave.

## Pendientes / Siguientes Pasos
1. **Verificar Conexión Airtable:** Si los datos no llegan, revisar la pestaña "LOGS" en Google Sheets para ver el código de error (404/422).
2. **Imágenes 404:** Corregir los prefijos de imágenes en los archivos `{code}_secciones.json` para eliminar los errores de consola.
3. **Google Analytics:** Verificar que los IDs en `registro.json` estén capturando eventos correctamente en el nuevo flujo.

## Código del Script (Backup)
El código v3.4 está disponible en la pestaña de Apps Script y documentado en `MIGRATION-GUIDE.md`.
