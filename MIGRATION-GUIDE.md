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

El 14 de Mayo de 2026 se migró de una arquitectura basada en archivos individuales a una **URL-driven architecture**.

- **Rutas limpias**: Se usan rewrites en Vercel para servir `/propuesta/:slug` desde `index.html`.
- **Datos centralizados**: Los metadatos de brochures viven en `escuelas.json`.
- **Regla de Autoridad**: Se unificaron criterios; `*_secciones.json` manda sobre el layout y `precios.json` manda sobre la visibilidad de paquetes/precios.

### Extensión Post-Onboarding (Fase 1+)

La arquitectura URL-driven se extenderá para soportar flujos post-onboarding:
- El formulario de reserva inicial generará un `student_id` único: `{whatsapp}_{nombre_slug}_{salon_slug}`
- Airtable usará fórmulas para generar URLs dinámicas para el **Discovery Pre-Sesión**: `/onboarding/cuestionario?sid={student_id}`
- **Fase 2: Agenda**: Se habilitó el dashboard `/agenda/` (admin) y la vista pública `/agenda/:slug` (padres) que centraliza la asignación de horarios.

---

## 1. Google Sheets (Base de Datos)
Las submissions se escriben en la primera pestaña de la hoja vinculada al Apps Script. 
**Pestañas Adicionales**:
- `Cuestionarios`: Respuestas brutas del formulario pre-sesión.
- `Agendas`: Configuración JSON de horarios por salón (`ID_Salon`, `Config_JSON`).

---

## 2. Airtable (Gestión CRM)
- **Base ID:** `appVXT9GPLoKT15YJ`
- **Tabla:** `Leads`
- **Campos Clave**: `ID` (student_id), `Colegio`, `Salon`, `Hora_Sesion` (actualizado por Agenda).
- Recibe el ID corto (ej: `clia-26`) para permitir filtrado consistente.

---

## 3. Google Contacts (Agenda)
- **Formato nombre:** `Acudiente : Estudiante` (Nombre) ` - ESCUELA SALON` (Apellido)

---

## 4. Discord (Notificaciones)
Webhook directo desde el frontend configurado en `brochure-config.js`.

---

## Diagnóstico
Si las filas no aparecen en Sheets, el POST no está llegando al Hub. Si aparecen en Sheets pero no en Airtable, el problema está en el Token o los nombres de las columnas en Airtable.
