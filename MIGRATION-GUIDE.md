# Guía de Backend & Migración — Google Sheets + Airtable + Discord + Analytics

## Estado actual del sistema

El sistema usa un **Google Apps Script Hub** como único receptor del formulario. El frontend envía un solo POST y el Hub distribuye a todos los destinos de forma asíncrona.

```
Frontend (Vercel)
    └── storage.js → postToAPI()
            └── POST → Google Apps Script Hub (v4.0)
                        ├── Google Sheets   (base de datos principal, Logs, Agendas, Propuestas)
                        ├── Google Contacts (agenda de contactos del fotógrafo)
                        ├── Airtable        (CRM / pipeline)
                        └── Discord         (notificación directa de leads + alertas tracker)
```

---

## Migración de Arquitectura & Mejoras de Diseño (Mayo 2026)

### 1. Sistema de Tokens CSS & Diseño Editorial (18 de Mayo de 2026)
Se migró el módulo de `/propuesta/` a un diseño premium mobile-first basado en **Tokens de Diseño** declarados en `:root`:
* **Tipografías**: `Playfair Display` (serif elegante para headings y cursivas expresivas) y `Outfit` (sans-serif geométrica para lectura cómoda).
* **Colores**: Paleta neutra cálida con fondo de papel orgánico (`#FBF9F6`), acento terracota cálido (`#C8622A`), texto principal (`#2A2724`) y acento claro (`#F2E8E0`).
* **Estabilidad del Layout**: Se reemplazó la tabla de precios hardcodeada por una estructura basada en **CSS Grid** dinámica, garantizando adaptabilidad y control total de bordes e items destacados.

### 2. Integración Activa de Analytics Multi-Propuesta (Actualizado a Producción)
Para medir de manera clara las visitas y la interacción en múltiples propuestas (ej. `/propuesta/lasa-26`, `/propuesta/indp-26`):
* **Código GA4 Activo**: Se insertó en producción el ID de medición `G-6H4H52RL0T` para todas las propuestas (`propuesta/index.html`) y para los flujos de onboarding (`precios.json`).
* **Estrategia Multi-Propuesta y SPA**: 
  * Se extrae dinámicamente el `schoolId` desde las rutas limpias manejadas por Vercel (`window.location.pathname`).
  * Se **retrasa el disparo** del hit de página hasta que `app.js` resuelve la configuración de la escuela (`_propuesta.json`).
  * Esto permite asignar dinámicamente el `document.title` antes de enviar el hit a Google Analytics. Como resultado, los informes en GA4 muestran los nombres limpios y comerciales de las escuelas (ej. `Propuesta: Colegio La Salle`) en vez del título genérico del archivo HTML.

### 3. Migración a Tabla Comparativa Única y Dinámica (DRY) (18 de Mayo de 2026)
Se unificaron y simplificaron los precios en el ecosistema:
* **Eliminación de Hardcoding**: Toda la información de entregables y precios de la propuesta comercial (`propuesta/index.html`) y del formulario de onboarding (`onboarding/index.html`) se deriva de un solo archivo: `precios.json`.
* **Esquema de Inclusiones Flexibles**: El objeto `tabla_comparativa` introducido en el JSON permite definir variables específicas del colegio de manera centralizada. Por ejemplo, el campo `fotos_familiares` (booleano) controla dinámicamente si la fila de fotos familiares se muestra como incluida (estudios independientes) o no (en horas de clase escolares) en ambos portales simultáneamente.
* **Consolidación de Look & Feel**: El onboarding abandonó el diseño de "tarjeta individual" por el formato comparativo Premium, usando el mismo generador dinámico de celdas pero estilizado con los tokens del dark theme de la aplicación principal.

### 4. Integración de CRM Local "Pulso" y Generación de Links (Fase 2 - 19 de Mayo)
Se implementó el módulo externo **Pulso** (`herramientas/wassap-crm`) como motor oficial de *outreach* y se completó su integración total mediante un **Exportador CSV en Google Apps Script**:
* **Puente Automatizado**: El Hub de Google Apps Script cuenta ahora con un UI de exportación que filtra las reservas del Google Sheet por Colegio y Salón, y devuelve un CSV formateado específicamente para Pulso.
* **Generación de ID en Origen**: Pulso ahora es el responsable de generar la llave primaria `student_id` al combinar el número de WhatsApp, nombre y salón durante la creación de la campaña, mediante la variable adaptada `[link_onboarding]`.
* Esto garantiza que los registros ingresen a Airtable sin errores tipográficos o duplicaciones, **marcando la finalización oficial de la Fase 2 de automatización**.

