(function (root) {
  'use strict';

  // The last three releases, newest first. Update with each release (the first entry must match the current version).
  var WHATS_NEW = [
    { version: '0.48.0', added: [ 'Bus templates now also remember fonts and text sizes, text positions, Rear at top, seat width, and the Save export row options (shrink empty rows, first names only, legend, frame, color).', 'Preview export button at the top next to the view buttons.' ], changed: [] },
    { version: '0.47.0', added: [
      'What\'s new in Settings > About now lists the last three versions.'
    ], changed: [
      'The Text sizes menu is now Text and labels, grouped into Names, Seat numbers, Stop number, and Driver and door labels.'
    ] },
    { version: '0.46.0',
      added: [
        'Bus layout box on the main page holds bus setup, emergency windows, bench overrides and templates.',
        'First names only checkbox in Save and export: big first names, with a last initial only when two students share one.'
      ],
      changed: [
        'Settings is shorter: Appearance, Data safety and About (with What\'s new and fake data).',
        'First names are about 1.7 times bigger in a heavy font, so they read on a moving bus.',
        'Star and H badges sit at the bottom right in the school line, clear of the stop number.',
        'Exports leave off the school line when every student goes to the same school.'
      ] }
  ];


  // Two surfaces. The gear popover holds app preferences (appearance, data safety, about). The Bus layout box on the main page
  // (opts.layoutPanel) holds everything that describes the bus itself: setup, emergency windows, bench overrides and templates.
  // actions is app.js's set of handlers; each one may throw, and app.js shows the message.
  function create(opts) {
    var h = root.BusApp.ui.h;
    var button = opts.button, panel = opts.panel, actions = opts.actions, layoutPanel = opts.layoutPanel;

    function isOpen() { return !panel.hidden; }
    function open() { panel.hidden = false; button.setAttribute('aria-expanded', 'true'); render(); }
    function close() { panel.hidden = true; button.setAttribute('aria-expanded', 'false'); }

    function numberField(label, value, min, onChange) {
      var input = h('input', { type: 'number', min: String(min), value: String(value), step: '1' });
      input.addEventListener('change', function () {
        var n = parseInt(input.value, 10);
        if (isNaN(n)) { render(); return; }
        run(function () { onChange(n); });
      });
      return h('label', { 'class': 'field' }, [label + ' ', input]);
    }

    function run(fn) { fn(); render(); }

    // Which sections are expanded survives re-renders (every change re-draws the panel).
    var openSections = { setup: true, windows: false, overrides: false, templates: false, appearance: true, safety: false, about: false };

    function section(key, title, kids) {
      var d = h('details', { 'class': 'set-section', open: openSections[key] }, [h('summary', { text: title })].concat(kids));
      d.addEventListener('toggle', function () { openSections[key] = d.open; });
      return d;
    }

    function render() {
      var st = opts.getState(), layout = st.layout, v = root.BusApp.version;
      var side = layout.doorSide, Lib = root.BusApp.busLayout, wc = layout.wheelchair;
      var scrollTop = panel.scrollTop;
      // The emergency-window table scrolls on its own; remember where it was so a click does not jump it to the top.
      var oldWrap = layoutPanel && layoutPanel.querySelector('.window-table-wrap');
      var winScroll = oldWrap ? oldWrap.scrollTop : 0;
      panel.textContent = '';
      if (layoutPanel) layoutPanel.textContent = '';
      var lp = layoutPanel || panel;

      // Header stays visible while the sections scroll.
      var closeX = h('button', { type: 'button', 'class': 'set-close', 'aria-label': 'Close settings', text: '×' });
      closeX.addEventListener('click', function () { close(); button.focus(); });
      panel.appendChild(h('div', { 'class': 'set-head' }, [
        h('div', {}, [h('h2', { text: 'Settings' })]),
        closeX]));

      // Bus setup
      var flip = h('button', { type: 'button', text: 'Door is on the ' + side + ' — flip to ' + (side === 'right' ? 'left' : 'right') });
      flip.addEventListener('click', function () { run(actions.flipDoor); });
      var wcBox = h('input', { type: 'checkbox', checked: wc.enabled });
      wcBox.addEventListener('change', function () { run(function () { actions.setWheelchair({ enabled: wcBox.checked }); }); });
      var setup = [
        numberField('Rows', layout.rows, 1, actions.setRows),
        numberField('Driver side seats per bench', layout.driverSeats, 0, function (n) { actions.setSeats('driver', n); }),
        numberField('Door side seats per bench', layout.doorSeats, 0, function (n) { actions.setSeats('door', n); }),
        flip,
        h('label', { 'class': 'field' }, [wcBox, ' Wheelchair area at the back'])
      ];
      if (wc.enabled) {
        setup.push(numberField('Wheelchair rows', wc.rows, Lib.MIN_WHEELCHAIR_ROWS, function (n) { actions.setWheelchair({ rows: n }); }));
      }
      lp.appendChild(section('setup', 'Bus setup', setup));

      // Emergency window exits
      function windowCell(row, sideName) {
        var box = h('input', { type: 'checkbox', checked: Lib.hasEmergencyWindow(layout, row, sideName),
          'aria-label': 'Row ' + row + ', ' + sideName + ' side emergency window exit' });
        box.addEventListener('change', function () { run(function () { actions.setWindow(row, sideName, box.checked); }); });
        return h('td', {}, [box]);
      }
      var firstWc = wc.enabled ? layout.rows - wc.rows + 1 : Infinity;
      var winRows = [];
      for (var r = 1; r < firstWc && r <= layout.rows; r++) {
        winRows.push(h('tr', {}, [h('th', { scope: 'row', text: String(r) }), windowCell(r, 'driver'), windowCell(r, 'door')]));
      }
      var nWin = Object.keys(layout.emergencyWindows || {}).length;
      lp.appendChild(section('windows', 'Emergency window exits' + (nWin ? ' (' + nWin + ')' : ''), [
        h('p', { 'class': 'hint', text: 'Check the rows that have an emergency window exit on each side of the bus.' }),
        h('div', { 'class': 'window-table-wrap' }, [h('table', { 'class': 'window-table' }, [
          h('thead', {}, [h('tr', {}, [h('th', { scope: 'col', text: 'Row' }),
            h('th', { scope: 'col', text: 'Driver side' }), h('th', { scope: 'col', text: 'Door side' })])]),
          h('tbody', {}, winRows)])])
      ]));

      // Single bench override
      var rowIn = h('input', { type: 'number', min: '1', max: String(layout.rows), value: '1', 'aria-label': 'Row' });
      var sideSel = h('select', { 'aria-label': 'Side' }, [
        h('option', { value: 'driver', text: 'Driver side' }), h('option', { value: 'door', text: 'Door side' })]);
      var countIn = h('input', { type: 'number', min: '0', value: '2', 'aria-label': 'Seats' });
      var set = h('button', { type: 'button', text: 'Set' });
      var clear = h('button', { type: 'button', text: 'Clear' });
      set.addEventListener('click', function () {
        run(function () { actions.setOverride(parseInt(rowIn.value, 10), sideSel.value, parseInt(countIn.value, 10)); });
      });
      clear.addEventListener('click', function () {
        run(function () { actions.clearOverride(parseInt(rowIn.value, 10), sideSel.value); });
      });
      var ov = [h('p', { 'class': 'hint', text: 'Change the number of seats on one bench only.' }),
        h('div', { 'class': 'row' }, ['Row ', rowIn, sideSel, ' seats ', countIn, set, clear])];
      var keys = Object.keys(layout.overrides);
      if (keys.length) ov.push(h('p', { 'class': 'hint', text: 'Overrides: ' + keys.map(function (k) { return k + ' = ' + layout.overrides[k]; }).join(', ') }));
      lp.appendChild(section('overrides', 'Single bench override' + (keys.length ? ' (' + keys.length + ')' : ''), ov));

      // Templates
      var nameIn = h('input', { type: 'text', placeholder: 'Template name', 'aria-label': 'Template name' });
      var save = h('button', { type: 'button', text: 'Save current bus' });
      save.addEventListener('click', function () { run(function () { actions.saveTemplate(nameIn.value); }); });
      var tpl = [h('div', { 'class': 'row' }, [nameIn, save])];
      var names = st.templateNames;
      if (names.length) {
        var sel = h('select', { 'aria-label': 'Saved templates' }, names.map(function (n) { return h('option', { value: n, text: n }); }));
        var load = h('button', { type: 'button', text: 'Load' });
        var del = h('button', { type: 'button', 'class': 'danger', text: 'Delete' });
        load.addEventListener('click', function () { run(function () { actions.loadTemplate(sel.value); }); });
        del.addEventListener('click', function () { run(function () { actions.deleteTemplate(sel.value); }); });
        tpl.push(h('div', { 'class': 'row' }, [sel, load, del]));
      } else {
        tpl.push(h('p', { 'class': 'hint', text: 'No saved templates yet.' }));
      }
      lp.appendChild(section('templates', 'Bus templates', tpl));

      // Appearance
      var themeSel = h('select', { 'aria-label': 'Theme' }, [
        h('option', { value: 'auto', text: 'Match my device' }), h('option', { value: 'light', text: 'Light' }), h('option', { value: 'dark', text: 'Dark' })]);
      themeSel.value = st.theme || 'auto';
      themeSel.addEventListener('change', function () { run(function () { actions.setTheme(themeSel.value); }); });
      panel.appendChild(section('appearance', 'Appearance', [
        h('label', { 'class': 'field' }, ['Theme ', themeSel]),
        h('p', { 'class': 'hint', text: 'Exports and printouts always use the light look.' })
      ]));

      // Data safety
      var safety = [h('p', { 'class': st.autosaveOk ? 'hint' : 'warn-note',
        text: st.autosaveOk ? 'Auto-save is on: your chart is saved in this browser after every change. Use Undo (Ctrl/Cmd+Z) for mistakes.'
          : 'Auto-save is failing, so your work may be lost. Use Save JSON to keep it.' })];
      if (st.backup) {
        var when = st.backup.savedAt ? new Date(st.backup.savedAt).toLocaleString() : 'earlier';
        var restore = h('button', { type: 'button', text: 'Restore previous chart' });
        restore.addEventListener('click', function () { run(actions.restoreBackup); });
        safety.push(h('p', { 'class': 'hint', text: 'Backup of the chart you replaced (' + (st.backup.reason || 'unknown action') + ') at ' + when + '.' }));
        safety.push(h('div', { 'class': 'row' }, [restore]));
      } else {
        safety.push(h('p', { 'class': 'hint', text: 'No backup yet. One is kept automatically before a chart is replaced (load JSON, fake data, clear roster).' }));
      }
      panel.appendChild(section('safety', 'Data safety', safety));

      // About holds the version, what changed lately, and the fake-data demo (it replaces the chart, so it is tucked away here).
      function whatsNew() {
        var out = [];
        WHATS_NEW.forEach(function (r) {
          out.push(h('p', {}, [h('strong', { text: 'Version ' + r.version })]));
          out.push(list(r.added.map(function (t) { return 'New: ' + t; }).concat(r.changed.map(function (t) { return 'Changed: ' + t; }))));
        });
        return out;
      }
      function list(items) { return h('ul', { 'class': 'hint' }, items.map(function (t) { return h('li', { text: t }); })); }
      var demo = h('button', { type: 'button', text: 'Generate fake names and layout' });
      demo.addEventListener('click', function () { run(function () { actions.loadSampleData(true); }); });
      var demoPlain = h('button', { type: 'button', text: 'Generate fake names, no wheelchair area' });
      demoPlain.addEventListener('click', function () { run(function () { actions.loadSampleData(false); }); });
      panel.appendChild(section('about', 'About', [
        h('p', { 'class': 'version', text: 'Version ' + v.version }),
        h('p', { 'class': 'hint', text: 'Built ' + v.buildDate + ' ' + v.buildTime + ' (US Eastern time)' }),
        h('p', {}, [h('strong', { text: 'What\'s new' })])
      ].concat(whatsNew()).concat([
        h('p', {}, [h('strong', { text: 'Try it out' })]),
        h('div', { 'class': 'row' }, [demo, demoPlain]),
        h('p', { 'class': 'hint', text: 'Replaces the current chart with made-up students, a baseline and a few moves, so you can preview exports.' })
      ])));

      panel.scrollTop = scrollTop;
      var newWrap = layoutPanel && layoutPanel.querySelector('.window-table-wrap');
      if (newWrap) newWrap.scrollTop = winScroll;
    }

    button.addEventListener('click', function () { if (isOpen()) close(); else open(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { close(); button.focus(); }
    });
    document.addEventListener('click', function (e) {
      // composedPath, not contains(): a click on a control re-renders the panel and detaches the target.
      var path = e.composedPath();
      if (isOpen() && path.indexOf(panel) < 0 && path.indexOf(button) < 0) close();
    });

    return { open: open, close: close, render: render, isOpen: isOpen };
  }

  var api = { create: create, WHATS_NEW: WHATS_NEW };
  root.BusApp = root.BusApp || {};
  root.BusApp.settingsPopover = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
