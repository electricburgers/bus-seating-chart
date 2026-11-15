const test = require('node:test');
const assert = require('node:assert');
const S = require('../js/sampleData.js');
const L = require('../js/busLayout.js');
const R = require('../js/roster.js');
const N = require('../js/needs.js');
const C = require('../js/changeLog.js');

test('same seed gives the same fake route', () => {
  assert.deepStrictEqual(S.generate(S.mulberry(7)), S.generate(S.mulberry(7)));
});

test('fake route is valid: unique names, everyone seated once, wheelchair spots used, some changes', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const d = S.generate(S.mulberry(seed));
    const names = d.students.map((s) => s.name);
    assert.strictEqual(new Set(names).size, names.length);
    [d.baselineRoster, d.roster].forEach((roster) => {
      assert.strictEqual(Object.keys(roster).length, d.students.length);
      assert.strictEqual(new Set(Object.values(roster)).size, d.students.length);
      Object.keys(roster).forEach((id) => assert.doesNotThrow(() => R.assign(R.create(), d.layout, 'x', id)));
    });
    assert.ok(d.layout.wheelchair.enabled);
    assert.ok(C.diff(C.createBaseline(d.baselineRoster, d.features), { roster: d.roster, features: d.features }).length > 0);
  }
});

test('works with the default random source', () => {
  assert.strictEqual(S.generate().students.length, 34);
});

test('no-wheelchair sample has no wheelchair area or wheelchair students', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const d = S.generate(S.mulberry(seed), { wheelchair: false });
    assert.ok(!d.layout.wheelchair.enabled);
    assert.strictEqual(d.students.length, 34);
    assert.ok(d.students.every((s) => !s.needs.wheelchair));
    assert.strictEqual(new Set(Object.values(d.roster)).size, d.students.length);
  }
});
