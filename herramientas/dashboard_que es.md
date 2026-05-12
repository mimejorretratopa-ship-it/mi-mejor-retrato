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

El dashboard no captura datos por sí solo. Se alimenta desde afuera a través del proceso de importación.

La fuente de datos es el `estudiantes.json` que genera la herramienta `json_a_csv.html`. Ese archivo se produce cuando procesas las submissions del brochure — los formularios que llenaron los papás en la página web. El `estudiantes.json` contiene la información de cada cliente: nombre del acudiente, relación, WhatsApp, nombre del estudiante, salón, escuela, paquete escogido, y precio.

---

**CÓMO IMPORTAR DATOS NUEVOS**

Haces clic en el botón **Importar** en la esquina superior derecha. Seleccionas el `estudiantes.json` que generaste con el conversor.

El dashboard hace un merge — no sobreescribe. Compara cada `student_id` del archivo entrante contra los que ya existen en memoria. Los estudiantes que ya están registrados se ignoran completamente: sus pagos y estados de entregables no se tocan. Solo se agregan los que son nuevos. El toast te confirma cuántos se agregaron y cuántos ya existían.

Esto significa que puedes importar un `estudiantes.json` nuevo cada vez que llegan submissions sin miedo a perder el historial de pagos o los estados de producción que ya registraste.

Si importas el mismo archivo dos veces, el dashboard detecta que todos los `student_id` ya existen y muestra "Sin cambios — X ya existían". Nada se modifica.

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

El dashboard se conecta con dos módulos:

**Módulo Conversor (`json_a_csv.html`)** — es su única fuente de datos de entrada. El conversor procesa las submissions del brochure y produce el `estudiantes.json` que el dashboard importa. Sin el conversor no hay forma de agregar estudiantes al dashboard salvo editando un JSON a mano.

**Módulo Brochure (los HTMLs en Netlify)** — es la fuente original de todo. Los papás llenan el formulario en el brochure, eso genera una submission, tú la descargas de Netlify Blobs, la procesas en el conversor, y de ahí llega al dashboard. El brochure no se comunica directamente con el dashboard — siempre pasa por el conversor en el medio.

El dashboard no tiene conexión con el Módulo WhatsApp. El CSV para WhatsApp lo genera el conversor de forma independiente. Son dos outputs distintos del mismo proceso de conversión — el CSV va a WhatsApp, el JSON viene al dashboard.