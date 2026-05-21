# Plan de Trabajo — Mi Mejor Retrato (20 mayo 2026)

## Contexto

Tienes el sistema técnico sólido. El problema ahora es **comercial y de gestión**: necesitas saber qué propuestas existen, cuáles has enviado, a quién, cuándo hacer seguimiento, y qué falta por construir. Este plan organiza eso en tres bloques.

---

## Estado actual del catálogo (inventario real)

| Código | Escuela / Propuesta | Paquetes | Propuesta B2B | Estado |
|--------|---------------------|----------|----------------|--------|
| `lasa` | Colegio La Salle | ✅ 3 paquetes | ✅ lasa_propuesta.json | **Listo** |
| `enda` | Guillermo Endara Galimani | ✅ 3 paquetes | ✅ enda_propuesta.json | **Listo** |
| `ebrv` | Vacamonte | ✅ 3 paquetes | ✅ ebrv_propuesta.json | **Listo** |
| `port` | Portafolio | ✅ 1 paquete | ✅ port_propuesta.json | **Listo** |
| `indp` | Tu Sesión de Retrato | ✅ 3 paquetes | ✅ indp_propuesta.json | **Listo** |
| `clia` | Chiara Lubich | ✅ 3 paquetes | ✅ clia_propuesta.json | **Listo** |
| `pana` | Propuesta Panamá | ✅ 3 paquetes | ✅ pana_propuesta.json | **Listo** |
| `chor` | Propuesta La Chorrera | ✅ 3 paquetes | ✅ chor_propuesta.json | **Listo** |
| `ofxd` | Oxford International | ✅ 3 paquetes | ✅ ofxd_propuesta.json | **Listo** |
| `oxbg` | Oxford Brisas | ✅ 3 paquetes | ✅ oxbg_propuesta.json | **Listo** |
| `sagu` | San Agustín | ✅ 3 paquetes | ✅ sagu_propuesta.json | **Listo** |
| `b2b`  | Propuesta Directores (genérica) | ❌ sin paquetes | ✅ b2b_propuesta.json | **Pendiente** |
| `sabi` | Sabis International | ⚠️ 1 paquete sin tabla | ❌ | **Pausado** |
| —      | Textos Genéricos (ej: SAIE) | ✅ Textos limpiados | ✅ | **Listo** |

---

## BLOQUE 1 — Tracker de Propuestas en Google Sheets

### Por qué Google Sheets + Apps Script (no Excel local)
- Ya tienes un Hub en Apps Script conectado; se agrega como **segunda pestaña del mismo Sheet**.
- Apps Script puede enviar alertas por email Y Discord sin instalación adicional.
- Funciona desde el celular.

### Estructura de columnas propuesta

| # | Columna | Tipo | Notas |
|---|---------|------|-------|
| A | **Escuela** | Texto | Nombre completo |
| B | **Código** | Texto | `lasa`, `enda`, etc. |
| C | **Tipo** | Dropdown | B2B Institución / B2C Independiente |
| D | **Zona** | Dropdown | Panamá Ciudad / Panamá Oeste |
| E | **Grados** | Texto libre | Kinder / 6to / Pre-K+K+6to / Toda la escuela |
| F | **Modalidad sesión** | Dropdown | En escuela / En estudio |
| G | **Contacto** | Texto | Nombre de la persona |
| H | **Cargo** | Texto | Director/a, Coordinador/a, Madre... |
| I | **WhatsApp** | Texto | Número directo |
| J | **Fecha de envío** | Fecha | Se ingresa manualmente |
| K | **Fecha seguimiento** | Fórmula | `=J2+7` (automático) |
| L | **Estado** | Dropdown | 🟡 Enviada / 👀 Visto / 💬 En negociación / ✅ Confirmada / ❌ Rechazada / 🔕 Sin respuesta |
| M | **Probabilidad** | Dropdown | Alta / Media / Baja |
| N | **Notas** | Texto | Observaciones |

### Lógica del Apps Script

