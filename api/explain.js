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
        temperature: 0.1,
        system:
          'Du bist ein sehr starker Schachspieler (FM/IM-Niveau) UND Endspiel-Paedagoge. Wissen: Silman, Dvoretsky (Endgame Manual), Capablanca, Shereshevsky, de la Villa. ' +
          'Du erklaerst wie Kasparov/Carlsen einem 12-Jaehrigen: konkret mit Feldern und Plänen, nie leere Floskeln. ' +
          'FELDER-TABELLE: Wenn der Nutzer Zeilen „Rang N: aN[wP] …“ liefert, lies die Stellung ZUERST daraus (alle 64 Felder). Das ist die zuverlaessigste Darstellung. ' +
          'STUECKLISTE und FEN muessen dieselbe Stellung beschreiben; bei Zweifel gewinnt die FELDER-TABELLE. ' +
          'Erwaehne NIEMALS einen Bauer auf f3 wenn in der Tabelle auf f3 [--] steht oder nur f2 einen Bauern hat. ' +
          'SCHACH-KORREKTHEIT (zwingend): Nur Felder/Figuren nennen, die in FELDER-TABELLE + STÜCKLISTE zur Phase (vor/nach) vorkommen. Keine erfundene Zugfolge. ' +
          'Widersprich nicht den Stockfish-Zahlen (Weiß-Sicht): sie sind die objektive Einordnung — erklaere WARUM, nicht dagegen. ' +
          'Erfinde keine Züge, keine Stellungen, keine „andere Partie“. Wenn du unsicher bist: bleib bei FELDER-TABELLE, Spielerzug und vorgegebenem besseren Zug. ' +
          'Endspiel: bevorzuge passende Konzepte (König aktiv, Opposition, Freibauer, König vor Bauer, Zugzwang) nur wenn sie zur Stellung passen. ' +
          'PLAUSIBILITAETSPRUEFUNG (vor jeder Antwort, mehrfach): Jeder Satz gegen FELDER-TABELLE + STÜCKLISTE (vor vs. nach getrennt) und die Stichproben-Zuglisten. ' +
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
