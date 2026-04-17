(function() {
  'use strict';

  var out = document.getElementById('out');
  var lines = [];
  var failed = 0;

  function log(msg) {
    lines.push(msg);
  }

  function assert(name, condition) {
    if (condition) log('PASS: ' + name);
    else {
      failed++;
      log('FAIL: ' + name);
    }
  }

  function testRouter() {
    var url = window.PracticeRouter.makeShareUrl({
      fen: '8/8/8/8/8/8/8/8 w - - 0 1',
      mode: 'rook',
      rv: 'krk',
      skill: 10,
      diff: 3,
      np: 2,
      replay: 'game_123'
    });
    assert('router includes practice flag', url.indexOf('practice=1') >= 0);
    assert('router includes replay id', url.indexOf('replay=game_123') >= 0);
  }

  function testCoach() {
    assert('coach best classification', window.PracticeCoach.classify(0, true) === 'best');
    assert('coach blunder classification', window.PracticeCoach.classify(400, false) === 'blunder');
    var review = window.PracticeCoach.buildMoveReview({
      ply: 3,
      playerMove: 'Re1',
      playerUci: 'e2e1',
      cpBeforeEval: 20,
      cpAfterActual: -90,
      cpLoss: 120,
      isBestMove: false
    });
    assert('review has rating tag', review.ratingTag === 'ok');
  }

  function testState() {
    window.PracticeState.setEnabled(true);
    window.PracticeState.startSession({ engineSkill: 7, mode: 'rook' });
    window.PracticeState.beginGame('8/8/8/8/8/8/8/8 w - - 0 1');
    window.PracticeState.pushMove({ uci: 'e2e4', san: 'e4' });
    window.PracticeState.addMoveReview({ cpLoss: 60 });
    window.PracticeState.finishGame('win');
    var snap = window.PracticeState.snapshot();
    assert('state records game', snap.games.length >= 1);
    assert('state records wins', snap.stats.wins >= 1);
  }

  try {
    testRouter();
    testCoach();
    testState();
  } catch (e) {
    failed++;
    log('ERROR: ' + e.message);
  }

  log('');
  log(failed ? 'Result: ' + failed + ' test(s) failed.' : 'Result: all tests passed.');
  out.textContent = lines.join('\n');
})();