### 5. Hub v4.0 — Tracker de Propuestas B2B (21 de Mayo de 2026)
Se añadió al Hub el módulo de seguimiento de propuestas comerciales (acuerdos con colegios):
* **Pestaña `Propuestas`**: Inicializada con `setupPropostasSheet()`. 14 columnas: Escuela, Código, Tipo, Zona, Modalidad, Grados, Contacto, Cargo, WhatsApp, Fecha envío, Fecha seguimiento, Estado, Probabilidad, Notas.
* **Validaciones de lista**: La columna Estado tiene valores predefinidos (🔵 Nueva, 🟡 Enviada, 🟢 En conversación, ✅ Confirmada, ❌ Rechazada). Probabilidad: Alta, Media, Baja.
* **`marcarEnviadaHoy()`**: Desde el menú de Sheets, llena automáticamente fechas de envío y seguimiento (hoy + 7 días).
* **`verificarSeguimientos()`**: Trigger diario 8am que colorea filas por urgencia y envía resumen a Discord.
* **Nota importante**: Las funciones `setupPropostasSheet()` y `setupTrackerTrigger()` usan `Logger.log()` en vez de `getUi().alert()` para ser compatibles con ejecución desde el editor de Apps Script.

### 6. Corrección Integral de Persistencia en Onboarding (21 de Mayo de 2026)
* **Sincronización Completa con Airtable**: Se añadieron los campos faltantes al payload POST (`Relacion`, `Paquete`, `Precio`, `Genero`, `Q_onboarding`, `Estudio`), asegurando que la data del lead viaje íntegra desde el primer toque.
* **Tracking de Estudio (Ubicación)**: El Hub ahora anexa la ubicación de la sesión (ej. `condado` o `viaargentina` para sesiones independientes) como columna 16 en Google Sheets, a Airtable y a Discord.
* **Auditoría Transaccional**: El flujo feliz de reservas B2C ahora registra un log detallado de éxito en la pestaña `Logs` de Google Sheets.

### 7. Generador de Hojas de Ruta y QR (25 de Mayo de 2026)
Como parte inicial de la **Fase 3**, se creó una herramienta operativa interna en `herramientas/generador_pdf/index.html`:
* **Aislada pero conectada**: Lee el archivo local `precios.json` y los endpoints del Hub en tiempo real (`getStudents` y `getAgenda`) para imprimir la lista combinada del salón sin requerir un backend intermedio.
* **Eficiencia en Flujo de Trabajo**: Renderiza códigos QR de 300px usando `qrcode.js` que exponen exclusivamente el `student_id` para escaneo rápido con cámaras DSLR / Lightroom en el set.
* **Layout Print-Ready**: Implementa `@media print` que formatea el HTML en grids 2x2 para papel carta (8.5x11).

### 8. Hub v4.1 - Motor de Secuencia Automática (25 de Mayo de 2026)
Se actualizó el Hub de Google Apps Script a la **versión 4.1**.
* **Automatización Cronológica**: Al presionar *Sincronizar* en la herramienta de Agenda, el script `saveAgenda` ahora calcula automáticamente el orden numérico de los estudiantes según su hora asignada.
* **Persistencia Airtable**: El script escribe (vía PATCH) este número de secuencia en el campo `Secuencia_Dia` de Airtable, además de la hora.
* **Consumo Transparente**: El `getAgenda` expone este campo de vuelta al frontend, permitiendo al Generador PDF mostrar dinámicamente un número de orden impreso (`#01`, `#02`...) de forma totalmente automatizada para el fotógrafo.

---

## 1. Google Sheets (Base de Datos)
Las reservas se escriben en la primera pestaña de la hoja de cálculo (anexando 16 columnas que incluyen datos de contacto, logística y la ubicación de estudio seleccionado).
**Pestañas Adicionales**:
* `Cuestionarios`: Respuestas en crudo del formulario de Discovery (Fase 1).
* `Agendas`: Configuración JSON de horarios y slots por salón (`ID_Salon`, `Config_JSON`) (Fase 2).
* `Propuestas`: Tracker manual de acuerdos B2B con colegios (Fase 3 — v4.0).
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
  * `Estudio`: Ubicación del estudio seleccionado para sesiones independientes.
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
* Si la propuesta no carga correctamente, verifique que el slug esté declarado en `precios.json` (dentro de `escuelas`) y el año esté incluido en la lista de `years`.
* Para depurar en caliente en localhost, abra la consola del navegador y ejecute `window.appState.debug()` para revisar el estado global de la aplicación.
