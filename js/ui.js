(function (root) {
  'use strict';

  // DOM builders only. No state lives here; app.js passes everything in.
  // Text is always set with textContent, so names from a CSV can never inject markup.
  var FEATURE_BUTTONS = [
    { key: 'carSeat', short: '★', label: 'Car seat (5-star belt)' },
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
      draggable: 'true', tabindex: '0', role: 'button', 'data-student-id': student.id,
      style: schoolStyle(student.school)
    }, [
      h('span', { 'class': 'chip-name', title: student.name, 'data-full-name': student.name, text: student.name }),
      student.nickname ? h('span', { 'class': 'chip-nickname', text: '“' + student.nickname + '”' }) : null,
      student.school ? h('span', { 'class': 'chip-school', text: student.school }) : null
    ]);
    if (warnings && warnings.length) {
      chip.classList.add('warn');
      chip.appendChild(h('span', { 'class': 'flag', title: warningText(warnings), 'aria-label': 'Warning: ' + warningText(warnings), text: '⚑' }));
    }
    return chip;
  }

  // Seat names that do not fit step down through nameFit tiers: smaller text first, then a shortened first name.
  // Needs the seats to be in the page so the text can be measured. Safe to call again after every render.
  var SMALL_SIZE = 12, FLOOR_SIZE = 10;
  function fitSeatNames(container) {
    var fit = lib('nameFit');
    Array.prototype.forEach.call(container.querySelectorAll('.seat .chip-name'), function (el) {
      var list = fit.tiers(el.getAttribute('data-full-name') || el.textContent, SMALL_SIZE, FLOOR_SIZE);
      function overflows() { return el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1; }
      for (var i = 0; i < list.length; i++) {
        el.textContent = list[i].text;
        el.style.fontSize = list[i].size ? list[i].size + 'px' : '';
        if (!overflows()) return;
      }
    });
  }

  function renderSeat(seatId, ctx, isWheelchair, label) {
    var studentId = ctx.roster[seatId];
    var student = studentId !== undefined ? ctx.byId[studentId] : null;
    var feats = ctx.features[seatId] || {};
    var seat = h('div', {
      'class': 'seat' + (isWheelchair ? ' wc' : '') + (student ? ' filled' : '') + (ctx.changed[seatId] ? ' changed' : ''),
      'data-seat-id': seatId, 'data-drop': ctx.interactive ? 'true' : false, tabindex: ctx.interactive ? '0' : false
    });
    if (!isWheelchair && (ctx.interactive || feats.carSeat || feats.harnessAttachment)) seat.classList.add('has-feat');
    if (label) seat.appendChild(h('span', { 'class': 'seat-label', text: label }));
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
          bar.appendChild(h('span', { 'class': 'feature on' + (f.key === 'harnessAttachment' ? ' feature-harness' : ''), title: f.label, text: f.short }));
        }
      });
      seat.appendChild(bar);
    }
    return seat;
  }

  function exitCell(side) {
    return h('span', { 'class': 'window-exit', role: 'img', 'aria-label': 'Emergency window exit, ' + side + ' side', title: 'Emergency window exit', text: 'EXIT' });
  }

  function markerCell(text, cls) { return h('div', { 'class': 'marker ' + cls, text: text }); }

  var LETTERS = 'ABCDEFGHIJKL';
  // A is always the window seat, then B, then C next to the aisle. The left column reads window to aisle, the right column aisle to window.
  function columnHeaders(layout, order, anyExit) {
    var L = lib('busLayout');
    var most = { driver: 0, door: 0 };
    L.getBenches(layout).forEach(function (b) {
      if (!b.wheelchair) { most.driver = Math.max(most.driver, b.driver.length); most.door = Math.max(most.door, b.door.length); }
    });
    var cols = order.map(function (side, i) {
      var kids = [];
      for (var n = 0; n < most[side]; n++) kids.push(h('div', { 'class': 'col-head', text: LETTERS.charAt(n) }));
      if (i === 1) kids.reverse();
      var tab = anyExit ? h('span', { 'class': 'window-exit-spacer', 'aria-hidden': 'true' }) : null;
      if (tab) { if (i === 0) kids.unshift(tab); else kids.push(tab); }
      return h('div', { 'class': 'bench-side col-heads ' + (i === 0 ? 'left' : 'right') }, kids);
    });
    return h('div', { 'class': 'bench col-head-row', 'aria-hidden': 'true' }, [cols[0], h('div', { 'class': 'aisle', text: '' }), cols[1]]);
  }

  // ctx: { chart, roster, features, interactive, changed: {seatId: true}, warnings, byId, title }
  function renderBus(ctx) {
    var L = lib('busLayout'), layout = ctx.chart.layout;
    var order = L.sideOrder(layout), markers = L.getMarkers(layout);
    var bus = h('div', { 'class': 'bus' });
    var anyExit = Object.keys(layout.emergencyWindows || {}).length > 0;

    var front = { left: [], right: [] };
    front[markers.driverSeat.side].push(markerCell('Driver', 'driver-marker'));
    front[markers.frontDoor.side].push(markerCell('Door', 'door-marker'));
    bus.appendChild(h('div', { 'class': 'bench front-row' }, [
      h('div', { 'class': 'bench-side left' }, front.left),
      h('div', { 'class': 'aisle', text: 'Front' }),
      h('div', { 'class': 'bench-side right' }, front.right)
    ]));

    bus.appendChild(columnHeaders(layout, order, anyExit));

    L.getBenches(layout).forEach(function (bench) {
      if (bench.wheelchair) {
        var spot = renderSeat('wc-' + bench.row, ctx, true);
        var door = h('div', { 'class': 'marker wc-door', text: 'Wheelchair door' });
        var parts = layout.doorSide === 'right' ? [spot, door] : [door, spot];
        bus.appendChild(h('div', { 'class': 'bench wc-row', 'data-row': bench.row }, parts));
        return;
      }
      // The EXIT tab sits inside its side, on the window edge of the bus, right beside that row's seats.
      var cols = order.map(function (side, i) {
        var kids = bench[side].map(function (s) { return renderSeat(s.id, ctx, false, s.label); });
        // Rows without an exit get an invisible spacer so seat columns stay lined up when any row has one.
        var tab = bench[side + 'Window'] ? exitCell(side) : (anyExit ? h('span', { 'class': 'window-exit-spacer', 'aria-hidden': 'true' }) : null);
        if (tab) { if (i === 0) kids.unshift(tab); else kids.push(tab); }
        return h('div', { 'class': 'bench-side ' + (i === 0 ? 'left' : 'right') }, kids);
      });
      bus.appendChild(h('div', { 'class': 'bench', 'data-row': bench.row }, [
        cols[0], h('div', { 'class': 'aisle', text: String(bench.row) }), cols[1]
      ]));
    });
    bus.appendChild(h('div', { 'class': 'rear-exit', text: 'Rear emergency exit' }));

    return h('figure', { 'class': 'bus-figure' }, [ctx.title ? h('figcaption', { text: ctx.title }) : null, bus]);
  }

  var NEED_LABELS = [
    { key: 'carSeat', label: 'Car seat (5-star belt)' },
    { key: 'harnessAttachment', label: 'Harness' }, { key: 'wheelchair', label: 'Wheelchair' }
  ];

  function renderPool(chart, warnings) {
    var R = lib('roster'), E = lib('exporter');
    var list = chart.students.filter(function (s) { return !s.removed; }).sort(function (a, b) {
      var sa = R.seatOf(chart.roster, a.id) !== undefined, sb = R.seatOf(chart.roster, b.id) !== undefined;
      return sa === sb ? a.name.localeCompare(b.name) : (sa ? 1 : -1);
    });
    if (!list.length) return [h('li', { 'class': 'empty', text: 'No students yet. Open "Import CSV" above and paste or choose a file.' })];
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
        seatId !== undefined ? h('div', { 'class': 'seat-note', text: E.formatSeat(seatId, chart.layout) }) : null,
        w ? h('div', { 'class': 'warn-note', text: warningText(w) }) : null,
        h('label', { 'class': 'nickname-edit' }, ['Preferred name ', h('input', { type: 'text', 'class': 'nickname-input', 'data-nickname': s.id, value: s.nickname || '', placeholder: 'Nickname' })]),
        needs,
        h('button', { type: 'button', 'class': 'danger delete-student', 'data-delete-student': s.id, 'aria-label': 'Delete ' + s.name, text: 'Delete student' })
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

  var api = { h: h, fitSeatNames: fitSeatNames, renderBus: renderBus, renderPool: renderPool, renderChangeLog: renderChangeLog, FEATURE_BUTTONS: FEATURE_BUTTONS };
  root.BusApp = root.BusApp || {};
  root.BusApp.ui = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
