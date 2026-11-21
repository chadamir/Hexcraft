# Hexcraft — Train Game Map Studio

A WYSIWYG hex map editor for train games: 18xx, Age of Steam, cube rails and anything else on a hex grid.

**Open the app:** this repository's GitHub Pages site (Settings › Pages shows the address), or download `index.html` and open it in any modern browser — no install, no server.

## Features
- Paint hexes, reusable hex types, terrain and rail icons, cities, towns, labels and costs
- Pre-printed track (curvilinear or Lawsonian), hexsides (rivers, borders, impassable, merged hexes)
- Irregular maps: add/remove hexes, insert rows and columns, partial edge hexes, freeform regions
- 1D and 2D stock markets, information tables, off-board revenues
- Companies: generated or uploaded token logos, share certificates, charters, private cards, home cities
- Export PNG, SVG and vector PDF (single page, fit to sheet, or tiled print-and-assemble); printable component sheets
- Import and export 18xx Maker game files
- Export game data (`.game.json`): every hex with coordinate, terrain kind, build cost and tags; cities and towns; hexsides; regions; companies — for turning a map into a playable online game. See [GAME-DATA.md](GAME-DATA.md)
- Point-to-point links between cities and towns (Link tool), art-only exports for use as a board background, a check view for game data, and `hexcraft-render.cjs` to draw maps from Node without a browser
- Your own icons and background images; autosave in the browser plus downloadable project files

## Saving
Work is autosaved in your browser. Use **File › Download project file** to keep a `.hexmap.json` you can open anywhere.

## Building from source
The app is one self-contained HTML file built from `source/src`:

```
cd source
npm install        # jsPDF and svg2pdf.js
python3 build.py   # writes ../index.html
```

## Third-party software
Bundles jsPDF and svg2pdf.js (MIT licensed) — see `THIRD-PARTY-LICENSES.txt`.
