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

  var api = { splitName: splitName, tiers: tiers };
  root.BusApp = root.BusApp || {};
  root.BusApp.nameFit = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
