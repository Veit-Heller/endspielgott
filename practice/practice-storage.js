(function(global) {
  'use strict';

  var KEY = 'endspielgott.practice.v1';

  function save(snapshot) {
    try {
      var payload = {
        schemaVersion: 1,
        savedAt: new Date().toISOString(),
        data: snapshot
      };
      localStorage.setItem(KEY, JSON.stringify(payload));
      return true;
    } catch (e) {
      return false;
    }
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var payload = JSON.parse(raw);
      if (!payload || payload.schemaVersion !== 1) return null;
      return payload.data || null;
    } catch (e) {
      return null;
    }
  }

  function clear() {
    try {
      localStorage.removeItem(KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  global.PracticeStorage = {
    save: save,
    load: load,
    clear: clear,
    key: KEY
  };
})(window);
