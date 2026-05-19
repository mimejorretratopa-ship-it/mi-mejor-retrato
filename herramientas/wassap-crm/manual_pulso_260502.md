# Pulso — Manual de usuario
**Mi Mejor Retrato · Versión 2 · 2026**

---

## Acerca de Pulso

Pulso es una herramienta local que corre en tu computadora sin necesidad de servidor ni internet. Organiza campañas de mensajes de WhatsApp: agrupa contactos por escuela o proyecto, aplica templates personalizados con el nombre del acudiente y del estudiante, y lleva registro de quién recibió qué mensaje.

Funciona completamente fuera de línea. Los datos se guardan en archivos JSON en la carpeta que elijas, o en la memoria del navegador si no conectas una carpeta.

**Requisito:** Google Chrome o Microsoft Edge. No funciona en Firefox ni Safari.

---

## 1. Primeros pasos

### 1.1 Abrir la aplicación

Abre `index.html` con Chrome o Edge. Arrastra el archivo a una ventana del navegador o haz doble clic si Chrome es tu navegador por defecto.

### 1.2 Conectar la carpeta de archivos

La primera vez verás el botón **Conectar archivos** en la barra superior. Conectar una carpeta hace que todos tus datos persistan entre sesiones en archivos JSON en tu computadora.

1. Haz clic en **Conectar archivos**
2. Selecciona la carpeta donde tienes `campaigns.json`, `contactLists.json`, `templates.json` y `state.json`
3. Acepta el permiso de acceso que pide el navegador
4. El punto en la barra superior cambia de naranja a verde — conexión activa

> **Nota:** Sin carpeta conectada los datos se guardan en localStorage del navegador y pueden perderse si limpias el caché. Se recomienda siempre conectar la carpeta.

### 1.3 Indicador de guardado

Cada vez que Pulso escribe datos aparece brevemente en la barra superior:

- **Punto naranja parpadeante** — guardando
- **Punto verde + "guardado"** — operación exitosa
- **Punto rojo + aviso** — error al guardar (reconectar la carpeta)

### 1.4 Pantalla de inicio

La pantalla principal muestra tres áreas:

- **Banner naranja** (si aplica) — contactos sin respuesta hace más de 3 días que requieren seguimiento
- **Campañas activas** — con barra de progreso, botones de acción, y acceso rápido a notas y estadísticas
- **Acciones** — crear campaña nueva o ir a Recursos

---

## 2. Recursos

Los recursos son los bloques con los que construyes campañas: listas de contactos y templates de mensajes. Accede desde el botón **Recursos** en la pantalla de inicio.

### 2.1 Listas de contactos

Una lista de contactos es un CSV importado con los datos de acudientes y estudiantes.

#### Formato del CSV

| Columna | Ejemplo | Descripción |
|---|---|---|
| `Acudiente` | María García | Nombre del padre, madre o tutor |
| `Relación` | mama / papa | Relación con el estudiante |
| `Teléfono` | 60138765 | Número local (sin código de país) |
| `Estudiante` | Ana García | Nombre completo del estudiante |
| `Salón` | Kínder A | Grado y sección |
| `Escuela` | clia | Código o nombre de la escuela |

El teléfono puede incluir guiones (`6013-8765`). Pulso los elimina y agrega `+507` automáticamente.

#### Importar una lista

1. Ve a **Recursos → Listas de contactos → + Importar CSV**
2. Escribe un nombre descriptivo (ej. "Chiara Lubich — Kínder 2026")
3. Arrastra el CSV al área señalada o haz clic para seleccionarlo
4. Revisa el preview y haz clic en **Guardar lista**

#### Ver y editar contactos

Cada lista en Recursos es expandible. Haz clic en la fila para desplegar la tabla de contactos con tres columnas editables: **Acudiente**, **Teléfono**, y **Estudiante · Salón**. Edita cualquier celda directamente y haz clic en **✓** para guardar los cambios.

> Una lista en uso por una campaña activa no se puede borrar — aparece etiquetada como "en uso".

---

### 2.2 Templates de mensajes

