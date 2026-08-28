# LanyardStudio

LanyardStudio is an open-source, browser-based name badge designer that connects CSV data to reusable layouts and exports print-ready PDFs at true physical size.

[Open the web app](https://lanyard-studio.com/) · [GitHub repository](https://github.com/EunHyeokJung/lanyardstudio) · [Download the latest release](https://github.com/EunHyeokJung/lanyardstudio/releases/latest) · [한국어 README](README.md)

![LanyardStudio preview](public/og.png)

## Features

- Millimeter-based layouts for lanyard badges, ID cards, and folded A4 table tents
- Text, variables, images/SVG, shapes, QR codes, and multi-logo brand bars
- Multi-selection, groups, copy/paste, resize handles, magnetic alignment, and layer controls
- CSV and table editing with row selection, bulk deletion, reordering, and variable renaming
- Paginated print previews and true-size PDFs with outlines and crop marks
- Saved-project lists, renaming, autosave, and JSON backup/restore
- Mobile property sheets and tablet side panels
- Eight-language UI and sample data, plus an installable PWA

Uploaded images and CSV data, project storage, and PDF generation are processed in your browser, not by an application server. Optional GA4 visitor analytics can be enabled separately at build time.

## What's new in v1.8.0

- Fixed the half-open mobile inspector so its last controls can scroll above the bottom navigation.
- Localized landing design, roster, print, and preset-card samples for all eight languages.
- Made square and portrait brand-bar logos fit proportionally instead of cropping by default.
- Improved element copy/paste and image paste from other applications.
- Added roster row selection, bulk deletion, and drag-handle reordering; standardized button and navigation alignment.

See the [changelog](CHANGELOG.md) and [v1.8.0 release](https://github.com/EunHyeokJung/lanyardstudio/releases/tag/v1.8.0).

## Workflow

### 1. Choose a size

Select a preset, then press **Create with this size**. Use **Enter a custom size** for another format; dimensions remain editable afterward.

| Preset | Design dimensions |
| --- | --- |
| Large lanyard badge | 95 × 123 mm |
| A7 event badge | 74 × 105 mm |
| B7 conference pass | 91 × 128 mm |
| Employee / ID card | 85.6 × 54 mm |
| A4 folded table tent | 297 × 105 mm per face, folded from one landscape A4 sheet |
| Landscape name badge | 90 × 60 mm |

Preset cards include product examples. Verify the holder's insert dimensions, not just its outer dimensions, before purchasing.

### 2. Design

- **Elements:** heading/body/caption text, rectangles, ellipses, lines, PNG/JPEG/WebP/SVG, and QR codes from links or text.
- **Typography:** font family presets, size, weight, color, and paragraph alignment. Variable text appears as `{{Name}}` in the editor and resolves to roster values in print output.
- **Placement:** dragging, resize handles, rotation, opacity, millimeter coordinates, safe areas, horizontal/vertical centering, and magnetic guides. Elements can extend partly beyond the badge boundary.
- **Groups and layers:** Ctrl/Cmd/Shift-click to select multiple elements, then group or ungroup from the context menu. Rename, reorder, hide, lock, duplicate, or delete elements.
- **Variables:** inspect connected text elements, rename fields, and add a variable directly to the canvas.
- **Brand bars:** import several logos, crop/zoom or reorder each, then distribute them horizontally or vertically. Adjust the whole bar's position, size, background, padding, and gaps. Logos fit with their aspect ratio preserved by default.

Selecting an element opens its properties. Tablet layouts use a side panel; mobile layouts use a handle-controlled collapsed, half-open, or expanded bottom sheet.

### 3. Connect a roster

Upload a CSV or edit the table. Each row is a person; column names are the variables used by the design.

- Add rows along the bottom and variables at the table's right edge.
- Select rows with checkboxes and delete them in bulk.
- Reorder rows with drag handles, or focus a handle and use the up/down arrow keys.
- Undo and redo roster edits.
- Use **Fill sample data** to load the current language's examples. This replaces the current roster; back up important data first.

Example CSV:

```csv
Name,Team,Role
Alex Morgan,Brand,Designer
Jordan Lee,Product,Product Manager
```

### 4. Preview and print

Choose A3, A4, Letter, or custom paper, then set orientation and horizontal/vertical gaps. Badges are centered automatically. Use previous/next controls to inspect every preview page, toggle outlines and crop marks separately, and export at 150, 300, or 600 DPI. Folded A4 table tents place matching names on both faces.

Print using **Actual Size / 100%**. Printer margins vary; test one sheet before a large print run.

## Projects and keyboard shortcuts

Open saved projects from the landing start menu. Project names are editable in the saved-project list and editor header. Autosave uses IndexedDB with a localStorage fallback. **Backup** exports a `.lanyardstudio.json` file with the design, images, and roster; **Load** restores it.

Storage belongs to the current browser and site origin. It does not automatically sync across browsers, devices, or domains and can be lost when site data is cleared. Keep JSON backups for important projects.

| Action | Shortcut |
| --- | --- |
| Undo | Ctrl/Cmd + Z |
| Redo | Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y |
| Copy / paste selected elements | Ctrl/Cmd + C / V |
| Paste external image data | Ctrl/Cmd + V |
| Delete selected elements | Backspace or Delete |
| Move elements | Arrow keys: 0.5 mm; Shift + arrow: 2 mm |
| Multi-select | Ctrl/Cmd/Shift + click |

Element shortcuts apply in the design workspace. Ordinary text-field copy/paste remains available. External image paste depends on the clipboard formats supplied by the source application and browser.

## Install the app

Open the [LanyardStudio web app](https://lanyard-studio.com/) in Chrome, Edge, or Safari. Use **Install app** in the header, or choose **Install app** / **Add to Home Screen** from the browser menu.

Supported languages: Korean, English, Japanese, Simplified Chinese, Traditional Chinese, Spanish, French, and German. Landing examples, new-project rosters, and **Fill sample data** use the selected language. Changing the UI locale does not rewrite an existing project's CSV headers, roster values, or canvas text. Missing translations fall back to English.

### Release downloads

The [latest release](https://github.com/EunHyeokJung/lanyardstudio/releases/latest) includes source archives and `lanyardstudio-v1.8.0-web.zip`, a static build containing `web/` and hosting instructions. The downloadable build does not include the production owner's GA measurement ID.

Distribution is currently a PWA and static web build, not a native `.dmg`, `.exe`, or `.apk` installer. Serve the ZIP through HTTP/HTTPS instead of opening `index.html` with `file://`. See [static-build instructions](docs/STATIC_BUILD.md).

## Local development

Requirements: Node.js 22.13 or later and npm 10 or later.

```bash
git clone https://github.com/EunHyeokJung/lanyardstudio.git
cd lanyardstudio
npm ci
npm run dev
```

Useful commands:

```bash
npm run lint
npm run typecheck
npm test
npm run check
npm run build
npm run build:pages
npm run build:cloudflare-pages
npm run start
```

## Limits

| Item | Limit |
| --- | --- |
| Images | PNG, JPEG, WebP, SVG; 10 MB per file |
| Brand bar | 24 logos per element; 24 MB combined image data per bar |
| Canvas elements | 200 per project |
| CSV | UTF-8 recommended; 5 MB, 500 rows, 50 columns |
| Project import | `.lanyardstudio.json`; 30 MB |
| PDF resolution | 150, 300, or 600 DPI |

## Deployment

The official deployment is a static Next.js export published from `main` to
[Cloudflare Pages](https://lanyard-studio.com/). Set the build command
to `npm run build:cloudflare-pages` and the output directory to `out`. The GitHub
Pages deployment remains available as a mirror. The previous domain,
`lanyardstudio.silverhyeok.dev`, serves the multilingual notice in `legacy-site/`
from a separate Pages project. Deploy it with `npm run deploy:moved-site`. Set
`NEXT_PUBLIC_GA_MEASUREMENT_ID` to enable the optional GA4 integration; no
analytics script is emitted by the main app when it is empty.

See [CONTRIBUTING.md](CONTRIBUTING.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/I18N.md](docs/I18N.md), [docs/PWA.md](docs/PWA.md), [docs/ANALYTICS.md](docs/ANALYTICS.md), and the [preset product sources](docs/PRESET_PRODUCT_SOURCES.md) for contribution and implementation details.

## Security

SVG uploads are sanitized by removing scripts, external resource references, dangerous CSS, and embedded active content. Project imports accept only supported image data URLs and bounded values. Report vulnerabilities according to [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © EunHyeokJung
