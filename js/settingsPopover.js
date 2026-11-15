(function (root) {
  'use strict';

  // Gear-button popover: version info, door flip, bus setup, bench overrides, templates.
  // actions is app.js's set of handlers; each one may throw, and app.js shows the message.
  function create(opts) {
    var h = root.BusApp.ui.h;
    var button = opts.button, panel = opts.panel, actions = opts.actions;

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

    function render() {
      var st = opts.getState(), layout = st.layout, v = root.BusApp.version;
      var side = layout.doorSide;
      panel.textContent = '';

      panel.appendChild(h('h2', { text: 'Settings' }));
      panel.appendChild(h('p', { 'class': 'version', text: 'Version ' + v.version + ' · built ' + v.buildDate + ' ' + v.buildTime }));

      panel.appendChild(h('h3', { text: 'Bus setup' }));
      panel.appendChild(numberField('Rows', layout.rows, 1, actions.setRows));
      panel.appendChild(numberField('Driver side seats per bench', layout.driverSeats, 0, function (n) { actions.setSeats('driver', n); }));
      panel.appendChild(numberField('Door side seats per bench', layout.doorSeats, 0, function (n) { actions.setSeats('door', n); }));
      var flip = h('button', { type: 'button', text: 'Door is on the ' + side + ' — flip to ' + (side === 'right' ? 'left' : 'right') });
      flip.addEventListener('click', function () { run(actions.flipDoor); });
      panel.appendChild(flip);

      var wc = layout.wheelchair;
      var wcBox = h('input', { type: 'checkbox', checked: wc.enabled });
      wcBox.addEventListener('change', function () { run(function () { actions.setWheelchair({ enabled: wcBox.checked }); }); });
      panel.appendChild(h('label', { 'class': 'field' }, [wcBox, ' Wheelchair area at the back']));
      if (wc.enabled) {
        panel.appendChild(numberField('Wheelchair rows', wc.rows, root.BusApp.busLayout.MIN_WHEELCHAIR_ROWS,
          function (n) { actions.setWheelchair({ rows: n }); }));
      }

      panel.appendChild(h('h3', { text: 'Single bench override' }));
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
      panel.appendChild(h('div', { 'class': 'row' }, ['Row ', rowIn, sideSel, ' seats ', countIn, set, clear]));
      var keys = Object.keys(layout.overrides);
      if (keys.length) {
        panel.appendChild(h('p', { 'class': 'hint', text: 'Overrides: ' + keys.map(function (k) { return k + ' = ' + layout.overrides[k]; }).join(', ') }));
      }

      panel.appendChild(h('h3', { text: 'Bus templates' }));
      var nameIn = h('input', { type: 'text', placeholder: 'Template name', 'aria-label': 'Template name' });
      var save = h('button', { type: 'button', text: 'Save current bus' });
      save.addEventListener('click', function () { run(function () { actions.saveTemplate(nameIn.value); }); });
      panel.appendChild(h('div', { 'class': 'row' }, [nameIn, save]));
      var names = st.templateNames;
      if (names.length) {
        var sel = h('select', { 'aria-label': 'Saved templates' }, names.map(function (n) { return h('option', { value: n, text: n }); }));
        var load = h('button', { type: 'button', text: 'Load' });
        var del = h('button', { type: 'button', 'class': 'danger', text: 'Delete' });
        load.addEventListener('click', function () { run(function () { actions.loadTemplate(sel.value); }); });
        del.addEventListener('click', function () { run(function () { actions.deleteTemplate(sel.value); }); });
        panel.appendChild(h('div', { 'class': 'row' }, [sel, load, del]));
      } else {
        panel.appendChild(h('p', { 'class': 'hint', text: 'No saved templates yet.' }));
      }

      panel.appendChild(h('h3', { text: 'Try it out' }));
      var demo = h('button', { type: 'button', text: 'Generate fake names and layout' });
      demo.addEventListener('click', function () { run(actions.loadSampleData); });
      panel.appendChild(demo);
      panel.appendChild(h('p', { 'class': 'hint', text: 'Replaces the current chart with made-up students, a baseline and a few moves, so you can preview exports.' }));

      var done = h('button', { type: 'button', text: 'Close' });
      done.addEventListener('click', function () { close(); button.focus(); });
      panel.appendChild(done);
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

  var api = { create: create };
  root.BusApp = root.BusApp || {};
  root.BusApp.settingsPopover = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
