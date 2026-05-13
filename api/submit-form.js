export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const data = req.body;

    console.log('--- Nueva Submission ---');
    console.log('Escuela:', data.idEscuela);
    console.log('Estudiante:', data.nombreEstudiante);
    console.log('------------------------');

    return res.status(200).json({
      success: true,
      id: `rec_${Date.now()}`,
      message: 'Recibido correctamente'
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
