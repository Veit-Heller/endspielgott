(function(global) {
  'use strict';

  function parse() {
    var p = new URLSearchParams(window.location.search);
    var on = p.get('practice');
    return {
      enabled: on === '1' || on === 'true',
      fen: p.get('fen') || '',
      mode: p.get('mode') || '',
      rv: p.get('rv') || '',
      skill: numberOrNull(p.get('skill')),
      diff: numberOrNull(p.get('diff')),
      np: numberOrNull(p.get('np')),
      replay: p.get('replay') || ''
    };
  }

  function numberOrNull(v) {
    if (v == null || v === '') return null;
    var n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  }

  function makeShareUrl(input) {
    var p = new URLSearchParams();
    p.set('practice', '1');
    p.set('fen', input.fen || '');
    p.set('mode', input.mode || 'pawns');
    p.set('rv', input.rv || 'krk');
    p.set('skill', String(input.skill == null ? 4 : input.skill));
    p.set('diff', String(input.diff == null ? 2 : input.diff));
    p.set('np', String(input.np == null ? 2 : input.np));
    if (input.replay) p.set('replay', input.replay);
    var base = (window.location.origin && window.location.origin !== 'null')
      ? (window.location.origin + window.location.pathname)
      : window.location.href.split('?')[0];
    return base + '?' + p.toString();
  }

  global.PracticeRouter = {
    parse: parse,
    makeShareUrl: makeShareUrl
  };
})(window);
