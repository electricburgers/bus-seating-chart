(function (root) {
  'use strict';

  // DOM builders only. No state lives here; app.js passes everything in.
  // Text is always set with textContent, so names from a CSV can never inject markup.
  var FEATURE_BUTTONS = [
    { key: 'carSeat', short: 'C', label: 'Car seat' },
    { key: 'fiveStarBelt', short: '5', label: '5-star belt' },
    { key: 'harnessAttachment', short: 'H', label: 'Harness attachment' }
  ];

  function lib(n) { return root.BusApp[n]; }

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === false || v === null || v === undefined) return;
      if (k === 'text') el.textContent = v;
      else if (k === 'style') el.setAttribute('style', v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (kid) {
      if (kid) el.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    });
    return el;
  }

  function schoolStyle(school) {
    if (!school) return '';
    var hash = 0;
    for (var i = 0; i < school.length; i++) hash = (hash * 31 + school.charCodeAt(i)) % 360;
    return 'background:hsl(' + hash + ',70%,90%);border-color:hsl(' + hash + ',45%,40%);';
  }

  function warningText(list) { return list.map(lib('needs').describe).join('; '); }

  function studentChip(student, warnings, extraClass) {
    var chip = h('div', {
      'class': 'chip' + (extraClass ? ' ' + extraClass : ''),
      draggable: 'true', 'data-student-id': student.id,
      style: schoolStyle(student.school)
    }, [
      h('span', { 'class': 'chip-name', text: student.name }),
      student.school ? h('span', { 'class': 'chip-school', text: student.school }) : null
    ]);
    if (warnings && warnings.length) {
      chip.classList.add('warn');
      chip.appendChild(h('span', { 'class': 'flag', title: warningText(warnings), 'aria-label': 'Warning: ' + warningText(warnings), text: '⚑' }));
    }
    return chip;
  }

  function renderSeat(seatId, ctx, isWheelchair) {
    var studentId = ctx.roster[seatId];
    var student = studentId !== undefined ? ctx.byId[studentId] : null;
    var feats = ctx.features[seatId] || {};
    var seat = h('div', {
      'class': 'seat' + (isWheelchair ? ' wc' : '') + (student ? ' filled' : '') + (ctx.changed[seatId] ? ' changed' : ''),
      'data-seat-id': seatId, 'data-drop': ctx.interactive ? 'true' : false
    });
    if (student) {
      seat.appendChild(studentChip(student, ctx.warnings[studentId]));
    } else {
      seat.appendChild(h('span', { 'class': 'seat-empty', text: isWheelchair ? 'Wheelchair spot' : 'Empty' }));
    }
    if (!isWheelchair) {
      var bar = h('div', { 'class': 'features' });
      FEATURE_BUTTONS.forEach(function (f) {
        var on = !!feats[f.key];
        if (ctx.interactive) {
          bar.appendChild(h('button', {
            type: 'button', 'class': 'feature' + (on ? ' on' : ''), 'data-seat-id': seatId, 'data-feature': f.key,
            'aria-pressed': on ? 'true' : 'false', 'aria-label': f.label + ' for this seat', title: f.label, text: f.short
          }));
        } else if (on) {
          bar.appendChild(h('span', { 'class': 'feature on', title: f.label, text: f.short }));
        }
      });
      seat.appendChild(bar);
    }
    return seat;
  }

  function markerCell(text, cls) { return h('div', { 'class': 'marker ' + cls, text: text }); }

  // ctx: { chart, roster, features, interactive, changed: {seatId: true}, warnings, byId, title }
  function renderBus(ctx) {
    var L = lib('busLayout'), layout = ctx.chart.layout;
    var order = L.sideOrder(layout), markers = L.getMarkers(layout);
    var bus = h('div', { 'class': 'bus' });

    var front = { left: [], right: [] };
    front[markers.driverSeat.side].push(markerCell('Driver', 'driver-marker'));
    front[markers.frontDoor.side].push(markerCell('Door', 'door-marker'));
    bus.appendChild(h('div', { 'class': 'bench front-row' }, [
      h('div', { 'class': 'bench-side left' }, front.left),
      h('div', { 'class': 'aisle', text: 'Front' }),
      h('div', { 'class': 'bench-side right' }, front.right)
    ]));

    L.getBenches(layout).forEach(function (bench) {
      if (bench.wheelchair) {
        var spot = renderSeat('wc-' + bench.row, ctx, true);
        var door = h('div', { 'class': 'marker wc-door', text: 'Wheelchair door' });
        var parts = layout.doorSide === 'right' ? [spot, door] : [door, spot];
        bus.appendChild(h('div', { 'class': 'bench wc-row', 'data-row': bench.row }, parts));
        return;
      }
      var cols = order.map(function (side, i) {
        return h('div', { 'class': 'bench-side ' + (i === 0 ? 'left' : 'right') }, bench[side].map(function (s) {
          return renderSeat(s.id, ctx, false);
        }));
      });
      bus.appendChild(h('div', { 'class': 'bench', 'data-row': bench.row }, [
        cols[0], h('div', { 'class': 'aisle', text: String(bench.row) }), cols[1]
      ]));
    });
    bus.appendChild(h('div', { 'class': 'rear-exit', text: 'Rear emergency exit' }));

    return h('figure', { 'class': 'bus-figure' }, [h('figcaption', { text: ctx.title }), bus]);
  }

  var NEED_LABELS = [
    { key: 'carSeat', label: 'Car seat' }, { key: 'fiveStarBelt', label: '5-star belt' },
    { key: 'harnessAttachment', label: 'Harness' }, { key: 'wheelchair', label: 'Wheelchair' }
  ];

  function renderPool(chart, warnings) {
    var R = lib('roster'), E = lib('exporter');
    var list = chart.students.slice().sort(function (a, b) {
      var sa = R.seatOf(chart.roster, a.id) !== undefined, sb = R.seatOf(chart.roster, b.id) !== undefined;
      return sa === sb ? a.name.localeCompare(b.name) : (sa ? 1 : -1);
    });
    if (!list.length) return [h('li', { 'class': 'empty', text: 'No students yet. Import a CSV above.' })];
    return list.map(function (s) {
      var seatId = R.seatOf(chart.roster, s.id);
      var needs = h('div', { 'class': 'needs' }, NEED_LABELS.map(function (n) {
        return h('label', {}, [
          h('input', { type: 'checkbox', 'data-need': n.key, 'data-student-id': s.id, checked: !!(s.needs && s.needs[n.key]) }),
          ' ' + n.label
        ]);
      }));
      var w = warnings[s.id];
      return h('li', { 'class': 'pool-item' + (seatId !== undefined ? ' seated' : '') }, [
        studentChip(s, w),
        seatId !== undefined ? h('div', { 'class': 'seat-note', text: E.formatSeat(seatId) }) : null,
        w ? h('div', { 'class': 'warn-note', text: warningText(w) }) : null,
        needs
      ]);
    });
  }

  function renderChangeLog(rows, tableRows) {
    if (!rows.length) return h('p', { 'class': 'hint', text: 'No changes since the baseline.' });
    var body = h('tbody');
    rows.forEach(function (row, i) {
      var t = tableRows[i];
      body.appendChild(h('tr', {}, [
        h('td', { text: t.student }), h('td', { text: t.from }), h('td', { text: t.to }),
        h('td', {}, [h('input', {
          type: 'text', 'class': 'reason', 'data-key': row.key, value: row.reason,
          'aria-label': 'Reason for change', placeholder: 'Reason'
        })])
      ]));
    });
    return h('table', { 'class': 'change-table' }, [
      h('thead', {}, [h('tr', {}, ['Student', 'From', 'To', 'Reason'].map(function (c) { return h('th', { text: c }); }))]),
      body
    ]);
  }

  var api = { h: h, renderBus: renderBus, renderPool: renderPool, renderChangeLog: renderChangeLog, FEATURE_BUTTONS: FEATURE_BUTTONS };
  root.BusApp = root.BusApp || {};
  root.BusApp.ui = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
