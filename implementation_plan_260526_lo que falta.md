# Plan de Desarrollo — Módulos Pendientes (Fase 4 y 5)

> **Contexto:** El ecosistema Mi Mejor Retrato tiene un avance del ~64%. Las Fases 1–3 (Pre-venta, Onboarding, Día de Sesión) están completas al 100%. Lo que resta es la **post-producción** y el **cierre de servicio**. Este plan cubre los 4 módulos faltantes organizados en 3 sprints.

---

## User Review Required

> [!IMPORTANT]
> **Decisión de Hosting para la Galería Web:** La galería necesita almacenamiento de imágenes en la nube. Esto implica elegir un proveedor (Cloudflare R2, Supabase Storage, AWS S3, o similar). Esta decisión impacta el costo mensual y la complejidad de implementación.

> [!IMPORTANT]
> **Alcance del Sprint 1:** La Galería Web MMR es el módulo más grande (~20% del proyecto total). Puede construirse en fases incrementales o como un bloque completo. El plan propone fases incrementales.

---

## Open Questions

> [!IMPORTANT]
> 1. **¿Dónde se alojarán las fotos de la galería?** Opciones:
>    - **Cloudflare R2** — Barato, sin egress fees, buena CDN. Requiere configurar Workers para la API.
>    - **Supabase Storage** — Gratis hasta 1GB, tiene auth integrado, API REST lista. Más simple de integrar.
>    - **Carpeta local + túnel** — Zero cost, pero requiere que tu PC esté encendida. No recomendado para producción.
>
> 2. **¿El upselling de fotos extra se cobra por la galería o se registra manualmente en el Dashboard?** Si es por la galería, necesitamos integrar un sistema de pagos (Stripe, PayPal). Si es manual, el padre avisa por WhatsApp y tú registras el pago en el Dashboard.
>
> 3. **¿Cuántas rondas de filtrado necesitas exactamente?** En tu transcripción mencionas 3 rondas (burdo, intermedio, final). ¿Se pueden simplificar a 2 (preselección + selección final)?
>
> 4. **¿El Contact Sheet PDF se genera desde el Dashboard o como herramienta independiente?** El plan propone integrarlo como una nueva pestaña del Dashboard existente para mantener todo centralizado.

---

## Proposed Changes

Los módulos se organizan en **3 sprints** de desarrollo, ordenados por dependencias y prioridad operativa.

---

### Sprint 1 — Galería Web MMR (El módulo más grande)

Reemplaza Pixieset con una galería propia optimizada para el flujo específico de MMR: filtrado en rondas, selección de impresiones, y upselling.

#### Arquitectura propuesta

```
┌─────────────────────────────────────────────────────┐
│              GALERÍA WEB MMR                         │
│              galeria/index.html                      │
│  — URL personalizada por estudiante                  │
│  — Autenticación por token único (student_id + hash) │
│  — Filtrado en rondas (Preview → Selección Final)    │
│  — Selección de fotos para impresión                 │
│  — Upselling de fotos adicionales                    │
└──────────────────────┬──────────────────────────────┘
                       │ consume / escribe
┌──────────────────────▼──────────────────────────────┐
│              BACKEND DE GALERÍA                      │
│  — Google Apps Script Hub (endpoints nuevos)         │
│    · getGallery(student_id, token)                   │
│    · saveSelection(student_id, round, photo_ids)     │
│    · getSelections(student_id)                        │
│  — Almacenamiento de imágenes: [Por definir]         │
│  — Metadata de fotos: Google Sheets (pestaña nueva)  │
└─────────────────────────────────────────────────────┘
```

#### Sub-fases de la Galería

**1A. Backend y estructura de datos**

#### [NEW] Pestaña `Galerias` en Google Sheets
- Columnas: `student_id`, `photo_id`, `url_preview`, `url_full`, `round_1` (bool), `round_2` (bool), `selected_print` (bool), `is_extra` (bool)
- Cada fila = una foto de un estudiante

#### [MODIFY] [MMR_brochures_hub_v4.0.gs](file:///d:/mmr_studio/01_core_apps/website/onboarding/apps-script/MMR_brochures_hub_v4.0.gs)
- Agregar endpoint `getGallery`: Recibe `student_id` + `token`, retorna lista de fotos con URLs y estado de selección
- Agregar endpoint `saveSelection`: Recibe `student_id`, `round` (1, 2, o "print"), y array de `photo_ids` seleccionados
- Agregar endpoint `getSelections`: Para consumo del Sincronizador Local — retorna todas las selecciones de un salón completo

**1B. Frontend de la Galería (vista del padre)**

