export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    console.log('API Key exists:', !!apiKey);
    console.log('API Key first 10 chars:', apiKey.substring(0, 10));
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    console.log('Anthropic response status:', response.status);
    console.log('Anthropic response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('Anthropic response body:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Anthropic API error',
        status: response.status,
        details: data,
        debug: {
          apiKeyExists: !!apiKey,
          apiKeyPrefix: apiKey.substring(0, 15)
        }
      });
    }

    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Function error:', error);
    return res.status(500).json({ error: error.message });
  }
}
