# Guía de Desarrollo

## Setup en 60 segundos

**Prerrequisitos:** VS Code + extensión [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)

```bash
# No hay nada que instalar.
code "mmr_schools_proposals 1.5 - antigravity"
```

1. Click derecho en `index.html` en VS Code
2. Seleccionar **"Open with Live Server"**
3. Navegar a `http://127.0.0.1:5500/index.html?brochure=ebrv-26`

> **Importante:** abrir como `file://` NO funciona — `fetch()` requiere un servidor HTTP.

---

## Crear un nuevo brochure

```bash
# 1. Agregar el código de la escuela y año en data/escuelas.json
# 2. Crear data/{code}_secciones.json (copiar de ebrv_secciones.json y ajustar)
# 3. Configurar precios en data/precios.json (visibilidad: "publicar")
# 4. Abrir en Live Server con el parámetro ?brochure={code}-{yy}
# 5. En producción, la URL será: /propuesta/{code}-{yy}
```

El sistema es ahora **URL-driven**. Ya no necesitas copiar archivos HTML.

---

## Debugging

En `localhost`, el sistema expone en `window`:

```js
// Consola del navegador (F12)
window.appState.debug()         // estado completo
window.appStorage.clearCache()  // limpia cache de JSONs
config.debug()                  // configuración activa
```

### Prefijos de log

```
[APP]       → orquestación principal
[FETCH]     → carga de JSON
[CACHE HIT] → JSON desde cache
[ERROR]     → errores fatales
[WARN]      → advertencias no fatales
```

### Problemas comunes

| Síntoma | Causa probable |
|---------|---------------|
| "Escuela no encontrada" | Slug en la URL no existe en `escuelas.json` o año no está en la lista de `years` |
| "No se pudieron cargar los datos" | Abriendo como `file://` en vez de con Live Server |
| Precios no aparecen | `visibilidad` no es `"publicar"` en `precios.json` |
| Sección no aparece | `activo: false` en `{code}_secciones.json` |

---

## Deploy en Vercel

```bash
git add .
git commit -m "feat: nuevo brochure sabi-26"
git push origin master
# Vercel despliega automáticamente
```

**Configuración del site en Vercel:**
- Framework Preset: **Other**
- Rewrites: configurados en `vercel.json` para mapear slugs a `index.html`
- Output directory: `.`

---

## Estructura de los JSONs principales

### `data/precios.json`

```json
{
  "escuelas": [{
    "code": "sabi",
    "visibilidad": "publicar",
    "paquetes": [{
      "id": "basico",
      "nombre": "Básico",
      "precio": 85,
      "moneda": "USD",
      "incluye": ["5 fotos digitales", "1 foto impresa 8x10"]
    }]
  }]
}
```

### `data/{code}_secciones.json`

```json
{
  "mascotas":          { "activo": false },
  "fondos":            { "activo": false },
  "direccion_estudio": { "activo": true },
  "portafolio_inicio": {
    "activo": true,
    "fotos": ["portafolio/foto1.jpg", "portafolio/foto2.jpg"]
  }
}
```

---

## Checklist antes de publicar

- [ ] Código y año agregados en `data/escuelas.json`
- [ ] `data/{code}_secciones.json` creado
- [ ] Precios con `"visibilidad": "publicar"` en `data/precios.json`
- [ ] Sin errores en consola del navegador
- [ ] Formulario de prueba completado exitosamente
- [ ] **Verificar fila nueva en Google Sheets**
- [ ] **Verificar pestaña LOGS en Google Sheets (Airtable OK)**
- [ ] **Verificar notificación en Discord**
- [ ] Imágenes cargando correctamente

---

## Post-Onboarding: Cuestionario Pre-Sesión (Fase 1 — Próximo)

### Cómo funciona

El cuestionario es un segundo formulario que se envía **después** del onboarding. El padre recibe un link personalizado por WhatsApp con los datos de su hijo pre-cargados.

```
https://mimejorretrato.com/propuesta/cuestionario?sid={student_id}
```

### Probar en desarrollo

```bash
# 1. Abrir cuestionario.html con Live Server
# 2. Navegar a: http://127.0.0.1:5500/cuestionario.html?sid=507XXXXXXXX_maria-antonia_kinder
# 3. Verificar que se pre-carga el nombre del estudiante
# 4. Verificar que las preguntas corresponden al tipo de salón (kinder vs sexto)
```

### JSONs del cuestionario

#### `data/cuestionario_config.json`

```json
{
  "mapeo_salones": {
    "prekinder": "kinder",
    "kinder": "kinder",
    "primero": "kinder",
    "sexto": "sexto",
    "noveno": "sexto"
  },
  "default": "kinder"
}
```

#### `data/cuestionario_kinder.json` / `data/cuestionario_sexto.json`

Misma estructura que `formulario.json`: array de campos con `id`, `label`, `tipo`, `opciones`.
Los textos usan `{nombreEstudiante}` como placeholder que se reemplaza en runtime.

### Checklist cuestionario antes de publicar

- [ ] `cuestionario.html` renderiza sin errores
- [ ] `cuestionario_config.json` tiene mapeo para todos los salones activos
- [ ] Preguntas del JSON se renderizan según tipo de salón
- [ ] Pronombres se ajustan al género seleccionado
- [ ] Submit llega a Google Sheets (pestaña "Cuestionarios")
- [ ] Submit actualiza la fila en Airtable (misma fila del Lead)
- [ ] Link copiado de Airtable abre el cuestionario con datos correctos

### Flujo operativo (cómo lo usa Mike)

```
1. Papá llena formulario de reserva (onboarding) → llega a Sheets + Airtable
2. En Airtable, la fila tiene un campo "Link Cuestionario" (fórmula automática)
3. Mike copia el link y lo pega en WhatsApp al padre
4. El padre abre, ve "Vamos a preparar la sesión de María Antonia", llena las preguntas
5. Las respuestas llegan a Sheets (pestaña Cuestionarios) + Airtable (misma fila)
```
