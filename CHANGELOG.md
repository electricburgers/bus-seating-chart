# Changelog

All notable changes to this project are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Planned
- Bus layout with driver side left, door side right (3 seats per bench driver side, 2 door side, both configurable, per-bench overrides).
- Optional wheelchair area (off by default) at the rear, at least 2 full rows (replacing the entire row), with the wheelchair door on the right side.
- Driver, door and rear exit markers.
- Seat toggles: car seat (5-star belt), harness attachment (H).
- Drag-and-drop student assignment with wrong-seat warnings.
- CSV student import (`name,school`), with a Copy button for a Claude Code prompt that reformats a messy roster.
- Baseline, Before/After view, and change log with reasons.
- Export to PDF (multiple pages), JPEG, CSV and JSON, with route name, your name and export date.
- Settings button with a popover showing version number, build date and build time.
- Auto-save in the browser, bus templates, GitHub Pages deployment.

## [0.22.0] - 2026-11-16

### Added
- Preferred name or nickname for each student: set when adding a student or edit it in the student list. It shows in quotes beside the name on seat chips and is saved with the chart.

## [0.21.0] - 2026-11-16

### Changed
- Planning notes no longer list 5-star belt separately from the harness; the H harness badge is kept.

## [0.20.0] - 2026-11-16

### Changed
- Build date in Settings > About now reads MMM-DD-YYYY (for example Nov-16-2026).

## [0.19.0] - 2026-11-16

### Added
- Settings now has an About section (version, build date and time in US Eastern time) and a What's new section listing the last three new things and changes.

### Changed
- Build stamp is always US Eastern time. The version line moved from the Settings header into About.

## [0.18.0] - 2026-11-16

### Changed
- PDF/JPEG header is now two larger rows (Route and Driver, then Aide and Date) with bold field names, so it reads at a glance.
- Removed "Prepared by" from the export header and change summary.

## [0.17.0] - 2026-11-16

### Changed
- PDF export is always portrait and sizes the chart as large as possible: margins cut to 18 pt, chart centered, and a wide chart is turned 90 degrees when that fills the page better.
- Driver name field next to Aide; saved with the chart and shown in PDF/JPEG headers and the change summary.
- Removed the Orientation option from export settings.

## [0.16.0] - 2026-11-16 17:50 EST

### Added
- Official seat labels on every seat: the driver side takes the odd numbers (1, 3, 5...) and the door side the even ones (2, 4, 6...), with the letter A at the window. The seat behind the driver is A1 and the seat behind the door is A2. Labels also appear in the student list, change log and PDF.

### Changed
- Default bus layout is now 11 rows (was 10).
- Seats on a shorter bench now line up under their column letter (A stays at the window) instead of sitting against the aisle.

## [0.15.0] - 2026-11-16 17:43 EST

### Added
- Column headers above the seats: A is always the window seat, then B, then C next to the aisle (driver side). Mirrored on the right side so A stays at the window.
- Route fields in the top bar: Route #, AM / PM / Both dropdown, Aide name and Notes. They are saved, undo-safe, and included in the PDF and JPEG export header and the change summary page.

## [0.14.0] - 2026-11-15 12:52 EST

### Added
- Undo and Redo buttons (also Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z) for every seating, roster, layout and feature change.
- Swap mode: click a seat with a student, then another seat, to swap the two students (or move into an empty seat).
- Legend explaining the badges and colors, and a welcome card with first steps when the chart is empty.
- Dark mode, chosen under Settings > Appearance (matches the device by default). Exports and printouts stay light.
- Drag feedback: while moving a student, seats are outlined green (fits), amber (would raise a warning) or blue (swap).
- Export options: paper size (Letter or A4), portrait or landscape, image quality, optional change summary page, and a preview.
- Data safety: a backup of the chart is kept before loading JSON, loading fake data or clearing the roster, with a Restore button under Settings > Data safety. Loading a JSON file now asks before replacing your work.

### Changed
- The yellow bus frame now has red and yellow lights at the back (red outside, yellow inside) instead of wheels.
- The rear emergency exit box is no longer the full width of the bus.

### Fixed
- The emergency window list no longer jumps to the top each time a window is checked.

## [0.13.0] - 2026-11-15 08:54 EST

### Changed
- The harness attachment "H" badge now sits in a rounded square instead of a circle, and the H is bold.

## [0.12.0] - 2026-11-15 08:49 EST

### Added
- "Rename schools" in the Students panel. Rename one school for every student who has it, or replace a whole word in all school names (for example Elementary to Elem), ignoring capital letters.

### Fixed
- The exported chart sheet now shrinks to fit the bus as well as growing, and the bus is laid out as one grid, so no white area covers the yellow bus frame.

## [0.11.0] - 2026-11-15 08:41 EST

### Added
- "Delete student" button on each student in the list, with a confirmation. A seated student's seat is freed. A student who was in the baseline is kept out of sight so the Before chart and change log still show their name.

### Fixed
- Yellow bus frame export no longer lets wide bus layouts spill over the right edge of the frame. The exported sheet now grows to fit the chart.

