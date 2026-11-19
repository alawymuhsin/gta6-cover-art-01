# Vice Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/alawymuhsin/gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/alawymuhsin/gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01)

A GTA 6-style cover art maker that runs entirely offline in the browser: drop in
your own photo, pick a multi-panel poster layout, grade it in a Vice City sunset
or neon palette, letter a bold caption over it, and export a share-ready PNG.

## How to use

1. Serve the app: `node serve.ts`, then open http://localhost:8080.
2. Load a photo — upload from your machine, drag & drop it onto the preview, or
   try a sample photo. Photos never leave your machine.
3. Pick a layout (full-bleed hero, hero + 3 strips, grid of 4, tilted snapshots)
   and a colour grade (Vice Sunset, Neon Nights, Palm Dusk, Heat Haze).
4. Click a panel to select it, drag on the preview to reposition its photo, and
   use the zoom slider to crop it. Each panel can hold its own photo, or one
   photo can fill them all.
5. Edit the title and subtitle, choose a post size, and hit **Export PNG**.

## Post sizes

- 1920 × 1080 (landscape)
- 1080 × 1350 (portrait)
- 1080 × 1080 (square)

## Screenshots

`screenshots/` holds four renders of the app itself: the landscape cover
(`1-cover.jpg`), the editor with a photo loaded (`2-editor.jpg`), and the
portrait and square covers (`3-cover-portrait.jpg`, `4-cover-square.jpg`).
They are taken from the app's own `?shot=` scenes — the same drawing the
export writes.

## What is inside

- `app/index.html` + `app/style.css` — the editor page.
- `app/src/cover.js` — the cover engine: panel layouts, colour grades, grain,
  vignette, and the title block. Everything is drawn on canvas, so the preview
  and the exported PNG are the same drawing.
- `app/src/main.js` — the editor: photo library, per-panel crop/position,
  caption editing, export.
- `app/src/shots.js` — fixed `?shot=` scenes used for the screenshots.
- `app/fonts/` — Anton and Pacifico, SIL Open Font License (`OFL.txt`).
- `app/samples/` — two sample photos made with an image model, free to use.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to `/output`
  and writes `/output/dossier.json`.

No network requests at runtime: every script, font, and image the app loads is
a file under `app/`. No Rockstar Games logo, wordmark, artwork, or font is used;
the lettering is original OFL-licensed type.
