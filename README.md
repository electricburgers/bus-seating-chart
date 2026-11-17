# Bus Seating Chart

Drag-and-drop seating charts for a school bus. Plain HTML, CSS and JavaScript: no build step, no server, no CDN.

## Use it

- **Locally:** double-click `index.html`. It works from `file://` and offline.
- **Online:** the GitHub Action in `.github/workflows/deploy.yml` tests and deploys to GitHub Pages on every push to `main` (enable Pages with source "GitHub Actions" in the repo settings).

## Workflow

1. **Import students** (`name,school` CSV, header optional). **Copy prompt** gives you a prompt for Claude Code that turns a messy roster into this format.
2. **Seat them**: drag a student onto a seat, or use the keyboard: Enter on a student picks them up, Enter on a seat (or the student list) puts them down, Escape cancels. Dropping on an occupied seat swaps.
3. Toggle seat features (5-star car seat, harness attachment) and set student needs. A red flag marks a student in a seat that doesn't meet their needs.
4. **Set baseline**, then make changes. Use the Before / After / Side by side views and write a reason for each change in the Change Log.
5. **Export** PDF, JPEG, CSV or JSON, or print the page (print styles show just the chart and change log).

The chart auto-saves in your browser (`localStorage`). Use JSON export/load for a portable copy.

## Settings

The gear button holds app preferences: theme, data safety (auto-save status and backup restore), and About (version, build date/time, what's new, and fake sample data).

The **Bus layout** box on the main page holds the bus itself: rows, seats per side, door side flip, the wheelchair area, emergency window exits, single bench overrides and bus templates.

## Development

```
npm test                    # node --test, Node 18+
node scripts/stamp-version.js   # rewrite js/version.js with the current date/time
```

Logic lives in pure, tested modules in `js/` (each sets `window.BusApp.<name>` and `module.exports`); `ui.js`, `dragdrop.js`, `settingsPopover.js` and `app.js` wire them to the DOM. See `plan.md` for the design and `CHANGELOG.md` for history. To release, bump `package.json` and add a matching `CHANGELOG.md` entry.

Vendored libraries (`vendor/`): html2canvas 1.4.1 and jsPDF 2.5.1 (MIT licenses included).
