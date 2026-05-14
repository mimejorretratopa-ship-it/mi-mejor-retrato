## Estado Actual (14 Mayo 2026)
1. **Unificación Completada**: Se fusionaron los dos sistemas (Website y Onboarding) en una arquitectura core compartida en `js/core/`.
2. **Renombrado**: La carpeta `/propuesta/` ahora es `/onboarding/`.
3. **Docs en Raíz**: Toda la documentación técnica se movió a la raíz para visibilidad global.

## Estado del Proyecto
La arquitectura modular es ahora definitiva y compartida entre el website y los brochures. Los documentos `ARCHITECTURE.md` y `MIGRATION-GUIDE.md` reflejan esta estructura de "un solo individuo".

## Pendientes / Siguientes Pasos
1. **Fase 1 (MVP) - Cuestionario Pre-Sesión**:
   - Crear `cuestionario.html` para el routing del segundo formulario.
   - Crear `cuestionario_config.json` y `cuestionario_kinder.json`/`sexto.json`.
   - Implementar el cálculo real del `student_id` en el onboarding para que Airtable pueda generar los links `?sid={student_id}`.
2. **Actualizar el Homepage**: Implementar la sección de ubicaciones/locaciones descrita en el transcript 1.
3. **Verificar Redirects**: Confirmar en producción que los enlaces `.html` antiguos redirigen correctamente a los nuevos slugs sin extensión.
4. **Nuevos Brochures**: Al crear nuevos brochures, usar `secciones.json` (v3.1) como plantilla maestra.

---
# Historial de Sesiones
- **14 Mayo 2026 (Mañana)**: Migración exitosa a URL-Driven Routing. Implementación de `vercel.json` y consolidación de `escuelas.json`.
