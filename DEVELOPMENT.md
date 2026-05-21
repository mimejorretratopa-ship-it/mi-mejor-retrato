# Guía de Desarrollo — Ecosistema Mi Mejor Retrato

## Setup en 60 segundos

**Prerrequisitos:** VS Code + extensión [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)

```bash
# No hay nada que instalar. Todo es HTML/CSS/JS nativo.
code "d:\mmr_studio\01_core_apps\website"
```

1. Click derecho en `index.html` en VS Code
2. Seleccionar **"Open with Live Server"**
3. Navegar a `http://127.0.0.1:5500/index.html?brochure=ebrv-26`

> ⚠️ **Importante:** abrir como archivo local `file://` NO funciona debido a políticas de seguridad CORS de los navegadores — `fetch()` requiere un servidor HTTP (servido por Live Server).

> 📌 El Hub de Google Apps Script se encuentra en `onboarding/apps-script/MMR_brochures_hub_v4.0.gs`. Copiar su contenido al editor de Apps Script antes de ejecutar cualquier función de setup.

---

## 1. Flujo Completo: Publicar Propuesta (B2B) y Onboarding (B2C)

El sistema requiere configurar tanto la experiencia comercial para el colegio (Brochure) como el portal de reservas para los padres (Onboarding).

### Paso 1: Registrar el Colegio (Usando el Dashboard)
No edites `precios.json` a mano.
1. Abre `admin/index.html` con Live Server.
2. Haz clic en el botón **`➕ Agregar Colegio`** en la parte inferior del menú lateral izquierdo.
3. Ingresa el código único de 4 letras minúsculas (ej: `lasa`) y el nombre completo de la institución.
4. El colegio se creará y se seleccionará automáticamente en la interfaz.

### Paso 2: Configurar Identidad, Precios y Visibilidad
1. Selecciona tu colegio en la barra lateral del panel de administración.
2. Configura los metadatos comerciales en la sección **Identidad del Colegio**:
   * **Nombre Comercial** (ej: *Colegio La Salle*)
   * **Años Activos** (ej: *26*)
   * **ID de Google Analytics 4** (ej: *G-6H4H52RL0T*)
3. Cambia el Estado a **"🟢 Publicar"**, **"🔴 Ocultar"** o **"🟡 Pendiente"** en la esquina superior derecha.
4. Añade y configura los paquetes visualmente (asegúrate de encender/apagar la opción de Fotos Familiares y configurar la tabla comparativa según aplique).
5. **Autoguardado Inteligente:** ¡Ya no tienes que preocuparte por perder datos! El panel guarda de manera automática e invisible lo que edites al cambiar de colegio o al hacer clic en el botón verde inferior.
6. Haz clic en el botón verde inferior **`Descargar precios.json actualizado`** para bajar tu archivo corregido y guárdalo en `onboarding/data/precios.json` reemplazando el anterior.

### Paso 3: Crear Configuración B2C (Onboarding)
Duplica un archivo existente en `onboarding/data/` (ej: `lasa_secciones.json`) y renómbralo a `{code}_secciones.json`.
Ajusta los horarios, las fechas límites y los salones disponibles.

### Paso 4: Crear Configuración B2B (Brochure Comercial)
Duplica un archivo existente en `propuesta/data/` (ej: `lasa_propuesta.json`) y renómbralo a `{code}_propuesta.json`.
Ajusta la logística, fechas y el copy específico que leerá la directiva del colegio.

### Paso 5: Probar Localmente
* **Brochure:** `http://127.0.0.1:5500/propuesta/index.html?brochure={code}-{yy}`
* **Onboarding:** `http://127.0.0.1:5500/onboarding/index.html?brochure={code}-{yy}`

### Paso 6: Lanzamiento (Outreach con Pulso)
Usa **Pulso** (`herramientas/wassap-crm/index.html`) para crear campañas masivas de WhatsApp.
* **Exporta los leads:** En tu Google Sheets, ve a `Mi Mejor Retrato > 📤 Exportar para Pulso`. Selecciona el colegio y salón, y descarga el archivo.
* **Importa:** Arrastra el archivo CSV descargado a la sección de Listas en Pulso.
* **Envía:** Crea una campaña y usa la variable `[link_onboarding]` en tus plantillas. Pulso generará de forma automática el enlace a `onboarding/cuestionario.html` inyectando el `student_id`.

### Paso 7: Registrar la propuesta en el Tracker B2B
Después de enviar la propuesta al director/coordinador:
1. Abre tu Google Sheet y ve a la pestaña **`Propuestas`**.
2. Agrega una fila con los datos del colegio (Escuela, Código, Contacto, etc.).
3. Con la fila seleccionada, usa el menú **`📸 Mi Mejor Retrato → ✅ Marcar fila como Enviada hoy`**.
4. El script llenará automáticamente la fecha de envío (hoy) y la fecha de seguimiento (hoy + 7 días).
5. Recibirás una alerta en Discord si hay seguimientos vencidos o próximos cada mañana a las 8am.

