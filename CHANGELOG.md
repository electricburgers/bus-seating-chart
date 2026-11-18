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

## [0.57.0] - 2026-11-18

### Added
- Settings > About shows a Hard refresh button when a newer version is deployed. It clears cached app files and reloads, and keeps the saved chart.

## [0.56.0] - 2026-11-18

### Fixed
- When empty rows shrink, the EXIT tabs, row numbers and row count labels now line up exactly with the shrunken rows.

## [0.55.0] - 2026-11-18

### Added
- Export options has a Page setting, Portrait or Landscape, that sets the PDF page orientation.

## [0.54.0] - 2026-11-18

### Fixed
- PDF export no longer turns the chart sideways, so the PDF matches the portrait Preview.

## [0.53.0] - 2026-11-18

### Changed
- PDF and Preview exports now stretch the rows that have students, and grow the text with them, to fill the page space freed by shrinking empty rows.

## [0.52.0] - 2026-11-18

### Changed
- A student with a nickname shows the nickname big in place of the first name (also in first-names-only mode). The real first name shrinks like a middle name: small type, then an initial, then off.

## [0.51.0] - 2026-11-18

### Added
- Export and Import buttons for bus templates (JSON file), so a template can move between computers.
- Middle names are shown in smaller type, then shrink to initials, then drop off, before the first or last name has to shrink.

## [0.50.0] - 2026-11-18

### Added
- CSV export has nickname and stop columns.

### Fixed
- The stop badge in the student list was far too big; it is now a small corner mark.
- Nicknames on seats could be squeezed out of the chart and exports.

## [0.49.0] - 2026-11-18

### Added
- Update button next to a saved bus template re-saves the current bus and look over it.
- "Start new charts from this template" checkbox sets a default template that a brand-new chart loads automatically.

## [0.48.0] - 2026-11-18

### Added
- Bus templates also save fonts and text sizes, text positions, Rear at top, seat width, and Save export row options; loading a template restores them.
- Preview export button in the top toolbar.

## [0.47.0] - 2026-11-17

### Changed
- The Text sizes menu is now "Text and labels", split into Names, Seat numbers, Stop number, and Driver and door labels groups with a tidy two-column layout.
- What's new in Settings > About lists the last three versions, each with its own changes.

## [0.46.0] - 2026-11-17

### Added
- A First names only checkbox in Save and export. Seats show just the first name, big, and add the last initial only when two seated students share a first name.

### Changed
- Settings is shorter: Appearance, Data safety and About. About now also holds What's new and the fake sample data buttons.
- Bus setup, Emergency window exits, Single bench override and Bus templates moved out of Settings into a Bus layout box on the main page, next to the chart they change.
- The onboarding Bus setup button opens the Bus layout box.
- The first name on a seat is about 1.7 times larger and extra bold, with the last name smaller beneath it, so it can be read on a moving bus.
- First names use a heavy font (Arial Black where available) and the seat ID in exports is smaller and quieter, so the name is the loudest thing in the seat.
- When every seated student goes to the same school, exports leave off the school line.
- The car seat star and harness H sit at the bottom right in the school line, and the school name leaves room for them, so they no longer cover the stop number.

## [0.45.0] - 2026-11-17

### Added
- A Shrink empty rows checkbox in Save and export (on by default). Rows with no students shrink to a thin strip that keeps the seat and row IDs, so the chart is shorter and prints larger.

### Changed
- In exports the seat ID sits inside the seat box and rows sit closer together.
- Grayscale and black and white exports drop the seat boxes for thin lines between seats, so names get more room.
- Names that do not fit now shorten the last name to an initial first ("Maximilian N."). The first name is only shortened after that.

## [0.44.0] - 2026-11-17

### Changed
- The export legend always sits to the right of the route and aide at the top, saving horizontal room for the chart.

## [0.43.0] - 2026-11-17

### Added
- An Aisle space slider (0 to 60 px, saved in the browser) sets the room on each side of the row number between the seat columns.

### Fixed
- More padding by default between the two sides of seats, so the aisle row number is no longer cramped.

## [0.42.0] - 2026-11-17

### Added
- A Show legend checkbox in Save and export. Turn it off to leave the legend out of the Preview, JPEG, PDF and PDF view. It is on by default.

### Changed
- The export legend moves to the top, under the driver info, when the chart is wider than tall.

## [0.41.0] - 2026-11-17

### Fixed
- The row number in the aisle between the two sides of seats is always visible now. The aisle column keeps a minimum width and sits above the seats so they can no longer cover it.

## [0.40.0] - 2026-11-17

### Changed
- What's new is now the first section in Settings and opens expanded every time Settings is opened. Its text lists the latest changes.
- The PDF, JPEG and PDF view header (route, driver, aide, date) is centered with the fields closer together instead of pushed to the far edges.

## [0.39.0] - 2026-11-17

### Fixed
- The stop number badge was missing from the export Preview, JPEG and PDF in every shape and corner. The export capture bakes an element's computed style into a standalone image, and a badge that was itself absolutely positioned was shifted out of view. The positioned part is now a wrapper and the SVG inside stays static. Checked by running the real export in headless Chrome.

