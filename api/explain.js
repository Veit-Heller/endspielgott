var explainPrompt = require('../explain-prompt.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Nur POST erlaubt.' });
    return;
  }

  try {
    var body = req.body || {};
    var content = (body.content || '').trim();
    var suppliedKey = (body.apiKey || '').trim();
    var apiKey = suppliedKey || process.env.ANTHROPIC_API_KEY || '';

    if (!content) {
      res.status(400).json({ error: 'Fehlender Inhalt fuer Erklaerung.' });
      return;
    }
    if (!apiKey) {
      res.status(400).json({ error: 'Kein API-Key gefunden (Input oder ANTHROPIC_API_KEY).' });
      return;
    }

    var upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        temperature: 0.25,
        system: explainPrompt.EXPLAIN_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: content }]
      })
    });

    var data = await upstream.json();
    if (!upstream.ok) {
      var details = data && data.error && data.error.message ? data.error.message : 'Anthropic-Fehler';
      res.status(upstream.status).json({ error: details });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err && err.message ? err.message : 'Unbekannter Serverfehler.' });
  }
};
