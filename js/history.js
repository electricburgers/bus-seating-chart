(function (root) {
  'use strict';

  // Undo/redo over opaque snapshots (app.js stores the serialized chart as a string).
  // A history is { past: [], present, future: [], limit }. Every function returns a new history.
  var DEFAULT_LIMIT = 100;

  function create(initial, limit) {
    return { past: [], present: initial, future: [], limit: limit > 0 ? limit : DEFAULT_LIMIT };
  }

  // Record a new present state. Identical states are ignored, and a new edit clears the redo stack.
  function push(h, state) {
    if (state === h.present) return h;
    var past = h.past.concat([h.present]);
    if (past.length > h.limit) past = past.slice(past.length - h.limit);
    return { past: past, present: state, future: [], limit: h.limit };
  }

  function canUndo(h) { return h.past.length > 0; }
  function canRedo(h) { return h.future.length > 0; }

  function undo(h) {
    if (!canUndo(h)) return h;
    return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present].concat(h.future), limit: h.limit };
  }

  function redo(h) {
    if (!canRedo(h)) return h;
    return { past: h.past.concat([h.present]), present: h.future[0], future: h.future.slice(1), limit: h.limit };
  }

  var api = { create: create, push: push, undo: undo, redo: redo, canUndo: canUndo, canRedo: canRedo, DEFAULT_LIMIT: DEFAULT_LIMIT };
  root.BusApp = root.BusApp || {};
  root.BusApp.history = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
