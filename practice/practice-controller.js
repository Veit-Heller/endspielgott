(function(global) {
  'use strict';

  var api = {};
  var suppressStartHook = false;
  var STANDARD_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  function getState() {
    return global.PracticeState ? global.PracticeState.state : null;
  }

  function render() {
    if (!global.PracticeUI || !global.PracticeState) return;
    global.PracticeUI.render(global.PracticeState.snapshot());
  }

  function syncSettingsFromGlobals() {
    if (!global.PracticeState) return;
    global.PracticeState.applySettings({
      mode: global.gameMode,
      rookVariant: global.rookVariant,
      numPawns: global.numPawns,
      difficulty: global.difficulty,
      engineSkill: global.skillLevel
    });
  }

  api.init = function() {
    if (!global.PracticeState || !global.PracticeStorage || !global.PracticeUI || !global.PracticeRouter) return;
    var parsed = global.PracticeRouter.parse();
    var saved = global.PracticeStorage.load();
    if (saved) global.PracticeState.restore(saved);
    if (parsed.enabled) global.PracticeState.setEnabled(true);
    syncSettingsFromGlobals();
    if (!global.PracticeState.state.session && global.PracticeState.state.enabled) {
      global.PracticeState.startSession(global.PracticeState.state.settings);
    }
    if (parsed.replay && global.PracticeState.state.games && global.PracticeState.state.games.length) {
      var replayGame = null;
      for (var i = 0; i < global.PracticeState.state.games.length; i++) {
        if (global.PracticeState.state.games[i].id === parsed.replay) {
          replayGame = global.PracticeState.state.games[i];
          break;
        }
      }
      if (replayGame && replayGame.startFen && typeof global.startGame === 'function') {
        suppressStartHook = true;
        global.startGame(replayGame.startFen, 0);
        suppressStartHook = false;
        global.PracticeCoach.renderCoachLine('Replay geladen: ' + replayGame.id);
      }
    }
    global.PracticeUI.bind(api);
    render();
    global.PracticeCoach.renderCoachLine('Coach bereit. Spiele eine Partie gegen Tobold.');
  };

  api.setEnabled = function(enabled) {
    if (!global.PracticeState) return;
    global.PracticeState.setEnabled(enabled);
    syncSettingsFromGlobals();
    if (enabled && !global.PracticeState.state.session) {
      global.PracticeState.startSession(global.PracticeState.state.settings);
      api.startFullGame();
    }
    api.saveNow();
    render();
  };

  api.onStartGame = function(startFen) {
    if (!global.PracticeState || !global.PracticeState.state.enabled) return;
    if (suppressStartHook) return;
    syncSettingsFromGlobals();
    global.PracticeState.beginGame(startFen);
    global.PracticeCoach.renderCoachLine('Partie gestartet. Finde aktive Züge und halte den König sicher.');
    api.saveNow();
    render();
  };

  api.onPlayerMove = function(moveObj, fenBefore, fenAfter) {
    if (!global.PracticeState || !global.PracticeState.state.enabled) return;
    global.PracticeState.setPhase(global.PracticeState.PHASE.ANALYZING);
    global.PracticeState.pushMove({
      uci: (moveObj.from || '') + (moveObj.to || '') + (moveObj.promotion || ''),
      san: moveObj.san || ''
    });
    global.PracticeCoach.renderCoachLine('Analysiere deinen Zug...');
    render();
    api.saveNow();
    return { fenBefore: fenBefore, fenAfter: fenAfter };
  };

  api.onEngineTurnStart = function() {
    if (!global.PracticeState || !global.PracticeState.state.enabled) return;
    global.PracticeState.setPhase(global.PracticeState.PHASE.ENGINE_TURN);
    global.PracticeCoach.renderCoachLine('Tobold denkt nach...');
    render();
  };

  api.onEngineMove = function(moveObj) {
    if (!global.PracticeState || !global.PracticeState.state.enabled) return;
    if (moveObj) {
      global.PracticeState.pushMove({
        uci: (moveObj.from || '') + (moveObj.to || '') + (moveObj.promotion || ''),
        san: moveObj.san || ''
      });
    }
    global.PracticeState.setPhase(global.PracticeState.PHASE.PLAYER_TURN);
    global.PracticeCoach.renderCoachLine('Dein Zug. Suche den besten Plan, nicht nur den nächsten Schachzug.');
    render();
    api.saveNow();
  };

  api.onMoveReview = function(reviewCtx) {
    if (!global.PracticeState || !global.PracticeState.state.enabled) return;
    var review = global.PracticeCoach.buildMoveReview(reviewCtx);
    global.PracticeState.addMoveReview(review);
    global.PracticeCoach.renderCoachLine(review.coachText);
    render();
    api.saveNow();
  };

  api.onGameEnd = function(result) {
    if (!global.PracticeState || !global.PracticeState.state.enabled) return;
    global.PracticeState.finishGame(result);
    var txt = result === 'win' ? 'Stark! Partie gewonnen.' : (result === 'loss' ? 'Niederlage. Fokus: Qualität der Kandidatenzüge.' : 'Remis. Gute Verteidigung.');
    global.PracticeCoach.renderCoachLine(txt);
    render();
    api.saveNow();
  };

  api.onUndo = function() {
    if (!global.PracticeState || !global.PracticeState.state.enabled) return;
    global.PracticeState.setPhase(global.PracticeState.PHASE.PLAYER_TURN);
    global.PracticeCoach.renderCoachLine('Letzten Zug zurückgenommen. Prüfe Kandidaten neu.');
    render();
    api.saveNow();
  };

  api.saveNow = function() {
    if (!global.PracticeStorage || !global.PracticeState) return;
    global.PracticeStorage.save(global.PracticeState.snapshot());
  };

  api.clearSaved = function() {
    if (!global.PracticeStorage || !global.PracticeState) return;
    global.PracticeStorage.clear();
    global.PracticeState.restore(global.PracticeState.createState());
    render();
    global.PracticeCoach.renderCoachLine('Practice-Speicher wurde zurückgesetzt.');
  };

  api.copyPracticeLink = function() {
    if (!global.PracticeRouter || !global.PracticeState) return;
    var startFen = (global.hist && global.hist[0] && global.hist[0].fen) ? global.hist[0].fen : '';
    if (!startFen) {
      alert('Starte zuerst eine Partie, dann kann ein Practice-Link erstellt werden.');
      return;
    }
    var s = global.PracticeState.state.settings || {};
    var url = global.PracticeRouter.makeShareUrl({
      fen: startFen,
      mode: s.mode,
      rv: s.rookVariant,
      skill: s.engineSkill,
      diff: s.difficulty,
      np: s.numPawns,
      replay: global.PracticeState.state.currentGame ? global.PracticeState.state.currentGame.id : ''
    });
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function() {
        global.PracticeCoach.renderCoachLine('Practice-Link kopiert.');
      });
    } else {
      window.prompt('Practice-Link markieren und kopieren:', url);
    }
  };

  api.retryGame = function() {
    if (!global.PracticeState || !global.PracticeState.state.enabled) return;
    var g = global.PracticeState.state.currentGame;
    if (!g || !g.startFen || typeof global.startGame !== 'function') return;
    suppressStartHook = true;
    global.startGame(g.startFen, 0);
    suppressStartHook = false;
    global.PracticeState.beginGame(g.startFen);
    global.PracticeCoach.renderCoachLine('Gleiche Stellung neu gestartet.');
    render();
    api.saveNow();
  };

  api.nextGame = function() {
    api.startFullGame();
  };

  api.startFullGame = function() {
    if (typeof global.startGame !== 'function') return;
    suppressStartHook = true;
    global.startGame(STANDARD_START_FEN, 0);
    suppressStartHook = false;
    if (global.PracticeState && global.PracticeState.state.enabled) {
      global.PracticeState.beginGame(STANDARD_START_FEN);
      global.PracticeState.setPhase(global.PracticeState.PHASE.PLAYER_TURN);
      global.PracticeCoach.renderCoachLine('Volles Spiel gestartet: 16 gegen 16.');
      render();
      api.saveNow();
    }
  };

  global.PracticeController = api;
})(window);
