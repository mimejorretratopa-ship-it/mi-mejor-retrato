# 🤝 Session Handoff — Mi Mejor Retrato

## 🎯 Estado Actual: SISTEMA DE CUESTIONARIOS Y HUB CONECTADOS
Hemos completado la Fase 1 (Cuestionarios Dinámicos) y la Fase 2 (Hub Backend). El sistema de brochures ahora no solo captura reservas, sino que enruta y procesa cuestionarios de preparación de sesión basados en el grado y el género del estudiante, todo conectado con Google Sheets, Google Contacts, Airtable y Discord.

### ✅ Logros Técnicos y Características (Finalizados)
1.  **Enrutamiento Dinámico**: Implementación de `cuestionario.html`. Configuración de `vercel.json` para permitir URLs limpias (`/onboarding/cuestionario?sid=...`).
2.  **Hub Backend (Apps Script v3.5)**:
    *   **Handshake Seguro (POST)**: Se migró el handshake de `GET` a `POST` para evitar bloqueos de CORS en producción.
    *   **Sincronización Airtable**: El sistema ahora busca el registro del estudiante y marca automáticamente el checkbox `Q_onboarding` al recibir respuestas.
    *   **Guardado de Cuestionarios**: Persistencia en la pestaña "Cuestionarios" de Google Sheets (JSON crudo).
3.  **Refactorización del Motor (`form-renderer.js`)**:
    *   **UX Mejorada**: Auto-scroll al primer error de validación y soporte para encabezados de sección.
    *   **Checkboxes Inteligentes**: Soporte para límites de selección (`max_selecciones`) y fix de visibilidad (CORS/Appearance).
    *   **Discord Intelligence**: Integración del placeholder `{genero}` en los templates de notificación (Niño/Niña).
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

---
**Nota para el siguiente dev:** Todo cambio global de estructura de datos o flujo de información debe actualizarse primero en los JSON de `onboarding/data/` y luego reflejarse en `MMR_brochures_hub_v3.3.gs` y Airtable si involucra nuevas columnas.