Un template define los mensajes que se envían. Puede tener uno o varios mensajes en secuencia.

#### Variables disponibles

| Variable | Se reemplaza con |
|---|---|
| `[saludo]` | "Buen día", "Buenas tardes" o "Buenas noches" según la hora |
| `[tratamiento]` | "Sr." si es papá, "Sra." si es mamá, "Sr.(a)" si es acudiente |
| `[cliente_nombre]` | Nombre del acudiente |
| `[hijo_nombre]` | Nombre del estudiante |
| `[link_onboarding]`| Link automático hacia el cuestionario pre-configurado para el alumno (crea y vincula el `student_id`). |
| `[link_fotos]` | Link de la galería (columna opcional en el CSV) |
| `[nota_especial]` | Nota manual del caso especial |

#### Mensajes de cierre

Un mensaje marcado como **cierre** finaliza la conversación con ese contacto. Cuando se envía, el contacto queda completado aunque queden otros mensajes sin enviar. Úsalo para respuestas negativas, confirmaciones finales, o cualquier mensaje que indique que no hay más acción a tomar.

#### Crear un template nuevo

1. Ve a **Recursos → Templates → + Nuevo**
2. Escribe el nombre del template
3. Escribe el texto del primer mensaje usando las variables si aplica
4. Haz clic en **+ Agregar mensaje** para agregar más mensajes a la secuencia
5. Marca **"Este es un mensaje de cierre"** en los mensajes que terminan la conversación
6. Opcionalmente escribe un mensaje para caso especial
7. Haz clic en **Guardar template**

#### Importar template desde archivo .txt

1. Ve a **Recursos → Templates → ↑ Importar .txt**
2. Selecciona tu archivo `.txt`
3. Pulso divide el texto en bloques separados por línea en blanco — cada bloque se convierte en un mensaje
4. Los bloques con frases como "no hay ningún problema" o "lo entiendo" se marcan automáticamente como cierre

> **Formato .txt:** separa cada mensaje con una línea en blanco. Los saltos de línea dentro de un bloque se preservan.

También puedes importar un archivo `.json` exportado de Pulso — se detecta automáticamente.

#### Editar un template existente

Haz clic en el botón **✎** junto al template en Recursos. Abre el editor con todos los mensajes cargados. Puedes modificar textos, agregar o eliminar mensajes, y cambiar cuáles son de cierre.

> Si el template está en uso por una campaña activa, al guardar se crea una copia con el sufijo "(editado)" — el original no se modifica.

#### Duplicar un template

Botón **⎘** junto al template. Crea una copia con el sufijo "(copia)" inmediatamente.

#### Vista previa del template

Botón **👁** junto al template. Abre un modal que muestra los mensajes con las variables resueltas usando datos reales. Puedes seleccionar una lista del desplegable para ver el mensaje con el primer contacto de esa lista, o buscar un contacto específico por nombre.

---

## 3. Crear una campaña

Una campaña conecta una lista de contactos con un template. El wizard guía el proceso en tres pasos.

### Paso 1 — Contactos

Tienes dos opciones:

- **Subir un CSV nuevo:** arrastra el archivo al área señalada. Se muestra un preview para confirmar que los datos son correctos. La lista se guarda automáticamente al lanzar la campaña.
- **Usar una lista guardada:** aparece en la parte inferior del paso. Haz clic para seleccionarla.

### Paso 2 — Mensaje

Los templates guardados aparecen como tarjetas seleccionables con un **✓** verde al hacer clic. Si no tienes ninguno o quieres crear uno nuevo, haz clic en **+ Crear template nuevo** para desplegar un editor rápido dentro del wizard — el template también queda guardado para futuras campañas.

### Paso 3 — Confirmar

Revisa el resumen (lista + template + conteo de contactos). El nombre de la campaña se pre-llena con el nombre de la lista. Haz clic en **🚀 Lanzar campaña** para entrar directamente al workspace.

---

## 4. Enviar mensajes — el workspace

El workspace muestra un contacto a la vez con los mensajes del template personalizados.

### 4.1 Barra de filtros

