/**
 * config.js — Fuente de verdad única para constantes de la app
 * ─────────────────────────────────────────────────────────────
 * REGLA: nada de lógica aquí. Solo valores.
 * Para cambiar cualquier integración, edita SOLO este archivo.
 * No toques api.js, form.js ni ui.js.
 */

const CONFIG = {
  // ── Identidad ─────────────────────────────────────────────
  BRAND_NAME:   'Mi Mejor Retrato',
  PHOTOGRAPHER: 'Mike Morelos',
  LOCATION:     'La Chorrera, Panamá',

  // ── Contacto ──────────────────────────────────────────────
  // Reemplazar con número real: '50760001234'
  WHATSAPP_NUMBER: '50767438951',

  // ── Formulario principal ──────────────────────────────────
  // null → modo desarrollo (guarda en localStorage, simula éxito)
  // Con valor → POST real al endpoint
  //   Ejemplos:
  //     Formspree:        'https://formspree.io/f/TU_ID'
  //     Netlify Function: '/.netlify/functions/contacto'
  FORM_ENDPOINT: null,

  // ── Discord Webhook ───────────────────────────────────────
  // Recibe notificación instantánea cada vez que alguien llena el formulario.
  //
  // PARA DESHABILITAR: cambia el valor a null
  //   DISCORD_WEBHOOK: null,
  //
  // PARA CAMBIAR EL CANAL: reemplaza la URL completa por la nueva.
  //   Cómo obtener una nueva URL:
  //   Discord → Configuración del canal → Integraciones → Webhooks → Nuevo Webhook
  //
  // ⚠️  IMPORTANTE — SEGURIDAD:
  //   Esta URL es pública en el código del navegador.
  //   Cualquiera que la vea puede enviar mensajes a tu Discord.
  //   Si eso te preocupa en el futuro, muévela a una Netlify Function
  //   y avísame — te armo el archivo en 5 minutos.
  //   Por ahora, para un sitio de fotografía personal, es aceptable.
  DISCORD_WEBHOOK: 'https://discord.com/api/webhooks/1462342214784122910/Jb1xTH6lIgsvYFtNasSxHnpCmSD1FKh4b5MC2ql58L50qfccKxRLc5W4V4pPeOSs3nVN',

  // ── Email (preparado, NO activo todavía) ──────────────────
  // El correo se enviará a esta dirección cuando actives el envío.
  //
  // ESTADO ACTUAL: DESACTIVADO
  //   En api.js la función _enviarEmail() existe pero no se llama.
  //   Cuando quieras activarlo:
  //     1. Crea cuenta en EmailJS (emailjs.com) — plan gratuito ok
  //     2. Conecta tu Gmail: mimejorretratopa@gmail.com
  //     3. Crea una plantilla con variables: {{nombre}}, {{celular}}, {{escuela}}, {{mensaje}}
  //     4. Llena los tres valores de abajo
  //     5. En api.js, descomenta la línea: await _enviarEmail(data);
  //
  //   Alternativa sin EmailJS: usar Formspree en FORM_ENDPOINT
  //   (Formspree envía email automáticamente al recibir el formulario)
  EMAIL_DESTINO:        'mimejorretratopa@gmail.com',
  EMAILJS_SERVICE_ID:   null,   // Ej: 'service_xxxxxxx'  ← llenar cuando actives
  EMAILJS_TEMPLATE_ID:  null,   // Ej: 'template_xxxxxxx' ← llenar cuando actives
  EMAILJS_PUBLIC_KEY:   null,   // Ej: 'xxxxxxxxxxxxxxx'  ← llenar cuando actives

  // ── localStorage ──────────────────────────────────────────
  // Prefijo para aislar keys de esta app en el navegador
  STORAGE_PREFIX: 'mmr_',

  // ── Debug ─────────────────────────────────────────────────
  // true  → todos los módulos muestran logs en consola con prefijo [Api], [Storage], etc.
  // false → silencio total (usar en producción)
  DEBUG: true,
};

window.APP_CONFIG = CONFIG;
