# Arquitectura — Mi Mejor Retrato School Proposals

## Principio central

> El sistema no tiene archivos HTML por colegio. Un solo `index.html` lee la URL para saber qué datos mostrar.

Un solo HTML funciona para cualquier escuela/año porque **todo el contenido se define en los JSONs**. Agregar un nuevo brochure no requiere tocar código, solo agregar datos.

---

## Capas del sistema

```
┌─────────────────────────────────────────────────────┐
│                   HTML (View)                        │
│                   index.html                         │
│  — Único punto de entrada                            │
│  — Estructura semántica + placeholders               │
│  — NO lógica de negocio, NO fetch directo            │
└──────────────────────┬──────────────────────────────┘
                       │ llama a
┌──────────────────────▼──────────────────────────────┐
│                   MÓDULOS (/modules)                  │
│  form-renderer.js  paquetes.js  galerias.js          │
│  secciones.js      ubicacion.js  analytics.js        │
│  — Renderizado de UI                                  │
│  — Leen de state, llaman a storage                   │
└──────────────────────┬──────────────────────────────┘
                       │ usa
┌──────────────────────▼──────────────────────────────┐
│                   ESTADO (lib/state.js)               │
│  — Store centralizado en memoria                     │
│  — Fuente de verdad en runtime                       │
│  — Sin reactividad automática (simple a propósito)   │
└──────────────────────┬──────────────────────────────┘
                       │ poblado por
┌──────────────────────▼──────────────────────────────┐
│              PERSISTENCIA (lib/storage.js)            │
│  — ÚNICO punto de acceso a datos externos            │
│  — Adapter pattern: POST a Google Sheets & Discord   │
│  — Fallback: solo logs (descarga local desactivada)  │
└──────────────────────┬──────────────────────────────┘
                       │ lee / escribe
┌──────────────────────▼──────────────────────────────┐
│                   DATOS & BACKEND                    │
│  DATOS (JSON): escuelas, precios, secciones          │
│  BACKEND: Google Sheets (DB) + Discord (Alertas)     │
│  — Sin servidor propio (Serverless)                  │
└─────────────────────────────────────────────────────┘
```

---

## La regla más importante

**La UI nunca toca localStorage ni fetch directamente.**

```js
// ✅ CORRECTO — todo pasa por storage
const precios = await storage.loadJSON('precios.json');
await storage.saveSubmission(formData);

// ❌ PROHIBIDO — acoplamiento directo
localStorage.setItem('data', JSON.stringify(data));
const res = await fetch('/data/precios.json');
```

Esta regla es lo que permite migrar de JSONs estáticos a una API real **sin reescribir un solo módulo de UI**.

---

## Autoconfiguración del brochure

URL: /propuesta/ebrv-26
     │
     ▼
extractBrochureConfig()
     │ location.pathname.match(/([a-z]{4})-(\d{2})/)
     ▼
{ code: 'ebrv', year: 26, id: 'ebrv-26' }
     │
     ▼
escuelas.json → busca code === 'ebrv' && years.includes(26)
     │
     ▼
state.set('brochure', { code, year, id, schoolName, gaId, estado })
     │
     ▼
todos los módulos leen state.get('brochure')

**Implicación práctica:** no hay archivos HTML duplicados. El enrutamiento es dinámico basado en el slug de la URL.

### Inyección Dinámica de Contenido
Además de la configuración, el sistema inyecta strings dinámicos en el DOM durante `initBrochure()`:
- **Hero Title**: `Fotografía escolar · [Escuela] · [Año]`
- **Hero Proposal**: `Propuesta preparada para: [Escuela] [Año]` (debajo del subtítulo).
- **Page Title**: `Mi Mejor Retrato — [Escuela] [Año]`

---

## Adapter Pattern en storage.js

`storage.js` tiene dos funciones privadas clave que abstraen el transporte:

```js
// Hoy: fetch de archivo JSON estático
async function fetchFromAPI(filename) {
  const url = `${config.baseURL}/data/${filename}`;
  return await fetch(url).then(r => r.json());
}

// Hoy: simulado en dev, POST real en prod
async function postToAPI(endpoint, data) {
  if (isDev) return { ok: true, id: Date.now() }; // mock
  return await fetch(endpoint, { method: 'POST', body: JSON.stringify(data) });
}
```