#### [NEW] `galeria/index.html`
- Single Page Application en HTML/CSS/JS vanilla (consistente con el stack del proyecto)
- URL: `galeria/index.html?sid={student_id}&token={hash}`
- **Diseño:** Dark theme premium (consistente con el Dashboard), grid responsivo de fotos con lightbox
- **Ronda 1 (Preview):** El padre ve todas sus fotos en thumbnails. Puede marcar favoritas con un corazón/estrella. Las no marcadas se descartan del filtrado siguiente
- **Ronda 2 (Selección Final):** Solo ve las fotos que pasaron Ronda 1. Selecciona las que van a retoque final. Si el paquete incluye N fotos y selecciona más, se activa el upselling
- **Selección de Impresión:** Después de los retoques, el padre ve las fotos retocadas y elige cuáles imprimir (según su paquete)
- **Upselling:** Modal claro que muestra cuántas fotos extra seleccionó y el costo adicional. Botón de "Confirmar y pagar extra" que registra la solicitud (el cobro real se hace por WhatsApp/Nequi)

**1C. Herramienta de Subida (vista del fotógrafo)**

#### [NEW] `herramientas/subida_galeria/index.html`
- Herramienta local para subir fotos en lote a la galería de un estudiante
- Seleccionar colegio → salón → estudiante (consume `precios.json` + `getStudents`)
- Drag & drop de archivos JPG/PNG
- Genera thumbnails en el browser antes de subir
- Sube al proveedor de almacenamiento elegido
- Registra metadata en Google Sheets vía el Hub

---

### Sprint 2 — Sincronizador Local + Contact Sheet PDF

Estos dos módulos trabajan juntos: uno descarga las selecciones del cliente a tu PC, y el otro empaqueta los archivos para el taller de impresión.

#### [NEW] `herramientas/sincronizador/index.html` — Sincronizador Local de Selección

Herramienta local que lee las selecciones del cliente desde la Galería Web y organiza los archivos en tu computadora.

