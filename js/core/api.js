/**
 * api.js — API Adapter (comunicación con el exterior)
 * ──────────────────────────────────────────────────────────────
 * Centraliza toda comunicación con servicios externos (Sheets, Discord, Emails).
 */

const Api = (() => {

  const log = (...args) => {
    if (window.config?.features?.debug) console.log('[API]', ...args);
  };

  /**
   * Helper genérico para POST
   * NOTA: Usamos 'text/plain' para Google Apps Script (evita CORS preflight)
   * pero 'application/json' para Discord (que es más estricto).
   */
  async function _post(url, data) {
    const isGAS = url.includes('script.google.com');
    
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: { 
        'Content-Type': isGAS ? 'text/plain' : 'application/json' 
      },
      body: JSON.stringify(data)
    });
    
    // Discord retorna 204 No Content
    if (response.status === 204) return { ok: true };
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }
    
    try {
      const text = await response.text();
      return text ? JSON.parse(text) : { ok: true };
    } catch {
      return { ok: true };
    }
  }

  return {
    /**
     * NOTIFICACIONES (Discord)
     * Soporta tanto embeds estructurados como mensajes de texto plano.
     */
    async notificarDiscord(payload, isWebsite = false) {
      const webhook = window.config.endpoints.discord;
      if (!webhook || !window.config.features.discordNotifications) return;

      log('Enviando notificación a Discord...');

      try {
        let discordPayload = {};

        // Si el payload es solo un string, lo enviamos como content
        if (typeof payload === 'string') {
          discordPayload = { content: payload };
        } 
        // Si tiene campos, enviamos un Embed
        else if (payload.fields || payload.description) {
          // Asegurar que los fields sean válidos (no vacíos)
          const validFields = (payload.fields || [])
            .filter(f => f.name && f.value)
            .map(f => ({
              name: String(f.name).substring(0, 256),
              value: String(f.value).substring(0, 1024),
              inline: !!f.inline
            }));

          discordPayload = {
            username: window.config.brand.name + ' · Bot',
            avatar_url: window.config.brand.logo,
            embeds: [{
              color: 0xF07030, // naranja terra
              title: payload.title || (isWebsite ? '📋 Nuevo contacto (Website)' : '🎉 Nueva reserva (Onboarding)'),
              ...(payload.description ? { description: payload.description } : {}),
              fields: validFields,
              footer: { text: window.config.brand.location },
              timestamp: new Date().toISOString()
            }]
          };
          
          // Si no hay fields ni descripción, Discord da error 400. 
          // En ese caso, usamos un fallback simple.
          if (validFields.length === 0 && !discordPayload.embeds[0].description) {
            discordPayload = { content: `🔔 Nueva notificación de ${window.config.brand.name}` };
          }
        } else {
          discordPayload = { content: JSON.stringify(payload) };
        }

        await _post(webhook, discordPayload);
        log('Discord OK');
      } catch (err) {
        console.warn('[API] Discord falló:', err.message);
      }
    },

    // ── SUBMIT FORM (Onboarding Hub) ──
    async enviarReserva(data) {
      const url = window.config.endpoints.onboardingHub;
      log('Enviando reserva al Hub...');
      
      try {
        const result = await _post(url, data);
        log('Hub OK:', result);
        return { ok: true, data: result };
      } catch (err) {
        console.error('[API] Hub falló:', err);
        return { ok: false, error: err.message };
      }
    },

    // ── HANDSHAKE (Cuestionario) ──
    async getStudent(sid) {
      const url = window.config.endpoints.onboardingHub;
      log(`Buscando estudiante sid=${sid} (vía POST)...`);
      
      try {
        const result = await _post(url, { action: 'getStudent', sid: sid });
        log('getStudent OK:', result);
        return result;
      } catch (err) {
        log(`getStudent Error: ${err.message}`);
        console.warn('[API] getStudent falló o no implementado. Usando Mock en Dev.');
        
        // MOCK DATA PARA DESARROLLO
        // Si estamos en localhost, simulamos respuesta exitosa basada en el SID
        if (window.config.isDev && sid.includes('_')) {
          const parts = sid.split('_');
          const nameSlug = parts[1] || 'estudiante-prueba';
          const salonSlug = parts[2] || 'kinder';
          
          return {
            success: true,
            data: {
              nombre: nameSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
              colegio: 'Colegio de Prueba (Mock)',
              salon: salonSlug.charAt(0).toUpperCase() + salonSlug.slice(1),
              genero: 'm' // Default mock genero
            }
          };
        }

        return { success: false, error: err.message };
      }
    },

    // ── SUBMIT CUESTIONARIO ──
    async enviarCuestionario(data) {
      const url = window.config.endpoints.onboardingHub;
      log('Enviando cuestionario al Hub...');
      
      try {
        const result = await _post(url, { ...data, action: 'saveQuestionnaire' });
        log('Hub OK (Cuestionario):', result);
        return { ok: true, data: result };
      } catch (err) {
        console.error('[API] Hub falló (Cuestionario):', err);
        return { ok: false, error: err.message };
      }
    },

    // ── AGENDA (Hub) ──
    async getAgenda(school, salon) {
      const url = window.config.endpoints.onboardingHub;
      log(`Buscando agenda para ${school}_${salon}...`);
      
      try {
        const result = await _post(url, { 
          action: 'getAgenda', 
          id_salon: `${school}_${salon}`,
          school: school,
          salon: salon
        });
        log('getAgenda OK:', result);
        return { ok: true, data: result };
      } catch (err) {
        console.error('[API] getAgenda falló:', err);
        return { ok: false, error: err.message };
      }
    },

    async saveAgenda(school, salon, agendaData) {
      const url = window.config.endpoints.onboardingHub;
      log(`Guardando agenda para ${school}_${salon}...`);
      
      try {
        const result = await _post(url, { 
          action: 'saveAgenda', 
          id_salon: `${school}_${salon}`,
          agenda_data: agendaData
        });
        log('saveAgenda OK:', result);
        return { ok: true, data: result };
      } catch (err) {
        console.error('[API] saveAgenda falló:', err);
        return { ok: false, error: err.message };
      }
    },

    // ── SUBMIT CONTACTO (Website) ──
    async enviarContacto(data) {
      log('Procesando contacto del website...');

      // 1. Guardar siempre respaldo en localStorage
      const historial = window.storage.get('form_historial') || [];
      historial.push({ ...data, timestamp: new Date().toISOString() });
      window.storage.set('form_historial', historial);

      // 2. Notificar Discord
      const saludo = encodeURIComponent(window.config.whatsapp.templates.website(data.nombre));
      const linkWA = `https://wa.me/${window.config.whatsapp.number}?text=${saludo}`;

      await this.notificarDiscord({
        fields: [
          { name: '👤 Nombre',  value: data.nombre,  inline: true  },
          { name: '📱 Celular', value: data.celular, inline: true  },
          { name: '🏫 Colegio', value: data.escuela || 'N/A', inline: false },
          { name: '💬 Mensaje', value: data.mensaje || 'Sin mensaje', inline: false },
          { name: '📲 WhatsApp', value: `[Responder a ${data.nombre} →](${linkWA})`, inline: false }
        ]
      }, true);

      // 3. Endpoint HTTP (si está configurado)
      if (window.config.endpoints.websiteContact) {
        try {
          await _post(window.config.endpoints.websiteContact, data);
        } catch (err) {
          console.warn('[API] Website endpoint falló:', err.message);
        }
      }

      return { ok: true };
    }
  };
})();

// Exponer globalmente
window.api = Api;
window.Api = Api; // Backward compatibility
