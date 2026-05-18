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

---

## 1. Crear una nueva Propuesta Comercial (B2B)

El sistema de Propuestas (`/propuesta/`) utiliza un **Modelo Híbrido Estático/Dinámico** altamente optimizado para conversión visual y lectura rápida (skimmability).

```bash
# 1. Agregar el código de la escuela y año en data/escuelas.json (ej: "lasa", 26)
# 2. Configurar los precios en data/precios.json (visibilidad: "publicar")
# 3. Crear el archivo propuesta/data/{code}_propuesta.json con el texto y logística específica.
# 4. Abrir en Live Server con la URL: http://127.0.0.1:5500/propuesta/index.html?brochure={code}-{yy}
# 5. En producción, la URL limpia mapeada en Vercel será: /propuesta/{code}-{yy}
```

### Reglas de Diseño de la Propuesta (Estilo Editorial Premium)
* **CSS de Marca**: Todos los estilos se heredan del archivo unificado [propuesta/css/style.css](file:///d:/mmr_studio/01_core_apps/website/propuesta/css/style.css). Cualquier ajuste estético debe usar los tokens declarados en `:root`.
* **Formulario Eliminado**: Se eliminó el formulario de contacto largo en favor de un botón directo de WhatsApp. El copy final `"Los niños cambian muy rápido..."` se inyecta directamente antes del botón de WhatsApp.
* **Tabla de Precios Comparativa**: Para máxima robustez, se utiliza una tabla HTML nativa (`<table class="pricing-table">`) con scroll horizontal suave en móviles (`.pricing-table-wrapper`), la cual muestra todos los paquetes de un vistazo sin colapsar.

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

## Debugging local en Consola (F12)

En entorno de desarrollo local, el sistema expone herramientas en el objeto global `window`:

```js
window.appState.debug()         // Devuelve el estado cargado en memoria (colegio, precios, etc.)
window.appStorage.clearCache()  // Limpia la caché local de los JSONs para forzar descarga fresca
config.debug()                  // Muestra la configuración de endpoints activa
```

---

## Checklist antes de publicar una Propuesta
- [ ] Código y año agregados en `data/escuelas.json`
- [ ] Precios configurados y en estado `"visibilidad": "publicar"` en `data/precios.json`
- [ ] Archivo `[code]_propuesta.json` creado en la carpeta `propuesta/data/` con la logística correcta
- [ ] El título dinámico de la propuesta carga el nombre del colegio y año correctamente
- [ ] El botón de WhatsApp tiene el número y mensaje de inicio correctos
- [ ] Las fotos del portafolio cargan fluidamente desde la ruta de archivos correspondiente
- [ ] Sin errores en la consola del navegador (`F12`)