- **Tecnología:** HTML/JS vanilla + [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) (la misma que usa Pulso para persistencia local)
- **Flujo:**
  1. Seleccionar colegio + salón
  2. El módulo consulta `getSelections` del Hub para obtener todas las selecciones del salón
  3. El usuario conecta la carpeta raíz donde están los archivos originales (ej: `D:\MMR_Sesiones\CLIA_2026\`)
  4. El módulo escanea la carpeta buscando archivos que contengan el `student_id` en su nombre
  5. **Separación determinista:** Crea automáticamente subcarpetas:
     ```
     📁 CLIA_2026/
     ├── 📁 _seleccionadas/
     │   ├── 📁 50760138765_scarla-kalentis_kinder/
     │   │   ├── IMG_0042.jpg  (seleccionada por el papá)
     │   │   ├── IMG_0047.jpg
     │   │   └── IMG_0051.jpg
     │   └── 📁 50761234567_juan-perez_1ero-a/
     │       └── ...
     ├── 📁 _para_retoque/
     │   └── (copias de las seleccionadas, listas para abrir en Lightroom/Photoshop)
     └── 📁 _descartadas/
         └── (fotos que el padre no seleccionó)
     ```
  6. **Reporte visual:** Muestra un resumen de cuántas fotos se movieron por estudiante y si hay discrepancias (ej: un estudiante seleccionó 8 fotos pero su paquete solo incluye 6)

---

#### [NEW] Pestaña `Impresión` en el Dashboard — Generador de Contact Sheet PDF

En lugar de crear una herramienta aislada, se propone agregar una **tercera pestaña** al Dashboard existente ([dashboard.html](file:///d:/mmr_studio/01_core_apps/website/herramientas/dashboard.html)).

#### [MODIFY] [dashboard.html](file:///d:/mmr_studio/01_core_apps/website/herramientas/dashboard.html)
- **Nueva pestaña: `Impresión`** junto a "Finanzas" y "Entregables"
- **Filtro por escuela + salón** (reutiliza el sistema de filtros existente)
- **Por cada estudiante muestra:**
  - Nombre, paquete, fotos seleccionadas para impresión
  - Thumbnails de las fotos (si están disponibles en la galería)
  - Tamaños de impresión según su paquete (ej: "2× 8x12 enmarcadas + 9× 4x6")
  - Checkbox de "Incluido en lote" para marcar cuáles van al taller
- **Botón: `📄 Generar Contact Sheet PDF`**
  - Usa la librería `jsPDF` (sin dependencias de servidor) para generar un PDF
  - Una página por estudiante con:
    - Nombre del estudiante + `student_id`
    - Grid de thumbnails de las fotos seleccionadas
    - Lista de tamaños de impresión
    - Código QR con el `student_id` (reutiliza `qrcode.js` del generador PDF existente)
  - Una página de resumen al final con el conteo total de impresiones por tamaño
- **Botón: `📦 Exportar Lote para Taller`**
  - Descarga un ZIP (usando `JSZip`) con:
    - Las fotos en resolución completa organizadas por estudiante
    - El Contact Sheet PDF incluido
    - Un archivo `instrucciones.txt` con el resumen de cantidades

#### [NEW] Generador de Etiquetas de Sobre
- Integrado en la misma pestaña de Impresión
- **Botón: `🏷️ Imprimir Etiquetas`**
- Genera un PDF con etiquetas recortables (formato Avery o similar) con:
  - Nombre del estudiante
  - Salón y escuela
  - Paquete contratado
  - `student_id` en texto pequeño
  - Cantidad de piezas impresas
- Usa `@media print` para optimizar el corte en hojas carta

---

### Sprint 3 — Confirmación de Entrega y Cierre

El módulo más pequeño pero operacionalmente crítico: cierra el ciclo de servicio de forma auditable.

#### [NEW] `galeria/confirmacion.html` — Página de Confirmación de Entrega

- **URL:** `galeria/confirmacion.html?sid={student_id}&token={hash}`
- **Diseño:** Página minimalista, mobile-first (el padre la abre desde WhatsApp)
- **Contenido:**
  - Logo de Mi Mejor Retrato
  - "Hola [nombre_acudiente], confirma que recibiste el paquete de fotos de [nombre_estudiante]"
  - Checklist visual:
    - ✅ "Recibí todas las fotos impresas"
    - ✅ "Las fotos digitales están disponibles en mi galería"
    - ✅ "No tengo saldos pendientes de pago"
  - Botón grande: **"Confirmar Entrega ✓"**
  - Al confirmar: Envía POST al Hub → Registra en Google Sheets (pestaña `Entregas`) con timestamp y el estado de cada checkbox

#### [MODIFY] [MMR_brochures_hub_v4.0.gs](file:///d:/mmr_studio/01_core_apps/website/onboarding/apps-script/MMR_brochures_hub_v4.0.gs)
- Agregar endpoint `confirmDelivery`: Recibe `student_id`, `token`, y los 3 checkboxes
- Registra en nueva pestaña `Entregas` con timestamp
- Envía notificación a Discord: "✅ {nombre_estudiante} — Entrega confirmada por {nombre_acudiente}"

#### [MODIFY] [dashboard.html](file:///d:/mmr_studio/01_core_apps/website/herramientas/dashboard.html)
- Agregar indicador visual en la pestaña de Entregables: un sexto estado `📋 Entregado` que se enciende automáticamente cuando el padre confirma vía la página web
- El Dashboard consulta la pestaña `Entregas` al sincronizar para actualizar este estado

---

## Resumen de Archivos por Sprint

| Sprint | Archivos Nuevos | Archivos Modificados |
|--------|----------------|---------------------|
| **Sprint 1** | `galeria/index.html`, `herramientas/subida_galeria/index.html`, Pestaña `Galerias` en Sheets | `MMR_brochures_hub_v4.0.gs` |
| **Sprint 2** | `herramientas/sincronizador/index.html` | `dashboard.html` (nueva pestaña Impresión + etiquetas) |
| **Sprint 3** | `galeria/confirmacion.html`, Pestaña `Entregas` en Sheets | `MMR_brochures_hub_v4.0.gs`, `dashboard.html` |

---

## Cronograma Estimado

| Sprint | Módulo | Esfuerzo Estimado | Dependencias |
|--------|--------|-------------------|-------------|
| **1A** | Galería Backend (Hub + Sheets) | 2–3 días | Definir proveedor de almacenamiento |
| **1B** | Galería Frontend (vista padre) | 3–4 días | Sprint 1A |
| **1C** | Herramienta de Subida | 1–2 días | Sprint 1A |
| **2** | Sincronizador Local | 2–3 días | Sprint 1B (necesita `getSelections`) |
| **2** | Contact Sheet + Etiquetas (Dashboard) | 2–3 días | Sprint 1B |
| **3** | Confirmación de Entrega | 1–2 días | Sprint 1A (solo necesita el Hub) |
| | **Total estimado** | **~12–18 días de desarrollo** | |

---

## Verification Plan

### Automated Tests
- Simular el flujo completo de la Galería: subir fotos → padre selecciona → sincronizar en local → verificar que las carpetas se creen correctamente
- Verificar que los endpoints nuevos del Hub (`getGallery`, `saveSelection`, `getSelections`, `confirmDelivery`) retornen los datos esperados
- Generar un Contact Sheet PDF y verificar que contenga los thumbnails y tamaños correctos

### Manual Verification
- **Galería:** Abrir la URL personalizada de un estudiante de prueba en un celular y completar las 2 rondas de selección
- **Sincronizador:** Conectar una carpeta de prueba con archivos JPG nombrados con `student_id` y verificar la separación automática
- **Contact Sheet:** Imprimir el PDF en hoja carta y verificar que los thumbnails sean legibles y los QR escaneables
- **Confirmación:** Enviar el link por WhatsApp a un número de prueba, completar el checklist, y verificar que el Dashboard refleje el estado "Entregado"
