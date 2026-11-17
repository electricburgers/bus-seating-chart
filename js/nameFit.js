(function (root) {
  'use strict';

  // Pure helpers for fitting a student name in a seat. ui.js measures the real text and walks the tiers.
  // First name is what the aide needs most, so it is kept whole as long as possible: the last name drops to an initial first.

  // "Ava Nguyen" or "Nguyen, Ava". Everything before the last word is the first name.
  function splitName(name) {
    var s = String(name || '').trim().replace(/\s+/g, ' ');
    var comma = s.indexOf(',');
    if (comma > 0) return { first: s.slice(comma + 1).trim(), last: s.slice(0, comma).trim() };
    var i = s.lastIndexOf(' ');
    if (i < 0) return { first: '', last: s };
    return { first: s.slice(0, i), last: s.slice(i + 1) };
  }

  function shorten(first, n) {
    var chars = Array.from(first);
    return chars.length <= n ? first : chars.slice(0, n).join('') + '.';
  }

  // Tiers from roomiest to tightest. Each is { text, size } where size is a font-size in px, or null for the normal size.
  function tiers(name, smallSize, floorSize) {
    var p = splitName(name);
    var full = p.first ? p.first + ' ' + p.last : p.last;
    var out = [{ text: full, size: null }, { text: full, size: smallSize }, { text: full, size: floorSize }];
    if (p.first && p.last) {
      var initial = Array.from(p.last)[0] + '.';
      out.push({ text: p.first + ' ' + initial, size: floorSize });
      var chars = Array.from(p.first);
      [8, 5].forEach(function (n) {
        if (chars.length > n) out.push({ text: shorten(p.first, n) + ' ' + initial, size: floorSize });
      });
    }
    return out;
  }

  // First-names-only mode: just the first name (plus the last initial when two seated students share a first name).
  // Smaller text first, then a shortened first name. A trailing initial like "N." is never dropped.
  function firstTiers(first, initial, smallSize, floorSize) {
    var tail = initial ? ' ' + initial : '';
    var out = [{ text: first + tail, size: null }, { text: first + tail, size: smallSize }, { text: first + tail, size: floorSize }];
    var chars = Array.from(first);
    [8, 5].forEach(function (n) { if (chars.length > n) out.push({ text: shorten(first, n) + tail, size: floorSize }); });
    return out;
  }

  // Maps each name to its first name, plus a last initial (e.g. "N.") only for first names that appear more than once.
  function firstOnlyLabels(names) {
    var count = {};
    var parts = names.map(function (n) { var p = splitName(n); var f = p.first || p.last; count[f.toLowerCase()] = (count[f.toLowerCase()] || 0) + 1; return { f: f, p: p }; });
    return parts.map(function (x) {
      var dup = count[x.f.toLowerCase()] > 1 && x.p.first && x.p.last;
      return { first: x.f, initial: dup ? Array.from(x.p.last)[0] + '.' : '' };
    });
  }

  var api = { splitName: splitName, tiers: tiers, firstTiers: firstTiers, firstOnlyLabels: firstOnlyLabels };
  root.BusApp = root.BusApp || {};
  root.BusApp.nameFit = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
