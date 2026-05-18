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
# 3. Abrir en Live Server con la URL: http://127.0.0.1:5500/propuesta/index.html?brochure={code}-{yy}
# 4. En producción, la URL limpia mapeada en Vercel será: /propuesta/{code}-{yy}
```

### Reglas de Diseño de la Propuesta (Estilo Editorial Premium)
* **CSS de Marca**: Todos los estilos se heredan del archivo unificado [propuesta/css/style.css](file:///d:/mmr_studio/01_core_apps/website/propuesta/css/style.css). Cualquier ajuste estético debe usar los tokens declarados en `:root`.
* **Formulario Eliminado**: Se eliminó el formulario de contacto largo en favor de un botón directo de WhatsApp. El copy final `"Los niños cambian muy rápido..."` se inyecta directamente antes del botón de WhatsApp.
* **Tabla de Precios Comparativa**: Para máxima robustez, se utiliza una tabla HTML nativa (`<table class="pricing-table">`) con scroll horizontal suave en móviles (`.pricing-table-wrapper`), la cual muestra todos los paquetes de un vistazo sin colapsar.

---

## 2. Configuración de Google Analytics en Producción

### Integración de GA4
El script estándar de Google Analytics 4 (GA4) está integrado en [propuesta/index.html](file:///d:/mmr_studio/01_core_apps/website/propuesta/index.html) y [propuesta/lasalletest.html](file:///d:/mmr_studio/01_core_apps/website/propuesta/lasalletest.html) de manera comentada:

```html
<!-- Google Analytics (Uncomment for production) -->
<!-- 
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
-->
```

### Estrategia Multi-Propuesta
Para medir de forma individualizada el comportamiento de delegados y colegios (`lasa-26`, `clia-26`, `sagu-26`, etc.) utilizando **una sola propiedad global de GA4**:
1. Descomente el bloque de GA4 y sustituya `G-XXXXXXXXXX` con su ID de Medición real.
2. GA4 rastreará automáticamente la ruta completa (`/propuesta/lasalletest.html` o `/propuesta/index.html?brochure=lasa-26`), permitiendo ver el desglose en el panel de **Páginas y pantallas**.
3. **Dimensión Personalizada**: Si desea segmentar con mayor facilidad en informes avanzados, configure la dimensión `school_slug` capturando el parámetro `brochure` de la URL en la inicialización:
   ```javascript
   const urlParams = new URLSearchParams(window.location.search);
   const brochureId = urlParams.get('brochure') || 'general';
   gtag('config', 'G-XXXXXXXXXX', {
     'school_slug': brochureId
   });
   ```

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
- [ ] El título dinámico de la propuesta carga el nombre del colegio y año correctamente
- [ ] El botón de WhatsApp tiene el número y mensaje de inicio correctos
- [ ] Las fotos del portafolio cargan fluidamente desde la ruta de archivos correspondiente
- [ ] Sin errores en la consola del navegador (`F12`)
