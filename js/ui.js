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

  function currentStopShape() { return document.documentElement.getAttribute('data-stop-shape') || 'triangle'; }
  function stopShapeEl(shape) {
    var sp = lib('stopShape').spec(shape);
    var el = document.createElementNS('http://www.w3.org/2000/svg', sp.tag);
    Object.keys(sp.attrs).forEach(function (k) { el.setAttribute(k, sp.attrs[k]); });
    return el;
  }

  // Bus stop number in a triangle. An SVG so the outline and number stay crisp in color, gray and black and white.
  function stopBadge(stop) {
    var ns = 'http://www.w3.org/2000/svg';
    // The positioned wrapper holds the corner and size. The SVG inside stays static: the export capture bakes an element's
    // computed style into a standalone image, and an SVG that is itself absolutely positioned ends up shifted out of view.
    var wrap = document.createElement('span');
    wrap.className = 'chip-stop';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'stop-svg');
    // The corner is stored on the badge itself, not on the page root: the export capture works on a copy where root attributes do not exist.
    wrap.setAttribute('data-corner', lib('stopShape').corner(document.documentElement.getAttribute('data-stop-corner')).id);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Bus stop ' + stop);
    var shape = currentStopShape();
    svg.setAttribute('viewBox', lib('stopShape').VIEWBOX);
    var tri = stopShapeEl(shape);
    tri.setAttribute('class', 'stop-tri');
    var t = document.createElementNS(ns, 'text');
    t.setAttribute('x', '50'); t.setAttribute('y', String(lib('stopShape').numberY(shape))); t.setAttribute('text-anchor', 'middle');
    t.setAttribute('class', 'stop-num');
    t.textContent = stop;
    svg.appendChild(tri); svg.appendChild(t);
    wrap.appendChild(svg);
    return wrap;
  }

  function studentChip(student, warnings, extraClass) {
    var chip = h('div', {
      'class': 'chip' + (extraClass ? ' ' + extraClass : ''),
      draggable: 'true', tabindex: '0', role: 'button', 'data-student-id': student.id,
      style: schoolStyle(student.school)
    }, [
      h('span', { 'class': 'chip-name', title: student.name, 'data-full-name': student.name, 'data-nickname': student.nickname || false, text: student.name }),
      student.nickname ? h('span', { 'class': 'chip-nickname', text: '“' + student.nickname + '”' }) : null,
      student.school ? h('span', { 'class': 'chip-school', text: student.school }) : null,
      student.stop ? stopBadge(student.stop) : null
    ]);
    if (warnings && warnings.length) {
      chip.classList.add('warn');
      chip.appendChild(h('span', { 'class': 'flag', title: warningText(warnings), 'aria-label': 'Warning: ' + warningText(warnings), text: '⚑' }));
    }
    return chip;
  }

  // Seat names that do not fit step down through nameFit tiers: smaller text first, then a shortened first name.
  // Needs the seats to be in the page so the text can be measured. Safe to call again after every render.
  // Car seat and harness badges sit at the bottom right, in the school line, and the school text leaves room for them.
  // The stop number sits just above the school line, and above the badges too when it is in the bottom right corner.
  function placeFeatureBars(container) {
    var seats = Array.prototype.slice.call(container.querySelectorAll('.seat')), info = [];
    // Pass 1: reserve room for the badges in the school line (this can wrap the school onto a second line).
    seats.forEach(function (seat) {
      var bar = seat.querySelector('.features'), school = seat.querySelector('.chip-school');
      var box = bar && bar.children.length ? bar.getBoundingClientRect() : null;
      if (school) school.style.paddingRight = box ? Math.ceil(box.width + 6) + 'px' : '';
      if (school && !school.getClientRects().length) school = null; // hidden (one-school routes)
      info.push({ seat: seat, school: school, barH: box ? box.height : 0 });
    });
    // Pass 2: put the stop number just above the (possibly taller) school line, and above the badges in the bottom right.
    var jobs = [];
    info.forEach(function (i) {
      var stop = i.seat.querySelector('.chip-stop');
      if (!stop || lib('stopShape').corner(stop.getAttribute('data-corner')).top) return;
      var gap = i.school ? i.seat.getBoundingClientRect().bottom - i.school.getBoundingClientRect().top + 2 : 4;
      var right = stop.getAttribute('data-corner') === 'br';
      jobs.push([stop, Math.max(4, Math.round(gap), right && i.barH ? Math.round(i.barH + 6) : 0)]);
    });
    jobs.forEach(function (j) { j[0].style.bottom = j[1] + 'px'; });
  }

  function fitSeatNames(container) {
    try { fitNames(container); } finally { placeFeatureBars(container); }
  }
  // First name is big and bold on its own line, last name smaller after it, so the first name reads from across a bouncing bus.
  function setName(el, text, middle) {
    var i = text.lastIndexOf(' ');
    el.textContent = '';
    if (el.hasAttribute('data-first-only')) {
      // "Mary Jane" or "Ava N.": everything is the first name, with a trailing last initial as the small line.
      var m = /^(.*\S)\s+(\S\.)$/.exec(text);
      el.appendChild(h('span', { 'class': 'nm-first', text: m ? m[1] : text }));
      if (m) el.appendChild(h('span', { 'class': 'nm-last', text: m[2] }));
      return;
    }
    if (i < 0) { el.appendChild(h('span', { 'class': 'nm-last', text: text })); return; }
    el.appendChild(h('span', { 'class': 'nm-first', text: text.slice(0, i) }));
    if (middle) el.appendChild(h('span', { 'class': 'nm-mid', text: middle }));
    el.appendChild(h('span', { 'class': 'nm-last', text: text.slice(i + 1) }));
  }
  function fitNames(container) {
    var fit = lib('nameFit');
    var base = parseInt(container.style && container.style.getPropertyValue('--name-size'), 10) || parseInt(getComputedStyle(document.documentElement).getPropertyValue('--name-size'), 10) || 14;
    var SMALL_SIZE = Math.max(9, base - 2), FLOOR_SIZE = Math.max(8, base - 4);
    // Each pass writes every pending name's next tier, then reads all overflow flags together, so the browser
    // lays out the page once per tier (at most a handful of times) instead of once per seat per tier.
    var pending = Array.prototype.map.call(container.querySelectorAll('.seat .chip-name'), function (el) {
      var full = el.getAttribute('data-full-name') || el.textContent, initial = el.getAttribute('data-initial');
      return { el: el, list: el.hasAttribute('data-first-only') ? fit.firstTiers(full, initial || '', SMALL_SIZE, FLOOR_SIZE) : fit.tiers(full, SMALL_SIZE, FLOOR_SIZE, el.getAttribute('data-nickname')) };
    }).filter(function (p) { return p.list.length > 0; });
    function overflows(el) { return el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1; }
    for (var tier = 0; pending.length; tier++) {
      pending.forEach(function (p) {
        var t = p.list[tier];
        setName(p.el, t.text, t.middle);
        p.el.style.fontSize = t.size ? t.size + 'px' : '';
      });
      pending = pending.filter(function (p) { return tier + 1 < p.list.length && overflows(p.el); });
    }
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
  function sideCounts(layout) {
    var most = { driver: 0, door: 0 };
    lib('busLayout').getBenches(layout).forEach(function (b) {
      if (!b.wheelchair) { most.driver = Math.max(most.driver, b.driver.length); most.door = Math.max(most.door, b.door.length); }
    });
    return most;
  }
  // One side of a header-style row: a slot per seat column plus the same spacers the seat rows have, so slots line up with the seats.
  // slotFor(side, n) returns the content of column n (0 = A).
  function slotRow(order, i, most, anyExit, slotFor) {
    var side = order[i], kids = [];
    for (var n = 0; n < most[side]; n++) kids.push(slotFor(side, n));
    if (i === 1) kids.reverse();
    var tab = anyExit ? h('span', { 'class': 'window-exit-spacer', 'aria-hidden': 'true' }) : null;
    if (tab) { if (i === 0) kids.unshift(tab); else kids.push(tab); }
    var pad = h('span', { 'class': 'window-num window-num-spacer', 'aria-hidden': 'true' });
    if (i === 0) kids.unshift(pad); else kids.push(pad);
    return h('div', { 'class': 'bench-side col-heads ' + (i === 0 ? 'left' : 'right') }, kids);
  }
  function columnHeaders(layout, order, anyExit) {
    var most = sideCounts(layout);
    function slot(side, n) { return h('div', { 'class': 'col-head', text: LETTERS.charAt(n) }); }
    var cols = [0, 1].map(function (i) { return slotRow(order, i, most, anyExit, slot); });
    return h('div', { 'class': 'bench col-head-row', 'aria-hidden': 'true' }, [cols[0], h('div', { 'class': 'aisle', text: '' }), cols[1]]);
  }
  // Driver and Door labels sit over (or, with the rear at top, under) the seat column the user picked. Default is the aisle seat column.
  function markerColumn(side, count) {
    var v = document.documentElement.getAttribute('data-' + side + '-col') || 'aisle';
    var n = v === 'aisle' ? count - 1 : LETTERS.indexOf(v);
    return Math.max(0, Math.min(count - 1, n));
  }
  function frontRow(layout, order, anyExit) {
    var most = sideCounts(layout);
    function slot(side, n) {
      var on = n === markerColumn(side, most[side]);
      return h('div', { 'class': 'col-head' }, on ? [markerCell(side === 'driver' ? 'Driver' : 'Door', side + '-marker')] : []);
    }
    var cols = [0, 1].map(function (i) { return slotRow(order, i, most, anyExit, slot); });
    return h('div', { 'class': 'bench front-row' }, [cols[0], h('div', { 'class': 'aisle', text: 'Front' }), cols[1]]);
  }

  // Aide's view: rotate the chart half a turn so the rear exit is at the top and the driver and door are at the bottom.
  // Rows run rear to front and each row is mirrored (the driver side moves to the right), as the aide sees it facing the back.
  var rearTop = false;
  function setRearTop(on) { rearTop = !!on; }
  function rotateBus(bus) {
    Array.prototype.forEach.call(bus.querySelectorAll('.bench'), function (bench) {
      var kids = Array.prototype.slice.call(bench.children);
      if (kids.length === 3) {
        kids.forEach(function (side) {
          if (side.classList.contains('bench-side')) {
            side.classList.toggle('left'); side.classList.toggle('right');
            Array.prototype.slice.call(side.children).reverse().forEach(function (c) { side.appendChild(c); });
          }
        });
        kids.reverse().forEach(function (c) { bench.appendChild(c); });
      } else {
        kids.reverse().forEach(function (c) { bench.appendChild(c); });
      }
    });
    Array.prototype.slice.call(bus.children).reverse().forEach(function (c) { bus.appendChild(c); });
    bus.classList.add('rear-top');
  }

  // ctx: { chart, roster, features, interactive, changed: {seatId: true}, warnings, byId, title }
  function renderBus(ctx) {
    var L = lib('busLayout'), layout = ctx.chart.layout;
    var order = L.sideOrder(layout), markers = L.getMarkers(layout);
    var bus = h('div', { 'class': 'bus' });
    var anyExit = Object.keys(layout.emergencyWindows || {}).length > 0;

    bus.appendChild(frontRow(layout, order, anyExit));

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
        // Row number on the window edge: odd numbers on the driver side, even on the door side, as on the official sheet.
        var num = h('span', { 'class': 'window-num', title: 'Row number', text: String(side === 'driver' ? 2 * bench.row - 1 : 2 * bench.row) });
        if (i === 0) kids.unshift(num); else kids.push(num);
        return h('div', { 'class': 'bench-side ' + (i === 0 ? 'left' : 'right') }, kids);
      });
      bus.appendChild(h('div', { 'class': 'bench', 'data-row': bench.row }, [
        cols[0], h('div', { 'class': 'aisle', text: String(bench.row) }), cols[1]
      ]));
    });
    bus.appendChild(h('div', { 'class': 'rear-exit', text: 'Rear emergency exit' }));

    if (rearTop) rotateBus(bus);
    return h('figure', { 'class': 'bus-figure' }, [ctx.title ? h('figcaption', { text: ctx.title }) : null, bus]);
  }

  var NEED_LABELS = [
    { key: 'carSeat', label: 'Car seat (5-star belt)' },
    { key: 'harnessAttachment', label: 'Harness' }, { key: 'wheelchair', label: 'Wheelchair' }
  ];

  function renderPool(chart, warnings) {
    var R = lib('roster'), E = lib('exporter');
    var seatIdx = R.seatIndex(chart.roster);
    var list = chart.students.filter(function (s) { return !s.removed; }).sort(function (a, b) {
      var sa = seatIdx[a.id] !== undefined, sb = seatIdx[b.id] !== undefined;
      return sa === sb ? a.name.localeCompare(b.name) : (sa ? 1 : -1);
    });
    if (!list.length) return [h('li', { 'class': 'empty', text: 'No students yet. Open "Import CSV" above and paste or choose a file.' })];
    return list.map(function (s) {
      var seatId = seatIdx[s.id];
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
        h('label', { 'class': 'nickname-edit' }, ['Stop number ', h('input', { type: 'text', 'class': 'nickname-input', maxlength: '3', size: '4', 'data-stop': s.id, value: s.stop || '', placeholder: '#' })]),
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

  var api = { stopShapeEl: stopShapeEl, currentStopShape: currentStopShape, schoolStyle: schoolStyle, setRearTop: setRearTop, h: h, fitSeatNames: fitSeatNames, renderBus: renderBus, renderPool: renderPool, renderChangeLog: renderChangeLog, FEATURE_BUTTONS: FEATURE_BUTTONS };
  root.BusApp = root.BusApp || {};
  root.BusApp.ui = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
