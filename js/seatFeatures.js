(function (root) {
  'use strict';

  var FEATURES = ['carSeat', 'harnessAttachment'];

  function checkFeature(f) {
    if (FEATURES.indexOf(f) < 0) throw new Error('seatFeatures: unknown feature "' + f + '"');
  }
  function none() { return { carSeat: false, harnessAttachment: false }; }

  // State is { seatId: { carSeat: true, ... } } holding only the features that are on.
  function create() { return {}; }

  function getFeatures(state, seatId) { return Object.assign(none(), state[seatId]); }
  function hasFeature(state, seatId, feature) { checkFeature(feature); return !!(state[seatId] && state[seatId][feature]); }

  function setFeature(state, seatId, feature, value) {
    checkFeature(feature);
    var next = Object.assign({}, state);
    var seat = Object.assign({}, next[seatId]);
    if (value) seat[feature] = true; else delete seat[feature];
    if (Object.keys(seat).length) next[seatId] = seat; else delete next[seatId];
    return next;
  }

  function toggleFeature(state, seatId, feature) {
    return setFeature(state, seatId, feature, !hasFeature(state, seatId, feature));
  }

  function prune(state, seatIds) {
    var keep = {};
    seatIds.forEach(function (id) { if (state[id]) keep[id] = state[id]; });
    return keep;
  }

  var api = { FEATURES: FEATURES, create: create, getFeatures: getFeatures, hasFeature: hasFeature,
    setFeature: setFeature, toggleFeature: toggleFeature, prune: prune };
  root.BusApp = root.BusApp || {};
  root.BusApp.seatFeatures = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
