# Guía de Backend & Migración — Google Sheets + Airtable + Discord + Analytics

## Estado actual del sistema

El sistema usa un **Google Apps Script Hub** como único receptor del formulario. El frontend envía un solo POST y el Hub distribuye a todos los destinos de forma asíncrona.

```
Frontend (Vercel)
    └── storage.js → postToAPI()
            └── POST → Google Apps Script Hub (v3.9)
                        ├── Google Sheets   (base de datos principal y Logs)
                        ├── Google Contacts (agenda de contactos del fotógrafo)
                        ├── Airtable        (CRM / pipeline)
                        └── Discord         (notificación directa de leads)
```

---

## Migración de Arquitectura & Mejoras de Diseño (Mayo 2026)

### 1. Sistema de Tokens CSS & Diseño Editorial (18 de Mayo de 2026)
Se migró el módulo de `/propuesta/` a un diseño premium mobile-first basado en **Tokens de Diseño** declarados en `:root`:
* **Tipografías**: `Playfair Display` (serif elegante para headings y cursivas expresivas) y `Outfit` (sans-serif geométrica para lectura cómoda).
* **Colores**: Paleta neutra cálida con fondo de papel orgánico (`#FBF9F6`), acento terracota cálido (`#C8622A`), texto principal (`#2A2724`) y acento claro (`#F2E8E0`).
* **Estabilidad del Layout**: Se mantiene la tabla comparativa de precios y la línea de tiempo tradicionales en HTML estático para garantizar una presentación impecable en escritorio y un scroll fluido en móviles.

### 2. Integración de Analytics Multi-Propuesta
Para medir las visitas y la interacción en múltiples propuestas comerciales activas (`/propuesta/lasa-26`, `/propuesta/clia-26`, etc.) se ha diseñado la siguiente estrategia de tracking:
* **Código GA4 Estándar**: Insertado en los encabezados HTML de forma comentada para producción.
* **Estrategia Multi-Propuesta**: 
  * Se utiliza **una única propiedad GA4** con un solo ID de Medición `G-XXXXXXXXXX`.
  * GA4 rastrea automáticamente el `page_location` y `page_title`, los cuales contienen el slug de la escuela (ej. `/propuesta/lasalletest.html`).
  * **Dimensión Personalizada (Recomendada)**: Configurar un parámetro personalizado `school_slug` en la etiqueta de configuración global leyendo de la URL para facilitar filtros e informes consolidados en GA4.

---

## 1. Google Sheets (Base de Datos)
Las reservas se escriben en la primera pestaña de la hoja de cálculo.
**Pestañas Adicionales**:
* `Cuestionarios`: Respuestas en crudo del formulario de Discovery (Fase 1).
* `Agendas`: Configuración JSON de horarios y slots por salón (`ID_Salon`, `Config_JSON`) (Fase 2).
* `Logs`: Auditoría del estado de sincronización y envío a Airtable/Discord en tiempo real.

---

## 2. Airtable (Gestión CRM)
* **Base ID:** `appVXT9GPLoKT15YJ`
* **Tabla:** `Leads`
* **Campos Clave**: 
  * `ID`: student_id (Clave primaria universal: `{whatsapp_limpio}_{nombre_slug}_{salon_slug}`).
  * `Colegio`: Código o nombre de la escuela.
  * `Salon`: Valor del salón (ej: `Kinder`, `6to`).
  * `Link_WhatsApp_Q` y `Link_WhatsApp_Agenda`: Generados automáticamente por el Hub.
  * `Hora_Sesion`: Hora asignada en la agenda.
  * `Q_onboarding`: Checkbox que indica si se recibió el cuestionario de Discovery.

---

## 3. Google Contacts (Agenda de Contactos)
* **Formato de Guardado Automático**: `Acudiente : Estudiante` (Nombre) ` - ESCUELA SALON` (Apellido) para facilitar la búsqueda en el celular del fotógrafo el día de la sesión.

---

## 4. Discord (Notificaciones B2B / B2C)
El frontend se conecta al webhook de Discord configurado en `js/core/config.js` para enviar notificaciones push instantáneas cada vez que un lead completa el formulario de onboarding. (Deshabilitado en `/propuesta/` para priorizar WhatsApp directo).

---

## Diagnóstico y Soporte
* Si la propuesta no carga correctamente, verifique que el slug esté declarado en `escuelas.json` y el año esté incluido en la lista de `years`.
* Para depurar en caliente en localhost, abra la consola del navegador y ejecute `window.appState.debug()` para revisar el estado global de la aplicación.
