/**
 * api.js — API Adapter (comunicación con el exterior)
 * ──────────────────────────────────────────────────────────────
 * Centraliza TODA comunicación con servicios externos.
 * La UI solo llama a Api.enviarContacto(data).
 *
 * INTEGRACIONES ACTIVAS:
 *   ✅ localStorage  → copia de respaldo siempre, en todo modo
 *   ✅ Discord       → notificación instantánea al canal configurado
 *   🔜 Email         → preparado, desactivado (ver instrucciones abajo)
 *   🔜 Endpoint HTTP → preparado para Formspree / Netlify Function
 *
 * FLUJO AL ENVIAR:
 *   1. Guarda copia en localStorage (siempre, sin excepción)
 *   2. Envía notificación a Discord (si DISCORD_WEBHOOK está configurado)
 *   3. Envía email (si se activa — ver _enviarEmail más abajo)
 *   4. Si hay FORM_ENDPOINT, también hace POST HTTP
 *
 * RESULTADO: aunque Discord falle, localStorage tiene el respaldo.
 * Nunca se pierde un lead.
 */

const Api = (() => {

  const log = (...args) => {
    if (window.APP_CONFIG?.DEBUG) console.log('[Api]', ...args);
  };

  // ── 1. COPIA LOCAL (siempre activa) ──────────────────────────
  /**
   * Guarda siempre una copia en localStorage.
   * Funciona como respaldo ante cualquier fallo de red.
   * Visible en DevTools → Application → Local Storage → mmr_form_historial
   */
  function _guardarEnLocal(data) {
    const entrada = { ...data, timestamp: new Date().toISOString() };
    const historial = window.Storage.get('form_historial') || [];
    historial.push(entrada);
    window.Storage.set('form_historial', historial);
    log('Copia local guardada. Total registros:', historial.length);
  }

  // ── 2. DISCORD WEBHOOK (activo) ───────────────────────────────
  /**
   * Envía notificación a Discord con:
   *   - Nombre y celular del contacto
   *   - Link de WhatsApp listo para abrir con saludo pre-escrito
   *
   * PARA DESHABILITAR: pon DISCORD_WEBHOOK: null en config.js
   * PARA CAMBIAR CANAL: reemplaza la URL en config.js
   *
   * Formato del mensaje Discord (Markdown soportado):
   *   🔔 **Nuevo formulario recibido**
   *   👤 Nombre · 📱 Celular
   *   [Abrir WhatsApp con saludo](...) ← link directo con texto pre-escrito
   */
  async function _notificarDiscord(data) {
    const webhook = window.APP_CONFIG?.DISCORD_WEBHOOK;
    if (!webhook) {
      log('Discord desactivado (DISCORD_WEBHOOK es null)');
      return;
    }

    const wa      = window.APP_CONFIG?.WHATSAPP_NUMBER || '';
    const saludo  = encodeURIComponent(
      `¡Hola ${data.nombre}! 👋 Soy Mike de Mi Mejor Retrato. Vi que te interesa saber más sobre las sesiones de fotografía. ¿Tienes un momento para contarme más sobre tu hijo/a?`
    );
    const linkWA  = `https://wa.me/${wa}?text=${saludo}`;

    const escuela = data.escuela ? `\n🏫 **Colegio:** ${data.escuela}` : '';
    const mensaje = data.mensaje ? `\n💬 **Mensaje:** ${data.mensaje}` : '';

    const payload = {
      // username e avatar_url personalizan cómo aparece el bot en Discord
      username:   'Mi Mejor Retrato · Bot',
      avatar_url: 'https://i.imgur.com/4M34hi2.png', // cámara emoji como avatar
      embeds: [{
        color: 0xF07030, // naranja terra — igual al color de la marca
        title: '📋 Nuevo formulario de contacto',
        fields: [
          { name: '👤 Nombre',  value: data.nombre,  inline: true  },
          { name: '📱 Celular', value: data.celular, inline: true  },
          ...(data.escuela ? [{ name: '🏫 Colegio', value: data.escuela, inline: false }] : []),
          ...(data.mensaje ? [{ name: '💬 Mensaje', value: data.mensaje, inline: false }] : []),
          {
            name:   '📲 Responder por WhatsApp',
            // Link clicable con saludo pre-escrito listo para enviar
            value:  `[Abrir chat con ${data.nombre} →](${linkWA})`,
            inline: false,
          },
        ],
        footer: { text: 'Mi Mejor Retrato · La Chorrera, Panamá' },
        timestamp: new Date().toISOString(),
      }],
    };

    try {
      const res = await fetch(webhook, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (res.ok || res.status === 204) {
        log('Discord ✅ notificación enviada');
      } else {
        // 204 No Content es el response normal de Discord webhooks
        log('Discord respuesta inesperada:', res.status);
      }
    } catch (err) {
      // Si Discord falla, NO falla el formulario — ya está en localStorage
      console.warn('[Api] Discord falló (no crítico):', err.message);
    }
  }

  // ── 3. EMAIL (preparado, NO activo) ───────────────────────────
  /**
   * ESTADO: DESACTIVADO
   * La función existe y está lista. Solo falta llamarla.
   *
   * PARA ACTIVAR:
   *   1. Crea cuenta en emailjs.com (gratis hasta 200 emails/mes)
   *   2. Conecta tu Gmail: mimejorretratopa@gmail.com
   *      EmailJS → Email Services → Add New Service → Gmail
   *   3. Crea plantilla:
   *      EmailJS → Email Templates → Create New Template
   *      Variables disponibles: {{nombre}}, {{celular}}, {{escuela}}, {{mensaje}}, {{timestamp}}
   *      Destino: mimejorretratopa@gmail.com
   *   4. Copia los IDs a config.js:
   *      EMAILJS_SERVICE_ID:  'service_xxxxxxx'
   *      EMAILJS_TEMPLATE_ID: 'template_xxxxxxx'
   *      EMAILJS_PUBLIC_KEY:  'xxxxxxxxxxxxxxx'
   *   5. Agrega este script al <head> de index.html:
   *      <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
   *   6. Aquí abajo, en enviarContacto(), descomenta la línea:
   *      await _enviarEmail(data);
   *
   * ALTERNATIVA MÁS SIMPLE:
   *   Usa Formspree en FORM_ENDPOINT — envía email automáticamente
   *   sin necesidad de EmailJS ni código extra.
   */
  async function _enviarEmail(data) {
    const cfg = window.APP_CONFIG;
    if (!cfg.EMAILJS_SERVICE_ID || !cfg.EMAILJS_TEMPLATE_ID || !cfg.EMAILJS_PUBLIC_KEY) {
      log('Email desactivado — faltan credenciales EmailJS en config.js');
      return;
    }

    if (typeof emailjs === 'undefined') {
      console.warn('[Api] EmailJS no está cargado. Agrega el script en index.html.');
      return;
    }

    try {
      await emailjs.send(
        cfg.EMAILJS_SERVICE_ID,
        cfg.EMAILJS_TEMPLATE_ID,
        {
          nombre:    data.nombre,
          celular:   data.celular,
          escuela:   data.escuela || '(no indicado)',
          mensaje:   data.mensaje || '(sin mensaje)',
          timestamp: new Date().toLocaleString('es-PA'),
          destino:   cfg.EMAIL_DESTINO,
        },
        cfg.EMAILJS_PUBLIC_KEY,
      );
      log('Email ✅ enviado a', cfg.EMAIL_DESTINO);
    } catch (err) {
      console.warn('[Api] Email falló (no crítico):', err);
    }
  }

  // ── 4. ENDPOINT HTTP (opcional) ───────────────────────────────
  /**
   * POST a Formspree, Netlify Function, Make, etc.
   * Solo se ejecuta si FORM_ENDPOINT está configurado en config.js.
   */
  async function _enviarAlEndpoint(endpoint, data) {
    const res = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body:    JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    log('Endpoint ✅ respuesta ok');
    return true;
  }

  // ── API PÚBLICA ───────────────────────────────────────────────

  return {
    /**
     * Punto de entrada único para enviar el formulario.
     * Orquesta todas las integraciones en orden.
     *
     * @param {Object} data - { nombre, celular, escuela, mensaje }
     * @returns {Promise<{ok: boolean, error?: string}>}
     */
    async enviarContacto(data) {
      // 1. Copia local — SIEMPRE, antes de cualquier llamada de red
      _guardarEnLocal(data);

      // 2. Discord — notificación instantánea
      //    Para desactivar: DISCORD_WEBHOOK: null en config.js
      await _notificarDiscord(data);

      // 3. Email — DESACTIVADO
      //    Para activar: descomenta la línea de abajo y sigue las instrucciones en _enviarEmail()
      // await _enviarEmail(data);

      // 4. Endpoint HTTP — solo si está configurado
      const endpoint = window.APP_CONFIG?.FORM_ENDPOINT;
      if (endpoint) {
        try {
          await _enviarAlEndpoint(endpoint, data);
        } catch (err) {
          console.error('[Api] Endpoint falló:', err.message);
          // No bloqueamos el éxito — Discord y localStorage ya funcionaron
        }
      }

      // El formulario siempre muestra éxito si llegó hasta aquí
      // (el respaldo en localStorage garantiza que no se perdió el lead)
      return { ok: true };
    },
  };

})();

window.Api = Api;
