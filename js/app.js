(function (root) {
  'use strict';
  if (typeof document === 'undefined') return;

  var B = root.BusApp;
  var Layout = B.busLayout, Features = B.seatFeatures, Roster = B.roster, Needs = B.needs, Csv = B.csvParser;
  var Prompt = B.rosterPrompt, Log = B.changeLog, Store = B.storage, Exp = B.exporter, UI = B.ui;

  function $(id) { return document.getElementById(id); }
  function today() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function storage() { try { return root.localStorage; } catch (e) { return null; } }
  function newChart() {
    return { routeName: '', preparedBy: '', layout: Layout.createLayout(), students: [], roster: {}, features: {}, baseline: null, reasons: {} };
  }

  var chart = Store.loadAutosave(storage()) || newChart();
  var templates = Store.loadTemplates(storage());
  var view = 'after';
  var popover;

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
    if (!r.ok) notify('Auto-save failed (' + r.error + '). Use Save JSON to keep your work.', true);
  }
  function commit() { save(); render(); }

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

    var pool = $('pool');
    pool.textContent = '';
    UI.renderPool(chart, Needs.getWarnings(chart.roster, needsById(), chart.features)).forEach(function (li) { pool.appendChild(li); });

    var rows = Log.getRows(changes, chart.reasons);
    var log = $('changelog');
    log.textContent = '';
    log.appendChild(chart.baseline ? UI.renderChangeLog(rows, Exp.changeTableRows(rows, chart.students))
      : UI.h('p', { 'class': 'hint', text: 'Press "Set baseline" to start tracking changes.' }));

    Array.prototype.forEach.call(document.querySelectorAll('[data-view]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-view') === view ? 'true' : 'false');
      if (b.getAttribute('data-view') !== 'after') b.disabled = !chart.baseline;
    });
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
      var hasWork = chart.students.length || Object.keys(chart.roster).length;
      if (hasWork && !root.confirm('Replace the current chart with fake names and a fake layout? This cannot be undone (save JSON first if you need it).')) return;
      guard(function () {
        var d = B.sampleData.generate(null, { wheelchair: wheelchair !== false });
        chart = Object.assign(newChart(), {
          routeName: chart.routeName || 'Route 12 (sample)', preparedBy: chart.preparedBy || 'Sample Driver',
          layout: d.layout, students: d.students, features: d.features, roster: d.roster,
          baseline: Log.createBaseline(d.baselineRoster, d.features)
        });
        var rows = Log.getRows(Log.diff(chart.baseline, { roster: chart.roster, features: chart.features }), {});
        var examples = ['Sibling seated together', 'Behavior seat change', 'New student added to route', 'Closer to the door'];
        rows.forEach(function (r, i) { chart.reasons = Log.setReason(chart.reasons, r.key, examples[i % examples.length]); });
        $('route-name').value = chart.routeName;
        $('prepared-by').value = chart.preparedBy;
        view = 'after';
        commit();
        notify((wheelchair === false ? 'Loaded fake names and a layout without a wheelchair area. Try the exports below.' : 'Loaded fake names and layout. Try the exports below.'));
      });
    },
    deleteTemplate: function (name) {
      templates = Store.deleteTemplate(templates, name);
      Store.saveTemplates(storage(), templates);
    }
  };

  // ---- students ----

  function nextStudentId() {
    var max = 0;
    chart.students.forEach(function (s) { var n = /^s(\d+)$/.exec(s.id); if (n) max = Math.max(max, +n[1]); });
    return 's' + (max + 1);
  }
  function importCsv(text) {
    var result = Csv.parse(text);
    var seen = {};
    chart.students.forEach(function (s) { seen[s.name.toLowerCase() + '\u0000' + s.school.toLowerCase()] = true; });
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
  function exportInfo() { return { routeName: chart.routeName, preparedBy: chart.preparedBy, exportDate: $('export-date').value || today() }; }
  function fileName(ext) { var i = exportInfo(); return Exp.buildFilename(i.routeName, i.exportDate, ext); }

  // Draws one chart with the export header in an off-screen sheet and returns a canvas.
  function captureSheet(which) {
    if (typeof root.html2canvas !== 'function') {
      return Promise.reject(new Error('PDF and JPEG export need the vendored html2canvas library, which is not installed yet.'));
    }
    var info = Exp.headerLines(exportInfo());
    var isBefore = which === 'before';
    var roster = isBefore ? chart.baseline.roster : chart.roster, features = isBefore ? chart.baseline.features : chart.features;
    var sheet = UI.h('div', { 'class': 'export-sheet' }, [
      UI.h('div', { 'class': 'export-header' }, [
        UI.h('strong', { text: info.route }), UI.h('span', { text: info.preparedBy }), UI.h('span', { text: info.date })]),
      UI.renderBus(busContext(roster, features, false, {}, isBefore ? 'Before (baseline)' : 'After (current)'))
    ]);
    if ($('export-frame').checked) {
      // Optional fun frame: a yellow school-bus outline with wheels around the chart.
      sheet.classList.add('framed');
      sheet.appendChild(UI.h('div', { 'class': 'bus-frame-label', text: 'SCHOOL BUS' }));
      sheet.appendChild(UI.h('div', { 'class': 'bus-wheel left' }));
      sheet.appendChild(UI.h('div', { 'class': 'bus-wheel right' }));
    }
    document.body.appendChild(sheet);
    return root.html2canvas(sheet, { scale: 2, backgroundColor: '#ffffff' }).then(
      function (canvas) { sheet.remove(); return canvas; },
      function (e) { sheet.remove(); throw e; });
  }

  function exportJpeg() {
    captureSheet('after').then(function (canvas) {
      canvas.toBlob(function (blob) { download(fileName('jpg'), blob); notify('JPEG saved.'); }, 'image/jpeg', 0.92);
    }).catch(function (e) { notify(e.message, true); });
  }

  function exportPdf() {
    var J = root.jspdf && root.jspdf.jsPDF;
    if (!J) { notify('PDF export needs the vendored jsPDF library, which is not installed yet.', true); return; }
    var wantBefore = $('pdf-before').checked && chart.baseline;
    var doc = new J({ unit: 'pt', format: 'letter' });
    function addImage(canvas, first) {
      if (!first) doc.addPage();
      var ratio = canvas.width / canvas.height, w = 540, hgt = w / ratio;
      if (hgt > 720) { hgt = 720; w = hgt * ratio; }
      doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 36, 36, w, hgt);
    }
    captureSheet('after').then(function (after) {
      addImage(after, true);
      return wantBefore ? captureSheet('before').then(function (before) { addImage(before, false); }) : null;
    }).then(function () {
      drawChangeSummary(doc);
      doc.save(fileName('pdf'));
      notify('PDF saved.');
    }).catch(function (e) { notify(e.message, true); });
  }

  function drawChangeSummary(doc) {
    var info = Exp.headerLines(exportInfo());
    var changes = Log.diff(chart.baseline, { roster: chart.roster, features: chart.features });
    var rows = Exp.changeTableRows(Log.getRows(changes, chart.reasons), chart.students);
    var x = [36, 150, 300, 450], widths = [108, 144, 144, 126], y = 36;
    doc.addPage();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text('Change Summary', 36, y); y += 18;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    [info.route, info.preparedBy, info.date].forEach(function (line) { doc.text(line, 36, y); y += 14; });
    y += 8;
    if (!rows.length) { doc.text(chart.baseline ? 'No changes since the baseline.' : 'No baseline was set.', 36, y); return; }
    function line(cells, bold) {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      var wrapped = cells.map(function (c, i) { return doc.splitTextToSize(String(c), widths[i]); });
      var height = Math.max.apply(null, wrapped.map(function (w) { return w.length; })) * 12 + 6;
      if (y + height > 756) { doc.addPage(); y = 36; }
      wrapped.forEach(function (w, i) { doc.text(w, x[i], y + 9); });
      y += height;
    }
    line(['Student', 'From', 'To', 'Reason'], true);
    rows.forEach(function (r) { line([r.student, r.from, r.to, r.reason], false); });
  }

  // ---- wiring ----

  function wire() {
    $('route-name').value = chart.routeName;
    $('prepared-by').value = chart.preparedBy;
    $('export-date').value = today();
    $('route-name').addEventListener('input', function (e) { chart.routeName = e.target.value; save(); });
    $('prepared-by').addEventListener('input', function (e) { chart.preparedBy = e.target.value; save(); });

    B.dragdrop.attach(document, {
      onMessage: function (m) { notify(m); },
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
      if (!root.confirm('Remove all students, the baseline and change reasons? Seat features and the bus layout are kept.')) return;
      chart.students = []; chart.roster = {}; chart.baseline = null; chart.reasons = {};
      commit();
    });

    $('set-baseline').addEventListener('click', function () {
      chart.baseline = Log.createBaseline(chart.roster, chart.features);
      chart.reasons = {};
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
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        guard(function () {
          chart = Store.deserialize(reader.result);
          $('route-name').value = chart.routeName;
          $('prepared-by').value = chart.preparedBy;
          view = 'after';
          commit();
          notify('Loaded ' + file.name + '.');
        });
      };
      reader.onerror = function () { notify('Could not read that file.', true); };
      reader.readAsText(file);
      e.target.value = '';
    });

    popover = B.settingsPopover.create({
      button: $('settings-button'), panel: $('settings-panel'), actions: actions,
      getState: function () { return { layout: chart.layout, templateNames: Store.listTemplates(templates) }; }
    });
  }

  wire();
  render();

  B.app = { getChart: function () { return chart; } };
})(typeof window !== 'undefined' ? window : globalThis);
