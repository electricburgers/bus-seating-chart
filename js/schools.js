(function (root) {
  'use strict';

  // Pure helpers for renaming schools across the whole roster. Students are { id, name, school, needs }.

  function clean(s) { return String(s === undefined || s === null ? '' : s).trim().replace(/\s+/g, ' '); }
  function key(s) { return clean(s).toLowerCase(); }
  function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // Distinct non-empty school names, sorted, with how many students use each. Spelling variants that differ only in case are one school.
  function listSchools(students) {
    var map = {};
    students.forEach(function (s) {
      var k = key(s.school);
      if (!k) return;
      if (!map[k]) map[k] = { name: clean(s.school), count: 0 };
      map[k].count++;
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  // Gives every student at school "from" the school name "to". Returns { students, changed }.
  function renameSchool(students, from, to) {
    var f = key(from), t = clean(to), changed = 0;
    var next = students.map(function (s) {
      if (key(s.school) !== f || s.school === t) return s;
      changed++;
      return Object.assign({}, s, { school: t });
    });
    return { students: next, changed: changed };
  }

  // Replaces text inside every school name, ignoring case ("Elementary" -> "Elem"). Whole-word only when wholeWord is true.
  // Returns { students, changed } where changed counts students whose school text changed.
  function replaceInSchools(students, find, replacement, wholeWord) {
    var needle = clean(find), changed = 0;
    if (!needle) return { students: students, changed: 0 };
    var pattern = escapeRegExp(needle);
    var re = new RegExp(wholeWord ? '(^|[^\\p{L}\\p{N}])' + pattern + '(?![\\p{L}\\p{N}])' : pattern, 'giu');
    var rep = clean(replacement);
    var next = students.map(function (s) {
      var updated = clean(wholeWord
        ? s.school.replace(re, function (m, pre) { return pre + rep; })
        : s.school.replace(re, function () { return rep; }));
      if (updated === s.school) return s;
      changed++;
      return Object.assign({}, s, { school: updated });
    });
    return { students: next, changed: changed };
  }

  var api = { listSchools: listSchools, renameSchool: renameSchool, replaceInSchools: replaceInSchools };
  root.BusApp = root.BusApp || {};
  root.BusApp.schools = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
