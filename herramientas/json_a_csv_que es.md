**CUÁNDO SE USA**

Cada vez que recibes submissions nuevas del brochure y necesitas hacer algo con esos datos — escribirle a los papás por WhatsApp, actualizar el dashboard de finanzas, o registrar nuevos estudiantes.

El flujo típico es: llega una notificación a Discord, ves el resumen ahí, pero los datos completos están en Netlify Blobs. Cuando ya tienes un lote de submissions que procesar — no tiene que ser uno por uno, puedes acumularlo — bajas los JSONs y los pasas por esta herramienta.

---

**CÓMO SE USA**

Primero bajas los JSONs del panel de admin de Netlify. Son los archivos que generó el formulario cuando los papás enviaron sus datos. Cada submission es un archivo JSON.

Abres `herramientas/json_a_csv.html` en tu browser de Windows 11 directamente — doble clic en el archivo, se abre en Chrome o Edge, sin servidor, sin instalación.

Arrastras los JSONs descargados al área de drop, o haces clic y los seleccionas con el file picker. Puedes soltar varios a la vez — de diferentes escuelas, de diferentes fechas, no importa.

La herramienta los procesa instantáneamente y muestra la tabla con todos los registros. Revisas que los datos se vean bien y que los duplicados marcados en amarillo sean efectivamente duplicados y no errores.

Cuando la tabla se ve correcta, haces clic en **Descargar CSV**. Ese archivo va directo a tu app de WhatsApp existente para generar los mensajes.

Luego haces clic en **Descargar estudiantes.json**. Ese archivo lo importas en el dashboard para que aparezcan los nuevos estudiantes en las pestañas de finanzas y entregables.

---

**LOS DUPLICADOS**

Aparecen marcados en amarillo cuando el mismo `student_id` aparece más de una vez en los archivos que subiste. Eso puede pasar por dos razones: subiste el mismo JSON dos veces por accidente, o el mismo papá envió el formulario dos veces.

Los duplicados se incluyen en las descargas con una marca `_dup: true`. En el CSV simplemente aparecen como filas repetidas — tu app de WhatsApp los mostraría dos veces, así que revisa y borra la fila duplicada del CSV antes de usarlo. En el `estudiantes.json` el dashboard los muestra marcados para que tú decidas si los conservas o los eliminas.

---

**CON QUÉ FRECUENCIA**

No hay una frecuencia fija. Lo usas cuando tú decides que ya tienes suficientes submissions para procesar. Puede ser todos los días durante la semana de la sesión fotográfica, o una vez a la semana en temporada tranquila. La herramienta no tiene memoria — cada vez que la abres empieza en blanco. El botón Limpiar hace lo mismo si quieres empezar de nuevo sin cerrar el browser.

---

**LO QUE NO HACE**

No sube nada a ningún servidor. No necesita internet. No recuerda qué archivos ya procesaste — eso lo llevas tú manualmente o con el registro de descargas del panel de admin. No valida si los datos del JSON son correctos — si un papá puso un teléfono mal, aparecerá mal en el CSV.