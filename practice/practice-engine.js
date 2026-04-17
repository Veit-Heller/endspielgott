(function(global) {
  'use strict';

  var queue = [];
  var running = false;
  var activeToken = 0;

  function enqueue(task) {
    queue.push(task);
    queue.sort(function(a, b) {
      return (b.priority || 0) - (a.priority || 0);
    });
    pump();
  }

  function mkTask(fn, opts) {
    opts = opts || {};
    return {
      fn: fn,
      priority: opts.priority || 0,
      timeoutMs: opts.timeoutMs || 12000,
      resolve: opts.resolve,
      reject: opts.reject
    };
  }

  function pump() {
    if (running || !queue.length) return;
    var task = queue.shift();
    running = true;
    var token = ++activeToken;
    var finished = false;
    var timeout = setTimeout(function() {
      if (finished) return;
      finished = true;
      running = false;
      if (task.reject) task.reject(new Error('Engine timeout'));
      pump();
    }, task.timeoutMs);

    Promise.resolve()
      .then(task.fn)
      .then(function(res) {
        if (finished || token !== activeToken) return;
        finished = true;
        clearTimeout(timeout);
        running = false;
        if (task.resolve) task.resolve(res);
        pump();
      })
      .catch(function(err) {
        if (finished || token !== activeToken) return;
        finished = true;
        clearTimeout(timeout);
        running = false;
        if (task.reject) task.reject(err);
        pump();
      });
  }

  function cancelAll() {
    queue = [];
    activeToken++;
    running = false;
  }

  function runEvalPosition(fen, depth, priority) {
    return new Promise(function(resolve, reject) {
      enqueue(mkTask(function() {
        return global.evalPosition(fen, depth);
      }, { priority: priority || 1, timeoutMs: 14000, resolve: resolve, reject: reject }));
    });
  }

  function runEvalFull(fen, depth, priority) {
    return new Promise(function(resolve, reject) {
      enqueue(mkTask(function() {
        return global.evalFull(fen, depth);
      }, { priority: priority || 2, timeoutMs: 18000, resolve: resolve, reject: reject }));
    });
  }

  function runEngineMove(fen, depth, skill, priority) {
    return new Promise(function(resolve, reject) {
      enqueue(mkTask(function() {
        return global.sfSearch(fen, depth, skill);
      }, { priority: priority || 3, timeoutMs: 16000, resolve: resolve, reject: reject }));
    });
  }

  global.PracticeEngine = {
    runEvalPosition: runEvalPosition,
    runEvalFull: runEvalFull,
    runEngineMove: runEngineMove,
    cancelAll: cancelAll
  };
})(window);