Para migrar a una API real: **solo se reescriben estas dos funciones**. Los módulos de UI no cambian.

---

## Estado global (state.js)

El state tiene claves fijas y predecibles:

```js
state.get('brochure')  // { code, year, id, schoolName, gaId, estado }
state.get('form')      // definición del formulario (formulario.json)
state.get('pricing')   // precios por escuela (precios.json)
state.get('sections')  // secciones activas (ebrv_secciones.json)
state.get('schools')   // catálogo de colegios (escuelas.json)
state.get('ui')        // { formLoading, pricingLoading, sectionsLoading }
```

Regla: **si un módulo necesita datos, los pide a `state`, no los carga él mismo**.

---

## Flujo de inicialización

```
initApp()
  ├── 1. initBrochure()    → carga escuelas.json, valida slug, setea state.brochure
  ├── 2. loadAppData()     → carga formulario + precios + secciones en paralelo
  ├── 3. seccionesModule.init()   → muestra/oculta secciones del DOM
  ├── 4. Promise.all([            → renderizado paralelo
  │       galeriasModule.init()
  │       paquetesModule.render()
  │       ubicacionModule.render()
  │       formModule.init()
  │     ])
  ├── 5. initReveal()      → IntersectionObserver para animaciones
  └── 6. initAnalytics()   → usa gaId de state.brochure, inicializa GA
```

---

## Configuración centralizada (config/brochure-config.js)

Un único objeto `config` expone:

| Sección | Qué contiene |
|---------|-------------|
| `config.isDev / isProd` | detección de ambiente |
| `config.endpoints` | URLs del Google Apps Script Hub |
| `config.whatsapp` | número y template de mensaje |
| `config.analytics` | GA ID por defecto y nombres de eventos |
| `config.ui` | duración de animaciones, thresholds |
| `config.validation` | reglas de validación de campos |
| `config.features` | feature flags (googleContacts, discord, etc.) |
| `config.messages` | textos de error y éxito |

**Regla:** cualquier string que pueda cambiar va en `config`, no hardcodeado.

---

## JSONs de datos — responsabilidad de cada uno

| Archivo | Editado cuándo |
|---------|---------------|
| `escuelas.json` | Al agregar un colegio nuevo o año activo (incluye ga_id) |
| `precios.json` | Al cambiar precios o paquetes |
| `formulario.json` | Al agregar/quitar campos del formulario |
| `{code}_secciones.json` | Al activar/desactivar secciones (layout) por escuela |

---

## 🏛️ La Regla de Oro de Visibilidad

Para evitar conflictos entre el diseño y la lógica de negocio, se ha dividido la autoridad:

1.  **Layout (ON/OFF)** → Se controla en `*_secciones.json`. Si una sección como `faq` o `sobre_mike` debe desaparecer, se usa `activo: false` allí.
2.  **Lógica de Paquetes (Precios)** → Se controla ÚNICAMENTE en `precios.json` mediante el campo `visibilidad`.
    *   `publicar`: Todo visible.
    *   `pendiente`: Muestra aviso de "coordinando precios".
    *   `no_publicar`: Oculta la sección pero permite enviar el formulario con el paquete #1 preseleccionado.

Esta separación garantiza que el `paquetes.js` pueda manejar lógica compleja de ventas sin interferir con el `secciones.js` que solo apaga interruptores.

---

---

## Qué NO existe aquí (a propósito)

| Ausente | Por qué |
|---------|---------|
| Build step / bundler | Fricción innecesaria para apps estáticas simples |
| TypeScript | Overhead para un proyecto de un solo dev |
| Framework (React/Vue) | El DOM manipulation manual es suficiente y más debuggeable |
| Estado reactivo complejo | La inicialización secuencial es más predecible |
| Testing automatizado | Complejidad no justificada para este escenario |

La complejidad se agrega **cuando el problema lo exige**, no antes.
