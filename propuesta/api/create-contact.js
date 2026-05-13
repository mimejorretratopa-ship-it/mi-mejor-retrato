// Usando fetch global de Node 18+

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    
    // Estos valores deben venir de tus Variables de Entorno en Netlify
    // Para Google Contacts necesitas configurar OAuth2 o una Service Account
    const GOOGLE_ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN;

    if (!GOOGLE_ACCESS_TOKEN) {
      console.warn('GOOGLE_ACCESS_TOKEN no configurada. Saltando creación de contacto.');
      return { 
        statusCode: 200, 
        body: JSON.stringify({ success: false, message: 'Google Auth not configured' }) 
      };
    }

    // Estructura básica para Google People API
    const contactPayload = {
      names: [{ givenName: data.nombreEstudiante, familyName: `(${data.nombre})` }],
      phoneNumbers: [{ value: `${data.codigoPais}${data.celular}`, type: 'mobile' }],
      emailAddresses: data.email ? [{ value: data.email, type: 'home' }] : [],
      biographies: [{ value: `Escuela: ${data.idEscuela}\nSalón: ${data.salon}\nPaquete: ${data.paqueteLabel}` }]
    };

    const response = await fetch('https://people.googleapis.com/v1/people:createContact', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOOGLE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contactPayload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Error en Google API');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, id: result.resourceName })
    };
  } catch (error) {
    console.error('Error en create-contact:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
