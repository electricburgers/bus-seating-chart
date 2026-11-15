(function (root) {
  'use strict';

  // State is { seatId: studentId }. Seat ids come from busLayout (wheelchair spots are "wc-<row>").
  // Placement is never blocked by student needs; js/needs.js flags mismatches instead.
  function layoutLib() {
    return (typeof require === 'function' && typeof module !== 'undefined')
      ? require('./busLayout.js') : root.BusApp.busLayout;
  }

  function create() { return {}; }

  function validSpotIds(layout) {
    var L = layoutLib();
    var ids = {};
    L.getSeats(layout).forEach(function (s) { ids[s.id] = true; });
    L.getWheelchairSpots(layout).forEach(function (s) { ids[s.id] = true; });
    return ids;
  }

  function isWheelchairSpot(id) { return /^wc-\d+$/.test(id); }
  function studentAt(state, seatId) { return state[seatId]; }
  function seatOf(state, studentId) {
    for (var id in state) if (state[id] === studentId) return id;
    return undefined;
  }

  function assign(state, layout, studentId, seatId) {
    if (!validSpotIds(layout)[seatId]) throw new Error('roster: no such seat "' + seatId + '"');
    var current = seatOf(state, studentId);
    if (current === seatId) return state;
    if (state[seatId] !== undefined) throw new Error('roster: seat "' + seatId + '" is already taken');
    var next = Object.assign({}, state);
    if (current !== undefined) delete next[current];
    next[seatId] = studentId;
    return next;
  }

  // Drop onto a seat: swaps with the occupant when the student is seated, otherwise
  // the occupant goes back to unseated.
  function place(state, layout, studentId, seatId) {
    var occupant = state[seatId];
    if (occupant === undefined || occupant === studentId) return assign(state, layout, studentId, seatId);
    if (seatOf(state, studentId) !== undefined) return swap(state, studentId, occupant);
    return assign(unassign(state, occupant), layout, studentId, seatId);
  }

  function unassign(state, studentId) {
    var current = seatOf(state, studentId);
    if (current === undefined) return state;
    var next = Object.assign({}, state);
    delete next[current];
    return next;
  }

  function swap(state, a, b) {
    var sa = seatOf(state, a), sb = seatOf(state, b);
    if (sa === undefined || sb === undefined) throw new Error('roster: both students must be seated to swap');
    var next = Object.assign({}, state);
    next[sa] = b;
    next[sb] = a;
    return next;
  }

  function prune(state, layout) {
    var ok = validSpotIds(layout), next = {};
    for (var id in state) if (ok[id]) next[id] = state[id];
    return next;
  }

  function unseated(state, studentIds) {
    return studentIds.filter(function (id) { return seatOf(state, id) === undefined; });
  }

  var api = { create: create, assign: assign, place: place, unassign: unassign, swap: swap, prune: prune,
    unseated: unseated, studentAt: studentAt, seatOf: seatOf, isWheelchairSpot: isWheelchairSpot };
  root.BusApp = root.BusApp || {};
  root.BusApp.roster = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
