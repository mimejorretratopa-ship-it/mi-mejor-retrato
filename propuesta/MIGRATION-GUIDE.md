# Guía de Backend — Google Sheets + Airtable + Discord

## Estado actual del sistema

El sistema usa un **Google Apps Script Hub** como único receptor del formulario. El frontend
envía un solo POST y el Hub distribuye a todos los destinos.

```
Frontend (Vercel)
    └── storage.js → postToAPI()
            └── POST → Google Apps Script Hub
                        ├── Google Sheets   (base de datos principal)
                        ├── Google Contacts (agenda del fotógrafo)
                        ├── Airtable        (CRM / pipeline)
                        └── Discord         (webhook directo, independiente del Hub)
```

> **Backup del código:** `apps-script/MMR_brochures_hub_v3.3.gs`

---

## 1. Google Sheets (Base de Datos)

Las submissions se escriben en la primera pestaña de la hoja vinculada al Apps Script.

- **Columnas:** Fecha · Colegio · Acudiente · Relación · Estudiante · Salón · WhatsApp · Paquete · Precio · Email · ID
- **Encabezado:** se crea automáticamente si la hoja está vacía.

---

## 2. Airtable (Gestión CRM)

Integrado vía el Hub de Google.

- **Base ID:** `appVXT9GPLoKT15YJ`
- **Tabla:** `Leads`
- **Token:** `patAmwrENFA2Qrqzy.21e195...` (ver `.gs` para el token completo)
- **Columnas:** Fecha, Colegio, Acudiente, Relacion, Estudiante, Salon, WhatsApp, Paquete, Precio, Email, ID

### Campo "Colegio" — diseño intencional

El campo `Colegio` en Airtable y Sheets recibe el **ID corto del brochure** (ej: `clia-26`),
**no** el nombre largo. Esto es intencional: permite filtrar y agrupar de forma consistente.

```js
// form-renderer.js — DISEÑO INTENCIONAL, no cambiar
metadata.schoolName = brochure.id;   // "clia-26", no "Chiara Lubich International Academy"
```

```js
// apps-script Hub — lee ese valor
var colegio = meta.schoolName || data.idEscuela;  // siempre será "clia-26"
```

---

## 3. Google Contacts (Agenda)

Integrado vía el Hub de Google.

- **Formato nombre:** `Nombre : Estudiante - ESCUELA SALON_CORTO`
  - Ejemplo: `Ana : Scarla Kalentis - CLIA K`
- **Grupo:** `MMR Leads 2026`

---

## 4. Discord (Notificaciones)

Webhook **directo** desde el frontend (no pasa por el Hub). Se dispara en paralelo al POST del Hub.

- **Endpoint:** en `config/brochure-config.js → endpoints.notifyDiscord`
- **Formato payload:** `{ content: "mensaje" }`

---

## Fallbacks y Seguridad

- **no-cors:** El POST al Hub usa `mode: 'no-cors'`. El frontend asume éxito si el fetch no lanza error.
- **Sin descarga local:** Eliminado para evitar desorden. Discord y Sheets son las fuentes de verdad.
- **Timeout:** 8 segundos antes de dar error en el frontend.
- **muteHttpExceptions en Airtable:** El script silencia errores de Airtable. Ver sección de diagnóstico.

---

## Diagnóstico — Airtable no popula datos

### Por qué v3.3 no tiene LOGS visibles

La versión 3.3 del script **no tiene pestaña LOGS**. Eso se agregó en v3.4 (Modo Diagnóstico).
Si las filas no aparecen en Google Sheets, el problema es anterior a Airtable.

### Árbol de diagnóstico

```
¿Hay filas nuevas en Google Sheets?
│
├── NO → El POST nunca llega al script
│         Causas posibles:
│         a) La URL del script en brochure-config.js expiró (re-deploy necesario)
│         b) El script no está publicado como "Anyone" (revisar permisos de deploy)
│         c) Error en el JSON enviado (revisar consola del navegador)
│
└── SÍ → El script funciona. Airtable es el problema
          Causas posibles:
          a) Token vencido → error 401/403
          b) Nombre de columna diferente al esperado → error 422
          c) Base ID o tabla incorrecta → error 404

```

### Cómo ver el error de Airtable (sin LOGS)

En el Apps Script, cambiar temporalmente la sección de Airtable para leer la respuesta:

```js
// Reemplazar el UrlFetchApp.fetch(...) actual por esto para diagnosticar:
var resp = UrlFetchApp.fetch(atUrl, { ... opciones ... });
Logger.log("Airtable status: " + resp.getResponseCode());
Logger.log("Airtable body:   " + resp.getContentText());
```

Luego ir a **Apps Script → Ver → Registros** para leer el código HTTP.

- `200 / 201` → Éxito
- `401 / 403` → Token inválido o vencido — generar nuevo token en airtable.com/account
- `404` → Base ID o nombre de tabla incorrecto
- `422` → Un campo requerido no llega o el nombre de columna no coincide exactamente

### Verificar nombres de columnas en Airtable

Los nombres del payload deben coincidir **exactamente** con las columnas en Airtable (mayúsculas, tildes, espacios):

| Payload (script) | Columna Airtable esperada |
|-----------------|--------------------------|
| `"Fecha"` | `Fecha` |
| `"Colegio"` | `Colegio` |
| `"Acudiente"` | `Acudiente` |
| `"Relacion"` | `Relacion` ← sin tilde (intencional) |
| `"Estudiante"` | `Estudiante` |
| `"Salon"` | `Salon` ← sin tilde (intencional) |
| `"WhatsApp"` | `WhatsApp` |
| `"Paquete"` | `Paquete` |
| `"Precio"` | `Precio` (campo numérico) |
| `"Email"` | `Email` |
| `"ID"` | `ID` |

---

## Cómo cambiar la base de datos

Si necesitas cambiar el Google Sheet de destino o el token de Airtable:

1. Abre el script en **script.google.com**
2. Edita las variables al tope del archivo (`AT_BASE_ID`, `AT_TABLE_NAME`, `AT_TOKEN`)
3. Haz click en **Implementar → Administrar implementaciones → Nueva versión**
4. La URL del endpoint **no cambia** entre versiones — no necesitas actualizar `brochure-config.js`

Si necesitas cambiar la **URL del endpoint** (nuevo script):
1. Crea el script, impleméntalo y copia la URL
2. Actualiza `config/brochure-config.js → endpoints.submitForm`
3. Haz push a GitHub/Vercel

---

## Lo que falta por migrar (Opcional)

| Recurso | Estado actual | Futuro sugerido |
|---------|---------------|-----------------|
| `precios.json` | Estático en `/data` | Google Sheets / Airtable |
| `escuelas.json` | Estático en `/data` | Google Sheets / Airtable |
| `create-contact` | Implementado en Hub v3.3 | — |

---

**Nota:** El sistema es 100% serverless. No requiere mantenimiento de servidores propios.
