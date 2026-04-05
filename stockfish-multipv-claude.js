/**
 * Stockfish MultiPV: Parser + Textbausteine für Erklär-Prompts (/api/explain).
 * Voraussetzung: vor "go" wurde setoption MultiPV N gesetzt; lines bis bestmove gesammelt.
 */
(function (global) {
  'use strict';

  var MATE_BASE = 9000;

  function stmToWhiteCp(cp, fen) {
    if (cp == null || fen == null) return null;
    return fen.split(' ')[1] === 'b' ? -cp : cp;
  }

  function mateStmToSyntheticCp(mateStm) {
    if (mateStm == null) return null;
    var x = Math.abs(mateStm);
    var sign = mateStm > 0 ? 1 : -1;
    return sign * (MATE_BASE + x);
  }

  function mateStmToWhiteCp(mateStm, fen) {
    var syn = mateStmToSyntheticCp(mateStm);
    if (syn == null) return null;
    return stmToWhiteCp(syn, fen);
  }

  function formatCpWhite(cp) {
    if (cp == null) return '?';
    if (Math.abs(cp) > MATE_BASE) {
      var x = Math.abs(cp) - MATE_BASE;
      return (cp > 0 ? '+' : '-') + 'M(' + x + ')';
    }
    var v = cp / 100;
    return (v >= 0 ? '+' : '') + v.toFixed(2);
  }

  /**
   * Eine info-Zeile mit score + pv. Letzte Zeile pro multipv gewinnt (tiefe Suche).
   */
  function parseInfoLine(line) {
    if (typeof line !== 'string' || line.indexOf('info ') !== 0) return null;
    if (line.indexOf(' score ') === -1 || line.indexOf(' pv ') === -1) return null;
    var mp = line.match(/\bmultipv (\d+)\b/);
    var pvNum = mp ? String(mp[1]) : '1';
    var cp = null;
    var mate = null;
    var mcp = line.match(/\bscore cp (-?\d+)\b/);
    if (mcp) cp = parseInt(mcp[1], 10);
    var mm = line.match(/\bscore mate (-?\d+)\b/);
    if (mm) mate = parseInt(mm[1], 10);
    var pvM = line.match(/\bpv (.+)/);
    if (!pvM) return null;
    var rawMoves = pvM[1].trim().split(/\s+/).filter(Boolean);
    return { pvNum: pvNum, stmCp: cp, stmMate: mate, moves: rawMoves };
  }

  /**
   * @param {string[]} lines - rohe Stockfish-Zeilen bis bestmove
   * @param {string} [fen] - Wurzel-FEN für Weiß-Sicht CP
   * @returns {Object.<string, { firstUci: string, pvUci: string, evalCpWhite: number|null, evalLabel: string }>}
   */
  function parseStockfishMultiPV(lines, fen) {
    var last = {};
    if (!lines || !lines.length) return last;
    for (var i = 0; i < lines.length; i++) {
      var p = parseInfoLine(lines[i]);
      if (!p || !p.moves.length) continue;
      var first = p.moves[0];
      if (!first || first.length < 4) continue;
      var slice = p.moves.slice(0, 6).join(' ');
      var evalCpWhite = null;
      var evalLabel = '';
      if (p.stmMate != null) {
        evalCpWhite = mateStmToWhiteCp(p.stmMate, fen);
        evalLabel = formatCpWhite(evalCpWhite);
      } else if (p.stmCp != null) {
        evalCpWhite = stmToWhiteCp(p.stmCp, fen);
        evalLabel = formatCpWhite(evalCpWhite);
      } else {
        evalLabel = '?';
      }
      last[p.pvNum] = {
        firstUci: first,
        pvUci: slice,
        movesArr: p.moves.slice(0, 6),
        evalCpWhite: evalCpWhite,
        evalLabel: evalLabel,
      };
    }
    return last;
  }

  /**
   * Abschnitt für den Tobold-/Claude-Prompt (Weiß-Sicht, wie Rest der App).
   * @param {number} [maxPlies] UCI-Halbzüge in der PV-Zeile (kleiner = kürzerer API-Prompt)
   */
  function formatMultiPVForExplain(fen, variations, maxPlies) {
    if (!variations || typeof variations !== 'object') return '';
    var mp = maxPlies == null || maxPlies < 1 ? 6 : Math.min(12, maxPlies | 0);
    var keys = Object.keys(variations).sort(function (a, b) {
      return parseInt(a, 10) - parseInt(b, 10);
    });
    if (!keys.length) return '';
    var lines = [];
    lines.push('STOCKFISCH TOP-VARIANTEN (Wurzelstellung vor deinem Zug, gleiche Engine-Tiefe):');
    lines.push('Bewertungen in Bauerneinheiten aus Weiß-Sicht (wie oben; höher = besser für Weiß).');
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var v = variations[k];
      if (!v) continue;
      var pvShow = v.pvUci || v.firstUci;
      if (v.movesArr && v.movesArr.length) {
        pvShow = v.movesArr.slice(0, mp).join(' ');
      }
      lines.push(
        k +
          '. Erster Zug: ' +
          v.firstUci +
          ' — Eval: ' +
          v.evalLabel +
          ' — PV (UCI, bis ' +
          mp +
          ' HZ): ' +
          pvShow
      );
    }
    lines.push(
      'Nutze diese Varianten als Stütze: der beste Zug für Weiß in dieser Liste ist typischerweise Zeile 1 (MultiPV 1).'
    );
    return lines.join('\n');
  }

  /**
   * Freistehender Prompt-Baustein (z. B. für andere Clients).
   */
  function buildClaudePromptBlock(opts) {
    opts = opts || {};
    var fen = opts.fen || '';
    var side = opts.sideToMove || (fen.split(' ')[1] === 'b' ? 'Schwarz' : 'Weiß');
    var playedMove = opts.playedMove || '?';
    var playedEval = opts.playedEval;
    var variations = opts.variations || {};
    var bestVar = variations['1'];
    var bestMove = bestVar && bestVar.firstUci ? bestVar.firstUci : '?';
    var bestEval =
      bestVar && bestVar.evalLabel != null ? bestVar.evalLabel : '?';
    var playedStr =
      playedEval === null || playedEval === undefined
        ? '?'
        : formatCpWhite(typeof playedEval === 'number' ? playedEval : Number(playedEval));

    var body = formatMultiPVForExplain(fen, variations);

    return (
      'FEN (Wurzel): ' +
      fen +
      '\nAm Zug (in dieser Wurzel): ' +
      side +
      '\n\nGespielter Zug (SAN): ' +
      playedMove +
      ' — Stellungswert nach diesem Zug (Weiß-Sicht): ' +
      playedStr +
      '\nBester erster Zug laut Engine (MultiPV 1, UCI): ' +
      bestMove +
      ' — Eval an der Wurzel nach dieser Linie (Weiß-Sicht): ' +
      bestEval +
      '\n\n' +
      body +
      '\n\nErkläre knapp:\n' +
      '1) Warum der gespielte Zug schwächer ist als die Engine-Empfehlung (1–2 Sätze), sofern nicht bester Zug.\n' +
      '2) Was der beste Zug konkret verbessert — mit Bezug zu PV/Variante (2–3 Sätze).\n' +
      '3) Welches Endspiel-Prinzip passt (1 Satz).'
    );
  }

  global.EndspielgottMultiPV = {
    parseStockfishMultiPV: parseStockfishMultiPV,
    formatMultiPVForExplain: formatMultiPVForExplain,
    buildClaudePromptBlock: buildClaudePromptBlock,
    formatCpWhite: formatCpWhite,
  };
})(typeof window !== 'undefined' ? window : this);
