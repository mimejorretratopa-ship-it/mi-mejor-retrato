export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { message } = req.body;
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error('DISCORD_WEBHOOK_URL no configurada');
      return res.status(500).send('Config Error');
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🔔 **Nueva Reserva Recibida**\n${message}`
      })
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error en notify-discord:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
