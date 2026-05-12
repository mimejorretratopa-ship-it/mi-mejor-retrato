# Guía de Migración — De JSONs estáticos a Backend real

## Estado actual

```
Frontend (Netlify static)
    └── storage.js
            ├── fetchFromAPI()  → fetch('/data/archivo.json')  ← HOY
            └── postToAPI()     → localStorage / download JSON ← HOY
```

## Estado objetivo

```
Frontend (Netlify static)
    └── storage.js
            ├── fetchFromAPI()  → fetch('https://api.../endpoint') ← FUTURO
            └── postToAPI()     → fetch('/.netlify/functions/...')  ← FUTURO
```

**La UI no cambia. Solo cambian las dos funciones privadas en `storage.js`.**

---

## Qué archivos tocar en la migración

| Archivo | Cambio necesario |
|---------|-----------------|
| `lib/storage.js` | Reescribir `fetchFromAPI()` y `postToAPI()` |
| `config/brochure-config.js` | Actualizar `endpoints.*` con URLs reales |
| `netlify/functions/*` | Implementar las funciones de backend |
| Todo lo demás | **Sin cambios** |

---

## Paso 1 — Migrar el formulario a Netlify Functions

### Qué hace hoy `postToAPI()`

En producción ya intenta hacer POST a `/.netlify/functions/submit-form`.  
Si falla, descarga el JSON localmente como fallback.

### Crear la Netlify Function

```js
// netlify/functions/submit-form.js
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const data = JSON.parse(event.body);
  
  // Aquí: guardar en Supabase, Airtable, Google Sheets, etc.
  // Por ejemplo con Supabase:
  // await supabase.from('submissions').insert(data);
  
  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, id: Date.now() })
  };
};
```

### Ajustar `storage.js` — eliminar el mock de dev

```js
// ANTES (storage.js línea ~70):
async function postToAPI(endpoint, data) {
  if (window.location.hostname === 'localhost') {
    console.log('[DEV] Guardado simulado:', endpoint, data);
    return { ok: true, id: Date.now() };  // ← ELIMINAR este bloque
  }
  // ...
}

// DESPUÉS:
async function postToAPI(endpoint, data) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return await response.json();
}
```

---

## Paso 2 — Migrar JSONs a una API o base de datos

### Escenario: los JSONs se vuelven dinámicos (CMS o base de datos)

**Opción A — Supabase (recomendada)**

```js
// storage.js — reemplazar fetchFromAPI()
async function fetchFromAPI(resource) {
  const { data, error } = await supabase
    .from(resource)  // 'precios', 'escuelas', etc.
    .select('*');
  if (error) throw error;
  return data;
}
```

**Opción B — Netlify Function como proxy**

```js
// storage.js — reemplazar fetchFromAPI()
async function fetchFromAPI(filename) {
  const resource = filename.replace('.json', '');
  const response = await fetch(`/.netlify/functions/get-data?resource=${resource}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
```

**Opción C — Mantener JSONs estáticos en CDN**

No requiere cambio en el código. Solo actualizar `config.endpoints.jsonBase`  
para apuntar a tu CDN en vez de `.`.

---

## Paso 3 — Notificaciones (Discord/WhatsApp)

Las funciones ya tienen placeholders en `config`:

```js
// config/brochure-config.js — ya configurado:
endpoints: {
  submitForm: '/.netlify/functions/submit-form',
  createContact: '/.netlify/functions/create-contact',
  notifyDiscord: '/.netlify/functions/notify-discord',
}
```

Y en `storage.js`:

```js
// Ya existen, solo necesitan la Function de backend:
await storage.createContact(contactData);
await storage.notifyDiscord(message);
```

Para activarlos: crear las Netlify Functions correspondientes y cambiar  
en `config/brochure-config.js`:

```js
features: {
  googleContacts: true,      // cambiar de false a true
  discordNotifications: true // cambiar de false a true
}
```

---

## Lo que NO cambia en la migración

- Todos los archivos HTML
- Todos los módulos en `/modules/`
- `lib/state.js`
- `lib/validators.js`
- `lib/utils.js`
- `brochure.css`
- La lógica de formulario
- La lógica de paquetes
- El sistema de secciones

---

## Señales de que la migración fue exitosa

```
[FETCH] precios.json      → [FETCH] /api/precios     ← log cambia
[DEV] Guardado simulado   → desaparece               ← mock eliminado
[ERROR] API error: 404    → nunca aparece             ← endpoints OK
```

---

## Opciones de backend recomendadas (en orden de menor a mayor esfuerzo)

| Opción | Esfuerzo | Ideal para |
|--------|----------|------------|
| Netlify Forms | 0 — ya incluido | formularios simples |
| Airtable via Zapier | Bajo | sin código de backend |
| Netlify Functions + Google Sheets | Medio | control total, sin DB |
| Netlify Functions + Supabase | Medio-Alto | escalabilidad futura |
| AWS Lambda + DynamoDB | Alto | si ya usas AWS |
