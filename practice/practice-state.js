(function(global) {
  'use strict';

  var PHASE = {
    IDLE: 'idle',
    PLAYER_TURN: 'playerTurn',
    ANALYZING: 'analyzing',
    ENGINE_TURN: 'engineTurn',
    FINISHED: 'finished'
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function mkSession(settings) {
    return {
      id: 'sess_' + Date.now(),
      startedAt: nowIso(),
      mode: settings.mode || 'pawns',
      engineSkill: settings.engineSkill == null ? 4 : settings.engineSkill,
      difficulty: settings.difficulty == null ? 2 : settings.difficulty,
      targetType: 'fullGame',
      currentGameId: null
    };
  }

  function mkGame(startFen) {
    return {
      id: 'game_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      startFen: startFen || '',
      startedAt: nowIso(),
      finishedAt: null,
      result: 'ongoing',
      movesUci: [],
      movesSan: [],
      moveReviews: [],
      plyCount: 0,
      avgCpLoss: 0
    };
  }

  function mkStats() {
    return {
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      avgCpLoss: 0,
      bestStreak: 0,
      currentStreak: 0,
      last20Trend: []
    };
  }

  function createState() {
    return {
      enabled: false,
      phase: PHASE.IDLE,
      session: null,
      currentGame: null,
      games: [],
      stats: mkStats(),
      settings: {
        mode: 'pawns',
        rookVariant: 'krk',
        numPawns: 2,
        difficulty: 2,
        engineSkill: 4
      }
    };
  }

  var state = createState();

  function setPhase(next) {
    state.phase = next;
  }

  function setEnabled(enabled) {
    state.enabled = !!enabled;
    if (!enabled) setPhase(PHASE.IDLE);
  }

  function applySettings(settings) {
    if (!settings) return;
    if (settings.mode) state.settings.mode = settings.mode;
    if (settings.rookVariant) state.settings.rookVariant = settings.rookVariant;
    if (settings.numPawns != null) state.settings.numPawns = settings.numPawns;
    if (settings.difficulty != null) state.settings.difficulty = settings.difficulty;
    if (settings.engineSkill != null) state.settings.engineSkill = settings.engineSkill;
  }

  function startSession(settings) {
    applySettings(settings);
    state.session = mkSession(state.settings);
    state.games = [];
    state.stats = mkStats();
  }

  function beginGame(startFen) {
    if (!state.session) startSession(state.settings);
    var g = mkGame(startFen);
    state.currentGame = g;
    state.session.currentGameId = g.id;
    state.games.push(g);
    setPhase(PHASE.PLAYER_TURN);
  }

  function pushMove(move) {
    if (!state.currentGame || !move) return;
    state.currentGame.movesUci.push(move.uci || '');
    state.currentGame.movesSan.push(move.san || '');
    state.currentGame.plyCount = state.currentGame.movesUci.length;
  }

  function addMoveReview(review) {
    if (!state.currentGame || !review) return;
    state.currentGame.moveReviews.push(review);
    var sum = 0;
    var n = 0;
    for (var i = 0; i < state.currentGame.moveReviews.length; i++) {
      var r = state.currentGame.moveReviews[i];
      if (r && typeof r.cpLoss === 'number') {
        sum += r.cpLoss;
        n++;
      }
    }
    state.currentGame.avgCpLoss = n ? sum / n : 0;
  }

  function finishGame(result) {
    if (!state.currentGame) return;
    state.currentGame.result = result || 'draw';
    state.currentGame.finishedAt = nowIso();
    state.stats.gamesPlayed += 1;
    if (result === 'win') {
      state.stats.wins += 1;
      state.stats.currentStreak += 1;
      if (state.stats.currentStreak > state.stats.bestStreak) {
        state.stats.bestStreak = state.stats.currentStreak;
      }
    } else if (result === 'loss') {
      state.stats.losses += 1;
      state.stats.currentStreak = 0;
    } else {
      state.stats.draws += 1;
      state.stats.currentStreak = 0;
    }
    state.stats.last20Trend.push(result);
    if (state.stats.last20Trend.length > 20) state.stats.last20Trend.shift();
    recomputeAverageCpLoss();
    setPhase(PHASE.FINISHED);
  }

  function recomputeAverageCpLoss() {
    var sum = 0;
    var n = 0;
    for (var i = 0; i < state.games.length; i++) {
      var g = state.games[i];
      if (g && typeof g.avgCpLoss === 'number' && g.moveReviews && g.moveReviews.length) {
        sum += g.avgCpLoss;
        n++;
      }
    }
    state.stats.avgCpLoss = n ? sum / n : 0;
  }

  function snapshot() {
    return JSON.parse(JSON.stringify(state));
  }

  function restore(data) {
    if (!data || typeof data !== 'object') return false;
    state.enabled = !!data.enabled;
    state.phase = data.phase || PHASE.IDLE;
    state.session = data.session || null;
    state.currentGame = data.currentGame || null;
    state.games = Array.isArray(data.games) ? data.games : [];
    state.stats = data.stats || mkStats();
    state.settings = data.settings || state.settings;
    return true;
  }

  global.PracticeState = {
    PHASE: PHASE,
    state: state,
    createState: createState,
    setPhase: setPhase,
    setEnabled: setEnabled,
    applySettings: applySettings,
    startSession: startSession,
    beginGame: beginGame,
    pushMove: pushMove,
    addMoveReview: addMoveReview,
    finishGame: finishGame,
    snapshot: snapshot,
    restore: restore
  };
})(window);
