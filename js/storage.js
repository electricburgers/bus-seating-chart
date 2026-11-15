(function (root) {
  'use strict';

  var APP_TAG = 'bus-seating-chart';
  var SCHEMA_VERSION = 1;
  var AUTOSAVE_KEY = 'busSeatingChart.autosave';
  var TEMPLATES_KEY = 'busSeatingChart.templates';
  var BACKUP_KEY = 'busSeatingChart.backup';
  var THEME_KEY = 'busSeatingChart.theme';

  function fail(msg) { throw new Error('storage: ' + msg); }
  function lib(name) {
    return (typeof require === 'function' && typeof module !== 'undefined')
      ? require('./' + name + '.js') : root.BusApp[name];
  }
  function clone(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  function isObject(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function str(x) { return typeof x === 'string' ? x : ''; }

  // A chart is { routeName, preparedBy, layout, students, roster, features, baseline, reasons }.
  // students: [{ id, name, school, needs }]. See roster.js, seatFeatures.js and changeLog.js for the rest.
  function serialize(chart) {
    return JSON.stringify({
      app: APP_TAG,
      schemaVersion: SCHEMA_VERSION,
      routeName: chart.routeName,
      preparedBy: chart.preparedBy,
      layout: chart.layout,
      students: chart.students,
      roster: chart.roster,
      features: chart.features,
      baseline: chart.baseline,
      reasons: chart.reasons,
      logSnapshot: chart.logSnapshot || null
    });
  }

  // Older saves had a separate fiveStarBelt flag. A 5-star belt is a car seat, so fold it into carSeat.
  function mergeLegacy(flags) {
    if (!isObject(flags) || !('fiveStarBelt' in flags)) return flags;
    var out = Object.assign({}, flags);
    if (out.fiveStarBelt) out.carSeat = true;
    delete out.fiveStarBelt;
    return out;
  }
  function mergeLegacyFeatures(features) {
    var out = {};
    Object.keys(features).forEach(function (seat) { out[seat] = mergeLegacy(features[seat]); });
    return out;
  }

  function cleanStudents(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(function (s) { return isObject(s) && s.id !== undefined && s.id !== ''; })
      .map(function (s) {
        var out = { id: String(s.id), name: str(s.name), school: str(s.school), needs: isObject(s.needs) ? mergeLegacy(clone(s.needs)) : {} };
        if (s.removed === true) out.removed = true; // deleted, but still in the baseline so the Before chart and change log can name them
        return out;
      });
  }

  function validSeatIds(layout) {
    var L = lib('busLayout'), ids = {};
    L.getSeats(layout).forEach(function (s) { ids[s.id] = true; });
    L.getWheelchairSpots(layout).forEach(function (s) { ids[s.id] = true; });
    return ids;
  }

  function cleanBaseline(b) {
    if (!isObject(b)) return null;
    return { roster: isObject(b.roster) ? clone(b.roster) : {}, features: isObject(b.features) ? mergeLegacyFeatures(clone(b.features)) : {} };
  }

  function deserialize(json) {
    var data;
    try { data = JSON.parse(json); } catch (e) { fail('file is not valid JSON'); }
    if (!isObject(data)) fail('file is not a bus seating chart');
    if (data.app !== APP_TAG) fail('file is not a bus seating chart');
    if (!Number.isInteger(data.schemaVersion) || data.schemaVersion < 1) fail('file has no valid schema version');
    if (data.schemaVersion > SCHEMA_VERSION) fail('file was saved by a newer version of the app');

    var layout = lib('busLayout').createLayout(isObject(data.layout) ? data.layout : undefined);
    var seats = validSeatIds(layout);
    var students = cleanStudents(data.students);
    var known = {};
    students.forEach(function (s) { known[s.id] = true; });

    var roster = {};
    if (isObject(data.roster)) {
      Object.keys(data.roster).forEach(function (seat) {
        if (seats[seat] && known[data.roster[seat]]) roster[seat] = data.roster[seat];
      });
    }
    var features = {};
    if (isObject(data.features)) {
      Object.keys(data.features).forEach(function (seat) {
        if (seats[seat] && isObject(data.features[seat])) features[seat] = mergeLegacy(clone(data.features[seat]));
      });
    }

    return {
      routeName: str(data.routeName),
      preparedBy: str(data.preparedBy),
      layout: layout,
      students: students,
      roster: roster,
      features: features,
      baseline: cleanBaseline(data.baseline),
      reasons: isObject(data.reasons) ? clone(data.reasons) : {},
      // The change log is only generated when the user finalizes it. null = not generated yet.
      logSnapshot: Array.isArray(data.logSnapshot) ? clone(data.logSnapshot.filter(isObject)) : null
    };
  }

  // ---- templates: { name: { layout, features } } ----

  function saveTemplate(templates, name, layout, features) {
    var n = String(name || '').trim();
    if (!n) fail('template needs a name');
    var next = Object.assign({}, templates);
    next[n] = { layout: clone(layout), features: clone(features || {}) };
    return next;
  }

  function listTemplates(templates) { return Object.keys(templates).sort(); }

  function loadTemplate(templates, name) {
    if (!Object.prototype.hasOwnProperty.call(templates, name)) fail('no template "' + name + '"');
    var t = clone(templates[name]);
    if (isObject(t.features)) t.features = mergeLegacyFeatures(t.features);
    return t;
  }

  function deleteTemplate(templates, name) {
    var next = Object.assign({}, templates);
    delete next[name];
    return next;
  }

  // ---- browser storage (pass window.localStorage, or a stand-in in tests) ----

  function write(store, key, text) {
    try {
      if (!store) return { ok: false, error: 'storage is not available' };
      store.setItem(key, text);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e && e.message ? e.message : String(e) };
    }
  }
  function read(store, key) {
    try { return store ? store.getItem(key) : null; } catch (e) { return null; }
  }

  function saveAutosave(store, chart) {
    try { return write(store, AUTOSAVE_KEY, serialize(chart)); }
    catch (e) { return { ok: false, error: e.message }; }
  }

  // Returns the saved chart, or null when there is none or it cannot be read.
  function loadAutosave(store) {
    var text = read(store, AUTOSAVE_KEY);
    if (text === null) return null;
    try { return deserialize(text); } catch (e) { return null; }
  }

  // One-deep backup of the chart that was just replaced (load JSON, sample data, clear roster).
  // Survives a page reload, unlike the in-session undo history.
  function saveBackup(store, chart, reason, now) {
    try {
      var text = JSON.stringify({ savedAt: (now || new Date()).toISOString(), reason: String(reason || ''), chart: serialize(chart) });
      return write(store, BACKUP_KEY, text);
    } catch (e) { return { ok: false, error: e.message }; }
  }

  // Returns { savedAt, reason, chart } or null.
  function loadBackup(store) {
    var text = read(store, BACKUP_KEY);
    if (text === null) return null;
    try {
      var data = JSON.parse(text);
      if (!isObject(data) || typeof data.chart !== 'string') return null;
      return { savedAt: str(data.savedAt), reason: str(data.reason), chart: deserialize(data.chart) };
    } catch (e) { return null; }
  }

  function saveTheme(store, theme) { return write(store, THEME_KEY, theme); }
  function loadTheme(store) {
    var t = read(store, THEME_KEY);
    return t === 'light' || t === 'dark' ? t : 'auto';
  }

  function saveTemplates(store, templates) { return write(store, TEMPLATES_KEY, JSON.stringify(templates)); }

  function loadTemplates(store) {
    var text = read(store, TEMPLATES_KEY);
    if (text === null) return {};
    try {
      var data = JSON.parse(text);
      return isObject(data) ? data : {};
    } catch (e) { return {}; }
  }

  var api = {
    SCHEMA_VERSION: SCHEMA_VERSION, AUTOSAVE_KEY: AUTOSAVE_KEY, TEMPLATES_KEY: TEMPLATES_KEY,
    serialize: serialize, deserialize: deserialize,
    saveTemplate: saveTemplate, listTemplates: listTemplates, loadTemplate: loadTemplate, deleteTemplate: deleteTemplate,
    saveBackup: saveBackup, loadBackup: loadBackup, saveTheme: saveTheme, loadTheme: loadTheme,
    saveAutosave: saveAutosave, loadAutosave: loadAutosave, saveTemplates: saveTemplates, loadTemplates: loadTemplates
  };
  root.BusApp = root.BusApp || {};
  root.BusApp.storage = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
