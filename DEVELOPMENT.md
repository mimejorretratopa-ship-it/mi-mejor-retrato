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

## 1. Crear una nueva Propuesta Comercial (B2B)

El sistema de Propuestas (`/propuesta/`) utiliza un **Modelo Híbrido Estático/Dinámico**. Gran parte del HTML está hardcodeado para optimización de conversión, y la data variable se inyecta.

```bash
# 1. Agregar el código de la escuela y año en data/escuelas.json
# 2. Configurar precios en data/precios.json (visibilidad: "publicar")
# 3. Abrir en Live Server con la URL: http://127.0.0.1:5500/propuesta/index.html?brochure={code}-{yy}
# 4. En producción, la URL será: /propuesta/{code}-{yy}
```

*Nota: Ya no hay formulario de contacto en la propuesta, todos los leads B2B entran directamente por WhatsApp.*

---

## 2. Crear un nuevo Onboarding Pre-Sesión (B2C)

El sistema Onboarding B2C es **100% URL-driven**. Todo el layout es montado dinámicamente por JS basado en JSONs.

```bash
# 1. Asegurarse de que el código y año estén en data/escuelas.json
# 2. Crear data/{code}_secciones.json (copiar de ebrv_secciones.json y ajustar)
# 3. En producción, la URL será: /onboarding/{code}-{yy}
```

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

## Post-Onboarding: Discovery Pre-Sesión (Fase 1 — ✅ HECHO)

### Cómo funciona

El cuestionario es un segundo formulario que se envía **después** del onboarding. El padre recibe un link personalizado por WhatsApp con los datos de su hijo pre-cargados. El Hub genera estos links automáticamente en la Fase 0.

```
https://mimejorretrato.com/onboarding/cuestionario.html?sid={student_id}
```

### Probar en desarrollo

```bash
# 1. Abrir index.html con Live Server
# 2. Navegar a: http://127.0.0.1:5500/onboarding/cuestionario.html?sid=507XXXXXXXX_maria-antonia_kinder
# 3. Verificar que el Hub realiza el "Handshake" vía POST (evita CORS)
# 4. Verificar que el formulario carga el JSON adecuado y marca 'Q_onboarding' en Airtable al enviar.
```

### Pipeline de Comunicación (B1 + D2 — ✅ HECHO)

- **B1**: Generación de `Link_WhatsApp_Q` y `Link_WhatsApp_Agenda` durante el onboarding.
- **D2**: Trigger diario a las 8 AM que envía recordatorios de Discovery a Discord después de 3 días.

### Checklist discovery (Completado)

- [x] `cuestionario.html` renderiza sin errores
- [x] `cuestionario_config.json` tiene mapeo para todos los salones activos
- [x] Hub genera links persistentes en Sheets y Airtable (B1)
- [x] Trigger diario configurado en Apps Script (D2)
- [x] Submit llega a Google Sheets (pestaña "Cuestionarios") y Airtable (Checkbox)
- [x] Submit marca 'Q_onboarding' (Checkbox) en Airtable
- [x] Handshake `getStudent` implementado vía POST (CORS fix)

### Flujo operativo (cómo lo usa Mike)

```
1. Papá llena formulario de reserva (onboarding) → llega a Sheets + Airtable (ahora con Género)
2. En Airtable, la fila tiene un campo "Link Cuestionario" (fórmula automática)
3. Mike copia el link y lo pega en WhatsApp al padre
4. El padre abre el link, el sistema consulta el backend y carga el JSON correcto.
5. Las respuestas llegan a Sheets (pestaña Cuestionarios) en crudo, listas para leer o exportar.
```

---

## Fase 2: Gestión de Agenda (✅ HECHO)

Dashboard interno para organizar los horarios de las sesiones fotográficas por salón.

### Cómo funciona
Ubicado en `/agenda/index.html`. Permite seleccionar escuela y salón, generar slots dinámicos y asignar niños de Airtable.

### Probar en desarrollo
1.  Abrir `/agenda/index.html` con Live Server.
2.  Seleccionar una Escuela y un Salón.
3.  Verificar que el Hub descarga los estudiantes registrados de Airtable para ese salón.
4.  Asignar un estudiante a un slot libre mediante el dropdown.
5.  Presionar **"Guardar / Sincronizar"** y verificar:
    *   Nueva fila o actualización en pestaña `Agendas` de Google Sheets.
    *   Campo `Hora_Sesion` actualizado en el registro de Airtable del niño.

### Checklist Agenda (Completado)
- [x] Selectores de Escuela/Salón cargan dinámicamente desde JSONs.
- [x] Generación de slots respeta Breaks y Duración.
- [x] Los Slots Extra se agregan sin colisiones.
- [x] Solo permite asignar estudiantes cargados desde Airtable (Integridad de IDs).
- [x] Botón 🔄 (Refrescar) trae nuevos leads sin recargar configuración.
- [x] Sincronización con Hub funcional (Persistencia en Sheets + Airtable).

### Vista Pública (Padres)
Ubicada en `/agenda/view.html`. Es de solo lectura y utiliza un motor de cálculo local para renderizar el horario basado en la configuración del admin.

**URL**: `https://mimejorretrato.com/agenda/clia_kinder` (mapeada vía Vercel).

- [x] Renderizado de Solo Lectura (sin botones de edición).
- [x] Nombres de niños visibles para confirmación de padres.
- [x] Motor dinámico soporta Breaks y Extras guardados en el Hub.
- [x] Optimizado para visualización móvil.