Encima de la tarjeta hay una barra con búsqueda y filtros:

| Filtro | Muestra |
|---|---|
| **Pendientes** | Contactos sin completar (default al abrir) |
| **Todos** | Todos los contactos de la campaña |
| **Completados** | Solo los ya completados |
| **Especiales** | Solo los marcados como caso especial |
| **⏰ Sin respuesta** | Contactos con al menos un mensaje enviado hace +3 días y sin cierre |

El contador de la derecha muestra cuántos contactos coinciden con el filtro activo.

### 4.2 Barra de progreso

La barra superior del workspace muestra cuántos contactos están completados del total. Se actualiza en tiempo real.

### 4.3 Tarjeta de contacto

Cada tarjeta muestra:

- **Encabezado:** nombre del acudiente (tachado si está completado), estudiante, salón, escuela, y posición actual en el filtro (ej. "3 de 8")
- **Badge de estado:** Pendiente / Caso especial / ✓ Completado
- **Mensajes:** uno o más bloques de texto editables. Si editas el texto antes de enviar, aparece un indicador "✎ editado"
- **Botón Enviar:** abre WhatsApp con el número y el texto pre-cargados
- **Log de conversación:** al pie de la tarjeta, campo para agregar notas de seguimiento

### 4.4 Enviar un mensaje

1. Lee el texto del mensaje. Edítalo si necesitas ajustar algo para este contacto
2. Haz clic en **↗ Enviar** (o **↗ Enviar cierre** si es un mensaje de cierre)
3. WhatsApp se abre con el número y el texto listos — envía desde WhatsApp
4. Vuelve a Pulso — el mensaje queda marcado como enviado
5. Si el contacto queda completado, Pulso avanza automáticamente al siguiente pendiente

> **Importante:** Pulso no envía mensajes por sí solo. Siempre envías tú manualmente desde WhatsApp.

### 4.5 Mensajes de cierre

Los mensajes de cierre tienen borde de color diferente y la etiqueta "Finaliza conversación". Al enviar uno, el contacto queda completado.

### 4.6 Modo masivo (☰ Masivo)

Para campañas donde el mensaje es genérico e igual para todos, el botón **☰ Masivo** en la barra superior cambia la vista de tarjeta individual a una tabla compacta con todos los contactos. Cada fila tiene un botón **↗ Enviar** que abre WhatsApp y marca el envío. Un selector permite elegir qué mensaje de la secuencia enviar. Los contactos ya enviados aparecen tachados.

Ideal para recordatorios de fecha de sesión o avisos donde no es necesario revisar cada mensaje individualmente.

### 4.7 Log de conversación

Al pie de cada tarjeta hay un campo de texto para anotar el resultado real de la conversación: "Respondió que sí", "Número incorrecto", "Llamar el viernes". Presiona Enter o haz clic en **+ Nota** para guardar. Las notas aparecen en orden cronológico inverso con fecha y hora, y persisten junto al historial de envíos.

### 4.8 Casos especiales

El botón **⚑ Marcar caso especial** en el pie de cada tarjeta abre un modal para agregar una nota interna. El contacto mostrará entonces el mensaje especial del template (si está configurado) en lugar de la secuencia normal. La nota se inserta automáticamente como `[nota_especial]`.

Para quitar el caso especial, haz clic en **✏ Editar caso especial** y luego en **Quitar caso especial**.

### 4.9 Reiniciar un contacto

El botón **↺ Reiniciar** aparece en las tarjetas de contactos completados. Borra el historial de envíos de ese contacto y lo regresa a estado pendiente.

### 4.10 Pantalla de cierre

Cuando todos los contactos están completados el workspace muestra una pantalla de confirmación. Desde ahí puedes volver al inicio o revisar los contactos enviados cambiando el filtro a **Todos**.

---

## 5. Gestión de campañas

### 5.1 Notas de campaña

El botón **📝** en cada fila de campaña abre un modal de notas internas: fecha de sesión, acuerdos, número del coordinador, etc. Si hay una nota guardada, el primer renglón aparece como preview en la fila de la campaña.

### 5.2 Estadísticas

