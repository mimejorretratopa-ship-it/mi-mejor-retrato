**DASHBOARD MMR — MANUAL DE USO**

---

**QUÉ ES**

El dashboard es una herramienta local que vive en tu computadora Windows 11. Es un archivo HTML que abres directamente en el browser sin necesidad de internet, servidor, ni instalación. Su propósito es darte visibilidad sobre dos cosas: el estado financiero de cada cliente (cuánto debe, cuánto ha pagado, cuánto falta), y el estado de producción de cada set de fotos (en qué etapa del flujo de trabajo está cada estudiante).

No es una aplicación en la nube. No tiene usuarios. No tiene login. Solo tú lo usas, solo en tu máquina.

---

**LAS DOS PESTAÑAS**

La pestaña **Finanzas** muestra una tabla con todos los estudiantes registrados. Por cada uno ves el nombre del acudiente y su relación, el nombre del estudiante, la escuela y salón, el paquete que escogió, el total que debe según ese paquete, cuánto ha pagado hasta ahora, el saldo pendiente, y el estado general (pendiente, parcial, o pagado) con una barra de progreso visual.

En la parte superior hay cuatro chips de resumen que se calculan en tiempo real: total facturado de todos los clientes, total cobrado hasta ahora, total por cobrar, y cuántos estudiantes están completamente pagados.

Para registrar un pago haces clic en el botón `+ Pago` de la fila del estudiante. Se abre un modal que muestra primero todos los pagos ya registrados para ese estudiante con su monto, fecha, y nota. Abajo hay un formulario para agregar uno nuevo: monto, fecha, y un campo de nota libre donde escribes algo que te ayude a identificar el pago, por ejemplo "Nequi · captura recibida por WhatsApp" o "Efectivo entregado en sesión". Los pagos existentes se pueden eliminar con el botón × si los registraste por error.

La pestaña **Entregables** muestra el flujo de producción de cada set de fotos. Por cada estudiante hay cinco estados en orden: Filtrado 🔍, Retocado ✏️, Preparado 📦, Impreso 🖨️, y Online 🌐. Cada estado es un botón toggle — lo activas con un clic, lo desactivas con otro. Cuando un estado está activo se pone verde. Puedes filtrar la tabla por escuela y salón para trabajar con un grupo específico. Cada estudiante tiene también un campo de notas libre para instrucciones especiales de retoque, entregas particulares, o cualquier cosa que necesites recordar de ese trabajo.

---

**DE DÓNDE VIENEN LOS DATOS**

El dashboard no captura datos manuales por sí solo en frío. Se conecta directamente a la base de datos central en tu **Google Sheets** a través del Google Apps Script Hub.

El Hub expone el endpoint `getStudents` que extrae los datos de todas las respuestas del onboarding completadas por los padres. Estos datos se descargan en formato JSON en tiempo real e incluyen toda la información del cliente: nombre del acudiente, relación, WhatsApp, nombre del estudiante, salón, escuela, paquete escogido y precio.

---

**CÓMO SINCRONIZAR DATOS NUEVOS**

En la esquina superior derecha del dashboard verás un selector de colegio y el botón **↻ Sincronizar**:

1. Selecciona un colegio específico (ej: "Colegio La Salle") o elige "Sincronizar Todo".
2. Haz clic en **Sincronizar**. El dashboard realizará una llamada segura al Hub en la nube.
3. El dashboard realiza un **Merge inteligente** en memoria: compara el `student_id` de cada registro descargado contra los que ya tienes guardados localmente.
   - **Estudiantes nuevos**: Se añaden a la lista.
   - **Estudiantes existentes**: Se conservan intactos. Sus pagos registrados y su progreso de entregables **no se sobrescriben ni se pierden**.
4. Tras la sincronización, el banner de advertencia te avisará que tienes cambios pendientes de guardar. Haz clic en **Guardar** para persistir los nuevos alumnos en el `localStorage` de tu navegador.

Esto te permite presionar "Sincronizar" en cualquier momento para descargar tarde-onboardings de forma segura y fluida.

---

**CÓMO GUARDA LA DATA**

El dashboard guarda en dos lugares distintos:

