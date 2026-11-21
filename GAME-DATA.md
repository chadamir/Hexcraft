# Hexcraft game data (`.game.json`)

**File › Export game data** writes what a map *means*, for programs that play the game. The drawing (PNG, SVG, PDF) is for people; this file is for software. It is written from the map as it is, and the editor's **Game data** fields add what a drawing can't say.

## Filling it in

- **Hex types** and **hexes** have a *Game data* section: **Kind** (terrain: any word; the editor suggests plain, rough, hill, mountain, forest, swamp, desert, water, lake, river, coast, offboard, city, town, port), **Build cost** (a number) and **Tags** (any words, comma separated). Set them once on a type; a hex's own values override its type's.
- With no Build cost set, a **Cost** stamp printed on the hex (a triangle or wave label, or a label like `$60`) is used.
- **Cities** and **towns** have **Tags** and **Real place** (latitude, longitude, e.g. `40.44, -79.99`).
- **Regions** (Region tool) have **Region name** and **Region tags**.
- The export warns about unnamed cities or towns, names used twice, and hexes with no Kind.

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
    track: [{ from, to, color, style }],          // pre-printed track: 'e0'…'e5' = hex edges, 'i<item>.<slot>' = city slots
  }],
  sides: [{ a: { id, col, row }, b: { id, col, row } | null, side, type, label }],
                                     // styled hexsides; b is null at the map's edge; type: river, water, impassable,
                                     // wall, border, dotted, merged (hidden grid line)
  regions: [{ name, tags: [], color, hexes: ['D8', …] }],   // hexes whose centres are inside the region
  companies: [{ id, abbr, name, kind, color, textColor, home: { id, col, row, city, slot } | null, destination, tokens, tokenCosts }],
  labels: [{ text, x, y }],          // free text boxes on the page
}
```

Hex corners: for pointy hexes, corner `i` is at angle `60·i − 30°` from the centre; for flat hexes, `60·i°`. Side `i` lies between corners `i` and `i+1` (angles measured clockwise from east, as SVG draws them).
