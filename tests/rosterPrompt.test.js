const test = require('node:test');
const assert = require('node:assert');
const P = require('../js/rosterPrompt.js');
const CSV = require('../js/csvParser.js');

test('prompt names every column the importer understands', () => {
  ['name', 'school', 'carSeat', 'harnessAttachment', 'wheelchair'].forEach((c) => {
    assert.ok(P.getPrompt().includes(c), c);
  });
});

test('prompt asks for CSV only and keeps the user data out of other output', () => {
  const p = P.getPrompt();
  assert.match(p, /CSV/);
  assert.match(p, /header row/i);
  assert.match(p, /yes/);
});

test('the example in the prompt parses cleanly with the real importer', () => {
  const r = CSV.parse(P.EXAMPLE_CSV);
  assert.deepStrictEqual(r.errors, []);
  assert.deepStrictEqual(r.duplicates, []);
  assert.ok(r.students.length >= 2);
  assert.ok(P.getPrompt().includes(P.EXAMPLE_CSV));
});

test('copyPrompt writes the prompt to the clipboard', async () => {
  let written = null;
  const res = await P.copyPrompt({ writeText: async (t) => { written = t; } });
  assert.deepStrictEqual(res, { ok: true });
  assert.strictEqual(written, P.getPrompt());
});

test('copyPrompt reports failure when the clipboard is missing or blocked', async () => {
  assert.strictEqual((await P.copyPrompt(null)).ok, false);
  const res = await P.copyPrompt({ writeText: async () => { throw new Error('denied'); } });
  assert.strictEqual(res.ok, false);
  assert.match(res.error, /denied/);
});
