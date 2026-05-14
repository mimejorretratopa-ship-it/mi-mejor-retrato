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
| HTML | Estructura y placeholders (index.html único) | Tener lógica de negocio |
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
| Archivos JS/HTML | kebab-case | `form-renderer.js`, `index.html` |

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

---

## Manejo de errores

**Regla:** todo `catch` debe:
1. Loggear con prefijo del módulo
2. Hacer algo útil (mostrar error, usar fallback, etc.)

---

## Manejo del DOM

```js
// ✅ Verificar existencia antes de manipular
const el = document.getElementById('paquetes-grid');
if (el) el.innerHTML = renderCards(data);

// ✅ Usar clases para mostrar/ocultar (ya definidas en brochure.css)
el.classList.add('hidden');
el.classList.remove('hidden');
```

---

## Qué NO hacer nunca

- No usar variables globales sueltas.
- No usar `localStorage` o `fetch` directo fuera de `storage.js`.
- No hardcodear strings que pueden cambiar (usar `config`).
- No crear funciones de más de ~30 líneas sin dividir.
