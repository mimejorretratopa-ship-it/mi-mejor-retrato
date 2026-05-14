# Arquitectura — Mi Mejor Retrato School Proposals

## Principio central

> El HTML no sabe a qué colegio sirve. Se autoconfigura leyendo su propio nombre de archivo.

Un solo HTML funciona para cualquier escuela/año porque **todo el contenido viene de JSONs**. Agregar un nuevo brochure es copiar el archivo y cambiarle el nombre.

---

## Capas del sistema

```
┌─────────────────────────────────────────────────────┐
│                   HTML (View)                        │
│  ebrv-26.html, clia-26.html, ...                    │
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

```
ebrv-26.html
     │
     ▼
extractBrochureConfig()
     │ filename.match(/([a-z]{4})-(\d{2})\.html/)
     ▼
{ code: 'ebrv', year: 26, id: 'ebrv-26' }
     │
     ▼
escuelas.json → busca code === 'ebrv'
     │
     ▼
state.set('brochure', { code, year, id, schoolName })
     │
     ▼
todos los módulos leen state.get('brochure')
```

**Implicación práctica:** copiar `ebrv-26.html` a `sabi-26.html` crea un brochure completamente distinto sin editar nada.

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
state.get('brochure')  // { code, year, id, schoolName, gaId }
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
  ├── 1. initBrochure()    → carga escuelas.json, setea state.brochure
  ├── 2. loadAppData()     → carga formulario + precios + secciones en paralelo
  ├── 3. seccionesModule.init()   → muestra/oculta secciones del DOM
  ├── 4. Promise.all([            → renderizado paralelo
  │       galeriasModule.init()
  │       paquetesModule.render()
  │       ubicacionModule.render()
  │       formModule.init()
  │     ])
  ├── 5. initReveal()      → IntersectionObserver para animaciones
  └── 6. initAnalytics()   → carga registro.json, inicializa GA
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
| `escuelas.json` | Al agregar un colegio nuevo |
| `precios.json` | Al cambiar precios o paquetes |
| `formulario.json` | Al agregar/quitar campos del formulario |
| `{code}_secciones.json` | Al activar/desactivar secciones por escuela |
| `registro.json` | Al crear un nuevo brochure (bitácora manual) |

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
