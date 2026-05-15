# Plan de Implementación: Actualizaciones y Automatización (Fase 3)

He dividido los requerimientos de tus notas (del 13 y 14 de mayo) en 3 fases lógicas. Este plan está diseñado para darte resultados rápidos en lo más urgente, sin romper la arquitectura actual.

## Fase 1: Actualización de Contenido Urgente (Locaciones)
**Objetivo**: Clarificar las opciones de locación para las fotos en el brochure principal.

*   **Acción 1.1**: Actualizar la configuración (`secciones.json` o el módulo `ubicacion.js`) para reflejar los nuevos textos.
*   **Contenido a incluir**:
    *   En la escuela (si la escuela coordina).
    *   En estudio (opciones en Vía Argentina, Condado del Rey y La Chorrera).
    *   Locación adicional coordinada con los padres.

## Fase 2: Automatización de Links y Personalización
**Objetivo**: Agilizar tu respuesta por WhatsApp y hacer que el cliente sienta una experiencia 100% personalizada.

*   **Acción 2.1: Crear `herramientas/generador_links.html`**:
    *   Una interfaz sencilla (solo local, para ti).
    *   Pegas o seleccionas los datos del lead (Nombre del estudiante, escuela, salón, teléfono).
    *   Genera el `student_id` único automáticamente.
    *   Te arroja un texto listo para copiar y pegar en WhatsApp con el link configurado. Ejemplo: `.../onboarding/cuestionario?sid=50760138765_maria-antonia_kinder&n=Maria%20Antonia`
*   **Acción 2.2: Actualizar `cuestionario.html`**:
    *   Leer el parámetro de la URL (el nombre).
    *   Inyectar el nombre en el título dinámicamente para que el saludo diga: *"¡Hola! Vamos a coordinar la sesión de **[Nombre del Hijo]**"*.

## Fase 3: Generador de PDF y Código QR (Handoff para la Sesión)
**Objetivo**: Crear la hoja de ruta física (PDF) que usarás el día de la foto, permitiendo que el script de Python lea el QR luego.

*   **Acción 3.1: Crear `herramientas/generador_pdf.html`**:
    *   Una herramienta local (sin servidor) que cargue las respuestas descargadas de Google Sheets o tu JSON local.
    *   Integración de una librería para generar Códigos QR en el navegador.
    *   Integración de una librería para generar PDFs en el navegador (`jsPDF`).
*   **Acción 3.2: Diseño del Layout (8.5x11)**:
    *   **Página 1**: Diseño limpio con las respuestas clave del cuestionario (qué le gusta, canción, etc.) para que lo leas rápido.
    *   **Página 2**: El Banner (4.25 x 11, horizontal) con el QR gigante (conteniendo ID único, escuela, salón, nombre) para la foto de identificación.

---

> [!NOTE]
> **Sobre el Dashboard de Agendamiento**: Lo he dejado fuera de esta iteración inmediata para no diluir el enfoque. Una vez que la captura de datos y el PDF/QR estén funcionando perfectamente, atacamos la interfaz de agendamiento como una Fase 4 independiente.

### Siguientes Pasos
Revisa este plan. Si estás de acuerdo, dímelo y empezaré **inmediatamente con la Fase 1 (Locaciones)**, o si prefieres, puedo saltar directamente a la **Fase 2 (Generador de links)**.
