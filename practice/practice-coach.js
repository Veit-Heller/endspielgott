(function(global) {
  'use strict';

  function classify(cpLoss, isBestMove) {
    if (isBestMove) return 'best';
    if (cpLoss < 20) return 'great';
    if (cpLoss < 60) return 'good';
    if (cpLoss < 150) return 'ok';
    if (cpLoss < 300) return 'bad';
    return 'blunder';
  }

  function shortAdvice(ctx) {
    if (!ctx) return 'Solider Zug. Weiter aktiv bleiben.';
    if (ctx.isBestMove) return 'Stark gespielt: Das war der beste Zug in der Stellung.';
    if (ctx.cpLoss >= 300) return 'Kritischer Fehler: Prüfe immer gegnerische Drohungen vor dem Zug.';
    if (ctx.cpLoss >= 150) return 'Ungenauigkeit: Verbessere Figurenaktivität und Königssicherheit.';
    if (ctx.cpLoss >= 60) return 'Solide Idee, aber es gab einen stärkeren Plan.';
    return 'Knapp daneben: Fast optimal, gute Richtung.';
  }

  function buildMoveReview(ctx) {
    return {
      ply: ctx.ply || 0,
      uci: ctx.playerUci || '',
      san: ctx.playerMove || '',
      evalBefore: ctx.cpBeforeEval == null ? 0 : ctx.cpBeforeEval,
      evalAfter: ctx.cpAfterActual == null ? 0 : ctx.cpAfterActual,
      bestMoveUci: ctx.bestUci || '',
      cpLoss: ctx.cpLoss == null ? 0 : ctx.cpLoss,
      ratingTag: classify(ctx.cpLoss || 0, !!ctx.isBestMove),
      coachText: shortAdvice(ctx)
    };
  }

  function renderCoachLine(text) {
    var el = document.getElementById('practice-coach-line');
    if (!el) return;
    el.textContent = text || 'Coach wartet auf deinen nächsten Zug.';
  }

  global.PracticeCoach = {
    classify: classify,
    shortAdvice: shortAdvice,
    buildMoveReview: buildMoveReview,
    renderCoachLine: renderCoachLine
  };
})(window);
