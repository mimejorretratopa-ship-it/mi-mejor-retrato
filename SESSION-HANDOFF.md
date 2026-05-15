# 🤝 Session Handoff — Mi Mejor Retrato

## 🎯 Estado Actual: SISTEMA DE CUESTIONARIOS Y HUB CONECTADOS
Hemos completado la Fase 1 (Cuestionarios Dinámicos) y la Fase 2 (Hub Backend). El sistema de brochures ahora no solo captura reservas, sino que enruta y procesa cuestionarios de preparación de sesión basados en el grado y el género del estudiante, todo conectado con Google Sheets, Google Contacts, Airtable y Discord.

### ✅ Logros de esta sesión
1.  **Cuestionario Dinámico (`cuestionario.html`)**: Creado como URL-driven (ej: `?sid=...`). Dependiendo de `genero` y `salon` (recibidos desde el Hub), carga automáticamente el archivo JSON correspondiente (ej: `cuestionario_sexto_m.json` o `cuestionario_kinder.json`).
2.  **Extensión del Form Renderer**: El motor de formularios (`form-renderer.js`) ahora soporta encabezados de sección y grupos de checkboxes con límite de selección (ej: "Selecciona hasta 4"). Se purgó la lógica redundante de `codigoPais`, forzando internamente el uso de `507` (Panamá).
3.  **Actualización del Backend (Apps Script Hub)**: 
    *   **Handshake (`doGet`)**: Responde a la web con los datos del estudiante (incluyendo género) usando su SID.
    *   **Guardado de Reservas**: Incorpora y persiste la columna de "Género" tanto en Google Sheets como en Airtable.
    *   **Guardado de Cuestionarios**: Intercepta la acción `saveQuestionnaire` y guarda las respuestas puras JSON en una nueva pestaña "Cuestionarios".
4.  **Notificaciones Discord Mejoradas**: Soporte correcto para renderizado del `{genero}` ("Niño" o "Niña") en los embeds enviados por la reserva inicial.

### 📂 Estructura de Archivos
- `/js/core/`: Lógica centralizada (`api.js` maneja modo Dev/Mock para el Hub).
- `/onboarding/cuestionario.html`: Interfaz del cuestionario post-reserva.
- `/onboarding/data/`: Formularios JSON (incluyendo las versiones segmentadas por género).
- `/onboarding/apps-script/`: Código fuente de Google Apps Script (`MMR_brochures_hub_v3.3.gs`).

### 🛠️ Herramientas de Debugging (Consola F12)
- `state.get('brochure')`: Ver configuración del brochure actual.
- `state.get('student')`: Ver contexto del estudiante cargado en cuestionario.
- `storage.clearCache()`: Limpiar memoria de JSONs cargados.

### 🎯 Próximos Pasos (Fase 3: Refinamiento & Operación)
1.  Monitorear el uso de los cuestionarios en el primer lote de reservas.
2.  Desarrollar una interfaz/dashboard interno para pre-visualizar rápidamente las respuestas del JSON guardado en Google Sheets antes de la sesión de fotos.
3.  Validar si los correos electrónicos se pueden sincronizar de igual forma a otras herramientas (ej: Mailchimp o Sendgrid) en el Hub de Apps Script.

---
**Nota para el siguiente dev:** Todo cambio global de estructura de datos o flujo de información debe actualizarse primero en los JSON de `onboarding/data/` y luego reflejarse en `MMR_brochures_hub_v3.3.gs` y Airtable si involucra nuevas columnas.
