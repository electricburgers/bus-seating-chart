(function (root) {
  'use strict';

  // A ready-made Claude Code prompt the user pastes next to a messy roster
  // (spreadsheet paste, PDF text, email list...) to get CSV this app can import.
  // The header and values must stay in sync with js/csvParser.js.
  var EXAMPLE_CSV = [
    'name,school,carSeat,harnessAttachment,wheelchair',
    'Ann Lee,Oak Elementary,yes,,,',
    '"Smith, Bob",Elm Middle,,,,yes'
  ].join('\n');

  var PROMPT = [
    'Convert the student roster I give you into a CSV file for my bus seating chart app.',
    '',
    'Output format:',
    '- Plain CSV, UTF-8, one student per line. Write it to a file named roster.csv.',
    '- Start with this header row, exactly: name,school,carSeat,harnessAttachment,wheelchair',
    '- name: the student\'s full name as "First Last" (convert "Last, First" if needed). Fix obvious capitalization problems and extra spaces. Wrap the field in double quotes if it contains a comma.',
    '- school: the student\'s school. Leave it empty if the roster does not say.',
    '- carSeat, harnessAttachment, wheelchair: write yes if the roster says the student needs it, otherwise leave the cell empty.',
    '',
    'Rules:',
    '- Do not invent data. If something is unclear, leave the cell empty and list it for me afterward.',
    '- Skip blank lines, page headers and totals. Remove exact duplicates (same name and school) and tell me which ones you removed.',
    '- After writing the file, tell me how many students are in it and list anything you were unsure about.',
    '',
    'Example of the expected format:',
    '',
    EXAMPLE_CSV,
    '',
    'Here is the roster:',
    ''
  ].join('\n');

  function getPrompt() { return PROMPT; }

  // clipboard: navigator.clipboard, or a stand-in in tests.
  function copyPrompt(clipboard) {
    if (!clipboard || typeof clipboard.writeText !== 'function') {
      return Promise.resolve({ ok: false, error: 'clipboard is not available' });
    }
    return Promise.resolve().then(function () { return clipboard.writeText(PROMPT); })
      .then(function () { return { ok: true }; },
        function (e) { return { ok: false, error: e && e.message ? e.message : String(e) }; });
  }

  var api = { EXAMPLE_CSV: EXAMPLE_CSV, getPrompt: getPrompt, copyPrompt: copyPrompt };
  root.BusApp = root.BusApp || {};
  root.BusApp.rosterPrompt = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
