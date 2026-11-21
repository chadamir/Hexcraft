# Hexcraft game data (`.game.json`)

**File › Export game data** writes what a map *means*, for programs that play the game. The drawing (PNG, SVG, PDF) is for people; this file is for software. It is written from the map as it is, and the editor's **Game data** fields add what a drawing can't say.

## Filling it in

- **Hex types** and **hexes** have a *Game data* section: **Kind** (terrain: any word; the editor suggests plain, rough, hill, mountain, forest, swamp, desert, water, lake, river, coast, offboard, city, town, port), **Build cost** (a number) and **Tags** (any words, comma separated). Set them once on a type; a hex's own values override its type's.
- With no Build cost set, a **Cost** stamp printed on the hex (a triangle or wave label, or a label like `$60`) is used.
- **Cities** and **towns** have **Tags** and **Real place** (latitude, longitude, e.g. `40.44, -79.99`).
- **Regions** (Region tool) have **Region name** and **Region tags**.
- **Links** (Link tool `L`, for point-to-point games) join two cities, towns or hexes and have **Cost**, **Length** (empty = hexes apart) and **Link tags**.
- The export warns about unnamed cities or towns, names used twice, and hexes with no Kind. **File › Check game data on the map** marks them on the canvas and steps through them.

## Format (version 1)

```js
{
  format: 'hexcraft-game-data', version: 1, app: 'hexcraft', name, exported,   // ISO date
  grid: {
    orient: 'pointy' | 'flat',
    stagger: 'odd' | 'even',        // which rows (pointy) or columns (flat) are shifted by half a hex
    cols, rows, size,                // size = hex radius in page units
    coords,                          // coordinate style used for ids, e.g. 'A1d'
    bounds: { x, y, w, h },          // page area covered by the hexes
  },
  page: { x, y, w, h },              // the whole export page: the viewBox of SVG exports (full or art only)
  hexes: [{                          // every hex on the map (removed hexes are left out)
    id,                              // printed coordinate, e.g. 'D8' (or 'col,row' when coordinates are off)
    col, row,                        // grid position, from 0
    x, y,                            // centre on the page, same units as SVG exports
    kind,                            // hex's Kind, else its type's; 'plain' for an untouched hex; null if not set
    cost,                            // number or null
    tags: [],                        // type's tags + hex's tags
    type,                            // hex type name or null
    color,                           // fill colour or null
    label,                           // hex label, or the name of its only city or town
    cities: [{ name, slots, values: [20, 30], revenue: '20/30', marks: [], homes: [{ slot, company }], tags: [], place: [lat, lon] | null }],
    towns:  [{ name, values: [10], revenue: '10', style: 'dot' | 'bar' | 'disc', tags: [], place }],
    revenues: [{ phase: 'yellow', value: 20 }],   // phase revenue boxes on the hex (off-board areas)
    texts: [],                       // other text printed on the hex
    track: [{ from, to, color, style }],          // pre-printed track: 'e0'…'e5' = hex edges, 'c' = hex centre,
                                     //   'i<item>' = a town, 'i<item>.<slot>' = a city slot (item = index in the hex's own items)
  }],
  sides: [{ a: { id, col, row }, b: { id, col, row } | null, side, type, label }],
                                     // styled hexsides; b is null at the map's edge; type: river, water, impassable,
                                     // wall, border, dotted, merged (hidden grid line)
  regions: [{ name, tags: [], color, hexes: ['D8', …] }],   // hexes whose centres are inside the region
  links: [{ id, from, to, cost, length, color, style, tags: [] }],
                                     // point-to-point links; from/to = { id, col, row, place: 'city' | 'town' | null,
                                     //   index (into that hex's cities or towns), name }; place null = the hex centre.
                                     //   cost: number or null; length: number (as set, else hexes apart);
                                     //   style: solid | dashed | rail | double
  companies: [{ id, abbr, name, kind, color, textColor, home: { id, col, row, city, slot } | null, destination, tokens, tokenCosts }],
  labels: [{ text, x, y }],          // free text boxes on the page
}
```

Hex corners: for pointy hexes, corner `i` is at angle `60·i − 30°` from the centre; for flat hexes, `60·i°`. Side `i` lies between corners `i` and `i+1` (angles measured clockwise from east, as SVG draws them).

`links` and `page` were added after the first release. They are new fields only, so `version` stays 1; nothing existing changed meaning.

## The picture: art-only SVG

**Export › Art only** (SVG, PNG or PDF) draws the map without grid lines, cities, towns, text, coordinates, markets or tables: terrain colours, hex images, icons, regions, the background colour and image, and the map edge. Options add rivers and coasts (on by default), pre-printed track and links. It uses the same page coordinates as everything above: an SVG's `viewBox` equals `page`, and every `x, y` in the game data is a point in that viewBox. A program can put the art behind its own board and place cities, tokens and track at the exported coordinates.

## Rendering without a browser: `hexcraft-render.cjs`

`hexcraft-render.cjs` (repository root, built by `source/build.py` from the editor's own drawing code) needs only Node 16+:

```js
const hc = require('./hexcraft-render.cjs');
const project = fs.readFileSync('map.hexmap.json', 'utf8');   // a project saved from Hexcraft
hc.render(project, { art: true })            // art-only SVG; options: sides (true), track, links, background (true), scale (1)
hc.render(project)                           // full map SVG, as File › Export › SVG
hc.gameData(project)                         // the .game.json object
hc.pageBounds(project)                       // { x, y, w, h }
```

Command line: `node hexcraft-render.cjs map.hexmap.json [--art] [--track] [--links] [--no-sides] [--transparent] [--scale 2] [--game-data] [-o out.svg]`.

Art-only output and game data come out identical to the editor's. Full maps match too, except that text widths are estimated (Node has no font metrics), so label boxes and table columns can differ by a pixel or two. Project files saved by the editor store the page area it measured (`page`), so the page frame matches; for older files it is estimated.
