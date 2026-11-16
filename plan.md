# Bus Seating Chart: Plan

A locally opened, offline-capable web page for placing students into a school bus layout by drag and drop. Plain HTML/CSS/JS, separate files, built test-first. Also deployable to GitHub Pages.

## Constraints

- Works by double-clicking `index.html` (`file://`) and on GitHub Pages.
- Classic `<script>` files only (ES modules are blocked on `file://`). Each file attaches to `window.BusApp` and also sets `module.exports` so Node can test it.
- Relative paths only. No CDN: html2canvas, jsPDF and fonts are vendored locally.
- No build step for the app. Tests run with `node --test` (Node 18+).
- Logic lives in pure, tested modules. UI files only wire logic to the DOM.

## Bus layout

- Front of bus at the top of the screen. **Driver side is left, door side is right.** The door side can be flipped in settings.
- Defaults (whole bus): **driver side 3 per bench, door side 2 per bench.** Row count is a number field (default 10 until the real bus is known).
- Customization: change seats per bench for a side, or override a single bench.
- Markers: driver seat, front door, rear emergency exit.
- Named **bus templates** so a different bus can be saved and loaded later.

### Wheelchair area

- Toggleable on or off. **Off by default**; you turn it on when the bus has one.
- Located at the **very back** of the bus.
- Takes up **at least 2 rows** (configurable upward).
- The **wheelchair door is on the right (door) side at the back.**
- The area **replaces the entire row** (both driver-side and door-side benches) for each of its rows.

## Seat features

Independent toggles per seat, combinable:

- Car seat, 5-star belt (`carSeat`)
- Harness attachment "H", for students with physical needs (`harnessAttachment`). Harness and 5-star are treated as one thing in the notes; the H is kept.

## Students

- CSV import with columns `name,school`. Header row optional. Quotes, blank lines and duplicates handled. Optional extra "needs" columns accepted.
- **Copy prompt button** next to the CSV import: copies a Claude Code prompt (`js/rosterPrompt.js`) that turns a messy roster into this CSV format. The button itself is wired in step 10.
- Needs are set per student in the app: car seat (5-star), harness attachment (H), wheelchair.
- **Wrong-seat warning:** a student who needs a feature gets a red flag when seated in a seat without it, or when a wheelchair student is outside the wheelchair area.
- School is shown on the seat (label and/or color per school).

## Before / After and change reasons

- **Set baseline** button, used by hand.
- Moves after the baseline are diffed against it: moved, added, removed, seat features changed.
- Repeated moves collapse to baseline to current. A move back to the original seat disappears from the list.
- Before/After toggle and a side-by-side view, with changed seats highlighted.
- Reasons are added afterward in the **Change Log** panel, one per change.

## Settings button and popover

- A **Settings** (gear) button in the header opens a popover.
- The popover shows **version number, build date and build time**.
- Source of truth: `js/version.js`, which exports `{ version, buildDate, buildTime }`.
- `scripts/stamp-version.js` rewrites `js/version.js` with the current date and time. The GitHub Action runs it before deploy, and it can be run by hand locally. The version number is read from `package.json` and `CHANGELOG.md` must have a matching entry.
- The popover is also the home for bus setup shortcuts and the door-flip option.

## Export

- Header on every export: **route name, your name, date exported** (editable, defaults to today).
- **PDF (multiple pages):** header, After chart, Before chart (optional checkbox), then the Change Summary table with student, from, to and reason.
- **JPEG:** one image of the chart with the header.
- **CSV:** one row per seat: `route, date, seat, side, row, student, school, car_seat, harness_attachment, wheelchair`.
- **JSON:** full save and load of the whole chart, including baseline and reasons.

## Saving

- Auto-save to `localStorage` on every change.
- JSON save/load as the portable copy.

## Files

```
index.html
plan.md
CHANGELOG.md
package.json
.nojekyll
README.md
css/      styles.css  print.css
js/       version.js  busLayout.js  seatFeatures.js  roster.js  needs.js
          csvParser.js  rosterPrompt.js  changeLog.js  storage.js  exporter.js
          ui.js  dragdrop.js  settingsPopover.js  app.js
vendor/   html2canvas.min.js  jspdf.umd.min.js
fonts/
scripts/  stamp-version.js
tests/    one *.test.js per logic module
.github/workflows/test.yml
```

## Build order (failing test first, then code)

1. `busLayout`: rows, per-side seats, per-bench overrides, door flip, wheelchair area (rear, 2+ rows, right-side door).
2. `seatFeatures`: the three toggles.
3. `roster`: assign, unassign, move, no double-booking, wheelchair rules.
4. `needs`: wrong-seat detection per need type.
5. `csvParser`: header row, quotes, blank lines, duplicates, optional needs columns.
6. `changeLog`: snapshot, diff, reasons, collapse of repeated moves, moves back to baseline.
7. `storage`: serialize/restore, JSON round trip, templates.
8. `version` and `stamp-version.js`: format of date and time, version matches `package.json`.
9. `exporter`: filenames, header text, CSV rows, change-table rows. PDF/JPEG rendering checked manually.
10. UI, drag-and-drop, settings popover and `app.js`.
11. Polish: keyboard alternative to dragging, print styles, empty states, README, GitHub Pages and Action.

## Open items

- Real row count for the actual bus (default 10 until known).
- Number of rows the wheelchair area takes once turned on (minimum 2).
