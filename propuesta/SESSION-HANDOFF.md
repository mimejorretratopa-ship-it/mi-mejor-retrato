# Handoff de Sesión — 14 Mayo 2026

## Cambios Recientes (Migración a URL-Driven Routing)
- **Migración de Arquitectura**: El sistema ha pasado de tener múltiples archivos HTML (`ebrv-26.html`, `clia-26.html`) a un solo punto de entrada dinámico: `index.html`.
- **Enrutamiento por URL**: Ahora el sistema identifica el brochure basándose en el slug de la URL (`/propuesta/ebrv-26`).
- **Fusión de Datos**: Se eliminó `registro.json`. Los metadatos de los brochures (GA IDs, años activos, estados) ahora viven en `data/escuelas.json`.
- **Página de Error**: Se implementó una página de error visualmente integrada para slugs inválidos, con link directo al WhatsApp de Mike.
- **Vercel Config**: Se agregó `vercel.json` para manejar rewrites y redirects automáticos.
- **Base Tag**: Se añadió `<base href="/propuesta/">` para garantizar la resolución correcta de rutas relativas.

## Estado del Proyecto
El sistema es ahora más escalable y fácil de mantener. El backend permanece intacto y sigue recibiendo los mismos payloads que antes.

## Pendientes / Siguientes Pasos
1. **Verificar Redirects**: Confirmar en producción que los enlaces `.html` antiguos redirigen correctamente a los nuevos slugs sin extensión.
2. **Pruebas de Analytics**: Asegurarse de que los `ga_id` migrados a `escuelas.json` se están cargando correctamente.

---
# Historial de Sesiones
... (historial previo)
