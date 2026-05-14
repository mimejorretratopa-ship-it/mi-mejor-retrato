# 🤝 Session Handoff — Mi Mejor Retrato

## 🎯 Estado Actual: UNIFICACIÓN COMPLETADA
Hemos unificado la arquitectura del Website raíz y los Brochures de Onboarding bajo un mismo núcleo compartido en `js/core/`. El sistema ahora es más robusto, escalable y fácil de mantener.

### ✅ Logros de esta sesión
1.  **Core Unificado**: Se crearon `config.js`, `state.js`, `storage.js`, `api.js`, `validators.js` y `utils.js` centralizados.
2.  **Unificación de Onboarding**: La carpeta `/propuesta/` ahora es `/onboarding/`. Se actualizaron todas las rutas y dependencias.
3.  **Corrección de Errores de Migración**:
    *   **CORS Fix**: Se ajustó `api.js` para usar `text/plain` con Google Apps Script, eliminando los errores de bloqueo al enviar el formulario.
    *   **Discord Fix**: Se implementó lógica selectiva de `Content-Type` para que Discord reciba `application/json` mientras Google recibe `text/plain`.
    *   **Student ID Fix**: Se aseguró el envío del ID único en la raíz y en `_meta` para persistencia en Sheets/Airtable.
    *   **Performance**: Se implementó el patrón "dispara y olvida" (fire-and-forget) en el envío del formulario, restaurando la velocidad instantánea de la UI.
    *   **Compatibilidad**: El `state.js` fue aplanado para que los módulos de onboarding existentes sigan funcionando sin cambios.

### 📂 Estructura de Archivos
- `/js/core/`: Lógica centralizada para todo el proyecto.
- `/onboarding/`: Sistema dinámico de brochures (URL-driven).
- `/onboarding/modules/`: Componentes de UI modulares.
- `/onboarding/data/`: Configuración por escuela (JSON).

### 🛠️ Herramientas de Debugging (Consola F12)
- `state.get('brochure')`: Ver configuración del brochure actual.
- `state.get('website')`: Ver estado de la navegación del homepage.
- `storage.clearCache()`: Limpiar memoria de JSONs cargados.

### 🎯 Próximos Pasos (Fase 1: Post-Onboarding)
1.  Implementar `onboarding/cuestionario.html` usando el mismo core.
2.  Capturar el `sid` (student_id) de la URL para pre-cargar datos del estudiante.
3.  Definir flujo de preguntas en `cuestionario_config.json`.

---
**Nota para el siguiente dev:** Todo cambio global (webhooks, números de WhatsApp) debe hacerse exclusivamente en `js/core/config.js`. No modifiques los módulos individuales a menos que sea para cambiar su comportamiento visual.
