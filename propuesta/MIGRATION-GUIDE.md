# Guía de Backend — Google Sheets + Discord

## Estado actual del sistema

El sistema ha sido migrado de un modelo de "Descarga Local" a un modelo de "Backend Automático".

```
Frontend (Vercel)
    └── storage.js
            ├── fetchFromAPI()  → fetch('/data/*.json') (Estático)
            └── postToAPI()     → Google Sheets (Base de Datos) + Discord (Aviso)
```

---

## 1. Google Sheets (Base de Datos)

Las submissions del formulario se envían directamente a un **Google Apps Script** que actúa como receptor.

### Configuración del Script
El script debe estar implementado como **Aplicación Web**, ejecutándose como **Yo** y con acceso para **Cualquier persona**.

**URL de destino:** Definida en `config/brochure-config.js` -> `endpoints.submitForm`.

**Campos capturados:**
- Fecha y Hora
- ID de Escuela/Brochure
- Datos del Acudiente (Nombre, WhatsApp, Email, Relación)
- Datos del Estudiante (Nombre, Salón)
- Reserva (Paquete seleccionado y Precio)

---

## 2. Discord (Notificaciones)

El sistema envía un aviso inmediato a Discord cada vez que se recibe un lead.

- **Endpoint:** Configurado en `config/brochure-config.js` -> `endpoints.notifyDiscord`.
- **Formato:** Se envía como un mensaje directo al Webhook de Discord.
- **WhatsApp Link:** El link de WhatsApp se envía envuelto en `<url>` para evitar que Discord genere un banner de vista previa (manteniendo el canal limpio).

---

## 3. Fallbacks y Seguridad

- **no-cors:** Las peticiones a Google Sheets usan `mode: 'no-cors'` para evitar bloqueos del navegador. El sistema asume éxito si la petición se envía correctamente.
- **Sin descarga local:** Se ha deshabilitado la descarga automática de archivos `.json` al PC del usuario para evitar desorden. Discord y Google Sheets son ahora las fuentes de verdad.
- **Timeout:** Las peticiones tienen un tiempo de espera de 8 segundos antes de dar error.

---

## Cómo cambiar la base de datos

Si necesitas cambiar el Google Sheet de destino:
1. Crea un nuevo script con el código de `doPost(e)`.
2. Impleméntalo y obtén la nueva URL.
3. Actualiza `config/brochure-config.js`.
4. Haz push a GitHub/Vercel.

---

## Lo que falta por migrar (Opcional)

| Recurso | Estado actual | Futuro sugerido |
|---------|---------------|-----------------|
| `precios.json` | Estático en `/data` | Google Sheets / Airtable |
| `escuelas.json` | Estático en `/data` | Google Sheets / Airtable |
| `create-contact` | Deshabilitado | Google Contacts API |

---

**Nota:** El sistema es ahora 100% serverless, no requiere mantenimiento de base de datos ni servidores propios.
