const test = require('node:test');
const assert = require('node:assert');
const S = require('../js/storage.js');
const B = require('../js/busLayout.js');

function sampleChart() {
  const layout = B.setBenchOverride(B.createLayout({ rows: 10, wheelchair: { enabled: true, rows: 2 } }), 2, 'driver', 2);
  return {
    routeName: 'Route 12',
    routeNumber: '42',
    shift: 'Both',
    driver: 'Lee',
    aide: 'Sam',
    notes: 'Note',
    preparedBy: 'Pat',
    layout,
    students: [
      { id: 's1', name: 'Ann', school: 'Oak', needs: { carSeat: true } },
      { id: 's2', name: 'Bob', school: 'Elm', needs: { wheelchair: true } }
    ],
    roster: { '1-driver-1': 's1', 'wc-9': 's2' },
    features: { '1-driver-1': { carSeat: true } },
    baseline: { roster: { '1-driver-1': 's1' }, features: {} },
    reasons: { 'student:s2': 'New student' }, logSnapshot: null
  };
}

test('JSON round trip restores the whole chart', () => {
  const chart = sampleChart();
  assert.deepStrictEqual(S.deserialize(S.serialize(chart)), chart);
});

test('serialize writes an app tag and schema version', () => {
  const data = JSON.parse(S.serialize(sampleChart()));
  assert.strictEqual(data.app, 'bus-seating-chart');
  assert.strictEqual(data.schemaVersion, S.SCHEMA_VERSION);
});

test('missing optional parts get defaults', () => {
  const json = JSON.stringify({ app: 'bus-seating-chart', schemaVersion: 1 });
  const chart = S.deserialize(json);
  assert.deepStrictEqual(chart.layout, B.createLayout());
  assert.deepStrictEqual(chart.students, []);
  assert.deepStrictEqual(chart.roster, {});
  assert.deepStrictEqual(chart.features, {});
  assert.strictEqual(chart.baseline, null);
  assert.deepStrictEqual(chart.reasons, {});
  assert.strictEqual(chart.routeName, '');
  assert.strictEqual(chart.preparedBy, '');
  assert.strictEqual(chart.routeNumber, '');
  assert.strictEqual(chart.shift, '');
  assert.strictEqual(chart.driver, '');
  assert.strictEqual(chart.aide, '');
  assert.strictEqual(chart.notes, '');
});

test('rejects invalid JSON, other files, and newer schema versions', () => {
  assert.throws(() => S.deserialize('not json'), /storage: .*JSON/i);
  assert.throws(() => S.deserialize('[]'), /storage:/);
  assert.throws(() => S.deserialize(JSON.stringify({ app: 'other', schemaVersion: 1 })), /storage: .*not a bus seating chart/i);
  assert.throws(() => S.deserialize(JSON.stringify({ app: 'bus-seating-chart', schemaVersion: 999 })), /storage: .*newer/i);
});

test('rejects an invalid layout', () => {
  const data = JSON.parse(S.serialize(sampleChart()));
  data.layout.rows = 0;
  assert.throws(() => S.deserialize(JSON.stringify(data)), /busLayout:/);
});

test('drops seats that are not in the layout and students that do not exist', () => {
  const data = JSON.parse(S.serialize(sampleChart()));
  data.roster['99-driver-1'] = 's1';
  data.roster['3-door-1'] = 'ghost';
  data.features['99-door-1'] = { carSeat: true };
  const chart = S.deserialize(JSON.stringify(data));
  assert.deepStrictEqual(chart.roster, { '1-driver-1': 's1', 'wc-9': 's2' });
  assert.deepStrictEqual(chart.features, { '1-driver-1': { carSeat: true } });
});

test('serialize does not mutate the chart', () => {
  const chart = sampleChart();
  const copy = JSON.parse(JSON.stringify(chart));
  S.serialize(chart);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(chart)), copy);
});

// ---- templates ----