```javascript
// Se ejecuta diario a las 8am — trigger configurado en el proyecto
function verificarSeguimientos() {
  const hoy = new Date();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Propuestas");
  const datos = sheet.getDataRange().getValues();
  const alertas = [];

  datos.forEach((fila, i) => {
    if (i === 0) return; // saltar encabezado
    const fechaSeguimiento = fila[10]; // columna K
    const estado = fila[11]; // columna L
    const escuela = fila[0];
    const contacto = fila[6];

    if (!fechaSeguimiento || estado === "✅ Confirmada" || estado === "❌ Rechazada") return;

    if (fechaSeguimiento < hoy) {
      // Pintar fila en rojo
      sheet.getRange(i + 1, 1, 1, 14).setBackground("#FFDEDE");
      alertas.push(`⚠️ VENCIDO: ${escuela} — Contacto: ${contacto} — Seguimiento era: ${Utilities.formatDate(fechaSeguimiento, "America/Panama", "dd/MM/yyyy")}`);
    } else if ((fechaSeguimiento - hoy) / 86400000 <= 1) {
      // Amarillo si es mañana
      sheet.getRange(i + 1, 1, 1, 14).setBackground("#FFF9C4");
      alertas.push(`🔔 HOY/MAÑANA: ${escuela} — Contacto: ${contacto}`);
    }
  });

  if (alertas.length > 0) {
    // Enviar email de resumen
    MailApp.sendEmail({
      to: Session.getActiveUser().getEmail(),
      subject: `📸 MMR — ${alertas.length} seguimiento(s) pendiente(s)`,
      body: alertas.join("\n")
    });
    // Opcional: también a Discord via webhook
  }
}
```

**Menú personalizado:**
```javascript
function onOpen() {
  SpreadsheetApp.getUi().createMenu("📸 MMR Propuestas")
    .addItem("Verificar seguimientos ahora", "verificarSeguimientos")
    .addItem("Marcar como Enviada hoy", "marcarEnviadaHoy")
    .addToUi();
}
```

> [!TIP]
> El trigger diario se configura una sola vez en Apps Script: Triggers → Agregar → `verificarSeguimientos` → Basado en tiempo → Día → 8:00am

---

## BLOQUE 2 — Variables que definen una propuesta

Estas son las dimensiones que hacen que una propuesta sea **estructuralmente diferente** (no solo de precio):

| Variable | Opciones | ¿Crea propuesta nueva? |
|----------|----------|------------------------|
| **Audiencia** | B2B (directivos escuela) / B2C (padres) | ✅ Sí — cambia el copy completo |
| **Zona geográfica** | Panamá Ciudad / Panamá Oeste | ✅ Sí — cambia logística y distancia |
| **Modalidad sesión** | En escuela / En estudio | ✅ Sí — cambia coordinación |
| **Grados cubiertos** | Kinder / 6to / Pre-K / Toda la escuela | ⚠️ Especificación dentro de la propuesta |
| **Precios / entregables** | Según escuela | ⚠️ Configuración en precios.json |
| **Fotos familiares** | Sí / No | ⚠️ Campo `fotos_familiares` en precios.json |

### Conclusión: ¿cuántos tipos de propuesta necesitas realmente?

```
┌─────────────────────────────────────────────────────┐
│  ÁRBOL DE PROPUESTAS                                 │
│                                                      │
│  B2B (Institución)                                   │
│   ├── Panamá Ciudad → {code}_propuesta.json          │
│   │     (lasa, enda, ofxd, clia, sabi, sagu...)      │
│   └── Panamá Oeste  → {code}_propuesta.json          │
│         (ebrv, chor, dolo...)                        │
│                                                      │
│  B2C (Independiente)                                 │
│   └── UNA SOLA propuesta `indp`                      │
│         + selector de estudio en el onboarding       │
│                                                      │
│  Portafolio (caso especial B2C)                      │
│   └── `port` — condiciones únicas, siempre en        │
│         La Chorrera, no importa procedencia          │
└─────────────────────────────────────────────────────┘
```

### Nombre sugerido para las dimensiones de localización

> [!IMPORTANT]
> **¿Cómo llamar al campo de zona/área?**
> Propuesta: usar **`zona`** para la región geográfica y **`modalidad`** para el tipo de locación.
>
> ```json
> "zona": "panama_ciudad",        // "panama_ciudad" | "panama_oeste"
> "modalidad": "en_escuela"       // "en_escuela" | "en_estudio"
> ```
>
> Esto puede vivir como metadata en `precios.json` por escuela y en `_propuesta.json` para el copy.

---

## BLOQUE 3 — Propuestas prioritarias a construir

### 🔴 Prioridad Alta (esta semana)

#### 1. `port` — Portafolio (completar)
- Definir precio real (actualmente $0)
- Crear `port_propuesta.json`
- Es B2C con condiciones especiales: siempre en La Chorrera, no importa procedencia del cliente
- **Salones**: ninguno (es individual)
- **Fotos familiares**: ✅ sí (es el diferencial)

