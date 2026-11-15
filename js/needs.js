(function (root) {
  'use strict';

  var NEEDS = ['carSeat', 'harnessAttachment', 'wheelchair'];
  var LABELS = { carSeat: 'a 5-star car seat', harnessAttachment: 'a harness attachment' };

  // needs: { carSeat: true, ... } for one student. seatFeaturesState: see seatFeatures.js.
  function checkStudent(needs, seatId, seatFeaturesState) {
    var warnings = [];
    var n = needs || {};
    var seat = seatFeaturesState[seatId] || {};
    ['carSeat', 'harnessAttachment'].forEach(function (f) {
      if (n[f] && !seat[f]) warnings.push({ type: 'missingFeature', feature: f });
    });
    if (n.wheelchair && !/^wc-\d+$/.test(seatId)) warnings.push({ type: 'wheelchairOutsideArea' });
    return warnings;
  }

  // rosterState: { seatId: studentId }; needsByStudent: { studentId: needs }.
  // Returns { studentId: [warnings] } for seated students that have at least one warning.
  function getWarnings(rosterState, needsByStudent, seatFeaturesState) {
    var out = {};
    Object.keys(rosterState).forEach(function (seatId) {
      var id = rosterState[seatId];
      var w = checkStudent(needsByStudent[id], seatId, seatFeaturesState);
      if (w.length) out[id] = w;
    });
    return out;
  }

  function describe(w) {
    if (w.type === 'wheelchairOutsideArea') return 'Needs the wheelchair area';
    if (w.type === 'missingFeature') return 'Needs ' + LABELS[w.feature];
    return 'Unknown warning';
  }

  var api = { NEEDS: NEEDS, checkStudent: checkStudent, getWarnings: getWarnings, describe: describe };
  root.BusApp = root.BusApp || {};
  root.BusApp.needs = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
