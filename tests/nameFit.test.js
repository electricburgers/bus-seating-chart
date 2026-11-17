const test = require('node:test');
const assert = require('node:assert');
const N = require('../js/nameFit.js');

test('splitName handles first last, multiple first names, last comma first, and one word', () => {
  assert.deepStrictEqual(N.splitName('Ava Nguyen'), { first: 'Ava', last: 'Nguyen' });
  assert.deepStrictEqual(N.splitName('Mary Jane  Watson'), { first: 'Mary Jane', last: 'Watson' });
  assert.deepStrictEqual(N.splitName('Nguyen, Ava'), { first: 'Ava', last: 'Nguyen' });
  assert.deepStrictEqual(N.splitName('Cher'), { first: '', last: 'Cher' });
  assert.deepStrictEqual(N.splitName('  '), { first: '', last: '' });
});

test('tiers go from full name at normal size to a last initial, then shorten the first name last', () => {
  const t = N.tiers('Maximilian Nguyen', 11, 10);
  assert.deepStrictEqual(t.map((x) => [x.text, x.size]), [
    ['Maximilian Nguyen', null], ['Maximilian Nguyen', 11], ['Maximilian Nguyen', 10],
    ['Maximilian N.', 10], ['Maximili. N.', 10], ['Maxim. N.', 10]
  ]);
});

test('a short first name only drops the last name to an initial', () => {
  const t = N.tiers('Eli Kim', 11, 10);
  assert.deepStrictEqual(t.map((x) => x.text), ['Eli Kim', 'Eli Kim', 'Eli Kim', 'Eli K.']);
});

test('a one-word name has only size tiers', () => {
  assert.deepStrictEqual(N.tiers('Cher', 11, 10).map((x) => x.text), ['Cher', 'Cher', 'Cher']);
});

test('firstTiers keeps the first name big and never drops a last initial', () => {
  const t = N.firstTiers('Maximilian', 'N.', 11, 10);
  assert.deepStrictEqual(t.map((x) => [x.text, x.size]), [
    ['Maximilian N.', null], ['Maximilian N.', 11], ['Maximilian N.', 10], ['Maximili. N.', 10], ['Maxim. N.', 10]
  ]);
  assert.deepStrictEqual(N.firstTiers('Eli', '', 11, 10).map((x) => x.text), ['Eli', 'Eli', 'Eli']);
});

test('firstOnlyLabels adds a last initial only when a first name is shared', () => {
  const r = N.firstOnlyLabels(['Ava Nguyen', 'ava Smith', 'Eli Kim', 'Nguyen, Zoe']);
  assert.deepStrictEqual(r, [
    { first: 'Ava', initial: 'N.' }, { first: 'ava', initial: 'S.' }, { first: 'Eli', initial: '' }, { first: 'Zoe', initial: '' }
  ]);
});
