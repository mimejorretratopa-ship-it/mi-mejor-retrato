# Mi Mejor Retrato — Guía de arquitectura y deploy
*Fotografía escolar de kinder · La Chorrera, Panamá*

---

## Estructura de archivos

```
mi-mejor-retrato/
├── index.html          ← HTML principal (esqueleto semántico)
├── netlify.toml        ← Config de deploy (sin build step)
├── css/
│   └── styles.css      ← Todo el CSS (extraído del HTML original)
├── js/
│   ├── config.js       ← ★ Única fuente de verdad — editar aquí primero
│   ├── storage.js      ← Adapter de localStorage (reemplazable por Supabase)
│   ├── state.js        ← Estado global compartido entre módulos
│   ├── api.js          ← Adapter de comunicación con backend
│   ├── form.js         ← Lógica del formulario (usa api.js, no fetch directo)
│   └── ui.js           ← Interacciones visuales (reveal, FAQ)
└── fotos/              ← (crear cuando tengas imágenes reales)
    └── .gitkeep
```

---

## Arquitectura en capas

```
HTML (index.html)
  └── CSS (styles.css)          ← Solo estilos, sin lógica
  └── JS/config.js              ← Constantes y feature flags
      └── JS/storage.js         ← Persistencia (localStorage → Supabase)
          └── JS/state.js       ← Estado compartido entre módulos
              └── JS/api.js     ← Comunicación exterior (fetch)
                  ├── JS/form.js    ← Formulario (usa api.js)
                  └── JS/ui.js      ← UI pura (scroll reveal, FAQ)
```

**Regla de oro:** la UI nunca toca `localStorage` directamente.
Toda la app lee/escribe datos solo a través de `Storage.*` o `Api.*`.

---

## Pasos de migración desde el HTML original

### Paso 1 — Copia los archivos
```bash
# Reemplaza tu index.html anterior con la nueva carpeta completa
# No hay npm, no hay node_modules, no hay build
```

### Paso 2 — Configura tu número de WhatsApp
Abre `js/config.js` y edita:
```js
WHATSAPP_NUMBER: '50760001234',  // Tu número real sin + ni espacios
```

### Paso 3 — Verifica en Live Server
Abre `index.html` con Live Server de VS Code.
El formulario funciona en modo desarrollo: guarda en localStorage y simula éxito.
Revisa en DevTools → Application → Local Storage para ver los envíos guardados.

### Paso 4 — Agrega imágenes reales
1. Crea carpeta `fotos/`
2. Agrega tus fotos: `foto-01.jpg`, `foto-02.jpg`, etc.
3. En `index.html`, descomenta los `<img>` y elimina los `.galeria-placeholder`

### Paso 5 — Conecta el formulario a un backend real

**Opción A — Formspree (5 minutos):**
1. Crea cuenta en [formspree.io](https://formspree.io)
2. Crea un formulario, copia tu ID
3. En `config.js`: `FORM_ENDPOINT: 'https://formspree.io/f/TU_ID'`
4. Listo. Sin tocar `form.js` ni `api.js`.

**Opción B — Make/Zapier webhook:**
1. Crea escenario con Webhook trigger en Make
2. En `config.js`: `FORM_ENDPOINT: 'https://hook.make.com/TU_WEBHOOK'`
3. Make recibe `{ nombre, celular, escuela, mensaje }` y los enruta donde quieras

**Opción C — Netlify Functions:**
1. Crea `/netlify/functions/contacto.js`
2. En `config.js`: `FORM_ENDPOINT: '/.netlify/functions/contacto'`
3. Ver plantilla de función abajo

---

## Cómo testear localmente

**Con Live Server (VS Code):**
```
1. Instala extensión "Live Server" en VS Code
2. Click derecho en index.html → "Open with Live Server"
3. Se abre en http://127.0.0.1:5500
4. Cualquier cambio en CSS o JS se refleja automáticamente
```

**Verificar el formulario en desarrollo:**
```
1. Llena el formulario y envía
2. Abre DevTools (F12) → Application → Local Storage → 127.0.0.1:5500
3. Busca la key: mmr_form_historial
4. Ahí ves todos los envíos guardados localmente
```

**Ver logs de debug:**
```
CONFIG.DEBUG = true  →  todos los módulos loggean en consola con prefijo [Storage], [Api], [State]
```

---

## Deploy en Netlify

### Primera vez:
```
1. Sube la carpeta a GitHub (sin node_modules, sin .env)
2. Ve a netlify.com → "Add new site" → "Import an existing project"
3. Conecta tu repo de GitHub
4. Publish directory: .  (punto — la raíz)
5. Build command: (dejar vacío)
6. Deploy site
```

### Deploys siguientes:
```
git add .
git commit -m "descripción del cambio"
git push
# Netlify detecta el push y redeploya automáticamente en ~30 segundos
```

### Variables de entorno en Netlify (si usas Functions):
```
Site settings → Environment variables → Add variable
Nunca pongas API keys directamente en config.js si el repo es público.
```

---

## Plantilla de Netlify Function (para el futuro)

Crea `/netlify/functions/contacto.js`:

```js
// netlify/functions/contacto.js
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    // Aquí: enviar email, guardar en Supabase, notificar por Slack, etc.
    console.log('Contacto recibido:', data);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
```

En `config.js`: `FORM_ENDPOINT: '/.netlify/functions/contacto'`

---

## Migración futura a Supabase

Solo necesitas modificar `js/storage.js`.
La firma de los métodos (`get`, `set`, `remove`, `list`) permanece igual.
Ningún otro archivo cambia.

```js
// js/storage.js — versión Supabase (reemplaza el contenido actual)
const Storage = (() => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  return {
    async set(name, value) {
      await supabase.from('storage').upsert({ key: name, value });
    },
    async get(name) {
      const { data } = await supabase.from('storage').select('value').eq('key', name).single();
      return data?.value ?? null;
    },
    // ...
  };
})();
```

---

## Qué cambió y por qué

| Antes | Después | Beneficio |
|-------|---------|-----------|
| CSS inline en `<style>` del HTML | `css/styles.css` externo | Cacheable, editable por separado |
| `fetch()` directamente en el `<script>` del HTML | `api.js` → `Api.enviarContacto()` | Cambiar backend = editar 1 línea en config.js |
| `localStorage` accedido directamente | `Storage.get/set()` | Migración a Supabase sin tocar UI |
| Variables sueltas (`form`, `msgExito`, `msgError`) | `State.get/set()` + módulo `form.js` | Estado predecible, sin bugs de variable global |
| Todo en un solo `<script>` de 70 líneas | 5 archivos con responsabilidades claras | Fácil de debuggear, fácil de extender |
| Número de WhatsApp hardcodeado en 4 lugares | `CONFIG.WHATSAPP_NUMBER` en config.js | Cambiar el número = editar 1 línea |

---

*Arquitectura diseñada para: mínima fricción · máxima mantenibilidad · deploy en Netlify sin build step*