## [0.38.0] - 2026-11-17

### Fixed
- The stop number moved to a top or right corner now shows in that corner in the export Preview, JPEG and PDF. The corner is stored on the badge itself, because the capture library works on a copy of the page that does not have the page's root settings.
- Text size, seat width and stop size settings are now carried onto the export sheet for the same reason, so the export matches the page.

## [0.37.0] - 2026-11-17

### Added
- PDF view in the View group: shows the chart on the page exactly as the PDF is built (same header, legend, frame, color mode and Before option), so what you see matches the export. It is not editable; switch back to After to move students.

### Changed
- The export sheet is now built by one shared function that both the PDF view and the Preview, JPEG and PDF exports use.

## [0.36.0] - 2026-11-17

### Fixed
- Stop shapes (circles especially) were clipped at the edge in the export Preview, JPEG and PDF. The badge now has a padded viewBox so the outline always fits, with a test that checks every shape fits.
- The export legend now shows the chosen stop shape instead of always showing a triangle.

## [0.35.0] - 2026-11-17

### Fixed
- The stop number shape now shows in the export Preview, JPEG and PDF. Its colors and sizes are copied onto the SVG before the chart is captured, because the capture library ignored the stylesheet.

## [0.34.0] - 2026-11-17

### Added
- Text sizes menu has Driver label column and Door label column options. The Driver and Door words slide to sit over the chosen seat column (A, B, C, D or the aisle seat), or under it when the rear is at the top. Applies to the web view and exports.

## [0.33.0] - 2026-11-17

### Added
- Text sizes menu has Stop shape (triangle, circle, square, squircle) and Stop corner (bottom left, bottom right, top left, top right) options for the stop number, which apply to the web view and exports.

## [0.32.0] - 2026-11-17

### Added
- Orientation setting (Front at top / Rear at top). Rear at top turns the chart half a turn so the rear emergency exit is at the top and the driver and door are at the bottom, as the aide and driver see the students. Applies to the web view and exports, and is remembered in the browser.
- Exported PDF and JPEG charts print a legend on the right side listing only what appears on that chart.

### Changed
- Text sizes are now sliders with a live px value instead of dropdowns.

## [0.31.0] - 2026-11-17

### Added
- Bus stop number: each student can have a stop number (up to 3 characters), set in the student list. It shows in a triangle at the bottom left of the seat, above the school name.
- Text sizes menu has Stop triangle and Stop number size options, which apply to the web view and exports.

## [0.30.0] - 2026-11-16

### Changed
- Faster rendering: student-to-seat lookups are built once per render instead of scanning every seat per student (O(students x seats) to O(students + seats)).
- Valid seat ids and seat labels are cached per layout instead of being rebuilt on every drop or change-log row.
- Seat names are fitted in batches (all writes, then all reads) so the browser lays out the page a few times instead of once per seat.
- Seat list building and the drag "fits" outline no longer rebuild the student map for every seat.

## [0.29.0] - 2026-11-16

### Changed
- Header: title and Settings on one row, route fields below with small labels above each input.
- Toolbar grouped into labeled sections (View, Seat width, Edit, Baseline).
- The five text size dropdowns moved into one tidy "Text sizes" menu.

## [0.28.0] - 2026-11-16

### Added
- Column header size dropdown (A B C) and Row number size dropdown (1 2 3 4), applied web view exports.

### Changed
- Row id size dropdown renamed Seat id size, now only affects seat ids (A1, A2, etc.).

## [0.27.0] - 2026-11-16

### Added
- Row id size dropdown (Small to Extra large) for row numbers and seat ids, applied to the web view and exports.

### Changed
- Student first name is always on its own line in a seat, even in Extra wide.
- Student name sits a little lower in the seat, clear of the seat id (A1, A2, etc.).

## [0.26.0] - 2026-11-16

### Added

- Row numbers along both window sides of each row, odd numbers on the driver side and even numbers on the door side, to match the official handwritten sheet.

## [0.25.1] - 2026-11-16

### Changed

- Car seat and harness (H) badges now sit at the bottom right of the seat, just above the school name.
- Row numbers and seat ids are a little bigger.

## [0.25.0] - 2026-11-16

### Added

- Separate font size dropdowns for student name and school name above the chart. The choices are remembered and apply to the web view and to exports.

## [0.24.0] - 2026-11-16

### Added

- Seat width buttons (Compact, Wide, Extra wide) above the chart. The choice is remembered and applies to the web view and to exports.
- Export color setting: Color, Grayscale, or Black and white (no tints, black on white) for printing or emailing.

### Changed

- Student's school now sits at the bottom of the seat in larger bold text with a rule above it, so it reads the same in color, gray and black and white.
- Seats are taller (116px) and the car seat and harness badges sit on the top edge of the seat, out of the school line.
- Harness H badge is larger (32px) and the rear emergency exit label is bigger (14px).

## [0.23.0] - 2026-11-16

### Changed

- Long student names fit their seat: text shrinks first, then first name is shortened (Maxim. Nguyen, Max. Nguyen, M. Nguyen). Last name always shown in full. Full name appears on hover.
- Exported chart is wider (150px seats instead of 96px) so more characters fit.

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
