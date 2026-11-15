const test = require('node:test');
const assert = require('node:assert');
const F = require('../js/seatFeatures.js');

test('feature names', () => {
  assert.deepStrictEqual(F.FEATURES, ['carSeat', 'fiveStarBelt', 'harnessAttachment']);
});

test('seats default to no features', () => {
  assert.deepStrictEqual(F.getFeatures(F.create(), '1-driver-1'),
    { carSeat: false, fiveStarBelt: false, harnessAttachment: false });
});

test('toggles are independent and combinable', () => {
  let f = F.setFeature(F.create(), '1-driver-1', 'carSeat', true);
  f = F.setFeature(f, '1-driver-1', 'harnessAttachment', true);
  assert.deepStrictEqual(F.getFeatures(f, '1-driver-1'),
    { carSeat: true, fiveStarBelt: false, harnessAttachment: true });
  assert.strictEqual(F.hasFeature(f, '2-door-1', 'carSeat'), false);
});

test('toggleFeature flips; turning everything off removes the entry', () => {
  let f = F.toggleFeature(F.create(), '1-door-1', 'fiveStarBelt');
  assert.strictEqual(F.hasFeature(f, '1-door-1', 'fiveStarBelt'), true);
  f = F.toggleFeature(f, '1-door-1', 'fiveStarBelt');
  assert.deepStrictEqual(f, {});
});

test('does not mutate; rejects unknown feature', () => {
  const a = F.create();
  F.setFeature(a, 's', 'carSeat', true);
  assert.deepStrictEqual(a, {});
  assert.throws(() => F.setFeature(a, 's', 'jetpack', true));
});

test('prune drops seats not in the layout', () => {
  let f = F.setFeature(F.create(), '1-driver-1', 'carSeat', true);
  f = F.setFeature(f, '9-driver-1', 'carSeat', true);
  assert.deepStrictEqual(Object.keys(F.prune(f, ['1-driver-1'])), ['1-driver-1']);
});
