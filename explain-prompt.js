/**
 * Endspielgott — Tobold/Claude: System-Prompt + Nutzer-Nachricht für Zug-Erklärungen.
 *
 * Warum frühere Antworten oft „generisch“ wirkten (kurz):
 * - Zu enge Längenvorgabe („nur zwei Sätze“) zwingt das Modell zu inhaltsleeren Füllsätzen.
 * - Ohne harten Feldbezug greifen LLMs reflexhaft zu Universallogik (König aktiv, Initiative …).
 * - Leaf-Bewertungen (Stellung nach genau einem Zug) werden mit Wurzelintuition verwechselt.
 * - Endspiel-Schlagworte ohne Bindung an die 64 Felder klingen überall „richtig“ und nirgends hilfreich.
 *
 * Gemeinsam genutzt von: Browser (bauern-generator-sf.html) und api/explain.js (Vercel).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EndspielgottExplain = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var EXPLAIN_SYSTEM_PROMPT = [
    'Rolle: Du bist Endspiel-Trainer (Deutsch, „du“). Du argumentierst ausschließlich aus den mitgelieferten Daten (FELDER-TABELLE, STÜCKLISTE, FEN, vorgegebene Züge, Zahlen).',
    'Oberste Regel: Jede Aussage über Figuren oder Felder muss in der passenden FELDER-TABELLE + STÜCKLISTE (Phase VOR bzw. NACH) nachprüfbar sein. Nichts erfinden.',
    'Bewertungszahlen sind Engine-Messwerte in Bauerneinheiten aus Weiß-Sicht (höher = besser für Weiß). „Nach deinem Zug“ und „nach dem angegebenen Bestzug“ beziehen sich jeweils auf die Stellung nach genau diesem einen Weiß-Zug (Schwarz kann danach am Zug sein) — diese beiden Zahlen sind miteinander vergleichbar.',
    'Wenn ein HINWEIS zu widersprüchlichen Leaf-Bewertungen mitgeliefert wird, erwähne ihn knapp und rate nicht gegen die Tabellen.',
    'STRIKT VERBOTEN ohne konkrete Felder (z. B. e4, d5) oder konkrete Züge aus den Daten: leere Floskeln wie „König aktivieren“, „Figuren entwickeln“, „Zentrum“, „Druck aufbauen“, „Initiative“, „Stellung verbessern“.',
    'Erlaubt sind Endspiel-Konzepte (Freibauer, Opposition, Turm hinter dem Bauern, Lucena/Philidor-Idee, Zugzwang) NUR mit sofort folgendem Feld- oder Zugbezug aus den Tabellen.',
    'Pflicht: Im gesamten JSON (summary + detail zusammen) mindestens drei verschiedene Felder nennen, die in der jeweils passenden Tabelle wirklich vorkommen.',
    'JSON-Ausgabe: genau ein Objekt mit keys summary und detail (beide Strings). detail muss genau drei Abschnitte enthalten, getrennt durch doppelten Zeilenumbruch \\n\\n:',
    'Abschnitt 1 — DEIN ZUG: Was macht der gespielte Zug konkret (von Feld zu Feld)? Was bleibt auf dem Brett problematisch oder was gibt er preis?',
    'Abschnitt 2 — ENGINE: Was macht der vorgegebene bessere Zug stattdessen (Felder nennen)? Wie unterscheiden sich die genannten Bewertungen nach den Zahlen (ein Satz)?',
    'Abschnitt 3 — MOTIV: Ein Satz: ein passendes Endspiel-Motiv NUR wenn es aus dieser Stellung klar wird; sonst exakt schreiben: „Kein Schlagwort nötig — hier zählt der konkrete Zug.“',
    'summary: ein Satz, Kernpunkt, mindestens ein Feldbezug.',
    'Kein Markdown außerhalb des JSON, keine Code-Fences, kein Text vor oder nach dem JSON.',
  ].join(' ');

  /**
   * @param {Object} o
   * @param {string} o.fen
   * @param {string} o.fenAfter
   * @param {string} o.tableBefore
   * @param {string} o.tableAfter
   * @param {string} o.piecesBefore
   * @param {string} o.piecesAfter
   * @param {string} o.sideBefore
   * @param {string} o.sideAfter
   * @param {string} o.playerMove
   * @param {string} [o.playerUci]
   * @param {string} o.legalBeforeStr
   * @param {string} o.legalAfterStr
   * @param {number|string} o.legalMax
   * @param {string} o.cpBeforeStr
   * @param {string} o.betterBlock
   * @param {string} o.task
   * @param {string} [o.situationTitle]
   * @param {string} [o.pvSanLine]
   * @param {string} [o.multiPVBlock]
   * @param {string} [o.evalNote]
   */
  function composeExplainUserContent(o) {
    o = o || {};
    var head = '';
    if (o.situationTitle) {
      head += 'ENDSPIEL-KONTEXT (Erkennung aus Material): ' + o.situationTitle + '\n\n';
    }
    head +=
      '=== WARUM DIESE AUFGABE ===\n' +
      'Du sollst einem Menschen helfen, genau diese eine Stellung zu verstehen — nicht „Schach im Allgemeinen“ zu wiederholen.\n' +
      'Jede Behauptung muss an FELDER-TABELLE + STÜCKLISTE überprüfbar sein.\n\n' +
      '=== ZU DEN ZAHLEN (wichtig) ===\n' +
      'Alle CP-Werte sind Weiß-Sicht. „Nach deinem Zug“ = Bewertung der Partiestellung direkt nach deinem Weiß-Zug. ' +
      '„Nach Bestzug“ = Bewertung direkt nach dem angegebenen besseren Weiß-Zug. ' +
      'Vergleiche nur diese paarweise — nicht mit „Vor deinem Zug“ verwechseln.\n\n';

    if (o.evalNote) {
      head += '=== HINWEIS ZU BEWERTUNGEN ===\n' + o.evalNote + '\n\n';
    }

    var pvPart = '';
    if (o.pvSanLine) {
      pvPart =
        'Engine-Hauptvariante nach Wurzel (erste Züge, SAN): ' + o.pvSanLine + '\n\n';
    }

    var multi = o.multiPVBlock ? '\n\n' + o.multiPVBlock + '\n' : '';

    return (
      head +
      '=== VOR DEINEM ZUG — am Zug: ' +
      o.sideBefore +
      ' ===\n' +
      'FEN: ' +
      o.fen +
      '\n\nFELDER-TABELLE:\n' +
      o.tableBefore +
      '\n\nSTÜCKLISTE:\n' +
      o.piecesBefore +
      '\n\nLegale Züge ' +
      o.sideBefore +
      ' (Stichprobe, max. ' +
      o.legalMax +
      '): ' +
      o.legalBeforeStr +
      '\n\n' +
      pvPart +
      '=== DEIN ZUG (Weiß) ===\n' +
      'SAN: "' +
      o.playerMove +
      '"' +
      (o.playerUci ? ', UCI: "' + o.playerUci + '"' : '') +
      '\n\n' +
      '=== NACH DEINEM ZUG — am Zug: ' +
      o.sideAfter +
      ' ===\n' +
      'FEN: ' +
      o.fenAfter +
      '\n\nFELDER-TABELLE:\n' +
      o.tableAfter +
      '\n\nSTÜCKLISTE:\n' +
      o.piecesAfter +
      '\n\nLegale Züge ' +
      o.sideAfter +
      ' (Stichprobe): ' +
      o.legalAfterStr +
      '\n\n' +
      '=== ENGINE-EINORDNUNG (Weiß-Sicht) ===\n' +
      'Vor deinem Zug: ' +
      o.cpBeforeStr +
      '\n' +
      o.betterBlock +
      multi +
      '\n' +
      '=== TEXTAUFGABE ===\n' +
      o.task +
      '\n\n' +
      'Antwort: genau ein JSON-Objekt, keine Code-Fences, kein Text außerhalb.\n' +
      'Schema: {"summary":"…","detail":"Abschnitt1\\n\\nAbschnitt2\\n\\nAbschnitt3"}'
    );
  }

  return {
    EXPLAIN_SYSTEM_PROMPT: EXPLAIN_SYSTEM_PROMPT,
    composeExplainUserContent: composeExplainUserContent,
  };
});
