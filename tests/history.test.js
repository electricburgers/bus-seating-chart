const test = require('node:test');
const assert = require('node:assert');
const H = require('../js/history.js');

test('push, undo and redo walk through states', () => {
  let h = H.create('a');
  assert.ok(!H.canUndo(h) && !H.canRedo(h));
  h = H.push(H.push(h, 'b'), 'c');
  assert.strictEqual(h.present, 'c');
  h = H.undo(h);
  assert.strictEqual(h.present, 'b');
  assert.ok(H.canRedo(h));
  h = H.redo(h);
  assert.strictEqual(h.present, 'c');
});

test('identical state is not recorded', () => {
  const h = H.create('a');
  assert.strictEqual(H.push(h, 'a'), h);
});

test('a new edit clears redo', () => {
  let h = H.push(H.push(H.create('a'), 'b'), 'c');
  h = H.push(H.undo(h), 'x');
  assert.ok(!H.canRedo(h));
  assert.strictEqual(H.undo(h).present, 'b');
});

test('undo and redo at the ends do nothing', () => {
  const h = H.create('a');
  assert.strictEqual(H.undo(h), h);
  assert.strictEqual(H.redo(h), h);
});

test('limit drops the oldest states', () => {
  let h = H.create(0, 3);
  for (let i = 1; i <= 6; i++) h = H.push(h, i);
  assert.strictEqual(h.past.length, 3);
  assert.deepStrictEqual(h.past, [3, 4, 5]);
});