### Reglas de Diseño de la Propuesta (Estilo Editorial Premium)
* **CSS de Marca**: Todos los estilos se heredan del archivo unificado [propuesta/css/style.css](file:///d:/mmr_studio/01_core_apps/website/propuesta/css/style.css). Cualquier ajuste estético debe usar los tokens declarados en `:root`.
* **Formulario Eliminado**: Se eliminó el formulario de contacto largo en favor de un botón directo de WhatsApp. El copy final `"Los niños cambian muy rápido..."` se inyecta directamente antes del botón de WhatsApp.
* **Tabla de Precios Comparativa Dinámica**: La tabla utiliza una implementación moderna en **CSS Grid** (`.pt-grid`) con scroll horizontal suave en móviles (`.pricing-table-wrapper`). No hay código HTML hardcodeado para los entregables ni precios de los paquetes; todo se inyecta dinámicamente desde `precios.json`.
* **Consistencia Visual con Onboarding**: La sección de paquetes de la pantalla de onboarding (`onboarding/index.html`) utiliza exactamente el mismo componente de tabla comparativa, logrando coherencia de diseño a lo largo del embudo del cliente (B2B -> B2C).

---

## 2. Configuración de Google Analytics en Producción

### Integración de GA4
El script estándar de Google Analytics 4 (GA4) está integrado activamente en la aplicación con el ID de medición en producción (`G-6H4H52RL0T`).

### Estrategia Multi-Propuesta y Títulos Legibles
Para medir de forma individualizada el comportamiento en las múltiples propuestas comerciales y asegurar que los reportes sean fáciles de leer y segmentar en GA4:
1. **Librería asíncrona:** El script base se carga en el `<head>` del HTML (`propuesta/index.html`), pero **no dispara el hit inicial**.
2. **URLs limpias de Vercel:** Vercel usa URLs limpias (ej. `/propuesta/lasa-26`). La aplicación intercepta el tráfico y parsea este slug correctamente, evitando que las métricas colapsen bajo parámetros `?brochure=` inválidos.
3. **Disparo dinámico:** En `js/app.js`, el sistema consulta el nombre del colegio, actualiza la pestaña del navegador (`document.title = "Propuesta: Colegio La Salle"`) y entonces dispara el hit `page_view` (`gtag('config')`) hacia Analytics.
4. **Claridad en reportes:** Gracias a esto, los reportes mostrarán directamente el nombre comercial (ej. `Propuesta: Tu Sesión de Retrato`) y la dimensión `school_id`.

---

## 3. Configuración del Tracker B2B (una sola vez)

Antes de usar el tracker, asegúrate de:
1. Haber reemplazado las tres constantes en `MMR_brochures_hub_v4.0.gs`:
   * `SHEET_ID` — ID de tu Google Sheet (extraer de la URL).
   * `AT_TOKEN` — Token de Airtable (en Airtable Account Settings).
   * `DISCORD_WEBHOOK` — URL del webhook del canal donde llegan las alertas.
2. Copiar el contenido del archivo al editor de Apps Script y guardar.
3. Ejecutar `setupPropostasSheet()` — crea la pestaña `Propuestas` con todo el formato.
4. Ejecutar `setupTrackerTrigger()` — activa el trigger diario a las 8am.

> ⚠️ Estas funciones deben ejecutarse desde el **editor de Apps Script**, no desde el menú de la hoja (ya que el menú usa `getUi()` que no está disponible en ese contexto). La función `marcarEnviadaHoy()` sí debe ejecutarse **desde el menú de Google Sheets**.

---

## Debugging local en Consola (F12)

En entorno de desarrollo local, el sistema expone herramientas en el objeto global `window`:

```js
window.appState.debug()         // Devuelve el estado cargado en memoria (colegio, precios, etc.)
window.appStorage.clearCache()  // Limpia la caché local de los JSONs para forzar descarga fresca
config.debug()                  // Muestra la configuración de endpoints activa
```

---

## Checklist de Publicación (B2B + B2C)
- [ ] **1. Core:** Colegio registrado en `onboarding/data/precios.json` usando el **Dashboard Admin** (`admin/index.html`)
- [ ] **2. Precios:** Configurados y en `"visibilidad": "publicar"` usando el **Dashboard Admin** (`admin/index.html`)
- [ ] **3. B2C (Padres):** Archivo `[code]_secciones.json` creado en `onboarding/data/` con horarios y logística B2C
- [ ] **4. B2B (Directiva):** Archivo `[code]_propuesta.json` creado en `propuesta/data/` con el copy B2B
- [ ] **5. UX:** El título dinámico de la propuesta carga el nombre del colegio correctamente en la pestaña
- [ ] **6. Conversión:** El botón de WhatsApp tiene el número y mensaje de inicio correctos
- [ ] **7. QA:** Sin errores en la consola del navegador (`F12`) al cargar ambas rutas en local
- [ ] **8. Tracker:** Fila agregada en la pestaña `Propuestas` del Google Sheet y marcada como Enviada