El botón **◑** en cada fila de campaña abre un panel con:

- Total de contactos, completados, pendientes, y mensajes enviados
- Barra de progreso general
- Porcentaje de completados que llegaron a mensaje de cierre
- Porcentaje de casos especiales
- Fecha del primer y último envío
- Promedio de mensajes por contacto completado

### 5.3 Archivar campañas

Las campañas completadas muestran un botón **Archivar**. Las campañas archivadas desaparecen de la lista principal y se agrupan en una sección colapsable **Archivadas** al fondo, con botón **↑ Restaurar**.

### 5.4 Recordatorio de no respondidos

Si un contacto recibió al menos un mensaje hace más de 3 días y no tiene cierre enviado, aparece un **banner naranja** en la pantalla de inicio indicando cuántos contactos están en esa situación y en qué campaña. Hacer clic en el banner abre el workspace directamente en el filtro **⏰ Sin respuesta**.

---

## 6. Datos y persistencia

### 6.1 Exportar

El botón **↓ Exportar** en la barra superior descarga los cuatro archivos JSON:

- `contactLists.json` — todas las listas de contactos
- `templates.json` — todos los templates
- `campaigns.json` — todas las campañas (incluyendo notas y estado de archivo)
- `state.json` — historial de envíos, logs de conversación y casos especiales

Exporta regularmente como respaldo, especialmente antes de limpiar el navegador.

### 6.2 Importar

El botón **↑ Importar** acepta uno o varios archivos JSON exportados. Pulso identifica cada archivo por su nombre y restaura los datos correspondientes.

> Importar reemplaza los datos actuales del mismo tipo. Puedes importar solo uno de los archivos si solo necesitas restaurar esa parte.

### 6.3 Borrar elementos

El botón **✕** en cada fila pide confirmación antes de borrar. No se puede borrar una lista o un template que esté en uso por una campaña activa — primero hay que borrar la campaña.

---

## 7. Flujos de uso típicos

### Primera vez con una nueva escuela

1. Conectar carpeta de archivos (botón en barra superior)
2. **Recursos → Templates → ↑ Importar .txt** — cargar el archivo de mensajes
3. **Inicio → Nueva campaña**
4. Paso 1: subir el CSV de la escuela
5. Paso 2: seleccionar el template importado
6. Paso 3: nombrar y lanzar
7. Enviar desde el workspace

### Segunda escuela con template existente

1. **Inicio → Nueva campaña**
2. Paso 1: subir el CSV de la nueva escuela
3. Paso 2: seleccionar el template guardado (aparece como tarjeta)
4. Lanzar y enviar

### Retomar una campaña en progreso

1. En el inicio hacer clic en **Enviar →** en la fila de la campaña
2. El workspace abre en el primer contacto pendiente
3. Continuar desde donde se dejó

### Contacto que responde no

1. Localizar el contacto (navegar con flechas o buscar por nombre)
2. Hacer clic en **↗ Enviar cierre**
3. El contacto queda completado

### Contacto con situación particular

1. Abrir la tarjeta del contacto
2. Hacer clic en **⚑ Marcar caso especial**
3. Escribir una nota interna
4. Enviar el mensaje especial del template

### Anotar el resultado de una conversación

1. Abrir la tarjeta del contacto
2. Escribir en el campo de log al pie de la tarjeta
3. Presionar Enter o hacer clic en **+ Nota**

### Envío masivo de aviso genérico

1. Abrir la campaña
2. Hacer clic en **☰ Masivo** en la barra superior
3. Seleccionar el mensaje que quieres enviar en el selector
4. Hacer clic en **↗ Enviar** fila por fila
5. Los enviados quedan tachados automáticamente

### Seguimiento de contactos sin respuesta

1. En el inicio, hacer clic en el **banner naranja** si aparece
2. El workspace abre directamente en el filtro **⏰ Sin respuesta**
3. Navegar entre los contactos pendientes y hacer seguimiento

---

## 8. Referencia rápida

