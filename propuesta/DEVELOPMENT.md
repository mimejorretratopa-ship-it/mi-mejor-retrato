# Guía de Desarrollo

## Setup en 60 segundos

**Prerrequisitos:** VS Code + extensión [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)

```bash
# No hay nada que instalar.
code "mmr_schools_proposals 1.5 - antigravity"
```

1. Click derecho en cualquier `.html` en VS Code
2. Seleccionar **"Open with Live Server"**
3. Navegar a `http://127.0.0.1:5500/ebrv-26.html`

> **Importante:** abrir como `file://` NO funciona — `fetch()` requiere un servidor HTTP.

---

## Crear un nuevo brochure

```bash
# 1. Copiar el HTML — no necesita edición
cp ebrv-26.html sabi-26.html

# 2. Verificar/agregar código en data/escuelas.json
# 3. Crear data/sabi_secciones.json (copiar de ebrv_secciones.json y ajustar)
# 4. Configurar precios en data/precios.json
# 5. Registrar en data/registro.json
# 6. Abrir en Live Server y verificar consola
```

El HTML se autoconfigura desde su nombre de archivo. No editar el HTML.

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
| "Escuela no encontrada" | Nombre del HTML no sigue patrón `{code}-{yy}.html` o código no está en `escuelas.json` |
| "No se pudieron cargar los datos" | Abriendo como `file://` en vez de con Live Server |
| Precios no aparecen | `visibilidad` no es `"publicar"` en `precios.json` |
| Sección no aparece | `activo: false` en `{code}_secciones.json` |

---

## Deploy en Netlify

```bash
git add .
git commit -m "feat: nuevo brochure sabi-26"
git push origin main
# Netlify despliega automáticamente
```

**Configuración del site:**
- Build command: (vacío)
- Publish directory: `.`

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

- [ ] HTML copiado con nombre correcto (`{code}-{yy}.html`)
- [ ] Código en `data/escuelas.json`
- [ ] `data/{code}_secciones.json` creado
- [ ] Precios con `"visibilidad": "publicar"` en `data/precios.json`
- [ ] Entrada en `data/registro.json` con estado `"publicado"`
- [ ] Sin errores en consola del navegador
- [ ] Formulario de prueba completado exitosamente
- [ ] Imágenes cargando correctamente
