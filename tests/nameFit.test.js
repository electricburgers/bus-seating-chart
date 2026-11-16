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

test('tiers go from full name at normal size down to first initial, always keeping the whole last name', () => {
  const t = N.tiers('Maximilian Nguyen', 11, 10);
  assert.deepStrictEqual(t.map((x) => [x.text, x.size]), [
    ['Maximilian Nguyen', null], ['Maximilian Nguyen', 11], ['Maximilian Nguyen', 10],
    ['Maxim. Nguyen', 10], ['Max. Nguyen', 10], ['M. Nguyen', 10]
  ]);
  t.forEach((x) => assert.ok(x.text.endsWith('Nguyen')));
});

test('tiers skip shortenings that would not shorten a short first name', () => {
  const t = N.tiers('Eli Kim', 11, 10);
  assert.deepStrictEqual(t.map((x) => x.text), ['Eli Kim', 'Eli Kim', 'Eli Kim', 'E. Kim']);
});

test('a one-word name has only size tiers', () => {
  assert.deepStrictEqual(N.tiers('Cher', 11, 10).map((x) => x.text), ['Cher', 'Cher', 'Cher']);
});
