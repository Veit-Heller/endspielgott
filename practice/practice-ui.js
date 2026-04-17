(function(global) {
  'use strict';

  function setText(id, text) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
  }

  function render(state) {
    if (!state) return;
    var toggle = document.getElementById('practice-toggle');
    if (toggle) toggle.checked = !!state.enabled;
    setText('practice-phase', state.phase || 'idle');
    if (state.stats) {
      setText(
        'practice-stats',
        'Partien: ' + state.stats.gamesPlayed +
        ' | W/D/L: ' + state.stats.wins + '/' + state.stats.draws + '/' + state.stats.losses +
        ' | Avg CpLoss: ' + (state.stats.avgCpLoss / 100).toFixed(2)
      );
    }
    var g = state.currentGame;
    if (g) {
      setText('practice-game', 'Aktuelle Partie: ' + g.plyCount + ' Halbzüge, Ergebnis: ' + g.result);
      var reviews = g.moveReviews || [];
      if (reviews.length) {
        var sorted = reviews.slice().sort(function(a, b) { return (b.cpLoss || 0) - (a.cpLoss || 0); });
        var top = sorted.slice(0, 3).map(function(r) {
          return (r.san || r.uci || '?') + ' (' + ((r.cpLoss || 0) / 100).toFixed(2) + ')';
        }).join(' | ');
        setText('practice-review', 'Top Lernmomente: ' + top);
      } else {
        setText('practice-review', 'Top Lernmomente erscheinen nach deinen ersten Zügen.');
      }
    } else {
      setText('practice-game', 'Noch keine Practice-Partie gestartet.');
      setText('practice-review', 'Top Lernmomente erscheinen nach deinen ersten Zügen.');
    }
  }

  function bind(controller) {
    var toggle = document.getElementById('practice-toggle');
    if (toggle) {
      toggle.addEventListener('change', function() {
        controller.setEnabled(!!toggle.checked);
      });
    }
    var saveBtn = document.getElementById('practice-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        controller.saveNow();
      });
    }
    var clearBtn = document.getElementById('practice-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        controller.clearSaved();
      });
    }
    var copyBtn = document.getElementById('practice-share-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function() {
        controller.copyPracticeLink();
      });
    }
    var retryBtn = document.getElementById('practice-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', function() {
        controller.retryGame();
      });
    }
    var nextBtn = document.getElementById('practice-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        controller.nextGame();
      });
    }
  }

  global.PracticeUI = {
    render: render,
    bind: bind
  };
})(window);
