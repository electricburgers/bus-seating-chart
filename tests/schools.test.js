const test = require('node:test');
const assert = require('node:assert');
const S = require('../js/schools.js');

const roster = () => [
  { id: 's1', name: 'Ann', school: 'Oak Elementary', needs: {} },
  { id: 's2', name: 'Bob', school: 'oak elementary', needs: {} },
  { id: 's3', name: 'Cy', school: 'Elm Elementary School', needs: {} },
  { id: 's4', name: 'Di', school: '', needs: {} }
];

test('listSchools groups case variants and skips blanks', () => {
  assert.deepStrictEqual(S.listSchools(roster()), [
    { name: 'Elm Elementary School', count: 1 }, { name: 'Oak Elementary', count: 2 }
  ]);
});

test('renameSchool changes every student at that school, ignoring case', () => {
  const r = S.renameSchool(roster(), 'Oak Elementary', 'Oak Elem');
  assert.strictEqual(r.changed, 2);
  assert.deepStrictEqual(r.students.map((s) => s.school), ['Oak Elem', 'Oak Elem', 'Elm Elementary School', '']);
});

test('renameSchool leaves the original list untouched and keeps other fields', () => {
  const list = roster();
  const r = S.renameSchool(list, 'Oak Elementary', 'Oak Elem');
  assert.strictEqual(list[0].school, 'Oak Elementary');
  assert.strictEqual(r.students[0].name, 'Ann');
  assert.strictEqual(r.students[2], list[2]);
});

test('replaceInSchools shortens a word in every school name', () => {
  const r = S.replaceInSchools(roster(), 'Elementary', 'Elem', true);
  assert.strictEqual(r.changed, 3);
  assert.deepStrictEqual(r.students.map((s) => s.school), ['Oak Elem', 'oak Elem', 'Elm Elem School', '']);
});

test('whole-word replace does not touch part of a longer word', () => {
  const list = [{ id: 'a', name: 'A', school: 'Elementary Annex', needs: {} }, { id: 'b', name: 'B', school: 'Preelementary', needs: {} }];
  const r = S.replaceInSchools(list, 'Elementary', 'Elem', true);
  assert.deepStrictEqual(r.students.map((s) => s.school), ['Elem Annex', 'Preelementary']);
  assert.strictEqual(S.replaceInSchools(list, 'elementary', 'Elem', false).students[1].school, 'PreElem');
});

test('replaceInSchools treats special characters literally and ignores an empty find', () => {
  const list = [{ id: 'a', name: 'A', school: 'St. Mary (East)', needs: {} }];
  assert.strictEqual(S.replaceInSchools(list, '(East)', 'E', true).students[0].school, 'St. Mary E');
  assert.strictEqual(S.replaceInSchools(list, 'St.', 'Saint', true).students[0].school, 'Saint Mary (East)');
  assert.strictEqual(S.replaceInSchools(list, '  ', 'x', true).changed, 0);
});
