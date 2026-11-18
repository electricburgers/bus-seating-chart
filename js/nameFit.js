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

  // "Mary Jane Watson" -> given "Mary", middle "Jane", last "Watson". Names without a middle name have middle ''.
  function splitParts(name) {
    var p = splitName(name), words = p.first.split(' ').filter(Boolean);
    return { given: words[0] || '', middle: words.slice(1).join(' '), last: p.last };
  }
  function middleInitials(middle) {
    return middle.split(' ').filter(Boolean).map(function (w) { return Array.from(w)[0] + '.'; }).join(' ');
  }

  function shorten(first, n) {
    var chars = Array.from(first);
    return chars.length <= n ? first : chars.slice(0, n).join('') + '.';
  }

  // Tiers from roomiest to tightest. Each is { text, size } where size is a font-size in px, or null for the normal size.
  // A name with a middle name keeps it in small type: full middle, then middle initials, then the usual size steps, then no middle name.
  // Tiers then carry a `middle` field and `text` holds only the first and last name.
  // With a nickname, the nickname takes the big first-name line and the real first (and middle) names shrink like a middle name.
  function tiers(name, smallSize, floorSize, nickname) {
    var parts = splitParts(name);
    var nick = String(nickname || '').trim();
    if (nick) {
      if (!parts.given || !parts.last) return plainTiers(nick, smallSize, floorSize);
      parts = { given: nick, middle: (parts.given + ' ' + parts.middle).trim(), last: parts.last };
    }
    if (parts.middle && parts.last) {
      var base = plainTiers(parts.given + ' ' + parts.last, smallSize, floorSize), ini = middleInitials(parts.middle);
      function withMid(t, m) { return { text: t.text, size: t.size, middle: m }; }
      return [withMid(base[0], parts.middle), withMid(base[0], ini), withMid(base[1], ini), withMid(base[2], ini), withMid(base[2], '')]
        .concat(base.slice(3));
    }
    return plainTiers(name, smallSize, floorSize);
  }

  function plainTiers(name, smallSize, floorSize) {
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

  // Maps each name to its first name, plus a last initial (e.g. "N.") only for first names that appear more than once (or for everyone when allInitials is set).
  function firstOnlyLabels(names, allInitials) {
    var count = {};
    var parts = names.map(function (n) { var p = splitName(n); var f = p.first || p.last; count[f.toLowerCase()] = (count[f.toLowerCase()] || 0) + 1; return { f: f, p: p }; });
    return parts.map(function (x) {
      var dup = (allInitials || count[x.f.toLowerCase()] > 1) && x.p.first && x.p.last;
      return { first: x.f, initial: dup ? Array.from(x.p.last)[0] + '.' : '' };
    });
  }

  var api = { splitName: splitName, splitParts: splitParts, middleInitials: middleInitials, tiers: tiers, firstTiers: firstTiers, firstOnlyLabels: firstOnlyLabels };
  root.BusApp = root.BusApp || {};
  root.BusApp.nameFit = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