**`localStorage` del browser** es el almacenamiento activo. Cuando haces clic en el botón **Guardar**, el estado completo se graba en el localStorage de tu browser. La próxima vez que abras el archivo HTML en el mismo browser, los datos aparecen automáticamente sin que tengas que importar nada. El botón Guardar cambia a amarillo y aparece el banner de advertencia cada vez que hay cambios no guardados, para recordarte que no has persistido los últimos cambios.

El localStorage tiene una limitación importante: está atado al browser y al archivo. Si cambias de browser, o si mueves el archivo HTML a otra carpeta, el localStorage queda desconectado y los datos no aparecen. Por eso existe el segundo mecanismo.

**El export JSON** es el respaldo portable. El botón **Exportar** descarga un archivo `mmr_dashboard_{fecha}.json` con todo el estado: los estudiantes, el historial completo de pagos, y todos los estados de entregables. Este archivo lo puedes guardar donde quieras, mandarlo por WhatsApp a ti mismo como respaldo, o cargarlo en otra máquina. Cuando lo importas en el dashboard (el mismo botón Importar acepta este formato también), restaura el estado exactamente como estaba cuando lo exportaste.

La práctica recomendada es guardar en localStorage al final de cada sesión de trabajo, y exportar el JSON al menos una vez por semana o antes de hacer cambios grandes.

---

**SEÑALES DE ALERTA**

El banner amarillo en la parte superior que dice "Hay cambios sin guardar" aparece en cuanto modificas cualquier cosa — un pago, un estado, una nota. Desaparece cuando guardas. Si intentas cerrar el browser con ese banner activo, el browser te pregunta si realmente quieres salir antes de que pierdas los cambios.

---

**EJEMPLO DEL OUTPUT — EXPORT JSON**

Cuando haces clic en Exportar, el archivo descargado tiene esta estructura:

```json
{
  "_dashboard": true,
  "_exportado": "2026-04-29T20:15:00.000Z",
  "estudiantes": [
    {
      "student_id": "50760138765_scarla-kalentis_kinder",
      "acudiente": {
        "nombre": "Barquiteño Scaldis",
        "relacion": "papa",
        "whatsapp": "50760138765",
        "codigoPais": "+507",
        "celular": "60138765",
        "email": ""
      },
      "estudiante": {
        "nombre": "Scarla Kalentis",
        "salon": "kinder",
        "escuela_code": "clia",
        "escuela_nombre": "Chiara Lubich International Academy"
      },
      "reserva": {
        "propuesta": "clia-26",
        "paquete": "Paquete 2",
        "precio": 200,
        "timestamp": "2026-04-29T14:32:00.000Z"
      }
    }
  ],
  "estadoFinanz": {
    "50760138765_scarla-kalentis_kinder": {
      "pagos": [
        { "monto": 100, "fecha": "2026-04-29", "nota": "Nequi · captura recibida WA" },
        { "monto": 100, "fecha": "2026-05-03", "nota": "Efectivo en sesión" }
      ]
    }
  },
  "estadoCRM": {
    "50760138765_scarla-kalentis_kinder": {
      "filtrado": true,
      "retocado": true,
      "preparado": false,
      "impreso": false,
      "online": false,
      "notas": "Pedir aprobación del papá antes de imprimir — prefiere fondo blanco"
    }
  }
}
```

---

**CON CUÁLES MÓDULOS SE CONECTA**

El dashboard se conecta dinámicamente con la arquitectura unificada:

**Google Apps Script Hub (`MMR_brochures_hub_v3.9.gs`)** — es su fuente directa de datos en tiempo real. Cuando sincronizas desde la UI, el dashboard consume el endpoint seguro del Hub, eliminando la necesidad de archivos intermediarios, convertidores o descargas manuales de submissions.

**Módulo de Precios y Configuración (`precios.json`)** — el dashboard consume este archivo local para poblar la lista de escuelas de forma automática, garantizando que puedas filtrar y sincronizar exactamente las campañas activas definidas en el catálogo.

**Módulo WhatsApp (Pulso CRM)** — Trabaja en paralelo. Mientras Google Sheets almacena las reservas del Onboarding, el Exportador CSV de Pulso CRM nativo en la hoja de cálculo gestiona los batches de comunicación, y el Dashboard lee la misma fuente unificada para hacer el seguimiento financiero y operativo de las entregas físicas en la escuela.