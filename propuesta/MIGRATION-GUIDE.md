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
Las submissions se envían a un **Google Apps Script** que actúa como receptor y repartidor (Hub).

## 2. Airtable (Gestión CRM)
Integrado vía el Hub de Google. 
- **Base ID:** `appVXT9GPLoKT15YJ`
- **Tabla:** `Leads`
- **Columnas:** Fecha, Colegio, Acudiente, Relacion, Estudiante, Salon, WhatsApp, Paquete, Precio, Email, ID.

## 3. Google Contacts (Agenda)
Integrado vía el Hub de Google.
- **Formato:** `Nombre : Estudiante - COLEGIO AÑO SALON`
- **Grupo:** `MMR Leads 2026`

## 4. Discord (Notificaciones)
Notificaciones inmediatas con link de WhatsApp limpio (`<url>`).

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
