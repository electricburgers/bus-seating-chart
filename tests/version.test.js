const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const St = require('../scripts/stamp-version.js');

const ROOT = path.join(__dirname, '..');
const when = new Date('2026-11-15T12:28:05Z');

test('formatDate is MMM-DD-YYYY in the given time zone', () => {
  assert.strictEqual(St.formatDate(when, 'America/New_York'), 'Nov-15-2026');
  assert.strictEqual(St.formatDate(new Date('2026-11-16T03:30:00Z'), 'America/New_York'), 'Nov-15-2026');
  assert.strictEqual(St.formatDate(new Date('2026-03-05T09:00:00Z'), 'UTC'), 'Mar-05-2026');
});

test('formatTime is 24-hour HH:MM plus the zone abbreviation', () => {
  assert.strictEqual(St.formatTime(when, 'America/New_York'), '07:28 EST');
  assert.strictEqual(St.formatTime(new Date('2026-07-01T00:05:00Z'), 'UTC'), '00:05 UTC');
});

test('buildSource makes a classic script that sets BusApp.version and module.exports', () => {
  const src = St.buildSource('1.2.3', when, 'UTC');
  const sandbox = { window: {}, module: { exports: {} } };
  new Function('window', 'module', src)(sandbox.window, sandbox.module);
  const expected = { version: '1.2.3', buildDate: 'Nov-15-2026', buildTime: '12:28 UTC' };
  assert.deepStrictEqual(sandbox.module.exports, expected);
  assert.deepStrictEqual(sandbox.window.BusApp.version, expected);
});

test('changelog check finds a matching version entry', () => {
  const log = '## [Unreleased]\n\n## [0.2.0] - 2026-11-15 07:28 EST\n\n## [0.1.0] - 2026-11-15\n';
  assert.strictEqual(St.hasChangelogEntry(log, '0.2.0'), true);
  assert.strictEqual(St.hasChangelogEntry(log, '0.1.0'), true);
  assert.strictEqual(St.hasChangelogEntry(log, '0.3.0'), false);
  assert.strictEqual(St.hasChangelogEntry(log, '0.2'), false);
});

function tmpProject(version, changelog) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-'));
  fs.mkdirSync(path.join(dir, 'js'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version }));
  fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), changelog);
  return dir;
}

test('stamp writes js/version.js using the package.json version', () => {
  const dir = tmpProject('0.4.0', '## [0.4.0] - 2026-01-01\n');
  const out = St.stamp({ root: dir, now: when, timeZone: 'UTC' });
  assert.deepStrictEqual(out, { version: '0.4.0', buildDate: 'Nov-15-2026', buildTime: '12:28 UTC' });
  assert.deepStrictEqual(require(path.join(dir, 'js', 'version.js')), out);
});

test('stamp refuses when CHANGELOG.md has no entry for the version, and writes nothing', () => {
  const dir = tmpProject('0.5.0', '## [0.4.0] - 2026-01-01\n');
  assert.throws(() => St.stamp({ root: dir, now: when }), /CHANGELOG\.md.*0\.5\.0/);
  assert.strictEqual(fs.existsSync(path.join(dir, 'js', 'version.js')), false);
});

test('the committed js/version.js matches package.json and the formats', () => {
  const v = require('../js/version.js');
  assert.strictEqual(v.version, require('../package.json').version);
  assert.match(v.buildDate, /^[A-Z][a-z]{2}-\d{2}-\d{4}$/);
  assert.match(v.buildTime, /^\d{2}:\d{2} [A-Z0-9+-]+$/);
  assert.strictEqual(St.hasChangelogEntry(fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8'), v.version), true);
});

test("What's new lists the current version first, then up to two earlier ones", () => {
  const { WHATS_NEW } = require('../js/settingsPopover.js');
  const pkg = require('../package.json');
  assert.strictEqual(WHATS_NEW[0].version, pkg.version);
  assert.strictEqual(WHATS_NEW.length, 3);
});
