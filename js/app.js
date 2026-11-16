(function (root) {
  'use strict';
  if (typeof document === 'undefined') return;

  var B = root.BusApp;
  var Schools = B.schools, Layout = B.busLayout, Features = B.seatFeatures, Roster = B.roster, Needs = B.needs, Csv = B.csvParser;
  var Prompt = B.rosterPrompt, Log = B.changeLog, Store = B.storage, Exp = B.exporter, UI = B.ui, History = B.history;

  function $(id) { return document.getElementById(id); }
  function today() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function storage() { try { return root.localStorage; } catch (e) { return null; } }
  function newChart() {
    return { routeName: '', routeNumber: '', shift: '', driver: '', aide: '', notes: '', preparedBy: '', layout: Layout.createLayout(), students: [], roster: {}, features: {}, baseline: null, reasons: {}, logSnapshot: null };
  }

  var chart = Store.loadAutosave(storage()) || newChart();
  var templates = Store.loadTemplates(storage());
  var view = 'after';
  var popover;
  var hist = History.create(Store.serialize(chart));
  var autosaveOk = true;
  var swapMode = false, swapFrom = null;
  var theme = Store.loadTheme(storage());

  // ---- theme ----

  function applyTheme() {
    var dark = theme === 'dark' || (theme === 'auto' && root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
  applyTheme();
  if (root.matchMedia) {
    var mq = root.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', applyTheme);
  }

  // ---- feedback and saving ----

  function notify(message, isError) {
    var el = $('status');
    el.textContent = message;
    el.className = 'status' + (isError ? ' error' : '');
  }
  function guard(fn) {
    try { fn(); } catch (e) { notify(e.message.replace(/^\w+: /, ''), true); }
  }
  function save() {
    var r = Store.saveAutosave(storage(), chart);
    autosaveOk = r.ok;
    if (!r.ok) notify('Auto-save failed (' + r.error + '). Use Save JSON to keep your work.', true);
  }
  // Every user-visible change goes through commit(): it records an undo step, auto-saves and redraws.
  function commit() { hist = History.push(hist, Store.serialize(chart)); save(); render(); }

  function syncHeaderInputs() {
    $('route-name').value = chart.routeName;
    $('route-number').value = chart.routeNumber;
    $('route-shift').value = chart.shift;
    $('driver-name').value = chart.driver;
    $('aide-name').value = chart.aide;
    $('route-notes').value = chart.notes;
    $('prepared-by').value = chart.preparedBy;
  }
  // Route name, preparer and change reasons are typed text, so they stay as they are when you undo or redo.
  function restoreSnapshot(text, message) {
    var keep = { routeName: chart.routeName, routeNumber: chart.routeNumber, shift: chart.shift, driver: chart.driver, aide: chart.aide, notes: chart.notes, preparedBy: chart.preparedBy, reasons: chart.reasons };
    chart = Object.assign(Store.deserialize(text), keep);
    swapFrom = null;
    syncHeaderInputs();
    save();
    render();
    notify(message);
  }
  function undo() {
    if (!History.canUndo(hist)) { notify('Nothing to undo.'); return; }
    hist = History.undo(hist);
    restoreSnapshot(hist.present, 'Undid the last change.');
  }
  function redo() {
    if (!History.canRedo(hist)) { notify('Nothing to redo.'); return; }
    hist = History.redo(hist);
    restoreSnapshot(hist.present, 'Redid the change.');
  }

  // One-deep safety copy of the chart that is about to be replaced. Survives a reload, unlike undo.
  function backupBefore(reason) {
    var r = Store.saveBackup(storage(), chart, reason);
    if (!r.ok) notify('Could not keep a backup of the old chart (' + r.error + ').', true);
  }
  function hasWork() { return activeStudents().length > 0 || Object.keys(chart.roster).length > 0; }

  // ---- rendering ----

  function needsById() {
    var map = {};
    chart.students.forEach(function (s) { map[s.id] = s.needs; });
    return map;
  }
  function byId() {
    var map = {};
    chart.students.forEach(function (s) { map[s.id] = s; });
    return map;
  }
  function busContext(roster, features, interactive, changed, title) {
    return {
      chart: chart, roster: roster, features: features, interactive: interactive, changed: changed, title: title,
      byId: byId(), warnings: Needs.getWarnings(roster, needsById(), features)
    };
  }
  function changedSeats(changes, which) {
    var set = {};
    changes.forEach(function (c) {
      if (c.type === 'featureChanged') set[c.seat] = true;
      else if (which === 'before' && c.from) set[c.from] = true;
      else if (which === 'after' && c.to) set[c.to] = true;
    });
    return set;
  }

  // The change log is not built while the user is still moving students. They press "Finalize change log"
  // and get a frozen table; if seating changes afterwards the log says so and offers a refresh.
  function changeSig(list) { return JSON.stringify((list || []).map(function (c) { return Log.getRows([c], {})[0].key; }).sort()); }
  function renderLogSection(liveChanges) {
    if (!chart.baseline) return UI.h('p', { 'class': 'hint', text: 'Press "Set baseline" first, then move students. Come back here when you are done.' });
    var btn = UI.h('button', { type: 'button', id: 'finalize-log', text: chart.logSnapshot ? 'Refresh change log' : 'Finalize change log' });
    if (!chart.logSnapshot) {
      return UI.h('div', {}, [
        UI.h('p', { 'class': 'hint', text: 'Keep moving students as much as you like. The change log is only built when you press Finalize, so it does not shift while you work.' }),
        btn]);
    }
    var rows = Log.getRows(chart.logSnapshot, chart.reasons);
    var stale = changeSig(chart.logSnapshot) !== changeSig(liveChanges);
    return UI.h('div', {}, [
      stale ? UI.h('p', { 'class': 'warn-note', role: 'status', text: 'Seating has changed since this log was finalized. Press Refresh to update it.' })
        : UI.h('p', { 'class': 'hint', text: 'Finalized. Add a reason for each change.' }),
      UI.renderChangeLog(rows, Exp.changeTableRows(rows, chart.students, chart.layout)),
      btn]);
  }

  function render() {
    if (view !== 'after' && !chart.baseline) view = 'after';
    var changes = Log.diff(chart.baseline, { roster: chart.roster, features: chart.features });

    var views = $('views');
    views.textContent = '';
    views.className = 'views ' + view;
    if (view !== 'after') {
      views.appendChild(UI.renderBus(busContext(chart.baseline.roster, chart.baseline.features, false,
        changedSeats(changes, 'before'), 'Before (baseline)')));
    }
    if (view !== 'before') {
      views.appendChild(UI.renderBus(busContext(chart.roster, chart.features, true, changedSeats(changes, 'after'), 'After (current)')));
    }
    UI.fitSeatNames(views);

    var pool = $('pool');
    pool.textContent = '';
    UI.renderPool(chart, Needs.getWarnings(chart.roster, needsById(), chart.features)).forEach(function (li) { pool.appendChild(li); });

    var fromSel = $('school-from'), picked = fromSel.value;
    fromSel.textContent = '';
    Schools.listSchools(chart.students).forEach(function (sc) {
      fromSel.appendChild(UI.h('option', { value: sc.name, text: sc.name + ' (' + sc.count + ')' }));
    });
    if (picked) fromSel.value = picked;
    $('student-count').textContent = '(' + activeStudents().length + ')';

    var rows = Log.getRows(changes, chart.reasons);
    var log = $('changelog');
    log.textContent = '';
    log.appendChild(renderLogSection(changes));

    Array.prototype.forEach.call(document.querySelectorAll('[data-view]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-view') === view ? 'true' : 'false');
      if (b.getAttribute('data-view') !== 'after') b.disabled = !chart.baseline;
    });
    $('onboarding').hidden = hasWork() || !!chart.baseline;
    $('undo').disabled = !History.canUndo(hist);
    $('redo').disabled = !History.canRedo(hist);
    markSwap();
    $('baseline-note').textContent = chart.baseline ? changes.length + ' change' + (changes.length === 1 ? '' : 's') + ' since baseline' : 'No baseline set';
  }

  // ---- layout changes ----

  function seatIds(layout) { return Layout.getSeats(layout).map(function (s) { return s.id; }); }
  function applyLayout(layout, features) {
    chart.layout = layout;
    chart.roster = Roster.prune(chart.roster, layout);
    chart.features = Features.prune(features || chart.features, seatIds(layout));
    commit();
  }
  function rebuild(change) { return Layout.createLayout(Object.assign({}, chart.layout, change)); }
  function wholeNumber(n) {
    if (!Number.isInteger(n)) throw new Error('Enter a whole number.');
    return n;
  }

  var actions = {
    setRows: function (n) { guard(function () { applyLayout(rebuild({ rows: wholeNumber(n) })); }); },
    setSeats: function (side, n) { guard(function () { applyLayout(Layout.setSeatsPerSide(chart.layout, side, wholeNumber(n))); }); },
    flipDoor: function () { guard(function () { applyLayout(Layout.flipDoorSide(chart.layout)); }); },
    setWheelchair: function (change) { guard(function () { applyLayout(Layout.setWheelchair(chart.layout, change)); }); },
    setOverride: function (row, side, n) {
      guard(function () { applyLayout(Layout.setBenchOverride(chart.layout, wholeNumber(row), side, wholeNumber(n))); });
    },
    setWindow: function (row, side, on) { guard(function () { applyLayout(Layout.setEmergencyWindow(chart.layout, wholeNumber(row), side, !!on)); }); },
    clearOverride: function (row, side) { guard(function () { applyLayout(Layout.clearBenchOverride(chart.layout, wholeNumber(row), side)); }); },
    saveTemplate: function (name) {
      guard(function () {
        templates = Store.saveTemplate(templates, name, chart.layout, chart.features);
        var r = Store.saveTemplates(storage(), templates);
        notify(r.ok ? 'Template "' + name.trim() + '" saved.' : 'Could not save template: ' + r.error, !r.ok);
      });
    },
    loadTemplate: function (name) {
      guard(function () {
        var t = Store.loadTemplate(templates, name);
        applyLayout(Layout.createLayout(t.layout), t.features);
        notify('Loaded template "' + name + '". Students no longer on a seat were moved back to the list.');
      });
    },
    loadSampleData: function (wheelchair) {
      if (hasWork() && !root.confirm('Replace the current chart with fake names and a fake layout? You can Undo this, and the old chart is also kept under Settings > Data safety.')) return;
      guard(function () {
        backupBefore('Before loading fake sample data');
        var d = B.sampleData.generate(null, { wheelchair: wheelchair !== false });
        chart = Object.assign(newChart(), {
          routeName: chart.routeName || 'Route 12 (sample)', preparedBy: chart.preparedBy || 'Sample Driver',
          layout: d.layout, students: d.students, features: d.features, roster: d.roster,
          baseline: Log.createBaseline(d.baselineRoster, d.features)
        });
        var rows = Log.getRows(Log.diff(chart.baseline, { roster: chart.roster, features: chart.features }), {});
        var examples = ['Sibling seated together', 'Behavior seat change', 'New student added to route', 'Closer to the door'];
        rows.forEach(function (r, i) { chart.reasons = Log.setReason(chart.reasons, r.key, examples[i % examples.length]); });
        chart.logSnapshot = Log.diff(chart.baseline, { roster: chart.roster, features: chart.features });
        syncHeaderInputs();
        view = 'after';
        commit();
        notify((wheelchair === false ? 'Loaded fake names and a layout without a wheelchair area. Try the exports below.' : 'Loaded fake names and layout. Try the exports below.'));
      });
    },
    setTheme: function (t) {
      theme = t === 'light' || t === 'dark' ? t : 'auto';
      Store.saveTheme(storage(), theme);
      applyTheme();
    },
    restoreBackup: function () {
      var b = Store.loadBackup(storage());
      if (!b) { notify('There is no backup to restore.', true); return; }
      if (hasWork() && !root.confirm('Replace the current chart with the backup? You can Undo this.')) return;
      guard(function () {
        chart = b.chart;
        syncHeaderInputs();
        view = 'after';
        commit();
        notify('Restored the backup.');
      });
    },
    deleteTemplate: function (name) {
      templates = Store.deleteTemplate(templates, name);
      Store.saveTemplates(storage(), templates);
    }
  };

  // ---- students ----

  function activeStudents() { return chart.students.filter(function (s) { return !s.removed; }); }

  function nextStudentId() {
    var max = 0;
    chart.students.forEach(function (s) { var n = /^s(\d+)$/.exec(s.id); if (n) max = Math.max(max, +n[1]); });
    return 's' + (max + 1);
  }
  function importCsv(text) {
    var result = Csv.parse(text);
    var seen = {};
    activeStudents().forEach(function (s) { seen[s.name.toLowerCase() + '\u0000' + s.school.toLowerCase()] = true; });
    var added = 0, already = 0;
    result.students.forEach(function (rec) {
      var key = rec.name.toLowerCase() + '\u0000' + rec.school.toLowerCase();
      if (seen[key]) { already++; return; }
      seen[key] = true;
      chart.students.push({ id: nextStudentId(), name: rec.name, school: rec.school, needs: rec.needs });
      added++;
    });
    var parts = ['Imported ' + added + ' student' + (added === 1 ? '' : 's') + '.'];
    if (already) parts.push(already + ' already in the roster.');
    if (result.duplicates.length) parts.push(result.duplicates.length + ' duplicate row' + (result.duplicates.length === 1 ? '' : 's') + ' skipped.');
    if (result.errors.length) parts.push(result.errors.length + ' row' + (result.errors.length === 1 ? '' : 's') + ' skipped (line '
      + result.errors.map(function (e) { return e.line; }).join(', ') + ': missing name).');
    notify(parts.join(' '), !!result.errors.length);
    if (added) commit();
  }

  function copyFallback(text) {
    var ta = UI.h('textarea', { style: 'position:fixed;left:-9999px' });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  // ---- export ----

  function download(filename, data, mime) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: mime });
    var a = UI.h('a', { href: URL.createObjectURL(blob), download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function exportInfo() { return { routeName: chart.routeName, routeNumber: chart.routeNumber, shift: chart.shift, driver: chart.driver, aide: chart.aide, notes: chart.notes, preparedBy: chart.preparedBy, exportDate: $('export-date').value || today() }; }
  function fileName(ext) { var i = exportInfo(); return Exp.buildFilename(i.routeName, i.exportDate, ext); }

  // "Route: X" becomes a bold "Route:" followed by the value.
  function headerField(text) {
    var i = text.indexOf(': ');
    return UI.h('span', {}, [UI.h('strong', { text: text.slice(0, i + 1) }), document.createTextNode(text.slice(i + 1))]);
  }

  // Draws one chart with the export header in an off-screen sheet and returns a canvas.
  // withLabel: show the "Before" / "After" caption. Only needed when both charts are in the same export.
  function captureSheet(which, withLabel) {
    if (typeof root.html2canvas !== 'function') {
      return Promise.reject(new Error('PDF and JPEG export need the vendored html2canvas library, which is not installed yet.'));
    }
    var info = Exp.headerLines(exportInfo());
    var isBefore = which === 'before';
    var roster = isBefore ? chart.baseline.roster : chart.roster, features = isBefore ? chart.baseline.features : chart.features;
    var sheet = UI.h('div', { 'class': 'export-sheet' }, [
      UI.h('div', { 'class': 'export-header' }, [
        UI.h('div', { 'class': 'export-header-row' }, [headerField(info.route), headerField(info.driver)]),
        UI.h('div', { 'class': 'export-header-row' }, [headerField(info.aide), headerField(info.date)])]),
        info.notes ? UI.h('div', { 'class': 'export-notes', text: 'Notes: ' + info.notes }) : null,
      UI.renderBus(busContext(roster, features, false, {}, !withLabel ? '' : isBefore ? 'Before (baseline)' : 'After (current)'))
    ]);
    if ($('export-frame').checked) {
      // Optional fun frame: a yellow school-bus outline with wheels around the chart.
      sheet.classList.add('framed');
      sheet.appendChild(UI.h('div', { 'class': 'bus-frame-label', text: 'SCHOOL BUS' }));
      ['red left', 'yellow left', 'yellow right', 'red right'].forEach(function (c) {
        sheet.appendChild(UI.h('div', { 'class': 'bus-light ' + c }));
      });
    }
    var colorMode = $('opt-color').value;
    if (colorMode === 'bw') sheet.classList.add('bw');
    document.body.appendChild(sheet);
    UI.fitSeatNames(sheet);
    var scale = parseFloat($('opt-quality').value) || 2;
    return root.html2canvas(sheet, { scale: scale, backgroundColor: '#ffffff' }).then(
      function (canvas) {
        sheet.remove();
        if (colorMode !== 'color') {
          var ctx = canvas.getContext('2d'), img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          Exp.toGrayscale(img.data);
          ctx.putImageData(img, 0, 0);
        }
        return canvas;
      },
      function (e) { sheet.remove(); throw e; });
  }

  function exportJpeg() {
    captureSheet('after', false).then(function (canvas) {
      canvas.toBlob(function (blob) { download(fileName('jpg'), blob); notify('JPEG saved.'); }, 'image/jpeg', 0.92);
    }).catch(function (e) { notify(e.message, true); });
  }

  function exportPdf() {
    var J = root.jspdf && root.jspdf.jsPDF;
    if (!J) { notify('PDF export needs the vendored jsPDF library, which is not installed yet.', true); return; }
    var wantBefore = $('pdf-before').checked && chart.baseline;
    var doc = new J({ unit: 'pt', format: $('opt-paper').value, orientation: 'portrait' });
    var size = doc.internal.pageSize;
    var pw = size.getWidth ? size.getWidth() : size.width, ph = size.getHeight ? size.getHeight() : size.height;
    var MARGIN = 18;
    // Fits the chart on the portrait page as large as possible. A wide chart is turned 90 degrees
    // when that makes it bigger than leaving it upright.
    function addImage(canvas, first) {
      if (!first) doc.addPage();
      var maxW = pw - 2 * MARGIN, maxH = ph - 2 * MARGIN;
      var upright = Math.min(maxW / canvas.width, maxH / canvas.height);
      var turned = Math.min(maxW / canvas.height, maxH / canvas.width);
      var src = canvas;
      if (turned > upright) {
        src = document.createElement('canvas');
        src.width = canvas.height; src.height = canvas.width;
        var ctx = src.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, src.width, src.height);
        ctx.translate(src.width, 0); ctx.rotate(Math.PI / 2); ctx.drawImage(canvas, 0, 0);
      }
      var k = Math.max(upright, turned), w = src.width * k, hgt = src.height * k;
      doc.addImage(src.toDataURL('image/jpeg', 0.92), 'JPEG', MARGIN + (maxW - w) / 2, MARGIN + (maxH - hgt) / 2, w, hgt);
    }
    captureSheet('after', !!wantBefore).then(function (after) {
      addImage(after, true);
      return wantBefore ? captureSheet('before', true).then(function (before) { addImage(before, false); }) : null;
    }).then(function () {
      if ($('opt-summary').checked) drawChangeSummary(doc, pw, ph);
      doc.save(fileName('pdf'));
      notify('PDF saved.');
    }).catch(function (e) { notify(e.message, true); });
  }

  function previewExport() {
    var wantBefore = $('pdf-before').checked && chart.baseline;
    captureSheet('after', !!wantBefore).then(function (canvas) {
      $('preview-img').src = canvas.toDataURL('image/jpeg', 0.85);
      $('preview-box').hidden = false;
      notify('Preview ready. This is the "After" chart as it will be exported.');
    }).catch(function (e) { notify(e.message, true); });
  }

  function drawChangeSummary(doc, pw, ph) {
    var info = Exp.headerLines(exportInfo());
    var changes = chart.logSnapshot || Log.diff(chart.baseline, { roster: chart.roster, features: chart.features });
    var rows = Exp.changeTableRows(Log.getRows(changes, chart.reasons), chart.students, chart.layout);
    var total = pw - 72, fr = [0.2, 0.267, 0.267, 0.233], widths = fr.map(function (f) { return Math.floor(total * f) - 6; });
    var x = [36, 36 + total * fr[0], 36 + total * (fr[0] + fr[1]), 36 + total * (fr[0] + fr[1] + fr[2])], y = 36;
    doc.addPage();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text('Change Summary', 36, y); y += 18;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    [[info.route, info.driver], [info.aide, info.date]].forEach(function (pair) {
      var x = 36;
      pair.forEach(function (t) {
        var i = t.indexOf(': '), label = t.slice(0, i + 1), value = t.slice(i + 1);
        doc.setFont('helvetica', 'bold'); doc.text(label, x, y);
        doc.setFont('helvetica', 'normal'); doc.text(value, x + doc.getTextWidth(label), y);
        x += pw / 2 - 36;
      });
      y += 14;
    });
    y += 8;
    if (!rows.length) { doc.text(chart.baseline ? 'No changes since the baseline.' : 'No baseline was set.', 36, y); return; }
    function line(cells, bold) {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      var wrapped = cells.map(function (c, i) { return doc.splitTextToSize(String(c), widths[i]); });
      var height = Math.max.apply(null, wrapped.map(function (w) { return w.length; })) * 12 + 6;
      if (y + height > ph - 36) { doc.addPage(); y = 36; }
      wrapped.forEach(function (w, i) { doc.text(w, x[i], y + 9); });
      y += height;
    }
    line(['Student', 'From', 'To', 'Reason'], true);
    rows.forEach(function (r) { line([r.student, r.from, r.to, r.reason], false); });
  }

  // ---- swap mode and drag feedback ----

  function studentName(id) { var st = byId()[id]; return st ? st.name : 'student'; }
  function interactiveSeats() { return Array.prototype.slice.call(document.querySelectorAll('.seat[data-drop="true"]')); }
  function markSwap() {
    document.body.classList.toggle('swap-mode', swapMode);
    $('swap-mode').setAttribute('aria-pressed', swapMode ? 'true' : 'false');
    if (swapFrom !== null && chart.roster[swapFrom] === undefined) swapFrom = null;
    interactiveSeats().forEach(function (el) { el.classList.toggle('swap-from', el.getAttribute('data-seat-id') === swapFrom); });
  }
  function swapClick(seatId) {
    if (swapFrom === null) {
      if (chart.roster[seatId] === undefined) { notify('Swap mode: click a seat with a student first, then the seat to swap with.'); return; }
      swapFrom = seatId;
      markSwap();
      notify('Swap mode: ' + studentName(chart.roster[seatId]) + ' selected. Click another seat to swap or move. Click the same seat to cancel.');
      return;
    }
    if (swapFrom === seatId) { swapFrom = null; markSwap(); notify('Swap cancelled.'); return; }
    var a = chart.roster[swapFrom], b = chart.roster[seatId], from = swapFrom;
    guard(function () {
      chart.roster = Roster.moveOrSwap(chart.roster, chart.layout, from, seatId);
      swapFrom = null;
      commit();
      notify(b !== undefined ? 'Swapped ' + studentName(a) + ' and ' + studentName(b) + '.' : 'Moved ' + studentName(a) + ' to ' + Exp.formatSeat(seatId, chart.layout) + '.');
    });
  }
  function setSwapMode(on) {
    swapMode = on; swapFrom = null;
    markSwap();
    notify(on ? 'Swap mode on. Click a seat with a student, then another seat to swap them.' : 'Swap mode off.');
  }

  // While a student is being moved, outline each seat: green fits, amber would raise a warning, blue swaps with someone.
  function showFits(studentId) {
    var st = byId()[studentId];
    if (!st) return;
    var here = Roster.seatOf(chart.roster, studentId);
    document.body.classList.add('is-moving');
    interactiveSeats().forEach(function (el) {
      var seatId = el.getAttribute('data-seat-id'), occ = chart.roster[seatId];
      if (seatId === here) return;
      var bad = Needs.checkStudent(st.needs, seatId, chart.features).length > 0;
      if (occ !== undefined && here !== undefined && byId()[occ]) {
        bad = bad || Needs.checkStudent(byId()[occ].needs, here, chart.features).length > 0;
      }
      el.classList.add(bad ? 'drop-warn' : occ !== undefined ? 'drop-swap' : 'drop-ok');
    });
  }
  function clearFits() {
    document.body.classList.remove('is-moving');
    Array.prototype.forEach.call(document.querySelectorAll('.drop-ok, .drop-warn, .drop-swap'), function (n) {
      n.classList.remove('drop-ok', 'drop-warn', 'drop-swap');
    });
  }

  // ---- loading a saved JSON file ----

  function loadJsonFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      guard(function () {
        var next = Store.deserialize(reader.result);
        if (hasWork() && !root.confirm('Replace the current chart with ' + file.name + '? You can Undo this, and the old chart is kept under Settings > Data safety.')) return;
        backupBefore('Before loading ' + file.name);
        chart = next;
        syncHeaderInputs();
        view = 'after';
        swapFrom = null;
        commit();
        notify('Loaded ' + file.name + '.');
      });
    };
    reader.onerror = function () { notify('Could not read that file.', true); };
    reader.readAsText(file);
  }

  // ---- wiring ----

  function wire() {
    syncHeaderInputs();
    $('export-date').value = today();
    $('route-name').addEventListener('input', function (e) { chart.routeName = e.target.value; save(); });
    $('route-number').addEventListener('input', function (e) { chart.routeNumber = e.target.value; save(); });
    $('route-shift').addEventListener('change', function (e) { chart.shift = e.target.value; save(); });
    $('driver-name').addEventListener('input', function (e) { chart.driver = e.target.value; save(); });
    $('aide-name').addEventListener('input', function (e) { chart.aide = e.target.value; save(); });
    $('route-notes').addEventListener('input', function (e) { chart.notes = e.target.value; save(); });
    $('prepared-by').addEventListener('input', function (e) { chart.preparedBy = e.target.value; save(); });

    B.dragdrop.attach(document, {
      onMessage: function (m) { notify(m); },
      onLift: showFits, onRelease: clearFits, isPaused: function () { return swapMode; },
      onDropSeat: function (studentId, seatId) { guard(function () { chart.roster = Roster.place(chart.roster, chart.layout, studentId, seatId); commit(); }); },
      onDropPool: function (studentId) { chart.roster = Roster.unassign(chart.roster, studentId); commit(); }
    });

    document.addEventListener('click', function (e) {
      var f = e.target.closest && e.target.closest('button[data-feature]');
      if (f) { chart.features = Features.toggleFeature(chart.features, f.getAttribute('data-seat-id'), f.getAttribute('data-feature')); commit(); return; }
      var v = e.target.closest && e.target.closest('button[data-view]');
      if (v) { view = v.getAttribute('data-view'); render(); }
    });
    document.addEventListener('change', function (e) {
      var nickId = e.target.getAttribute && e.target.getAttribute('data-nickname');
      if (nickId) {
        var nick = e.target.value.trim();
        chart.students = chart.students.map(function (s) {
          if (s.id !== nickId) return s;
          var next = Object.assign({}, s);
          if (nick) next.nickname = nick; else delete next.nickname;
          return next;
        });
        commit();
        return;
      }
      var n = e.target.getAttribute && e.target.getAttribute('data-need');
      if (!n) return;
      var id = e.target.getAttribute('data-student-id');
      chart.students = chart.students.map(function (s) {
        if (s.id !== id) return s;
        var needs = Object.assign({}, s.needs);
        if (e.target.checked) needs[n] = true; else delete needs[n];
        return Object.assign({}, s, { needs: needs });
      });
      commit();
    });
    $('changelog').addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('#finalize-log')) return;
      chart.logSnapshot = Log.diff(chart.baseline, { roster: chart.roster, features: chart.features });
      notify('Change log finalized with ' + chart.logSnapshot.length + ' change' + (chart.logSnapshot.length === 1 ? '' : 's') + '.');
      commit();
    });
    $('changelog').addEventListener('input', function (e) {
      var key = e.target.getAttribute('data-key');
      if (key) { chart.reasons = Log.setReason(chart.reasons, key, e.target.value); save(); }
    });

    $('csv-file').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () { $('csv-text').value = reader.result; notify('Loaded ' + file.name + '. Press Import.'); };
      reader.onerror = function () { notify('Could not read that file.', true); };
      reader.readAsText(file);
    });
    $('pool').addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-delete-student]');
      if (!btn) return;
      var id = btn.getAttribute('data-delete-student');
      var st = chart.students.filter(function (s) { return s.id === id; })[0];
      if (!st) return;
      var seated = Roster.seatOf(chart.roster, id) !== undefined;
      if (!root.confirm('Delete ' + st.name + '?' + (seated ? ' Their seat will be freed.' : '') + ' You can Undo this.')) return;
      chart.roster = Roster.unassign(chart.roster, id);
      var inBaseline = chart.baseline && Object.keys(chart.baseline.roster).some(function (seat) { return chart.baseline.roster[seat] === id; });
      if (inBaseline) chart.students = chart.students.map(function (s) { return s.id === id ? Object.assign({}, s, { removed: true }) : s; });
      else chart.students = chart.students.filter(function (s) { return s.id !== id; });
      notify('Deleted ' + st.name + '.');
      commit();
    });
    function applySchoolChange(result, message) {
      if (!result.changed) { notify('No school names matched.', true); return; }
      chart.students = result.students;
      notify(message(result.changed));
      commit();
    }
    $('school-rename-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var from = $('school-from').value, to = $('school-to').value.trim();
      if (!from) { notify('There are no schools to rename yet.', true); return; }
      if (!to) { notify('Enter the new school name.', true); return; }
      applySchoolChange(Schools.renameSchool(chart.students, from, to),
        function (n) { return 'Renamed ' + from + ' to ' + to + ' for ' + n + ' student' + (n === 1 ? '' : 's') + '.'; });
      $('school-to').value = '';
    });
    $('school-replace-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var find = $('school-find').value.trim(), rep = $('school-replace').value.trim();
      if (!find) { notify('Enter the text to find.', true); return; }
      applySchoolChange(Schools.replaceInSchools(chart.students, find, rep, true),
        function (n) { return 'Replaced "' + find + '" with "' + rep + '" for ' + n + ' student' + (n === 1 ? '' : 's') + '.'; });
    });
    $('add-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('add-name').value.trim(), school = $('add-school').value.trim();
      if (!name) { notify('Enter a student name.', true); return; }
      var dup = activeStudents().some(function (s) { return s.name.toLowerCase() === name.toLowerCase() && s.school.toLowerCase() === school.toLowerCase(); });
      if (dup) { notify(name + ' is already in the roster.', true); return; }
      var nick = $('add-nickname').value.trim();
      var rec = { id: nextStudentId(), name: name, school: school, needs: {} };
      if (nick) rec.nickname = nick;
      chart.students.push(rec);
      $('add-name').value = ''; $('add-school').value = ''; $('add-nickname').value = '';
      $('add-name').focus();
      notify('Added ' + name + '.');
      commit();
    });
    $('csv-import').addEventListener('click', function () {
      if (!$('csv-text').value.trim()) { notify('Paste CSV text or choose a file first.', true); return; }
      importCsv($('csv-text').value);
      $('csv-text').value = '';
    });
    $('copy-prompt').addEventListener('click', function () {
      Prompt.copyPrompt(root.navigator && root.navigator.clipboard).then(function (r) {
        var ok = r.ok || copyFallback(Prompt.getPrompt());
        notify(ok ? 'Prompt copied. Paste it into Claude Code with your roster.' : 'Could not copy the prompt.', !ok);
      });
    });
    $('clear-roster').addEventListener('click', function () {
      if (!chart.students.length) return;
      if (!root.confirm('Remove all students, the baseline and change reasons? Seat features and the bus layout are kept. You can Undo this.')) return;
      backupBefore('Before clearing the roster');
      chart.students = []; chart.roster = {}; chart.baseline = null; chart.reasons = {}; chart.logSnapshot = null;
      commit();
    });

    $('set-baseline').addEventListener('click', function () {
      chart.baseline = Log.createBaseline(chart.roster, chart.features);
      chart.students = activeStudents();
      chart.reasons = {};
      chart.logSnapshot = null;
      notify('Baseline set. Changes from here on are tracked.');
      commit();
    });

    $('export-csv').addEventListener('click', function () {
      download(fileName('csv'), '﻿' + Exp.toCsv(Exp.csvRows(chart, exportInfo().exportDate)), 'text/csv;charset=utf-8');
      notify('CSV saved.');
    });
    $('export-json').addEventListener('click', function () {
      download(fileName('json'), Store.serialize(chart), 'application/json');
      notify('JSON saved.');
    });
    $('export-jpeg').addEventListener('click', exportJpeg);
    $('export-pdf').addEventListener('click', exportPdf);
    $('load-json').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (file) loadJsonFile(file);
      e.target.value = '';
    });
    $('onb-json').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (file) loadJsonFile(file);
      e.target.value = '';
    });
    $('export-preview').addEventListener('click', previewExport);
    $('preview-close').addEventListener('click', function () { $('preview-box').hidden = true; $('preview-img').removeAttribute('src'); });

    $('undo').addEventListener('click', undo);
    $('redo').addEventListener('click', redo);
    $('swap-mode').addEventListener('click', function () { setSwapMode(!swapMode); });
    // Capture phase so swap mode sees seat clicks before the tap-to-move handler does.
    document.addEventListener('click', function (e) {
      if (!swapMode || !e.target.closest || e.target.closest('button')) return;
      var seat = e.target.closest('.seat[data-drop="true"]');
      if (!seat) return;
      e.stopImmediatePropagation();
      swapClick(seat.getAttribute('data-seat-id'));
    }, true);
    document.addEventListener('keydown', function (e) {
      var t = e.target, typing = t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !typing) {
        var k = e.key.toLowerCase();
        if (k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
        if (k === 'y') { e.preventDefault(); redo(); return; }
      }
      if (!swapMode || typing) return;
      if (e.key === 'Escape' && swapFrom !== null) { swapFrom = null; markSwap(); notify('Swap cancelled.'); return; }
      if ((e.key === 'Enter' || e.key === ' ') && t && t.classList && t.classList.contains('seat') && t.getAttribute('data-drop') === 'true') {
        e.preventDefault();
        e.stopImmediatePropagation();
        swapClick(t.getAttribute('data-seat-id'));
      }
    }, true);

    $('onb-setup').addEventListener('click', function () { popover.open(); });
    $('onb-import').addEventListener('click', function () {
      $('students-box').open = true;
      $('import-box').open = true;
      $('csv-text').focus();
    });
    $('onb-sample').addEventListener('click', function () { actions.loadSampleData(true); });
    root.addEventListener('beforeunload', function (e) {
      // Only when browser storage is failing: otherwise every change is already saved.
      if (autosaveOk) return;
      e.preventDefault();
      e.returnValue = '';
    });

    popover = B.settingsPopover.create({
      button: $('settings-button'), panel: $('settings-panel'), actions: actions,
      getState: function () {
        return { layout: chart.layout, templateNames: Store.listTemplates(templates), theme: theme, backup: Store.loadBackup(storage()), autosaveOk: autosaveOk };
      }
    });
  }

  // Seat width is a view setting (not part of the chart). It applies to the web view and to exports.
  function setSeatWidth(px, save) {
    px = [96, 140, 180].indexOf(px) >= 0 ? px : 140;
    document.documentElement.style.setProperty('--seat-w', px + 'px');
    Array.prototype.forEach.call(document.querySelectorAll('[data-seat-width]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-seat-width') === String(px) ? 'true' : 'false');
    });
    if (save) { try { storage().setItem('busSeatWidth', String(px)); } catch (e) { /* storage unavailable */ } }
  }
  var savedWidth = 140;
  try { savedWidth = parseInt(storage().getItem('busSeatWidth'), 10) || 140; } catch (e) { /* storage unavailable */ }
  setSeatWidth(savedWidth, false);
  Array.prototype.forEach.call(document.querySelectorAll('[data-seat-width]'), function (b) {
    b.addEventListener('click', function () { setSeatWidth(parseInt(b.getAttribute('data-seat-width'), 10), true); render(); });
  });

  // Student name and school name font sizes are view settings too. They apply to the web view and to exports.
  function setupSizePick(id, cssVar, key, allowed, fallback) {
    var sel = $(id);
    if (!sel) return;
    function apply(px, save) {
      px = allowed.indexOf(px) >= 0 ? px : fallback;
      document.documentElement.style.setProperty(cssVar, px + 'px');
      sel.value = String(px);
      if (save) { try { storage().setItem(key, String(px)); } catch (e) { /* storage unavailable */ } }
    }
    var saved = fallback;
    try { saved = parseInt(storage().getItem(key), 10) || fallback; } catch (e) { /* storage unavailable */ }
    apply(saved, false);
    sel.addEventListener('change', function () { apply(parseInt(sel.value, 10), true); render(); });
  }
  setupSizePick('name-size', '--name-size', 'busNameSize', [12, 14, 16, 18], 14);
  setupSizePick('row-size', '--row-size', 'busRowSize', [12, 14, 18, 22], 14);
  setupSizePick('school-size', '--school-size', 'busSchoolSize', [11, 12, 14, 16], 14);

  wire();
  render();

  B.app = { getChart: function () { return chart; } };
})(typeof window !== 'undefined' ? window : globalThis);
