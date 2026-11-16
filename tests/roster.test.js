const test = require('node:test');
const assert = require('node:assert');
const R = require('../js/roster.js');
const L = require('../js/busLayout.js');

const layout = L.createLayout();
const wcLayout = L.setWheelchair(layout, { enabled: true });

test('wheelchair spots: one per wheelchair row, none when disabled', () => {
  assert.deepStrictEqual(L.getWheelchairSpots(layout), []);
  assert.deepStrictEqual(L.getWheelchairSpots(wcLayout).map(s => s.id), ['wc-10', 'wc-11']);
});

test('assign and look up', () => {
  const r = R.assign(R.create(), layout, 'ann', '1-driver-1');
  assert.strictEqual(R.studentAt(r, '1-driver-1'), 'ann');
  assert.strictEqual(R.seatOf(r, 'ann'), '1-driver-1');
});

test('no double-booking of a seat', () => {
  const r = R.assign(R.create(), layout, 'ann', '1-driver-1');
  assert.throws(() => R.assign(r, layout, 'bob', '1-driver-1'));
});

test('assigning a seated student moves them and frees the old seat', () => {
  let r = R.assign(R.create(), layout, 'ann', '1-driver-1');
  r = R.assign(r, layout, 'ann', '2-door-1');
  assert.strictEqual(R.studentAt(r, '1-driver-1'), undefined);
  assert.strictEqual(R.seatOf(r, 'ann'), '2-door-1');
});

test('unassign', () => {
  let r = R.assign(R.create(), layout, 'ann', '1-driver-1');
  r = R.unassign(r, 'ann');
  assert.strictEqual(R.seatOf(r, 'ann'), undefined);
  assert.deepStrictEqual(r, {});
});

test('swap two seated students', () => {
  let r = R.assign(R.create(), layout, 'ann', '1-driver-1');
  r = R.assign(r, layout, 'bob', '1-driver-2');
  r = R.swap(r, 'ann', 'bob');
  assert.strictEqual(R.seatOf(r, 'ann'), '1-driver-2');
  assert.strictEqual(R.seatOf(r, 'bob'), '1-driver-1');
});

test('unknown seats are rejected; regular seats under wheelchair rows are gone', () => {
  assert.throws(() => R.assign(R.create(), layout, 'ann', '99-door-1'));
  assert.throws(() => R.assign(R.create(), wcLayout, 'ann', '10-door-1'));
});

test('wheelchair spots can be assigned', () => {
  const r = R.assign(R.create(), wcLayout, 'ann', 'wc-10');
  assert.strictEqual(R.isWheelchairSpot('wc-10'), true);
  assert.strictEqual(R.seatOf(r, 'ann'), 'wc-10');
});

test('does not mutate', () => {
  const a = R.create();
  R.assign(a, layout, 'ann', '1-driver-1');
  assert.deepStrictEqual(a, {});
});

test('prune removes students whose seats vanished; unseated lists the rest', () => {
  let r = R.assign(R.create(), layout, 'ann', '10-door-1');
  r = R.assign(r, layout, 'bob', '1-door-1');
  const pruned = R.prune(r, wcLayout);
  assert.strictEqual(R.seatOf(pruned, 'ann'), undefined);
  assert.strictEqual(R.seatOf(pruned, 'bob'), '1-door-1');
  assert.deepStrictEqual(R.unseated(pruned, ['ann', 'bob', 'cy']), ['ann', 'cy']);
});

test('place: empty seat just assigns', () => {
  const r = R.place(R.create(), layout, 'ann', '1-driver-1');
  assert.deepStrictEqual(r, { '1-driver-1': 'ann' });
});

test('place: seated student dropped on an occupied seat swaps the two', () => {
  let r = R.assign(R.assign(R.create(), layout, 'ann', '1-driver-1'), layout, 'bob', '2-driver-1');
  r = R.place(r, layout, 'ann', '2-driver-1');
  assert.deepStrictEqual(r, { '1-driver-1': 'bob', '2-driver-1': 'ann' });
});

test('place: unseated student dropped on an occupied seat sends the occupant to unseated', () => {
  const r = R.place(R.assign(R.create(), layout, 'bob', '1-driver-1'), layout, 'ann', '1-driver-1');
  assert.deepStrictEqual(r, { '1-driver-1': 'ann' });
});

test('place: invalid seat still throws', () => {
  assert.throws(() => R.place(R.create(), layout, 'ann', 'nope'));
});

test('moveOrSwap: swaps an occupied target, moves into an empty one', () => {
  const base = { '1-driver-1': 'ann', '1-driver-2': 'bo' };
  assert.deepStrictEqual(R.moveOrSwap(base, layout, '1-driver-1', '1-driver-2'), { '1-driver-1': 'bo', '1-driver-2': 'ann' });
  assert.deepStrictEqual(R.moveOrSwap(base, layout, '1-driver-1', '2-driver-1'), { '1-driver-2': 'bo', '2-driver-1': 'ann' });
  assert.strictEqual(R.moveOrSwap(base, layout, '1-driver-1', '1-driver-1'), base);
});

test('moveOrSwap: rejects an empty source or unknown seat', () => {
  assert.throws(() => R.moveOrSwap({}, layout, '1-driver-1', '1-driver-2'), /empty/);
  assert.throws(() => R.moveOrSwap({ '1-driver-1': 'ann' }, layout, '1-driver-1', 'nope'), /no such seat/);
});
