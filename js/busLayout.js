(function (root) {
  'use strict';

  var SIDES = ['driver', 'door'];
  var MIN_WHEELCHAIR_ROWS = 2;

  function fail(msg) { throw new Error('busLayout: ' + msg); }
  function isCount(n) { return Number.isInteger(n) && n >= 0; }
  function checkSide(side) { if (SIDES.indexOf(side) < 0) fail('unknown side "' + side + '"'); }
  function copy(layout) {
    return {
      rows: layout.rows,
      driverSeats: layout.driverSeats,
      doorSeats: layout.doorSeats,
      overrides: Object.assign({}, layout.overrides),
      doorSide: layout.doorSide,
      wheelchair: Object.assign({}, layout.wheelchair)
    };
  }
  function normalizeWheelchair(w, rows) {
    var out = { enabled: false, rows: MIN_WHEELCHAIR_ROWS };
    Object.assign(out, w || {});
    out.enabled = !!out.enabled;
    if (!Number.isInteger(out.rows) || out.rows < MIN_WHEELCHAIR_ROWS) {
      fail('wheelchair area needs at least ' + MIN_WHEELCHAIR_ROWS + ' rows');
    }
    if (out.enabled && out.rows >= rows) fail('wheelchair area must leave at least one regular row');
    return out;
  }
  function validate(layout) {
    if (!Number.isInteger(layout.rows) || layout.rows < 1) fail('rows must be a positive integer');
    if (!isCount(layout.driverSeats) || !isCount(layout.doorSeats)) fail('seats per bench must be a non-negative integer');
    if (layout.doorSide !== 'left' && layout.doorSide !== 'right') fail('doorSide must be "left" or "right"');
    layout.wheelchair = normalizeWheelchair(layout.wheelchair, layout.rows);
    return layout;
  }

  function createLayout(options) {
    var o = options || {};
    return validate({
      rows: o.rows === undefined ? 10 : o.rows,
      driverSeats: o.driverSeats === undefined ? 3 : o.driverSeats,
      doorSeats: o.doorSeats === undefined ? 2 : o.doorSeats,
      overrides: Object.assign({}, o.overrides),
      doorSide: o.doorSide || 'right',
      wheelchair: o.wheelchair
    });
  }

  function setSeatsPerSide(layout, side, count) {
    checkSide(side);
    if (!isCount(count)) fail('seat count must be a non-negative integer');
    var next = copy(layout);
    next[side + 'Seats'] = count;
    return next;
  }

  function overrideKey(row, side) { return row + '-' + side; }
  function checkRow(layout, row) {
    if (!Number.isInteger(row) || row < 1 || row > layout.rows) fail('row ' + row + ' is out of range');
  }

  function setBenchOverride(layout, row, side, count) {
    checkSide(side); checkRow(layout, row);
    if (!isCount(count)) fail('seat count must be a non-negative integer');
    var next = copy(layout);
    next.overrides[overrideKey(row, side)] = count;
    return next;
  }

  function clearBenchOverride(layout, row, side) {
    checkSide(side); checkRow(layout, row);
    var next = copy(layout);
    delete next.overrides[overrideKey(row, side)];
    return next;
  }

  function flipDoorSide(layout) {
    var next = copy(layout);
    next.doorSide = layout.doorSide === 'right' ? 'left' : 'right';
    return next;
  }

  function setWheelchair(layout, change) {
    var next = copy(layout);
    next.wheelchair = normalizeWheelchair(Object.assign({}, layout.wheelchair, change), layout.rows);
    return next;
  }

  function sideOrder(layout) {
    return layout.doorSide === 'right' ? ['driver', 'door'] : ['door', 'driver'];
  }

  function wheelchairDoorSide(layout) { return layout.doorSide; }

  function seatsOnBench(layout, row, side) {
    var key = overrideKey(row, side);
    var n = Object.prototype.hasOwnProperty.call(layout.overrides, key) ? layout.overrides[key] : layout[side + 'Seats'];
    var seats = [];
    for (var i = 1; i <= n; i++) seats.push({ id: row + '-' + side + '-' + i, row: row, side: side, index: i });
    return seats;
  }

  // Rows run front (1) to rear. Wheelchair rows, when enabled, are the last N rows
  // and replace both sides of the bench entirely.
  function getBenches(layout) {
    var firstWheelchairRow = layout.wheelchair.enabled ? layout.rows - layout.wheelchair.rows + 1 : Infinity;
    var benches = [];
    for (var row = 1; row <= layout.rows; row++) {
      var wc = row >= firstWheelchairRow;
      benches.push({
        row: row,
        wheelchair: wc,
        driver: wc ? [] : seatsOnBench(layout, row, 'driver'),
        door: wc ? [] : seatsOnBench(layout, row, 'door')
      });
    }
    return benches;
  }

  function getSeats(layout) {
    var seats = [];
    getBenches(layout).forEach(function (b) { seats = seats.concat(b.driver, b.door); });
    return seats;
  }

  // One wheelchair spot per wheelchair row, ids like "wc-9".
  function getWheelchairSpots(layout) {
    return getBenches(layout).filter(function (b) { return b.wheelchair; })
      .map(function (b) { return { id: 'wc-' + b.row, row: b.row, wheelchair: true }; });
  }

  function getMarkers(layout) {
    var doorLeft = layout.doorSide === 'left';
    return {
      driverSeat: { side: doorLeft ? 'right' : 'left', position: 'front' },
      frontDoor: { side: layout.doorSide, position: 'front' },
      rearExit: { position: 'rear' }
    };
  }

  var api = {
    createLayout: createLayout, setSeatsPerSide: setSeatsPerSide,
    setBenchOverride: setBenchOverride, clearBenchOverride: clearBenchOverride,
    flipDoorSide: flipDoorSide, setWheelchair: setWheelchair, sideOrder: sideOrder,
    wheelchairDoorSide: wheelchairDoorSide, getBenches: getBenches, getSeats: getSeats,
    getMarkers: getMarkers, getWheelchairSpots: getWheelchairSpots, MIN_WHEELCHAIR_ROWS: MIN_WHEELCHAIR_ROWS
  };
  root.BusApp = root.BusApp || {};
  root.BusApp.busLayout = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
