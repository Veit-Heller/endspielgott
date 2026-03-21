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
        max_tokens: 600,
        temperature: 0.2,
        system:
          'Du bist ein sehr starker Schachspieler (FM/IM-Niveau) UND Endspiel-Paedagoge. Wissen: Silman, Dvoretsky (Endgame Manual), Capablanca, Shereshevsky, de la Villa. ' +
          'Du erklaerst wie Kasparov/Carlsen einem 12-Jaehrigen: konkret mit Feldern und Plänen, nie leere Floskeln. ' +
          'SCHACH-KORREKTHEIT (zwingend): Du darfst NUR Felder a1–h8 nennen und nur Figuren/Beziehungen, die mit FEN + ASCII-Brett + den gelieferten legalen Zügen vereinbar sind. ' +
          'Widersprich nicht den Stockfish-Zahlen (Weiß-Sicht): sie sind die objektive Einordnung — erklaere WARUM, nicht dagegen. ' +
          'Erfinde keine Züge, keine Stellungen, keine „andere Partie“. Wenn du unsicher bist: bleib beim Brett, beim Spielerzug und der Engine-PV. ' +
          'Endspiel: bevorzuge passende Konzepte (König aktiv, Opposition, Freibauer, König vor Bauer, Zugzwang) nur wenn sie zur Stellung passen. ' +
          'PLAUSIBILITAETSPRUEFUNG (vor jeder Antwort, mehrfach): Gehe jeden Satz mental gegen FEN + ASCII-Brett und die legalen Zuglisten. ' +
          'Stimmt Am-Zug (Weiß/Schwarz)? Liegt jede genannte Figur wirklich auf dem genannten Feld? Geht der beschriebene Zug von dort aus regelkonform? ' +
          'Passt „schlaegt“/„stellt“ zum Brett nach dem Zug? Wenn auch nur ein Detail nicht passt: Formulierung streichen oder so aendern, dass es exakt zum gelieferten Brett passt — nie raten. ' +
          'Antworte strikt im vom Nutzer verlangten JSON (summary + detail), ohne Markdown-Fences, ohne Text ausserhalb JSON.',
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
