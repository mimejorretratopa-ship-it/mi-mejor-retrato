# 🤝 Session Handoff — Mi Mejor Retrato

## 🎯 Estado Actual: TRACKER DE PROPUESTAS ACTIVO + CATÁLOGO DE COLEGIOS COMPLETO (v4.0)

Esta sesión completó la implementación del módulo de **Tracker de Propuestas Comerciales (B2B)** y amplió el catálogo de colegios activos en producción. El Hub de Google Apps Script fue actualizado a la versión **v4.0**.

---

## ✅ Logros Técnicos de Esta Sesión (Mayo 21, 2026)

### 1. Hub v4.0 — Módulo Tracker de Propuestas
* **Nueva pestaña "Propuestas" en Google Sheets**: Inicializada mediante `setupPropostasSheet()` con 14 columnas formateadas (encabezado oscuro, anchos definidos, validaciones de lista desplegable en Estado y Probabilidad, formato de fecha en columnas J/K).
* **Función `marcarEnviadaHoy()`**: Acción de menú que, al seleccionar una fila, rellena automáticamente _Fecha envío_ (hoy), _Fecha seguimiento_ (hoy + 7 días) y cambia el Estado a `🟡 Enviada`.
* **Función `verificarSeguimientos()`**: Corre diariamente (trigger a las 8am) y colorea las filas en rojo (vencidas) o amarillo (hoy/mañana). Envía un resumen formateado a Discord con las propuestas que requieren acción. Fallback a email si Discord falla.
* **Función `setupTrackerTrigger()`**: Configura el trigger diario una sola vez. Elimina triggers anteriores duplicados automáticamente.
* **Corrección de contexto `getUi()`**: Se reemplazaron todos los `SpreadsheetApp.getUi().alert()` por `Logger.log()` dentro de las funciones de setup, ya que `getUi()` solo está disponible cuando se ejecuta desde el menú de la hoja, no desde el editor de Apps Script.

### 2. Catálogo de Colegios — Nuevos colegios publicados
Se completaron los paquetes y se activó la visibilidad (`publicar`) en `precios.json` para:
* **`chor`** — La Chorrera: paquetes agregados.
* **`clia`** — Chiara Lubich: paquetes agregados + `clia_propuesta.json` creado.
* **`ofxd`** / **`oxbg`** — Oxford (dos colegios): paquetes agregados.
* **`sagu`** — San Agustín (solo Kinder): paquetes agregados.

### 3. Limpieza de Textos Genéricos
* El portafolio `lasa` fue renombrado de _"Nuestro trabajo en La Salle"_ a **"Nuestro trabajo previo"** en `propuesta/portafolios/lasa/manifest.json` para que sirva como portafolio genérico reutilizable por otros colegios.

---

## ✅ Logros Técnicos de Sesiones Anteriores

### 4. Refactorización Estética Premium (Design Handoff — 50% CSS Base)
* **Tokens de Diseño en `:root`**: Se implementó una arquitectura CSS moderna en `propuesta/css/style.css` gobernada por variables CSS.
* **Tipografía Editorial**: `Playfair Display` (itálicas expresivas para títulos) y `Outfit` (alta legibilidad para cuerpo).
* **Mobile-First**: Layout reestructurado para verse impecable en dispositivos móviles (WhatsApp) y adaptarse a escritorio.

### 5. Migración Dinámica y DRY de Precios (100% Completado)
* **Single Source of Truth (`precios.json`)**: Eliminamos la redundancia de precios y entregables en todo el ecosistema.
* **Tabla Comparativa Dinámica**: El generador en `propuesta/js/app.js` renderiza celdas dinámicamente desde `precios.json` en layout CSS Grid.
* **Control de Inclusiones por Escuela**: El campo `fotos_familiares` (booleano) activa/desactiva fotos familiares por colegio.

### 6. Integración de CRM Local "Pulso" y Generación de Links (Fase 2)
* **Exportador CSV en Hub**: filtra reservas por colegio/salón y devuelve CSV para Pulso.
* **`[link_onboarding]` Variable**: Pulso genera el `student_id` e inyecta la URL del cuestionario automáticamente.

### 7. Dashboard Local v2.0
* Sincronización directa desde Google Sheets via `getStudents`.
* Selector de colegio alimentado en tiempo real desde `precios.json`.

---

## 📂 Archivos Modificados (esta sesión)

* `onboarding/apps-script/MMR_brochures_hub_v4.0.gs` — Hub v4.0 con módulo Tracker completo.
* `onboarding/data/precios.json` — Colegios `chor`, `clia`, `ofxd`, `oxbg`, `sagu` activos.
* `propuesta/data/clia_propuesta.json` — **[NUEVO]** Propuesta Chiara Lubich.
* `propuesta/portafolios/lasa/manifest.json` — Título cambiado a "Nuestro trabajo previo".
* `ARCHITECTURE.md`, `DEVELOPMENT.md`, `MIGRATION-GUIDE.md`, `SESSION-HANDOFF.md` — Documentación actualizada.

---

## 🗺️ Cómo funciona el Tracker (resumen operacional)

El tab **"Propuestas"** en Google Sheets es un **CRM manual** para seguimiento de acuerdos con directores/coordinadores de colegios. **No se llena automáticamente desde ningún formulario web** — las filas se agregan a mano. La automatización opera así:

1. **Agregar fila manualmente**: Escuela, contacto, zona, tipo de sesión, etc.
2. **Marcar envío**: Seleccionar fila → Menú "📸 Mi Mejor Retrato" → "✅ Marcar fila como Enviada hoy" → llena J (fecha envío), K (hoy+7) y L (🟡 Enviada) automáticamente.
3. **Alertas diarias automáticas**: A las 8am el script colorea filas vencidas 🔴 o próximas 🟡 y envía resumen a Discord.
4. **Actualizar estado manualmente**: Cambiar columna L a 🟢 En conversación / ✅ Confirmada / ❌ Rechazada.

---

## 🛠️ Pendientes de Configuración (usuario)

El archivo `MMR_brochures_hub_v4.0.gs` tiene tres constantes que **deben reemplazarse** con los valores reales antes de que el Tracker funcione:

```javascript
var SHEET_ID        = 'VER_APPS_SCRIPT'; // ← ID del Google Sheet (en la URL: /d/<ID>/)
var AT_TOKEN        = 'VER_APPS_SCRIPT'; // ← Token personal de Airtable
var DISCORD_WEBHOOK = 'VER_APPS_SCRIPT'; // ← URL del webhook de Discord
```

Después de reemplazar, ejecutar **una sola vez** en el editor de Apps Script:
1. `setupPropostasSheet()` — crea/formatea la pestaña "Propuestas".
2. `setupTrackerTrigger()` — activa el trigger diario a las 8am.

---

## 🔭 Siguientes Pasos (Fase 3)

1. **Generador de Hojas de Ruta PDF** — `herramientas/generador_pdf.html`: exportar agenda de cada salón en formato imprimible 8.5x11.
2. **Módulo de Códigos QR**: QR con `student_id`, escuela, salón y nombre para identificación ágil en Lightroom.
3. **Verificación de Envíos**: Testear submit → Airtable con el esquema actual.
4. **Propuestas adicionales**: Completar `port` y `pana` si son prioritarias para la temporada.
