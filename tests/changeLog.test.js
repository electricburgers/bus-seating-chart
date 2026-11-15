const test = require('node:test');
const assert = require('node:assert');
const C = require('../js/changeLog.js');

const state = (roster, features) => ({ roster, features: features || {} });
const base = C.createBaseline({ '1-driver-1': 'ann', '1-driver-2': 'bob' }, {});

test('no baseline means no changes', () => {
  assert.deepStrictEqual(C.diff(null, state({ a: 'x' })), []);
});

test('unchanged chart has an empty diff', () => {
  assert.deepStrictEqual(C.diff(base, state({ '1-driver-1': 'ann', '1-driver-2': 'bob' })), []);
});

test('moved, added, removed', () => {
  const cur = state({ '2-door-1': 'ann', '3-door-1': 'cy' });
  assert.deepStrictEqual(C.diff(base, cur), [
    { type: 'moved', student: 'ann', from: '1-driver-1', to: '2-door-1' },
    { type: 'removed', student: 'bob', from: '1-driver-2' },
    { type: 'added', student: 'cy', to: '3-door-1' }
  ]);
});

test('repeated moves collapse to baseline -> current', () => {
  // ann: 1-driver-1 -> A -> B -> C; the diff only knows baseline and current.
  assert.deepStrictEqual(C.diff(base, state({ C: 'ann', '1-driver-2': 'bob' })),
    [{ type: 'moved', student: 'ann', from: '1-driver-1', to: 'C' }]);
});

test('moving back to the original seat removes the change', () => {
  assert.deepStrictEqual(C.diff(base, state({ '1-driver-1': 'ann', '1-driver-2': 'bob' })), []);
});

test('a swap is two moves', () => {
  const d = C.diff(base, state({ '1-driver-1': 'bob', '1-driver-2': 'ann' }));
  assert.deepStrictEqual(d.map(c => c.student), ['ann', 'bob']);
  assert.ok(d.every(c => c.type === 'moved'));
});

test('seat feature changes are listed, and revert cleanly', () => {
  const cur = state({ '1-driver-1': 'ann', '1-driver-2': 'bob' }, { '1-driver-1': { carSeat: true } });
  assert.deepStrictEqual(C.diff(base, cur), [{ type: 'featureChanged', seat: '1-driver-1',
    from: { carSeat: false, fiveStarBelt: false, harnessAttachment: false },
    to: { carSeat: true, fiveStarBelt: false, harnessAttachment: false } }]);
  assert.deepStrictEqual(C.diff(base, state(base.roster, { '1-driver-1': {} })), []);
});

test('baseline is a copy, not a reference', () => {
  const roster = { s: 'ann' };
  const b = C.createBaseline(roster, {});
  roster.s = 'zed';
  assert.strictEqual(b.roster.s, 'ann');
});

test('change keys', () => {
  assert.strictEqual(C.changeKey({ type: 'moved', student: 'ann' }), 'student:ann');
  assert.strictEqual(C.changeKey({ type: 'featureChanged', seat: '1-door-1' }), 'seat:1-door-1');
});

test('reasons attach to changes by key; blank clears', () => {
  let reasons = C.setReason({}, 'student:ann', ' Behavior ');
  assert.deepStrictEqual(reasons, { 'student:ann': 'Behavior' });
  const rows = C.getRows(C.diff(base, state({ X: 'ann', '1-driver-2': 'bob' })), reasons);
  assert.strictEqual(rows[0].reason, 'Behavior');
  assert.strictEqual(rows[0].key, 'student:ann');
  assert.deepStrictEqual(C.setReason(reasons, 'student:ann', '  '), {});
});

test('rows without a reason get an empty string', () => {
  const rows = C.getRows(C.diff(base, state({ X: 'ann', '1-driver-2': 'bob' })), {});
  assert.strictEqual(rows[0].reason, '');
});
