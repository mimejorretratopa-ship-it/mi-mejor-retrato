# Guía de Backend — Google Sheets + Airtable + Discord

## Estado actual del sistema

El sistema usa un **Google Apps Script Hub** como único receptor del formulario. El frontend envía un solo POST y el Hub distribuye a todos los destinos.

```
Frontend (Vercel)
    └── storage.js → postToAPI()
            └── POST → Google Apps Script Hub
                        ├── Google Sheets   (base de datos principal)
                        ├── Google Contacts (agenda del fotógrafo)
                        ├── Airtable        (CRM / pipeline)
                        └── Discord         (webhook directo, independiente del Hub)
```

---

## Migración de Arquitectura (Frontend)

El 14 de Mayo de 2026 se migró de una arquitectura basada en archivos individuales a una **URL-driven architecture** (B2C - Onboarding).
Posteriormente, el 18 de Mayo de 2026, el módulo B2B (`/propuesta/`) evolucionó hacia un **Modelo Híbrido Estático/Dinámico**.

### 1. Modelo Híbrido Estático/Dinámico (`/propuesta/`)
- **Mejoras SEO & LLM**: El ~80% de la estructura de la propuesta (FAQ, logística común, copy principal, tabla de precios) está *hardcoded* en `index.html`.
- **Inyección Ligera**: Solo datos altamente variables (valores de `$precio`, ubicaciones, nombres y colores de togas) se inyectan dinámicamente desde los JSONs mediante `app.js`.
- **Fricción Cero**: Se eliminó el `<form>` interactivo y la integración a Discord en favor de un botón directo de WhatsApp.

### 2. Extensión Post-Onboarding B2C (Fase 1+)
La arquitectura URL-driven pura se mantiene para soportar flujos post-onboarding:
- El formulario de reserva inicial generará un `student_id` único: `{whatsapp}_{nombre_slug}_{salon_slug}`
- Airtable usa fórmulas para generar URLs dinámicas para el **Discovery Pre-Sesión**: `/onboarding/cuestionario?sid={student_id}`
- **Fase 2: Agenda**: Se habilitó el dashboard `/agenda/` (admin) y la vista pública `/agenda/:slug` (padres) que centraliza la asignación de horarios.

---

## 1. Google Sheets (Base de Datos)
Las submissions se escriben en la primera pestaña de la hoja vinculada al Apps Script. 
**Pestañas Adicionales**:
- `Cuestionarios`: Respuestas brutas del formulario pre-sesión.
- `Agendas`: Configuración JSON de horarios por salón (`ID_Salon`, `Config_JSON`).

**Columnas Requeridas en Leads**:
13. `Link_WA_Discovery`: Link WhatsApp para el cuestionario.
14. `Link_WA_Agenda`: Link WhatsApp para la agenda pública.
15. `Fecha_Envio_Q`: Fecha sugerida (Hoy + 3 días).
16. `Q_Enviado`: Marca de recordatorio enviado.

---

## 2. Airtable (Gestión CRM)
- **Base ID:** `appVXT9GPLoKT15YJ`
- **Tabla:** `Leads`
- **Campos Clave**: 
  - `ID`: student_id.
  - `Colegio`: Código o nombre (usa `SEARCH` en Hub v3.9).
  - `Salon`: Valor del salón (ej: `6to`).
  - `Link_WhatsApp_Q`: Link generado por el Hub.
  - `Link_WhatsApp_Agenda`: Link generado por el Hub.
  - `Hora_Sesion`: Hora asignada.
  - `Q_onboarding`: Checkbox de cuestionario recibido.

---

## 3. Google Contacts (Agenda)
- **Formato nombre:** `Acudiente : Estudiante` (Nombre) ` - ESCUELA SALON` (Apellido)

---

## 4. Discord (Notificaciones)
Webhook directo desde el frontend configurado en `brochure-config.js`.

---

## Diagnóstico
Si las filas no aparecen en Sheets, el POST no está llegando al Hub. Si aparecen en Sheets pero no en Airtable, el problema está en el Token o los nombres de las columnas en Airtable.