test('save, list, load and delete templates', () => {
  const chart = sampleChart();
  let t = S.saveTemplate({}, 'Big bus', chart.layout, chart.features);
  t = S.saveTemplate(t, 'Another', B.createLayout({ rows: 8 }), {});
  assert.deepStrictEqual(S.listTemplates(t), ['Another', 'Big bus']);
  const loaded = S.loadTemplate(t, 'Big bus');
  assert.deepStrictEqual(loaded.layout, chart.layout);
  assert.deepStrictEqual(loaded.features, chart.features);
  const after = S.deleteTemplate(t, 'Big bus');
  assert.deepStrictEqual(S.listTemplates(after), ['Another']);
  assert.deepStrictEqual(S.listTemplates(t), ['Another', 'Big bus'], 'original untouched');
});

test('templates keep look settings (fonts, orientation, row options) when given', () => {
  const chart = sampleChart();
  const view = { busRearTop: '1', busNameSize: '16', 'chk:export-shrink': '1' };
  const t = S.saveTemplate({}, 'Look', chart.layout, chart.features, view);
  assert.deepStrictEqual(S.loadTemplate(t, 'Look').view, view);
  assert.strictEqual(S.loadTemplate(S.saveTemplate({}, 'Old', chart.layout, {}), 'Old').view, undefined);
});

test('templates hold the bus only, not students or seating', () => {
  const chart = sampleChart();
  const t = S.saveTemplate({}, 'Bus', chart.layout, chart.features);
  assert.deepStrictEqual(Object.keys(t['Bus']).sort(), ['features', 'layout']);
});

test('template names are trimmed, required, and saving again overwrites', () => {
  const layout = B.createLayout();
  assert.throws(() => S.saveTemplate({}, '   ', layout, {}), /storage: .*name/i);
  let t = S.saveTemplate({}, '  Bus A ', layout, {});
  assert.deepStrictEqual(S.listTemplates(t), ['Bus A']);
  t = S.saveTemplate(t, 'Bus A', B.createLayout({ rows: 12 }), {});
  assert.strictEqual(S.loadTemplate(t, 'Bus A').layout.rows, 12);
});

test('loading a missing template fails; loaded template is a copy', () => {
  assert.throws(() => S.loadTemplate({}, 'nope'), /storage: no template "nope"/);
  const t = S.saveTemplate({}, 'Bus', B.createLayout(), { '1-driver-1': { carSeat: true } });
  const a = S.loadTemplate(t, 'Bus');
  a.features['1-driver-1'].carSeat = false;
  assert.strictEqual(S.loadTemplate(t, 'Bus').features['1-driver-1'].carSeat, true);
});

// ---- browser storage ----

function fakeStore() {
  const data = {};
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); }
  };
}

test('autosave and load through a storage object', () => {
  const store = fakeStore();
  assert.strictEqual(S.loadAutosave(store), null);
  assert.deepStrictEqual(S.saveAutosave(store, sampleChart()), { ok: true });
  assert.deepStrictEqual(S.loadAutosave(store), sampleChart());
});

test('corrupt autosave returns null instead of throwing', () => {
  const store = fakeStore();
  store.setItem(S.AUTOSAVE_KEY, '{broken');
  assert.strictEqual(S.loadAutosave(store), null);
});

test('autosave reports failure when storage is full or blocked', () => {
  const store = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  const res = S.saveAutosave(store, sampleChart());
  assert.strictEqual(res.ok, false);
  assert.match(res.error, /quota/);
  assert.strictEqual(S.saveAutosave(null, sampleChart()).ok, false);
});

test('templates persist through a storage object', () => {
  const store = fakeStore();
  assert.deepStrictEqual(S.loadTemplates(store), {});
  const t = S.saveTemplate({}, 'Bus', B.createLayout(), {});
  assert.deepStrictEqual(S.saveTemplates(store, t), { ok: true });
  assert.deepStrictEqual(S.loadTemplates(store), t);
  store.setItem(S.TEMPLATES_KEY, 'garbage');
  assert.deepStrictEqual(S.loadTemplates(store), {});
});

