export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('API Key exists:', !!process.env.CLAUDE_API_KEY);
  console.log('API Key length:', process.env.CLAUDE_API_KEY?.length || 0);
  console.log('API Key starts with sk-ant:', process.env.CLAUDE_API_KEY?.startsWith('sk-ant-') || false);

  if (!process.env.CLAUDE_API_KEY) {
    console.error('No Claude API key found in environment variables');
    return res.status(500).json({ error: 'Claude API key not configured in Vercel environment variables' });
  }

  try {
    console.log('Claude Code SDK: Making API request...');
    console.log('Request body keys:', Object.keys(req.body));
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'messages-2023-12-15'
      },
      body: JSON.stringify(req.body)
    });

    console.log('Anthropic API Response status:', response.status);
    console.log('Anthropic API Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API Error:', response.status, errorText);
      
      // Return detailed error for debugging
      return res.status(response.status).json({ 
        error: `Anthropic API error: ${response.status}`,
        details: errorText,
        apiKeyLength: process.env.CLAUDE_API_KEY?.length || 0,
        apiKeyFormat: process.env.CLAUDE_API_KEY?.startsWith('sk-ant-') ? 'correct' : 'incorrect'
      });
    }

    const data = await response.json();
    console.log('Claude Code SDK: Success, response keys:', Object.keys(data));
    res.status(200).json(data);
    
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ 
      error: 'Claude Code SDK server error: ' + error.message,
      apiKeyExists: !!process.env.CLAUDE_API_KEY
    });
  }
}