| Acción | Dónde |
|---|---|
| Conectar carpeta de datos | Barra superior → punto naranja → Conectar archivos |
| Importar lista CSV | Recursos → Listas → + Importar CSV |
| Ver / editar contactos de una lista | Recursos → Listas → clic en la fila para expandir |
| Importar template desde .txt | Recursos → Templates → ↑ Importar .txt |
| Crear template nuevo | Recursos → Templates → + Nuevo |
| Editar template existente | Recursos → Templates → ✎ |
| Duplicar template | Recursos → Templates → ⎘ |
| Vista previa del template | Recursos → Templates → 👁 |
| Nueva campaña | Inicio → Nueva campaña |
| Abrir workspace de una campaña | Inicio → fila de campaña → Enviar → |
| Notas de campaña | Inicio → fila de campaña → 📝 |
| Estadísticas de campaña | Inicio → fila de campaña → ◑ |
| Archivar campaña completada | Inicio → fila de campaña → Archivar |
| Restaurar campaña archivada | Inicio → sección Archivadas → ↑ Restaurar |
| Filtrar contactos en workspace | Workspace → barra de filtros |
| Buscar contacto por nombre | Workspace → campo de búsqueda |
| Modo masivo | Workspace → barra superior → ☰ Masivo |
| Agregar nota de conversación | Workspace → tarjeta → campo log al pie → Enter |
| Marcar caso especial | Workspace → tarjeta → ⚑ Marcar caso especial |
| Reiniciar contacto completado | Workspace → tarjeta → ↺ Reiniciar |
| Ver contactos sin respuesta | Workspace → filtro ⏰ Sin respuesta |
| Exportar todos los datos | Barra superior → ↓ Exportar |
| Importar datos de respaldo | Barra superior → ↑ Importar |
| Borrar lista o template | Recursos → fila del elemento → ✕ |
| Borrar campaña | Inicio → fila de campaña → ✕ |

---

## 9. Preguntas frecuentes

**¿Pulso necesita internet?**
No. La única excepción es que WhatsApp Web requiere internet para enviar — pero eso es externo a Pulso.

**¿Puedo usar Pulso en varios computadores?**
Sí, exportando los JSON desde un equipo e importándolos en el otro. No hay sincronización automática.

**¿Qué pasa si cierro el navegador a mitad de una campaña?**
Si tienes la carpeta conectada no pierdes nada — el estado se guarda en tiempo real. Al volver, el workspace retoma desde el primer contacto pendiente.

**¿Puedo tener varias campañas activas al mismo tiempo?**
Sí. Pulso maneja múltiples campañas en paralelo. Puedes alternar entre ellas libremente desde el inicio.

**¿El modo masivo y el modo normal comparten el mismo historial?**
Sí. Un mensaje marcado como enviado en modo masivo aparece como enviado en la tarjeta individual y viceversa.

**¿Las notas del log de conversación se pueden borrar?**
No desde la interfaz — se diseñaron como registro permanente. Para borrar una nota hay que editar `state.json` directamente y eliminar la entrada del array `log` del contacto correspondiente.

**¿Puedo editar el texto del mensaje antes de enviarlo?**
Sí. El texto en el workspace es editable antes de hacer clic en Enviar. Si lo modificas aparece un indicador "✎ editado". El historial guarda el texto final enviado.

**¿Cómo sé que el indicador de guardado funcionó?**
El punto en la barra superior se pone verde y aparece el texto "guardado" brevemente. Si aparece rojo, reconecta la carpeta con el botón "Conectar archivos".

**¿El umbral de 3 días del banner de seguimiento es configurable?**
No desde la interfaz. Está definido como la constante `DAYS` en el código JavaScript del archivo `index.html`. Para cambiarlo, abre el archivo con un editor de texto, busca `const DAYS = 3` y cambia el número.

**¿Qué pasa si importo un JSON y ya tenía datos?**
Los datos del mismo tipo se reemplazan completamente. Por ejemplo, si importas `campaigns.json`, todas las campañas actuales se reemplazan con las del archivo. Exporta antes de importar si quieres conservar lo que tienes.

---

*Pulso — Mi Mejor Retrato · 2026*
