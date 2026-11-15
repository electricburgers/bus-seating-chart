const test = require('node:test');
const assert = require('node:assert');
const { parse } = require('../js/csvParser.js');

test('header row is optional', () => {
  assert.deepStrictEqual(parse('name,school\nAnn,Oak\nBob,Elm').students.map(s => s.name), ['Ann', 'Bob']);
  assert.deepStrictEqual(parse('Ann,Oak\nBob,Elm').students.map(s => s.name), ['Ann', 'Bob']);
});

test('fields are trimmed; school may be missing', () => {
  const { students } = parse('  Ann , Oak \nBob');
  assert.deepStrictEqual(students[0], { name: 'Ann', school: 'Oak', needs: {} });
  assert.strictEqual(students[1].school, '');
});

test('quotes: commas, escaped quotes, newlines inside fields', () => {
  const { students } = parse('"Smith, Ann","Oak ""Hill"""\n"Bo\nb",Elm');
  assert.strictEqual(students[0].name, 'Smith, Ann');
  assert.strictEqual(students[0].school, 'Oak "Hill"');
  assert.strictEqual(students[1].name, 'Bo\nb');
});

test('CRLF, BOM and blank lines are handled', () => {
  const { students } = parse('﻿name,school\r\n\r\nAnn,Oak\r\n   \r\nBob,Elm\r\n');
  assert.deepStrictEqual(students.map(s => s.name), ['Ann', 'Bob']);
});

test('duplicates (same name and school, case-insensitive) are dropped and reported', () => {
  const r = parse('Ann,Oak\nann , oak\nAnn,Elm');
  assert.strictEqual(r.students.length, 2);
  assert.deepStrictEqual(r.duplicates, [{ line: 2, name: 'ann', school: 'oak' }]);
});

test('rows without a name are skipped with a warning', () => {
  const r = parse('Ann,Oak\n,Elm');
  assert.strictEqual(r.students.length, 1);
  assert.deepStrictEqual(r.errors, [{ line: 2, message: 'Missing name' }]);
});

test('optional needs columns by header, any common spelling', () => {
  const csv = 'name,school,car seat,five_star_belt,Harness Attachment,wheelchair\nAnn,Oak,yes,,x,\nBob,Elm,no,1,,TRUE';
  const { students } = parse(csv);
  assert.deepStrictEqual(students[0].needs, { carSeat: true, harnessAttachment: true });
  assert.deepStrictEqual(students[1].needs, { fiveStarBelt: true, wheelchair: true });
});

test('empty input', () => {
  assert.deepStrictEqual(parse(''), { students: [], duplicates: [], errors: [] });
});

test('a lone header row gives no students', () => {
  assert.strictEqual(parse('name,school').students.length, 0);
});
