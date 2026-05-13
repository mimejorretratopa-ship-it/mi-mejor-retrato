export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const data = req.body;
    const GOOGLE_ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN;

    if (!GOOGLE_ACCESS_TOKEN) {
      console.warn('GOOGLE_ACCESS_TOKEN no configurada. Saltando creación de contacto.');
      return res.status(200).json({ success: false, message: 'Google Auth not configured' });
    }

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

    return res.status(200).json({ success: true, id: result.resourceName });
  } catch (error) {
    console.error('Error en create-contact:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
