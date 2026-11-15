# Changelog

All notable changes to this project are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added (step 11)
- Keyboard alternative to dragging (Enter picks up / puts down, Escape cancels), focusable seats and student list.
- `css/print.css` print styles, empty-state text, `README.md`.
- Vendored `html2canvas` 1.4.1 and `jsPDF` 2.5.1 in `vendor/`, enabling PDF and JPEG export.

### Added
- Step 10: the app itself. `index.html`, `css/styles.css`, `js/ui.js`, `js/dragdrop.js`, `js/settingsPopover.js`, `js/app.js`.
- Drag-and-drop seating (drop on an occupied seat swaps, or sends the occupant back to the list), per-seat feature toggles, per-student needs, wrong-seat flags.
- CSV import with Copy prompt button, baseline, Before/After/side-by-side views, Change Log reasons.
- Settings popover: version and build time, rows, seats per side, door flip, wheelchair area, bench overrides, bus templates.
- CSV and JSON export, JSON load, auto-save. `roster.place()` for the drop rule (tested).

### Planned
- Bus layout with driver side left, door side right (3 seats per bench driver side, 2 door side, both configurable, per-bench overrides).
- Optional wheelchair area (off by default) at the rear, at least 2 full rows (replacing the entire row), with the wheelchair door on the right side.
- Driver, door and rear exit markers.
- Seat toggles: car seat, 5-star seat belt, harness attachment.
- Drag-and-drop student assignment with wrong-seat warnings.
- CSV student import (`name,school`), with a Copy button for a Claude Code prompt that reformats a messy roster.
- Baseline, Before/After view, and change log with reasons.
- Export to PDF (multiple pages), JPEG, CSV and JSON, with route name, your name and export date.
- Settings button with a popover showing version number, build date and build time.
- Auto-save in the browser, bus templates, GitHub Pages deployment.

## [0.2.0] - 2026-11-15 07:28 EST

### Added
- Settings button with popover showing version, build date and build time (planned in `plan.md`).
- Wheelchair area spec: rear of bus, at least 2 full rows, right-side door, off by default.
- Plan for GitHub Pages deployment, offline vendored libraries and fonts, and JSON/CSV/PDF/JPEG export.

## [0.1.0] - 2026-11-15

### Added
- Project plan (`plan.md`) and this changelog.
