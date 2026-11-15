(function (root) {
  'use strict';

  var FEATURE_NAMES = ['carSeat', 'harnessAttachment'];

  function copyFeatures(features) {
    var out = {};
    Object.keys(features).forEach(function (id) { out[id] = Object.assign({}, features[id]); });
    return out;
  }
  function full(f) {
    var out = {};
    FEATURE_NAMES.forEach(function (n) { out[n] = !!(f && f[n]); });
    return out;
  }
  function seatByStudent(roster) {
    var map = {};
    Object.keys(roster).forEach(function (seat) { map[roster[seat]] = seat; });
    return map;
  }
  function sameFeatures(a, b) { return FEATURE_NAMES.every(function (n) { return a[n] === b[n]; }); }

  function createBaseline(roster, features) {
    return { roster: Object.assign({}, roster), features: copyFeatures(features) };
  }

  // Compares baseline to current only, so a chain of moves collapses to one change
  // and a move back to the original seat produces nothing.
  function diff(baseline, current) {
    if (!baseline) return [];
    var before = seatByStudent(baseline.roster), after = seatByStudent(current.roster);
    var students = Object.keys(before).concat(Object.keys(after).filter(function (s) { return !(s in before); }));
    var changes = [];
    var order = { moved: 0, removed: 1, added: 2 };
    students.forEach(function (s) {
      if (s in before && s in after) {
        if (before[s] !== after[s]) changes.push({ type: 'moved', student: s, from: before[s], to: after[s] });
      } else if (s in before) changes.push({ type: 'removed', student: s, from: before[s] });
      else changes.push({ type: 'added', student: s, to: after[s] });
    });
    changes.sort(function (a, b) { return order[a.type] - order[b.type]; });

    var seats = {};
    Object.keys(baseline.features).concat(Object.keys(current.features)).forEach(function (id) { seats[id] = true; });
    Object.keys(seats).sort().forEach(function (id) {
      var from = full(baseline.features[id]), to = full(current.features[id]);
      if (!sameFeatures(from, to)) changes.push({ type: 'featureChanged', seat: id, from: from, to: to });
    });
    return changes;
  }

  function changeKey(change) {
    return change.type === 'featureChanged' ? 'seat:' + change.seat : 'student:' + change.student;
  }

  function setReason(reasons, key, text) {
    var next = Object.assign({}, reasons), t = String(text || '').trim();
    if (t) next[key] = t; else delete next[key];
    return next;
  }

  function getRows(changes, reasons) {
    return changes.map(function (c) {
      var key = changeKey(c);
      return Object.assign({ key: key, reason: reasons[key] || '' }, c);
    });
  }

  var api = { createBaseline: createBaseline, diff: diff, changeKey: changeKey, setReason: setReason, getRows: getRows };
  root.BusApp = root.BusApp || {};
  root.BusApp.changeLog = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
