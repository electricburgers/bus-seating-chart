const test = require('node:test');
const assert = require('node:assert');
const X = require('../js/exporter.js');
const B = require('../js/busLayout.js');
const CL = require('../js/changeLog.js');

const students = [
  { id: 's1', name: 'Ann Lee', school: 'Oak', needs: {} },
  { id: 's2', name: 'Smith, Bob', school: 'Elm', needs: { wheelchair: true } }
];

test('buildFilename slugs the route name and adds date and extension', () => {
  assert.strictEqual(X.buildFilename('Route 12', '2026-11-15', 'pdf'), 'route-12_2026-11-15.pdf');
  assert.strictEqual(X.buildFilename('  Oak/Elm: AM run!! ', '2026-11-15', 'csv'), 'oak-elm-am-run_2026-11-15.csv');
  assert.strictEqual(X.buildFilename('', '2026-11-15', 'json'), 'bus_2026-11-15.json');
  assert.strictEqual(X.buildFilename('../../etc', '2026-11-15', 'jpg'), 'etc_2026-11-15.jpg');
});

test('formatSeat gives readable labels', () => {
  assert.strictEqual(X.formatSeat('3-driver-2'), 'Row 3, driver side, seat 2');
  assert.strictEqual(X.formatSeat('10-door-1'), 'Row 10, door side, seat 1');
  assert.strictEqual(X.formatSeat('wc-9'), 'Wheelchair area, row 9');
  assert.strictEqual(X.formatSeat(undefined), '');
});

test('headerLines uses route, name and date, with fallbacks', () => {
  assert.deepStrictEqual(X.headerLines({ routeName: 'Route 12', preparedBy: 'Pat', exportDate: '2026-11-15' }),
    { route: 'Route: Route 12', preparedBy: 'Prepared by: Pat', date: 'Date: 2026-11-15' });
  const h = X.headerLines({ routeName: ' ', preparedBy: '', exportDate: '2026-11-15' });
  assert.strictEqual(h.route, 'Route: (no route name)');
  assert.strictEqual(h.preparedBy, 'Prepared by: (not set)');
});

function chart() {
  return {
    routeName: 'Route 12',
    layout: B.createLayout({ rows: 4, driverSeats: 2, doorSeats: 1, wheelchair: { enabled: true, rows: 2 } }),
    students,
    roster: { '1-driver-1': 's1', 'wc-3': 's2' },
    features: { '1-driver-1': { carSeat: true, harnessAttachment: true } }
  };
}

test('csvRows: header, then one row per seat in left-to-right order', () => {
  const rows = X.csvRows(chart(), '2026-11-15');
  assert.deepStrictEqual(rows[0], ['route', 'date', 'seat', 'side', 'row', 'student', 'school',
    'car_seat', 'harness_attachment', 'wheelchair']);
  // rows 1-2: 3 seats each; wheelchair rows 3-4: one spot each
  assert.strictEqual(rows.length, 1 + 3 + 3 + 2);
  assert.deepStrictEqual(rows[1], ['Route 12', '2026-11-15', '1-driver-1', 'driver', 1, 'Ann Lee', 'Oak', 'yes', 'yes', 'no']);
  assert.deepStrictEqual(rows[2].slice(2, 6), ['1-driver-2', 'driver', 1, '']);
  assert.deepStrictEqual(rows[3].slice(2, 5), ['1-door-1', 'door', 1]);
  assert.deepStrictEqual(rows[7], ['Route 12', '2026-11-15', 'wc-3', 'wheelchair', 3, 'Smith, Bob', 'Elm', 'no', 'no', 'yes']);
  assert.deepStrictEqual(rows[8].slice(2, 7), ['wc-4', 'wheelchair', 4, '', '']);
});

test('csvRows follows the door-side flip', () => {
  const c = chart();
  c.layout = B.flipDoorSide(c.layout);
  const rows = X.csvRows(c, '2026-11-15');
  assert.deepStrictEqual(rows.slice(1, 4).map((r) => r[2]), ['1-door-1', '1-driver-1', '1-driver-2']);
});

test('toCsv quotes commas, quotes and newlines, and defuses spreadsheet formulas', () => {
  assert.strictEqual(X.toCsv([['a', 'b,c', 'say "hi"', 'x\ny', 5]]), 'a,"b,c","say ""hi""","x\ny",5\r\n');
  assert.strictEqual(X.toCsv([['=SUM(A1)', '+1', '-2', '@x', 'ok']]), "'=SUM(A1),'+1,'-2,'@x,ok\r\n");
});

test('exported CSV quotes student names that contain commas', () => {
  const csv = X.toCsv(X.csvRows(chart(), '2026-11-15'));
  assert.match(csv, /"Smith, Bob"/);
});

test('changeTableRows: student, from, to, reason', () => {
  const base = CL.createBaseline({ '1-driver-1': 's1', '1-driver-2': 's2' }, {});
  const cur = { roster: { '2-door-1': 's1', '3-door-1': 's3' }, features: { '2-door-1': { carSeat: true } } };
  const all = students.concat([{ id: 's3', name: 'Cy', school: 'Oak', needs: {} }]);
  const rows = CL.getRows(CL.diff(base, cur), { 'student:s1': 'Sibling together' });
  assert.deepStrictEqual(X.changeTableRows(rows, all), [
    { student: 'Ann Lee', from: 'Row 1, driver side, seat 1', to: 'Row 2, door side, seat 1', reason: 'Sibling together' },
    { student: 'Smith, Bob', from: 'Row 1, driver side, seat 2', to: '(removed)', reason: '' },
    { student: 'Cy', from: '(new)', to: 'Row 3, door side, seat 1', reason: '' },
    { student: '', from: 'Row 2, door side, seat 1: no seat features', to: 'Row 2, door side, seat 1: 5-star car seat', reason: '' }
  ]);
});

test('changeTableRows falls back to the id for unknown students', () => {
  const rows = [{ key: 'student:zz', type: 'added', student: 'zz', to: '1-door-1', reason: '' }];
  assert.strictEqual(X.changeTableRows(rows, students)[0].student, 'zz');
});

test('describeFeatures lists features or says none', () => {
  assert.strictEqual(X.describeFeatures({ carSeat: true, harnessAttachment: true }), '5-star car seat, harness attachment');
  assert.strictEqual(X.describeFeatures({}), 'no seat features');
});