test('old saves with a separate fiveStarBelt flag are folded into carSeat', () => {
  const data = JSON.parse(S.serialize(sampleChart()));
  data.students[0].needs = { fiveStarBelt: true, harnessAttachment: true };
  const seat = Object.keys(data.features)[0] || Object.keys(data.roster)[0];
  data.features[seat] = { fiveStarBelt: true };
  data.baseline = { roster: {}, features: { [seat]: { fiveStarBelt: true } } };
  const chart = S.deserialize(JSON.stringify(data));
  assert.deepStrictEqual(chart.students[0].needs, { harnessAttachment: true, carSeat: true });
  assert.deepStrictEqual(chart.features[seat], { carSeat: true });
  assert.deepStrictEqual(chart.baseline.features[seat], { carSeat: true });
});

test('finalized change log snapshot round-trips; missing or bad snapshot means not generated', () => {
  const chart = sampleChart();
  chart.logSnapshot = [{ type: 'moved', student: 's1', from: '1-driver-1', to: '1-driver-2' }];
  assert.deepStrictEqual(S.deserialize(S.serialize(chart)).logSnapshot, chart.logSnapshot);
  assert.strictEqual(S.deserialize(S.serialize(sampleChart())).logSnapshot, null);
  const data = JSON.parse(S.serialize(sampleChart()));
  data.logSnapshot = 'nope';
  assert.strictEqual(S.deserialize(JSON.stringify(data)).logSnapshot, null);
});

test('a deleted student kept for the baseline stays flagged as removed after a save and load', () => {
  const chart = sampleChart();
  chart.students = chart.students.concat([{ id: 'gone', name: 'Gone', school: 'Oak', needs: {}, removed: true }]);
  const back = S.deserialize(S.serialize(chart));
  assert.strictEqual(back.students.find((s) => s.id === 'gone').removed, true);
  assert.strictEqual(back.students.find((s) => s.id !== 'gone').removed, undefined);
});

test('backup round-trips and ignores junk', () => {
  const mem = {};
  const store = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; } };
  const S2 = require('../js/storage.js');
  assert.strictEqual(S2.loadBackup(store), null);
  const chart = S2.deserialize(S2.serialize({ routeName: 'R1', preparedBy: '', layout: undefined, students: [], roster: {}, features: {}, baseline: null, reasons: {}, logSnapshot: null }));
  assert.ok(S2.saveBackup(store, chart, 'Loaded sample data', new Date('2026-01-02T03:04:05Z')).ok);
  const b = S2.loadBackup(store);
  assert.strictEqual(b.reason, 'Loaded sample data');
  assert.strictEqual(b.savedAt, '2026-01-02T03:04:05.000Z');
  assert.strictEqual(b.chart.routeName, 'R1');
  mem['busSeatingChart.backup'] = 'not json';
  assert.strictEqual(S2.loadBackup(store), null);
});

test('theme preference defaults to auto', () => {
  const mem = {};
  const store = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; } };
  const S2 = require('../js/storage.js');
  assert.strictEqual(S2.loadTheme(store), 'auto');
  S2.saveTheme(store, 'dark');
  assert.strictEqual(S2.loadTheme(store), 'dark');
  mem['busSeatingChart.theme'] = 'purple';
  assert.strictEqual(S2.loadTheme(store), 'auto');
});

test('student nicknames survive a round trip and blank ones are dropped', () => {
  const chart = sampleChart();
  chart.students[0].nickname = 'Annie';
  chart.students[1].nickname = '   ';
  const back = S.deserialize(S.serialize(chart));
  assert.strictEqual(back.students[0].nickname, 'Annie');
  assert.ok(!('nickname' in back.students[1]));
});
