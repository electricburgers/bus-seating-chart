(function (root) {
  'use strict';

  // Pure helpers for exports. Drawing the PDF and JPEG (html2canvas, jsPDF) happens in the UI layer.
  var FEATURE_LABELS = { carSeat: '5-star car seat', harnessAttachment: 'harness attachment' };
  var CSV_COLUMNS = ['route', 'date', 'seat', 'side', 'row', 'student', 'school',
    'car_seat', 'harness_attachment', 'wheelchair'];

  function lib(name) {
    return (typeof require === 'function' && typeof module !== 'undefined')
      ? require('./' + name + '.js') : root.BusApp[name];
  }

  function slug(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function buildFilename(routeName, date, ext) {
    return (slug(routeName) || 'bus') + '_' + date + '.' + ext;
  }

  // Pass the layout to get the official label first, like "A1 (row 1, driver side)".
  function formatSeat(id, layout) {
    if (!id) return '';
    var wc = /^wc-(\d+)$/.exec(id);
    if (wc) return 'Wheelchair area, row ' + wc[1];
    var m = /^(\d+)-(driver|door)-(\d+)$/.exec(id);
    if (!m) return id;
    if (layout) {
      var seat = lib('busLayout').getSeats(layout).filter(function (s) { return s.id === id; })[0];
      if (seat) return seat.label + ' (row ' + m[1] + ', ' + m[2] + ' side)';
    }
    return 'Row ' + m[1] + ', ' + m[2] + ' side, seat ' + m[3];
  }

  function headerLines(info) {
    return {
      route: 'Route: ' + (String(info.routeName || '').trim() || '(no route name)') +
        (String(info.routeNumber || '').trim() ? ' #' + String(info.routeNumber).trim() : '') +
        (info.shift ? ' (' + info.shift + ')' : ''),
      driver: 'Driver: ' + (String(info.driver || '').trim() || '(none)'),
      aide: 'Aide: ' + (String(info.aide || '').trim() || '(none)'),
      notes: String(info.notes || '').trim(),
      date: 'Date: ' + info.exportDate
    };
  }

  function yesNo(v) { return v ? 'yes' : 'no'; }

  // One row per seat, left to right on screen, front to rear. Wheelchair rows have one spot each.
  function csvRows(chart, exportDate) {
    var L = lib('busLayout');
    var byId = {};
    chart.students.forEach(function (s) { byId[s.id] = s; });
    var rows = [CSV_COLUMNS.slice()];
    function add(seatId, side, row, isWheelchair) {
      var s = byId[chart.roster[seatId]];
      var f = (chart.features && chart.features[seatId]) || {};
      rows.push([chart.routeName || '', exportDate, seatId, side, row, s ? s.name : '', s ? s.school : '',
        yesNo(f.carSeat), yesNo(f.harnessAttachment), yesNo(isWheelchair)]);
    }
    var order = L.sideOrder(chart.layout);
    L.getBenches(chart.layout).forEach(function (bench) {
      if (bench.wheelchair) { add('wc-' + bench.row, 'wheelchair', bench.row, true); return; }
      order.forEach(function (side) {
        bench[side].forEach(function (seat) { add(seat.id, side, bench.row, false); });
      });
    });
    return rows;
  }

  // Quotes fields as needed. Text that a spreadsheet would run as a formula gets a leading apostrophe.
  function csvCell(v) {
    var s = v === null || v === undefined ? '' : String(v);
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCsv(rows) {
    return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n';
  }

  function describeFeatures(f) {
    var names = Object.keys(FEATURE_LABELS).filter(function (k) { return f && f[k]; })
      .map(function (k) { return FEATURE_LABELS[k]; });
    return names.length ? names.join(', ') : 'no seat features';
  }

  // rows come from changeLog.getRows. Returns plain rows for the Change Summary table.
  function changeTableRows(rows, students, layout) {
    var names = {};
    students.forEach(function (s) { names[s.id] = s.name; });
    return rows.map(function (r) {
      if (r.type === 'featureChanged') {
        var seat = formatSeat(r.seat, layout);
        return { student: '', from: seat + ': ' + describeFeatures(r.from), to: seat + ': ' + describeFeatures(r.to), reason: r.reason };
      }
      return {
        student: names[r.student] || r.student,
        from: r.type === 'added' ? '(new)' : formatSeat(r.from, layout),
        to: r.type === 'removed' ? '(removed)' : formatSeat(r.to, layout),
        reason: r.reason
      };
    });
  }

  var api = { CSV_COLUMNS: CSV_COLUMNS, buildFilename: buildFilename, formatSeat: formatSeat, headerLines: headerLines,
    csvRows: csvRows, toCsv: toCsv, describeFeatures: describeFeatures, changeTableRows: changeTableRows };
  root.BusApp = root.BusApp || {};
  root.BusApp.exporter = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
