(function (root) {
  'use strict';

  var TRUE_VALUES = ['true', 'yes', 'y', 'x', '1'];
  var COLUMN_KEYS = {
    name: 'name', school: 'school',
    carseat: 'carSeat', fivestarbelt: 'fiveStarBelt', fivestarseatbelt: 'fiveStarBelt',
    harnessattachment: 'harnessAttachment', harness: 'harnessAttachment', wheelchair: 'wheelchair'
  };

  // RFC 4180 style: quoted fields may hold commas, doubled quotes and newlines.
  // Returns [{ line, cells }], where line is the 1-based line the row started on.
  function splitRows(text) {
    var rows = [], cells = [], cell = '', inQuotes = false, line = 1, start = 1, i = 0;
    function endCell() { cells.push(cell); cell = ''; }
    function endRow() { endCell(); rows.push({ line: start, cells: cells }); cells = []; start = line; }
    for (; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
        } else { if (c === '\n') line++; cell += c; }
      } else if (c === '"') inQuotes = true;
      else if (c === ',') endCell();
      else if (c === '\r') { if (text[i + 1] === '\n') i++; line++; endRow(); }
      else if (c === '\n') { line++; endRow(); }
      else cell += c;
    }
    if (cell !== '' || cells.length) endRow();
    return rows;
  }

  function normalizeKey(h) { return h.toLowerCase().replace(/[^a-z]/g, ''); }

  function parse(text) {
    var result = { students: [], duplicates: [], errors: [] };
    var rows = splitRows(String(text).replace(/^﻿/, '')).filter(function (r) {
      return r.cells.some(function (c) { return c.trim() !== ''; });
    });
    if (!rows.length) return result;

    var columns = ['name', 'school'];
    if (normalizeKey(rows[0].cells[0]) === 'name') {
      columns = rows.shift().cells.map(function (h) { return COLUMN_KEYS[normalizeKey(h)] || null; });
    }

    var seen = {};
    rows.forEach(function (row) {
      var rec = { name: '', school: '', needs: {} };
      columns.forEach(function (key, i) {
        var v = (row.cells[i] || '').trim();
        if (!key) return;
        if (key === 'name' || key === 'school') rec[key] = v;
        else if (TRUE_VALUES.indexOf(v.toLowerCase()) >= 0) rec.needs[key] = true;
      });
      if (!rec.name) { result.errors.push({ line: row.line, message: 'Missing name' }); return; }
      var id = rec.name.toLowerCase() + '\u0000' + rec.school.toLowerCase();
      if (seen[id]) {
        result.duplicates.push({ line: row.line, name: rec.name.toLowerCase(), school: rec.school.toLowerCase() });
        return;
      }
      seen[id] = true;
      result.students.push(rec);
    });
    return result;
  }

  var api = { parse: parse };
  root.BusApp = root.BusApp || {};
  root.BusApp.csvParser = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