#### 2. `pana` — Propuesta Panamá (independientes B2C)
- Precios: **iguales a `enda`** según indicaste
- Opciones de estudio: Vía Argentina o Condado del Rey
- Mención explícita: si quieren grupo/escuela → que contacten directamente
- `pana_secciones.json` ya existe, revisar que tenga selector de estudio

#### 3. `ebrv` — Vacamonte (ajustar precios)
- Revisar y actualizar los 3 paquetes en `precios.json`
- Estudio: en escuela únicamente (Panamá Oeste, zona Vacamonte)
- Coordinar si fin de semana o día de semana desde mediodía

### 🟡 Prioridad Media (próximos 10 días)

#### 4. `chor` — La Chorrera (para directivos)
- Es una propuesta B2B genérica para escuelas en zona oeste
- Mencionar opciones: en escuela o estudio en Arboledas / local en centro de La Chorrera
- Coordinar día/hora (fin de semana o desde mediodía en semana)
- Diferencial vs Panamá: sin costo de traslado, más flexibilidad de horarios

#### 5. `clia` — Chiara Lubich (6to grado)
- B2B, Panamá Ciudad
- Preparar aunque no sea urgente (sirve de plantilla para escuelas similares)
- Precios similares a `lasa`

#### 6. Texto genérico en brochure SAIE
- Cambiar cualquier referencia específica a "SAIE" en el HTML de propuesta
- Reemplazar cabecera de galerías por **"Nuestro trabajo previo"** (genérico)
- Baja prioridad, solo limpiar el texto

### ⚪ Prioridad Baja (cuando haya espacio)

#### 7. `ofxd` / `oxbg` — Oxford (ambas sedes)
- Ya existen los archivos `_propuesta.json`, faltan paquetes en `precios.json`
- B2B, Panamá Ciudad

#### 8. `sagu` — San Agustín
- Ya existe `sagu_propuesta.json`
- Solo Kinder, B2B

#### 9. SAIE
- Baja probabilidad este año
- Crear cuando se reactiven las conversaciones

---

## BLOQUE 4 — Decisión: Independientes (indp)

### El problema
¿Una propuesta `indp` o dos (`pana` + `chor`) para independientes?

### Recomendación: **UNA SOLA** (`indp`) con selector en onboarding

**Argumentos:**
1. Los precios son los mismos independientemente del estudio
2. El cliente no sabe qué estudio quiere hasta que ve la disponibilidad
3. Evita mantener dos brochures con copy casi idéntico
4. El selector de estudio en el onboarding ya existe en `ubicaciones_catalogo`

**Flujo propuesto:**

```
Cliente ve propuesta indp (genérica) 
    → Le interesa
    → Abre onboarding
    → Escoge paquete
    → Pregunta: "¿Qué estudio te queda más conveniente?"
        ○ Estudio Arboledas (La Chorrera)
        ○ Vía Argentina (Panamá)
        ○ Condado del Rey (Panamá)
        ○ Sin preferencia / coordinemos
    → Escoge fecha
    → Submit → Google Sheets + Airtable + Discord
```

**Para clientes de escuelas (que llegaron por `indp` pero quieren algo grupal):**
- El CTA final de la propuesta debe decir:
  > *"¿Quieres organizarlo para el salón de tu hijo? Escríbeme directo y coordinamos."*
- Botón de WhatsApp directo (no formulario)

> [!IMPORTANT]
> Pendiente de decisión: ¿agregas `zona` como pregunta explícita en el onboarding de `indp`, o dejas que el selector de estudio lo implique? El selector de estudio ya resuelve esto.

---

## Cronograma sugerido (esta semana)

| Día | Tarea |
|-----|-------|
| **Hoy Mié 20** | Crear el tracker en Google Sheets + Apps Script |
| **Jue 21** | Completar `port` (precios + propuesta) |
| **Vie 22** | Completar `pana` + ajustar `ebrv` (precios) |
| **Sáb 23** | `chor` (propuesta directores Chorrera) |
| **Lun 25** | `clia` (Chiara Lubich) |
| **Mar 26** | Texto genérico SAIE + revisar `ofxd`/`oxbg` |

---

## Próximos pasos de Fase 3 (ya identificados en SESSION-HANDOFF)

1. **Generador de Hojas de Ruta PDF** — `herramientas/generador_pdf.html`
2. **Módulo de Códigos QR** — para identificación en Lightroom
3. **Verificación de envíos** — testear submit → Airtable con nuevo esquema