## [0.10.0] - 2026-11-15 08:40 EST

### Added
- "Add a student" form in the Students panel (name and school) for adding someone without a CSV. Duplicate name and school pairs are rejected.
- The Students panel collapses with a twisty and shows the student count in its header.

### Changed
- Car seat and harness badges sit inside the bottom-right corner of each seat, so it is clear which student they belong to. They may cover part of a long school name.

## [0.9.0] - 2026-11-15 08:34 EST

### Changed
- Car seat and harness badges are now small circles on the bottom-right corner of each seat, so they no longer take space from student names and schools.
- The car seat badge is now a star (★) instead of "C".

## [0.8.0] - 2026-11-15 08:28 EST

### Fixed
- Emergency window EXIT tabs now read "EXIT" upright and sit directly beside their row's outer seat (screen, PDF and JPEG), instead of in far-edge columns. Checked in a rendered PDF.
- Seats are now 96 x 96 px so a two-line name plus school is no longer clipped.

## [0.7.0] - 2026-11-15 08:21 EST

### Fixed
- EXIT labels no longer print upside down or garbled in PDF and JPEG exports, and line up with their row.
- Every seat container is now the same fixed size (96 x 84 px); long names and schools are clamped to two lines.

## [0.6.0] - 2026-11-15 08:15 EST

### Added
- Emergency window exits: Settings has a table to tick which rows have an exit on the driver side and the door side; a red vertical EXIT tab shows on the bus. Saved with JSON and templates.
- Tap-to-move for phones and tablets: tap a student, then tap a seat (a bottom bar offers Back to list and Cancel). Keyboard and mouse drag still work.
- "Finalize change log" button: the in-app Change Log is no longer rebuilt while you move students. Press Finalize to freeze it, and a warning with a Refresh button appears if seating changes afterwards. The PDF change summary uses the finalized log. Saved with JSON and autosave.

### Changed
- Driver and Door labels are larger (18px bold).
- Settings popover is pinned to the top of the screen with a sticky header and close button, and grouped into collapsible sections (Bus setup, Emergency window exits, Single bench override, Bus templates, Try it out).
- PDF and JPEG exports only show the "After (current)" caption when "Include Before chart" is checked.

## [0.5.0] - 2026-11-15 08:04 EST

### Added
- Settings button "Generate fake names, no wheelchair area" for a plain-bus sample.

### Changed
- A 5-star belt is the same as a car seat: the separate 5-star belt feature, need, CSV column and export column are removed. The label is now "Car seat (5-star)". Old saves, templates and CSVs that use the 5-star flag are merged into car seat automatically.

### Fixed
- Phone layout (checked at 360 and 390 px): the page no longer scrolls sideways, seat names no longer break mid-word, the bus scrolls inside its own box, and the student list is height-limited on small screens.

## [0.4.0] - 2026-11-15 07:53 EST

### Changed
- Mobile layout: stacked header fields, full-width settings popover, larger touch targets, smaller seats and horizontally scrollable bus view on narrow screens.
- WCAG AA: darker borders (3:1 non-text contrast), darker hint, aisle and empty-seat text (4.5:1), seat toggles at least 24x24 px, seated students no longer rely on reduced opacity, changed seats also get a double border (not colour alone), reduced-motion support.

## [0.3.0] - 2026-11-15 07:51 EST

### Added
- Settings button "Generate fake names and layout": a made-up 11-row bus with wheelchair area, 34 students, a baseline and a few moves with sample reasons, for previewing exports (`js/sampleData.js`, tested).
- Optional "Yellow bus frame" checkbox: wraps PDF and JPEG chart exports in a yellow school-bus outline with wheels.
- Keyboard alternative to dragging (Enter picks up / puts down, Escape cancels), focusable seats and student list.
- `css/print.css` print styles, empty-state text, `README.md`.
- Vendored `html2canvas` 1.4.1 and `jsPDF` 2.5.1 in `vendor/`, enabling PDF and JPEG export.
- Step 10: the app itself. `index.html`, `css/styles.css`, `js/ui.js`, `js/dragdrop.js`, `js/settingsPopover.js`, `js/app.js`.
- Drag-and-drop seating (drop on an occupied seat swaps, or sends the occupant back to the list), per-seat feature toggles, per-student needs, wrong-seat flags.
- CSV import with Copy prompt button, baseline, Before/After/side-by-side views, Change Log reasons.
- Settings popover: version and build time, rows, seats per side, door flip, wheelchair area, bench overrides, bus templates.
- CSV and JSON export, JSON load, auto-save. `roster.place()` for the drop rule (tested).

## [0.2.0] - 2026-11-15 07:28 EST

### Added
- Settings button with popover showing version, build date and build time (planned in `plan.md`).
- Wheelchair area spec: rear of bus, at least 2 full rows, right-side door, off by default.
- Plan for GitHub Pages deployment, offline vendored libraries and fonts, and JSON/CSV/PDF/JPEG export.

## [0.1.0] - 2026-11-15

### Added
- Project plan (`plan.md`) and this changelog.
