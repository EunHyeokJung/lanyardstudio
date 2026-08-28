# Changelog

All notable changes to LanyardStudio are documented here.

## 1.8.0 — 2026-08-28

- Reorganized the responsive editor with compact add-element tools, tablet side panels, and mobile property and print-settings sheets.
- Fixed the half-open mobile property sheet so its scroll area ends above the bottom navigation; added bottom scroll clearance and retained hidden scrollbars.
- Standardized navigation and icon-button alignment and removed duplicate download and row-management actions.
- Added roster row selection, bulk deletion, drag-handle reordering, and keyboard-accessible row movement.
- Improved element copy/paste, external clipboard-image paste, and editing undo/redo behavior.
- Corrected brand-bar logo fitting so square and portrait logos preserve their aspect ratio instead of being cropped by default.
- Localized landing-page design, roster, print, and size-card samples using the same eight-language sample catalog as new projects and the sample-data action. Existing project data remains unchanged when the UI language changes.
- Added organizer/community-leader attribution to the landing footer and preserved optional GA4 cross-domain configuration.
- Updated Korean and English documentation, keyboard shortcuts, installation and self-hosting guidance, and release distribution instructions.

## 1.7.1 — 2026-08-22

- Moved the primary Cloudflare Pages domain to `lanyard-studio.com` and updated canonical URLs and deployment documentation.
- Added a separate multilingual moved-site notice for `lanyardstudio.silverhyeok.dev` with automatic language detection, manual language selection, accessibility support, and GA4 tracking.

## 1.7.0 — 2026-08-18

- Added brand bars with multi-logo upload, per-logo drag cropping and zoom, horizontal or vertical automatic spacing, reordering, background color, padding, and gap controls.
- Added project-schema validation, local persistence, canvas preview, and print/PDF rendering for brand bars.
- Localized new-project and sample roster data for all eight supported UI languages.
- Added accessible multi-page print-preview pagination and visible crop marks that match the final PDF drawing order.
- Simplified the output sidebar and corrected spacing around the paper-orientation control.

## 1.2.3 — 2026-08-17

- Migrated project JSON, browser databases, local fallback keys, locale preferences, and source module names to the LanyardStudio identity.
- Added one-time migration of projects and preferences saved by earlier releases, then removes the previous browser storage after a successful transfer.
- Removed the previous project filename extension and identity from the deployable source.

## 1.2.2 — 2026-08-17

- Made GitHub Pages the official deployment and aligned its path, repository links, and package metadata with LanyardStudio.
- Reworked the tablet bottom-sheet control into a conventional centered grab indicator that toggles open and closed on press.

## 1.2.1 — 2026-08-17

- Replaced the tablet inspector below the canvas with a draggable three-stage bottom sheet overlay.
- Added touch, pointer, keyboard-button, focus, safe-area, and reduced-motion behavior for the tablet inspector.

## 1.2.0 — 2026-08-17

- Renamed the product to LanyardStudio with a new vector mark, PWA icons, favicon, and social preview.
- Added project renaming from both the saved-project list and the editor header.
- Added pointer resizing with aspect-ratio and canvas-boundary constraints, plus global Backspace/Delete handling for selected elements.
- Added variable-to-layer connection details, data-table column actions, and undo/redo support for roster editing.

## 1.1.0 — 2026-07-28

- Added eight selectable UI locales with browser detection, persistence, and English fallback.
- Added an installable PWA manifest, branded app icons, offline navigation, and install controls.
- Localized the landing page, design inspector, data table, print settings, validation, and status messages.
- Added PWA and localization tests plus contributor documentation.

## 1.0.0 — 2026-07-25

- Initial production-ready open-source release.
- Added badge presets, design tools, image and SVG layers, CSV-driven variables, true-size PDF export, and local project persistence.
