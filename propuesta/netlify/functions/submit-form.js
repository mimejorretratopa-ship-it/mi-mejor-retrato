exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    
    // LOG en la consola de Netlify para ver que llegan los datos
    console.log('--- Nueva Submission ---');
    console.log('Escuela:', data.idEscuela);
    console.log('Estudiante:', data.nombreEstudiante);
    console.log('------------------------');

    // Aquí es donde en el futuro guardaríamos en Google Sheets o DB
    // Por ahora, retornamos éxito para que el frontend siga su flujo
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        id: `rec_${Date.now()}`,
        message: 'Recibido correctamente' 
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
