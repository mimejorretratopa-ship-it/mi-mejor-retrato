# Estándares de Código

> Estas reglas existen para que cualquier archivo del proyecto sea predecible, fácil de debuggear y fácil de mantener. La prioridad es siempre **claridad sobre cleverness**.

---

## La regla de oro

**Si tienes que pensar más de 5 segundos para entender qué hace una línea, está mal escrita.**

---

## Separación de responsabilidades

### Qué hace cada capa

| Capa | Responsabilidad | NO debe |
|------|----------------|---------|
| HTML | Estructura y placeholders | Tener lógica |
| `/modules/*.js` | Renderizar UI, manejar eventos | Acceder a storage directamente |
| `lib/state.js` | Centralizar el estado en runtime | Hacer fetch |
| `lib/storage.js` | Toda lectura/escritura externa | Manipular el DOM |
| `config/brochure-config.js` | Constantes y configuración | Tener lógica de negocio |
| `/data/*.json` | Contenido configurable | (son datos, no código) |

### Reglas absolutas

```js
// ✅ Un módulo pide datos al state
const pricing = state.get('pricing');

// ❌ Un módulo carga datos él mismo
const pricing = await fetch('/data/precios.json').then(r => r.json());
```

```js
// ✅ Storage es el único que toca fetch/localStorage
const data = await storage.loadJSON('precios.json');

// ❌ Fetch directo en cualquier otro archivo
const res = await fetch('/data/precios.json');
```

---

## Async/await — siempre, desde el inicio

Toda operación de datos es async, aunque hoy sea instantánea:

```js
// ✅ Correcto — preparado para migración
const items = await storage.loadJSON('precios.json');
await storage.saveSubmission(formData);

// ❌ Incorrecto — rompe la migración futura
const items = JSON.parse(localStorage.getItem('precios'));
```

**Razón:** cuando se migre a una API real, el código async no cambia. El síncrono sí.

---

## Nombrado de variables y funciones

```js
// ✅ Nombres que explican qué es o qué hace
const schoolCode = 'ebrv';
const currentPricing = state.helpers.getCurrentPricing();
async function renderPricingCards(pricingData) { }

// ❌ Nombres que no dicen nada
const x = 'ebrv';
const data = state.helpers.getCurrentPricing();
async function render(d) { }
```

### Convenciones

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Variables | camelCase | `schoolCode`, `formData` |
| Funciones | camelCase + verbo | `renderCards()`, `loadPricing()` |
| Constantes globales | camelCase (objeto) | `config.whatsapp` |
| IDs en HTML | kebab-case | `paquetes-grid`, `btn-enviar` |
| Clases CSS | kebab-case | `.paquete-card`, `.form-grid` |
| Archivos JSON | snake_case | `ebrv_secciones.json` |
| Archivos JS/HTML | kebab-case | `form-renderer.js`, `ebrv-26.html` |

---

## Estructura de un módulo

Todos los módulos siguen el mismo patrón IIFE con API pública:

```js
/**
 * NOMBRE DEL MÓDULO
 * ─────────────────────────────────────────
 * Una línea que explica qué hace.
 * 
 * DEPENDE DE: state, storage (si aplica)
 * EXPONE: miModulo.init(), miModulo.render()
 */
const miModulo = (() => {

  // ── FUNCIONES PRIVADAS ──────────────────
  function funcionPrivada() {
    // ...
  }

  // ── API PÚBLICA ─────────────────────────
  return {
    async init() {
      // punto de entrada principal
    },

    async render() {
      // si tiene renderizado separado
    }
  };
})();
```

### Reglas de módulos

- Un módulo = una responsabilidad
- Las funciones privadas van arriba del `return`
- La API pública va dentro del `return`
- El nombre del módulo termina en `Module`: `formModule`, `paquetesModule`

---

## Comentarios

```js
// ✅ Comenta el POR QUÉ, no el QUÉ
// Usamos Promise.all aquí porque los 3 JSONs son independientes
// y cargarlos en paralelo reduce el tiempo de carga ~60%
const [form, pricing, sections] = await Promise.all([...]);

// ❌ Comentario que solo repite el código
// Carga el formulario
const form = await storage.loadJSON('formulario.json');
```

