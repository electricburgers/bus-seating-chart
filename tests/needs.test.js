const test = require('node:test');
const assert = require('node:assert');
const N = require('../js/needs.js');
const F = require('../js/seatFeatures.js');
const R = require('../js/roster.js');
const L = require('../js/busLayout.js');

const layout = L.setWheelchair(L.createLayout(), { enabled: true });

test('need names', () => {
  assert.deepStrictEqual(N.NEEDS, ['carSeat', 'harnessAttachment', 'wheelchair']);
});

test('no needs, no warnings', () => {
  assert.deepStrictEqual(N.checkStudent({}, '1-driver-1', F.create()), []);
});

test('missing seat feature is flagged per need', () => {
  const needs = { carSeat: true, harnessAttachment: true };
  let f = F.setFeature(F.create(), '1-driver-1', 'carSeat', true);
  assert.deepStrictEqual(N.checkStudent(needs, '1-driver-1', f),
    [{ type: 'missingFeature', feature: 'harnessAttachment' }]);
  f = F.setFeature(f, '1-driver-1', 'harnessAttachment', true);
  assert.deepStrictEqual(N.checkStudent(needs, '1-driver-1', f), []);
});

test('wheelchair student outside the wheelchair area is flagged', () => {
  assert.deepStrictEqual(N.checkStudent({ wheelchair: true }, '1-door-1', F.create()),
    [{ type: 'wheelchairOutsideArea' }]);
  assert.deepStrictEqual(N.checkStudent({ wheelchair: true }, 'wc-10', F.create()), []);
});

test('wheelchair spots have no seat features to miss', () => {
  assert.deepStrictEqual(N.checkStudent({ carSeat: true }, 'wc-10', F.create()),
    [{ type: 'missingFeature', feature: 'carSeat' }]);
});

test('getWarnings covers all seated students, skips unseated', () => {
  let r = R.assign(R.create(), layout, 'ann', '1-driver-1');
  r = R.assign(r, layout, 'bob', 'wc-10');
  const needs = { ann: { harnessAttachment: true }, bob: { wheelchair: true }, cy: { carSeat: true } };
  assert.deepStrictEqual(N.getWarnings(r, needs, F.create()),
    { ann: [{ type: 'missingFeature', feature: 'harnessAttachment' }] });
});

test('describe gives readable text', () => {
  assert.strictEqual(N.describe({ type: 'missingFeature', feature: 'carSeat' }), 'Needs a 5-star car seat');
  assert.strictEqual(N.describe({ type: 'wheelchairOutsideArea' }), 'Needs the wheelchair area');
});
