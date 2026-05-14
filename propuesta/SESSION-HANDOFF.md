# Handoff de Sesión — 14 Mayo 2026 (Tarde)

## Cambios Recientes (Estabilización y Unificación)
- **Regla de Autoridad**: Se resolvió el conflicto de visibilidad. `*_secciones.json` controla el layout (ON/OFF) y `precios.json` controla la lógica de venta (`publicar`, `pendiente`, `no_publicar`).
- **Inyección Dinámica**: El Hero ahora muestra automáticamente "Propuesta preparada para: [Escuela] [Año]".
- **Documentación en Código**: Se agregaron notas descriptivas (`nota_estados`, `_nota`, etc.) directamente en los JSON de configuración para facilitar su edición sin manuales externos.
- **Blindaje de Datos**: Se estabilizó el formato de `salones` como un Array de Objetos para mantener compatibilidad con el CRM y Google Contacts.

## Estado del Proyecto
La arquitectura modular es ahora definitiva. Los documentos `ARCHITECTURE.md` y `MIGRATION-GUIDE.md` han sido actualizados con estas nuevas reglas.

## Pendientes / Siguientes Pasos
1. **Verificar Redirects**: Confirmar en producción que los enlaces `.html` antiguos redirigen correctamente a los nuevos slugs sin extensión.
2. **Nuevos Brochures**: Al crear nuevos brochures, usar `secciones.json` (v3.1) como plantilla maestra.

---
# Historial de Sesiones
- **14 Mayo 2026 (Mañana)**: Migración exitosa a URL-Driven Routing. Implementación de `vercel.json` y consolidación de `escuelas.json`.