```js
// ✅ Comentarios de navegación (útiles en archivos largos)
// ── FUNCIONES PRIVADAS ──────────────────────────────
// ── API PÚBLICA ─────────────────────────────────────
```

```js
// ✅ TODO con contexto
// TODO: cuando tengamos API real, reemplazar esta URL por config.endpoints.pricing
const url = '/data/precios.json';

// ❌ TODO sin contexto
// TODO: fix this
```

---

## Manejo de errores

```js
// ✅ Errores con contexto útil para debugging
try {
  const data = await storage.loadJSON('precios.json');
} catch (error) {
  console.error('[PAQUETES] No se pudieron cargar precios:', error);
  // Mostrar estado de error al usuario
  document.getElementById('paquetes-grid').innerHTML = '<p>Error al cargar precios.</p>';
}

// ❌ Errores silenciosos o sin contexto
try {
  const data = await storage.loadJSON('precios.json');
} catch (e) {
  console.log('error');
}
```

**Regla:** todo `catch` debe:
1. Loggear con prefijo del módulo
2. Hacer algo útil (mostrar error, usar fallback, etc.)

---

## Prefijos de log por módulo

Usar siempre el prefijo para poder filtrar en la consola:

```js
console.log('[APP] ...')       // orquestación principal
console.log('[FORM] ...')      // form-renderer.js
console.log('[PAQUETES] ...')  // paquetes.js
console.log('[GALERIAS] ...')  // galerias.js
console.log('[STORAGE] ...')   // storage.js
console.log('[STATE] ...')     // state.js
console.log('[ANALYTICS] ...')  // analytics.js
```

---

## Manejo del DOM

```js
// ✅ Verificar existencia antes de manipular
const el = document.getElementById('paquetes-grid');
if (el) el.innerHTML = renderCards(data);

// ❌ Asumir que el elemento existe
document.getElementById('paquetes-grid').innerHTML = renderCards(data);
```

```js
// ✅ Usar clases para mostrar/ocultar (ya definidas en brochure.css)
el.classList.add('hidden');
el.classList.remove('hidden');

// ❌ Manipular display directamente (excepto en HTML inicial)
el.style.display = 'none';
```

---

## JSONs de datos

- Usar `snake_case` para las claves: `school_code`, `fecha_creacion`
- Incluir siempre un bloque `metadata` con descripción y fecha de última actualización
- Los arrays de escuelas siempre usan `"code"` (4 letras minúsculas) como identificador único
- El campo `"visibilidad"` en precios solo acepta: `"publicar"` | `"pendiente"` | `"ocultar"`

---

## Qué NO hacer nunca

```js
// ❌ Variables globales sueltas
let FORM_DATA = null;           // usar state.get('form')
let currentSchool = {};         // usar state.get('brochure')

// ❌ localStorage directo fuera de storage.js
localStorage.setItem('data', JSON.stringify(data));

// ❌ fetch directo fuera de storage.js
const res = await fetch('/data/precios.json');

// ❌ Hardcodear strings que pueden cambiar
const number = '50767438951';   // usar config.whatsapp.photographerNumber
const gaId = 'G-XXXXXXXX';     // usar el de registro.json

// ❌ Funciones de más de ~30 líneas sin dividir
function initApp() {
  // 200 líneas...
}
```

---

## Agregar un nuevo JSON de datos

1. Crearlo en `/data/` con `snake_case` y extensión `.json`
2. Agregar la clave correspondiente en `lib/state.js` → `const store`
3. Cargarlo en `loadAppData()` dentro del `Promise.all`
4. Documentar en `ARCHITECTURE.md` qué contiene y cuándo editarlo

---

## Agregar un nuevo módulo

1. Crear `/modules/nuevo-modulo.js` siguiendo el patrón IIFE
2. Agregar `<script src="modules/nuevo-modulo.js">` en el HTML **antes** del script de inicialización
3. Llamarlo en el `Promise.all` de `initApp()` si es renderizado paralelo
4. Documentar sus dependencias en el comentario de cabecera del archivo
