/**
 * Endspielgott — Tobold/Claude: System-Prompt + Nutzer-Nachricht für Zug-Erklärungen.
 * Freier Fließtext (kein JSON, keine Pflicht-Abschnitte) — nur Brett-Treue und Engine-Zahlen respektieren.
 *
 * Browser + api/explain.js (Vercel).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EndspielgottExplain = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var EXPLAIN_SYSTEM_PROMPT = [
    'Du bist ein sehr starker Schachspieler und Endspiel-Coach. Du schreibst auf Deutsch, direkt mit „du“, in normalem Fließtext.',
    'Nutze die mitgelieferte FELDER-TABELLE und STÜCKLISTE als Wahrheit über das Brett (vor dem Zug / nach dem Zug). Erfinde keine Figuren, keine Felder, keine Züge die dort nicht stehen.',
    'Wenn der Spieler offensichtlich Material verliert (z.B. Turm geschlagen, hängende Figur) — sag das klar und benenne die Felder. Kein Beschönigen.',
    'Die Engine-Zahlen sind Bauerneinheiten aus Weiß-Sicht (höher = besser für Weiß). „Nach deinem Zug“ und „nach dem empfohlenen Zug“ sind jeweils Bewertungen der Stellung direkt nach diesem einen Weiß-Zug — vergleiche die sinnvoll miteinander.',
    'Du darfst frei analysieren: so lang oder kurz wie nötig, mit eigenem Aufbau, ohne vorgegebene Überschriften oder Summary-Feld.',
    'Kein JSON, keine Code-Blöcke am Anfang oder Ende — nur durchgehender Text. Optional einfache Absätze mit Leerzeile.',
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
      '=== ZU DEN ZAHLEN ===\n' +
      'Alles in Bauerneinheiten, Weiß-Sicht. „Nach deinem Zug“ / „nach empfohlenem Zug“ = Stellung jeweils direkt nach diesem Weiß-Zug (Schwarz kann danach am Zug sein).\n\n';

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
      '=== DEINE ANALYSE (frei formuliert) ===\n' +
      o.task
    );
  }

  return {
    EXPLAIN_SYSTEM_PROMPT: EXPLAIN_SYSTEM_PROMPT,
    composeExplainUserContent: composeExplainUserContent,
  };
});
