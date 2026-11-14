// =====================================================================
//  Help: documentation modal + hover tips
// =====================================================================
const HELP = [
  ['start', 'Getting started', `
    <p>Hexcraft makes hex maps for train games — 18xx, Age of Steam, cube rails and anything else on a hex grid. What you see on the canvas is exactly what exports.</p>
    <ol>
      <li><b>Start a map:</b> File › New map… and pick a template (18xx, Age of Steam, Cube rails or Blank). Each sets orientation, coordinates, colors and a starter set of hex types.</li>
      <li><b>Shape it:</b> set columns/rows in the right panel (click empty canvas to see map settings), then use <b>Add / remove hexes</b> <kbd>A</kbd> to carve coastlines or grow the map in any direction.</li>
      <li><b>Paint terrain:</b> pick a color or a <b>hex type</b> on the left and drag with <b>Paint</b> <kbd>B</kbd>.</li>
      <li><b>Add cities, towns, icons:</b> choose a stamp and click inside a hex with <b>Stamp</b> <kbd>S</kbd>. Name hexes with <b>Text</b> <kbd>T</kbd> or the <b>Hex label</b> field.</li>
      <li><b>Pre-printed track:</b> drag across hexes with <b>Track</b> <kbd>K</kbd>.</li>
      <li><b>Markets and tables:</b> Insert › Stock market or Information table.</li>
      <li><b>Companies:</b> switch to the <b>Companies</b> tab to add railroads. Hexcraft designs their token logos, share certificates and charters, and prints home logos on the map.</li>
      <li><b>Save and export:</b> <kbd>Ctrl S</kbd> saves to your library; Export gives PNG, SVG or PDF.</li>
    </ol>
    <p class="tipline">Click anything on the map to edit it in the right panel. Hover over buttons and fields for a description of what they do.</p>`],
  ['tools', 'Tools & shortcuts', `
    <table class="kt">
      <tr><td><kbd>V</kbd></td><td><b>Select</b> — click a hex, object or market cell to edit it. Drag objects and hex items to move them (<kbd>Shift</kbd> snaps).</td></tr>
      <tr><td><kbd>B</kbd></td><td><b>Paint</b> — drag to color hexes or apply a hex type. <kbd>Alt</kbd>-click samples a hex's color. Also colors stock market cells.</td></tr>
      <tr><td><kbd>G</kbd></td><td><b>Flood fill</b> — fills all connected hexes that currently look the same.</td></tr>
      <tr><td><kbd>E</kbd></td><td><b>Erase</b> — drag to erase everything, just color, just icons/labels, just track, or to remove/restore hexes.</td></tr>
      <tr><td><kbd>S</kbd></td><td><b>Stamp</b> — place the selected stamp (city, town, icon, cost, upload) where you click inside a hex. <kbd>Alt</kbd>-click places it freely on the page.</td></tr>
      <tr><td><kbd>T</kbd></td><td><b>Text</b> — click a hex to add a label; click off the grid (or <kbd>Alt</kbd>-click) for a free text box.</td></tr>
      <tr><td><kbd>K</kbd></td><td><b>Track</b> — drag across hexes to lay pre-printed track. <kbd>Shift</kbd>-drag removes.</td></tr>
      <tr><td><kbd>X</kbd></td><td><b>Hexsides</b> — click hex edges for rivers, borders, impassable sides. Drag to do several; <kbd>Shift</kbd> removes. The <i>Plain</i> style turns edges back to normal.</td></tr>
      <tr><td><kbd>A</kbd></td><td><b>Add / remove hexes</b> — click or drag to remove hexes; click removed hexes or empty space beyond the grid to add.</td></tr>
      <tr><td><kbd>R</kbd></td><td><b>Region</b> — draw freeform shapes: lakes, seas, multi-hex off-board areas, merged hexes.</td></tr>
      <tr><td><kbd>H</kbd> / <kbd>Space</kbd></td><td><b>Pan</b> — drag to move around. Hold Space with any tool. Mouse wheel zooms; <kbd>Shift</kbd>+wheel scrolls sideways.</td></tr>
    </table>
    <h4>Editing</h4>
    <table class="kt">
      <tr><td><kbd>Del</kbd></td><td>Delete the selected object or hex item. On a hex: first clears it, then removes it from the map. On a removed hex: restores it.</td></tr>
      <tr><td><kbd>Ctrl Z</kbd> / <kbd>Ctrl Shift Z</kbd></td><td>Undo / redo</td></tr>
      <tr><td><kbd>Ctrl C</kbd> / <kbd>Ctrl X</kbd></td><td>Copy / cut the selected hexes or object</td></tr>
      <tr><td><kbd>Ctrl V</kbd></td><td>Paste onto the hex under the pointer (the group keeps its shape). Works between maps too.</td></tr>
      <tr><td><kbd>Shift</kbd>-click, drag</td><td>With Select: add or remove hexes from the selection, or drag a box across empty hexes to select an area</td></tr>
      <tr><td><kbd>Ctrl D</kbd></td><td>Duplicate the selected object — or, in the Companies tab, the selected company</td></tr>
      <tr><td>Arrow keys</td><td>Nudge the selected object (<kbd>Shift</kbd> = 10 px)</td></tr>
      <tr><td><kbd>Ctrl S</kbd> / <kbd>Ctrl O</kbd></td><td>Save / open saved maps</td></tr>
      <tr><td><kbd>Esc</kbd></td><td>Deselect, cancel a region in progress, close dialogs</td></tr>
      <tr><td><kbd>?</kbd></td><td>Open this help</td></tr>
    </table>`],
  ['hexes', 'Hexes & hex types', `
    <p><b>Selecting a hex</b> (Select tool, click it) shows its coordinate (e.g. <b>E7</b>) and everything on it in the right panel: hex type, color, label, image fill, items and track.</p>
    <h4>Hex types</h4>
    <p>A hex type is a reusable preset — a fill color plus any icons, cities, labels or costs, e.g. <i>Mountain $60</i> or <i>Off-board</i>. Templates come with a starter set.</p>
    <ul>
      <li><b>Paint with a type:</b> click it in the <i>Hex types</i> list, then paint or flood-fill.</li>
      <li><b>Edit a type:</b> double-click it. Changes update every hex that uses it.</li>
      <li><b>Make one from a hex:</b> select a hex you've built and press <i>Save as hex type</i>.</li>
      <li><b>Extras on one hex:</b> anything you add to a hex is on top of its type, for that hex only.</li>
      <li><b>Detach:</b> copies the type's contents into the hex so you can change them individually.</li>
    </ul>
    <h4>Items inside a hex</h4>
    <h4>Copy &amp; paste</h4>
    <p>Select one hex, Shift-click more, or drag a box across empty hexes with the Select tool. <kbd>Ctrl C</kbd> copies everything on them — color, hex type, icons, cities, labels, costs, track, hexsides and outlines. Point at a hex and press <kbd>Ctrl V</kbd>: the group lands with its top-left hex under the pointer, keeping its shape. <kbd>Ctrl X</kbd> cuts. You can paste into another map too (same hex orientation); hex types and uploaded images come along. Company home markers stay with the original city.</p>
    <p>With several hexes selected, the right panel can also apply the current brush, clear them, remove them, or turn them into hex types.</p>
    <h4>Outlines &amp; merged hexes</h4>
    <p>Give any hex its own <b>Outline</b> color and width in the hex panel. To make several hexes read as one big city or area, use the <b>Hexsides</b> tool <kbd>X</kbd> with the style <i>Hide grid line (merge hexes)</i> and click or drag across the edges between them. A <b>Region</b> <kbd>R</kbd> with a fill can also cover a group of hexes.</p>
    <h4>Rows &amp; columns</h4>
    <p>A selected hex's panel can insert rows or columns next to it, or delete them — see <i>Map shape &amp; irregular maps</i>.</p>
    <p>Each item (icon, city, town, label, revenue bar, upload) has its own card with position, size, rotation and style. Drag items on the canvas with the Select tool; <kbd>Shift</kbd> snaps to the 13 standard positions. Order items with ↑ ↓ (later items draw on top).</p>`],
  ['cities', 'Cities, towns & labels', `
    <ul>
      <li><b>Cities</b> are white circles with 1, 2, 3, 4 or 6 station slots (18xx style). Set the revenue value and which side it sits on, home markers per slot (e.g. <code>PRR, B&amp;O</code>), a name and its position.</li>
      <li><b>Towns</b> come as a black dot, a bar, or a white disc (Age of Steam style), with optional revenue and name.</li>
      <li><b>Off-board arrows:</b> the small triangle stamp sits on a hex edge, pointing into the map — click near the edge where it belongs. Change its edge, color and size in the hex panel.</li>
      <li><b>Off-board revenues:</b> the revenue bar stamp shows phase values in colored boxes. Drag it anywhere, even outside the hex, or press <i>Move to page as a free box</i> (or Insert › Off-board revenue box) so it floats above the map and nothing draws over it. Type <code>y20 g30 b40 x60</code> — letters: <code>y</code> yellow, <code>g</code> green, <code>b</code> brown, <code>x</code> gray, <code>r</code> red, <code>w</code> white.</li>
      <li><b>Labels:</b> the <i>Hex label</i> field on a selected hex is the quickest way to name a city. The Text tool and <i>Labels &amp; costs</i> stamps add more: big letters (<i>NY</i>, <i>B</i>, <i>OO</i>), number badges, boxed labels, mountain cost triangles and water cost waves.</li>
      <li><b>Hex coordinates:</b> map settings › Hex coordinates prints letters and numbers around the edges (or inside hexes) so players can say “A8”. The 18xx format numbers columns by twos (A1, A3, B2…).</li>
    </ul>`],
  ['track', 'Pre-printed track', `
    <p>Use the <b>Track</b> tool <kbd>K</kbd> to draw existing track for 18xx preprinted tiles or Age of Steam starting track.</p>
    <ul>
      <li>Press on a hex edge, the center, a city slot or a town, and drag across neighboring hexes. Each hex you cross gets a segment from the edge you entered to the edge you left.</li>
      <li>Release on a city, town or center to end there; release near an edge to stop at the edge.</li>
      <li>Two track geometries, as on real 18xx tiles: <b>Curvilinear</b> (smooth arcs — straight, gentle and sharp curves) and <b>Lawsonian</b> (every track runs straight into the hex center). Choose the map default under map settings › Grid › Track style, pick one on the Track tool, or flip single segments in the hex panel.</li>
      <li>Styles: standard, narrow gauge (dashed) and dual; any color and width; optional white edge.</li>
      <li><kbd>Shift</kbd>-drag removes track. Individual segments can be recolored or deleted in the hex panel.</li>
    </ul>`],
  ['shape', 'Map shape & irregular maps', `
    <p>Real maps are rarely perfect rectangles. You have four ways to handle that:</p>
    <ul>
      <li><b>Add / remove hexes</b> <kbd>A</kbd>: click or drag to remove hexes (coastlines, ragged rows, gaps). Click a removed hex to bring it back, or click anywhere outside the grid to add a hex there — the grid grows automatically. Removed hexes show as dashed outlines while editing and never export.</li>
      <li><b>Delete key:</b> select an empty hex and press <kbd>Del</kbd> to remove it.</li>
      <li><b>Cut hexes at map edge:</b> in map settings › Map edge, trim each side to leave partial hexes along the board edge, with an optional edge line.</li>
      <li><b>Regions</b> <kbd>R</kbd>: freeform shapes that snap to hex corners and edge midpoints (<kbd>Alt</kbd> for free placement). Use them for lakes and seas, off-board areas spanning several hexes, merged “double” hexes, or borders that don't follow the grid. Turn on <i>Smooth curves</i> for coastlines, or <i>Behind the hex grid</i> to put a shape under the hexes.</li>
      <li><b>Hexsides</b> <kbd>X</kbd>: rivers, coasts, impassable sides, colored lines, dashed or dotted borders, each with an optional label such as <code>$40</code>. <i>Hide grid line</i> removes the line between two hexes so they merge into one shape.</li>
      <li><b>Back to plain:</b> choose <i>Plain (remove style)</i> in the Hexsides tool and click or drag along edges; or press <i>Reset hexsides to plain</i> in a hex's panel (also for several selected hexes); or use the Erase tool's <i>Hexsides only</i> mode; or <i>Clear all hexsides…</i> in map settings.</li>
    </ul>
    <p>Grow or shrink rows and columns from any side with the buttons under <i>Grid</i> — your content stays where it is.</p>
    <p><b>Widen the map in the middle:</b> select a hex and use <i>Rows &amp; columns</i> in its panel to insert rows above/below or columns left/right (1–4 at a time), or delete that row or column. Everything beyond moves over with its contents, track, hexsides and home cities. In offset layouts, inserting an odd number of the offset lines shifts the far side half a hex sideways to keep it intact; insert two to keep it lined up.</p>`],
  ['markets', 'Stock markets', `
    <p>Insert › Stock market — 1D track or 2D grid. Click a market to edit it; click a single cell to edit just that cell.</p>
    <ul>
      <li><b>Values:</b> type them in order (1D) or one row per line (2D). Add a color letter after a value: <code>y</code> yellow, <code>o</code> orange, <code>b</code> brown, <code>r</code> red, <code>g</code> green, <code>l</code> blue, <code>u</code> purple, <code>x</code> gray. Add <code>p</code> for a par space: <code>100p</code>, <code>70yp</code>.</li>
      <li><b>2D ledges:</b> use <code>.</code> for an empty space, giving the staircase shape common in 18xx markets. <i>Offset alternate rows</i> makes a brick layout.</li>
      <li><b>1D layouts:</b> rows, snake (zig-zag), single row or column, or <i>Around a border</i> for revenue tracks that run around the map edge.</li>
      <li><b>Look:</b> cell size, text size, value position (center, top or corner, leaving room for tokens), zone colors, par outline color.</li>
      <li><b>Paint cells:</b> with the Paint tool, click cells to color them individually.</li>
    </ul>`],
  ['tables', 'Information tables', `
    <p>Insert › Information table for terrain costs, train rosters, phase charts, legends — anything players need to look up.</p>
    <ul>
      <li>One row per line, cells separated by <code>|</code>. The first row is the header (can be turned off).</li>
      <li>Icons inside cells: <code>:mountain:</code>, <code>:water:</code>, <code>:forest:</code>, <code>:loco:</code>… or your uploads by name, e.g. <code>:my-logo:</code>.</li>
      <li>Color a cell by starting it with <code>[#ffcc00]</code>. Make a cell bold with <code>**text**</code>.</li>
      <li>Column alignment: <code>l,c,r</code> per column. Header, body, stripe and border colors are all adjustable.</li>
    </ul>`],
  ['images', 'Your own icons & backgrounds', `
    <ul>
      <li><b>Icons:</b> Insert › Upload custom icons (PNG, JPG, SVG, WebP), or drag image files onto the canvas. They appear under Stamps › Your uploads, can be stamped into hexes, used in hex types, as image fills, and in tables by name.</li>
      <li><b>Background image:</b> Insert › Set background image. Use it as artwork or trace a real map: set the hex color to transparent or lower hex opacity in map settings. Move or resize it with the mouse via <i>Move with mouse</i>, or type exact values.</li>
      <li><b>Free images:</b> Insert › Image from file places a logo or illustration anywhere on the page.</li>
    </ul>`],
  ['saving', 'Saving your work', `
    <ul>
      <li><b>Autosave:</b> every change is kept in this browser automatically, and your last map reopens when you come back.</li>
      <li><b>Your library:</b> <kbd>Ctrl S</kbd> (or Save) stores the map in your private online library, reachable from any device. After the first save, changes keep syncing automatically.</li>
      <li><b>Open saved maps:</b> File › Open saved maps lists your library and maps kept in this browser.</li>
      <li><b>Project files:</b> File › Download project file saves a <code>.hexmap.json</code> you can back up, email, or open later with File › Open project file (or drop it on the canvas).</li>
      <li><b>Save as copy</b> makes a duplicate so you can try variations.</li>
      <li><b>18xx Maker:</b> File › Import 18xx Maker game opens an 18xx Maker <code>.json</code> (you can also just open or drop it — it's detected automatically). File › Export for 18xx Maker writes a game file 18xx Maker can open: hexes with colors, cities and home companies, towns, revenue values, terrain costs, icons, labels, off-board revenues, pre-printed track, borders, companies with shares and tokens, privates, and the stock market. Free-floating objects such as tables and regions have no 18xx Maker equivalent and are left out.</li>
    </ul>`],
  ['companies', 'Companies, shares & charters', `
    <p>Open the <b>Companies</b> tab (top bar) to add the railroads in your game. The left side lists your companies and the card style; the middle shows the selected company's charter, certificates and tokens; the right panel edits it.</p>
    <h4>Company types</h4>
    <ul>
      <li><b>18xx</b> — a major company: charter with station-token spaces and costs, treasury, train slots and turn order; a president's certificate plus regular shares; token stickers.</li>
      <li><b>Minor</b> — a small company owned by one player. Its charter is its only certificate unless you tick <i>Also make share certificates</i>.</li>
      <li><b>Cube rails</b> — for Chicago Express, Irish Gauge and similar: a company card with track cubes, a treasury and income box, and plain share cards (1 of 5, 2 of 5…).</li>
      <li><b>Private</b> — one card with cost, revenue and special ability.</li>
    </ul>
    <h4>Logos &amp; tokens</h4>
    <p>Logos are generated from the abbreviation in 8 styles (solid, ring, band, split, stripe, star, diamond, monogram) using the main and accent colors — or choose <i>Your image</i> to upload a picture, cropped to a circle. The same logo is used on tokens, cards, charters and the map. Token stickers print 0.5 mm smaller than the disc size you choose (12, 15, 16 or 20 mm), plus extra tokens per company for market markers.</p>
    <h4>Shares</h4>
    <p>Set the president's share (20/30/40%), the regular share size and the total, or type an exact list like <code>20,10,10,10,10,10,10,10,10</code>. Certificates keep the logo and percentage on the left so they stay readable when fanned out; the president's certificate shows two logos and a double border.</p>
    <h4>Charters</h4>
    <p>Station tokens (count and costs, e.g. <code>Home, $40, $60, $80</code>), train slots, par value, destination and printed notes. The turn order strip along the bottom is edited under <i>Component style</i>.</p>
    <h4>Home cities</h4>
    <p>Pick a home city slot from the list, or press <i>Pick home on the map…</i> and click a city. The company's logo is printed in that slot on the map (turn this off under Component style).</p>
    <h4>Reusing stats</h4>
    <ul>
      <li><b>Duplicate</b> (⧉ in the list, the panel button, or <kbd>Ctrl D</kbd>) copies every stat and picks a new color.</li>
      <li><b>Make copies…</b> creates several companies at once from a list of <code>Name | ABBR</code> lines.</li>
      <li><b>Copy stats to other companies…</b> pushes shares, tokens, charter settings, logo style or notes to every company of the same type.</li>
    </ul>
    <h4>Card style &amp; printing</h4>
    <p><i>Component style</i> sets the look (Classic or Modern), a game title printed on every card, and card sizes (poker, bridge, mini, tarot or custom; charters A5, half-letter and more). <b>Print / export components…</b> (or Export while in the Companies tab) makes real-size PDF sheets with cut lines — charters, certificates and private cards, and token stickers — or an SVG/PNG of the selected company.</p>`],
  ['export', 'Exporting & printing', `
    <ul>
      <li><b>PNG:</b> 1× to 6× resolution; optionally transparent.</li>
      <li><b>SVG:</b> vector file for Inkscape, Illustrator or Affinity; text stays editable.</li>
      <li><b>PDF</b> (vector), three layouts:
        <ul><li><i>Tile across sheets</i> — prints at true size over several Letter/A4/A3… sheets with trim marks and overlap lines for assembling.</li>
        <li><i>One page at true print size</i> — a single large page for a print shop.</li>
        <li><i>Shrink to fit one sheet</i> — a quick reference copy.</li></ul>
        Set the hex size in millimetres across the flats; 18xx tiles are usually about 38 mm (1.5″).</li>
      <li><b>Company components</b> print from the Companies tab — see <i>Companies, shares &amp; charters</i>.</li>
      <li>The light “page” behind the map on the canvas is the export area. Adjust its margin in map settings › Colors › Page margin.</li>
    </ul>`],
];
function helpDialog(sec = 'start') {
  closeMenus();
  const nav = HELP.map(([id, t]) => `<button data-hs="${id}">${t}</button>`).join('');
  openModal('Help', `<div class="help-wrap"><nav class="help-nav">${nav}</nav><div class="help-body" id="helpBody"></div></div>`, [
    { label: S.tips ? 'Turn hover tips off' : 'Turn hover tips on', onClick: (e) => { setTips(!S.tips); e.target.textContent = S.tips ? 'Turn hover tips off' : 'Turn hover tips on'; } },
    { label: 'Close', cls: 'pri', onClick: closeModal }]);
  $('#modal .modal').classList.add('wide');
  const show = (id) => { const h = HELP.find((x) => x[0] === id) || HELP[0]; $('#helpBody').innerHTML = `<h3>${h[1]}</h3>${h[2]}`; $$('.help-nav button').forEach((b) => b.classList.toggle('on', b.dataset.hs === h[0])); $('#helpBody').scrollTop = 0; };
  $$('.help-nav button').forEach((b) => (b.onclick = () => show(b.dataset.hs)));
  show(sec);
}

// ---------------- Hover tips ----------------
const FIELD_TIPS = {
  'Name': 'The name shown in your library and used for exported file names.',
  'Columns': 'Number of hex columns in the grid. Content outside the grid is removed when you shrink it.',
  'Rows': 'Number of hex rows in the grid.',
  'Hex size': 'Radius of each hex on screen and in exports. Printed size is set separately in the PDF export.',
  'Orientation': 'Pointy-top hexes form straight rows; flat-top hexes form straight columns.',
  'Offset': 'Which rows (pointy) or columns (flat) are pushed half a hex over.', 'Track style': 'Curvilinear: smooth arcs between edges. Lawsonian: all track runs straight into the hex center. Applies to every segment that has no style of its own.', 'Geometry': 'Curvilinear arcs, or Lawsonian straight-to-center track, for new segments.',
  'Format': 'How hexes are named. 18xx style numbers columns by twos (A1, A3, B2…).',
  'Show': 'Print coordinates around the map edges, inside each hex, or both.',
  'Background': 'Color of the page behind the map, markets and tables.',
  'Hex color': 'Default color for hexes that have no color or type of their own.',
  'Hex opacity': 'Lower it to see a background image through the hexes.',
  'Grid lines': 'Color of the lines between hexes.',
  'Line width': 'Thickness of lines. Set to 0 to hide them.',
  'Page margin': 'Empty space around everything in exports.',
  'Opacity': 'How see-through this is.',
  'Left': 'Horizontal position in map units.', 'Top': 'Vertical position in map units.', 'Width': 'Width in map units; height follows the image’s proportions.',
  'Hex type': 'Preset this hex uses. Editing the type changes every hex that uses it.',
  'Color': 'Fill color. Tick “Custom/Override” to set one for just this hex.',
  'Hex label': 'Quick name for this hex — a city name, “NY”, “B”, etc. Drag it on the canvas to reposition.',
  'Image fill': 'Fill the hex with one of your uploaded images, cropped to the hex shape.',
  'Icon': 'Which icon to show.', 'Image': 'Which uploaded image to show.',
  'Size': 'Make it bigger or smaller.', 'Rotate': 'Rotate in degrees.',
  'Left/right': 'Position inside the hex: -1 is the left edge, 1 the right edge.',
  'Up/down': 'Position inside the hex: -1 is the top, 1 the bottom.',
  'Slots': 'Number of station token spaces in the city.',
  'Revenue': 'Revenue value shown in a small circle beside the city or town. Leave empty for none.',
  'Rev. side': 'Which side the revenue circle sits on.',
  'Home marks': 'Text inside each slot, comma separated — e.g. company home stations.',
  'Name pos.': 'Put the name above or below.', 'Name size': 'Size of the name text.',
  'Fill': 'Fill color. Untick for the default.', 'Style': 'Visual style.',
  'Text size': 'Size of the text.', 'Text color': 'Color of the text.',
  'Shape color': 'Color of the badge shape behind the text (box, circle, triangle, wave…).',
  'Outline': 'Outline color.', 'Font': 'Typeface. PDF export uses Helvetica, Times or Courier to match.',
  'Values': 'The numbers or words in each box or cell. See Help › Stock markets for color codes.',
  'Title': 'Optional heading shown above it.', 'Layout': 'How 1D cells are arranged.',
  'Per row': 'Cells per row before wrapping.', 'Cells across': 'Cells along the top edge of the border track.',
  'Cell width': 'Width of each cell.', 'Cell height': 'Height of each cell.', 'Gap': 'Space between cells.',
  'Value spot': 'Where the value sits inside each cell. Corner leaves room for tokens.',
  'Plain cells': 'Color of cells without a zone.', 'Borders': 'Color of cell borders.', 'Border width': 'Thickness of borders.',
  'Par outline': 'Color of the outline marking par spaces.', 'Padding': 'Space inside each cell.',
  'Align': 'Text alignment. For tables: l, c or r for each column, comma separated.',
  'Header': 'Header row background and text colors.', 'Body': 'Body background and text colors.',
  'Stripes': 'Alternate row shading.', 'Title size': 'Size of the title text.',
  'X': 'Horizontal position.', 'Y': 'Vertical position.',
  'Trim top': 'How much of the top hexes to cut off, in hex radii.', 'Trim right': 'How much of the right hexes to cut off.',
  'Trim bottom': 'How much of the bottom hexes to cut off.', 'Trim left': 'How much of the left hexes to cut off.',
  'Edge line': 'Line drawn along the cut map edge: color and thickness (0 hides it).',
  'Fill opacity': 'How see-through the region fill is.', 'Corner': 'Rounded corners for the text box background.',
  'Box border': 'Outline around the text box background.', 'Zone': 'Color zone of this cell.', 'Paint': 'Custom color for just this cell.',
  'Placement': 'Snap to standard spots, always the center, or exactly where you click.',
  'Border': 'Outer border color.', 'Box size': 'Width of each revenue box.', 'Edge': 'Which hex edge the off-board arrow sits on.', 'Name color': 'Color of the name text.',
  'Value': 'The number or word printed in this cell.', 'Width mm': 'Width in millimetres at print size.', 'Height mm': 'Height in millimetres at print size.',
  'Outline': 'Outline color (and width) for this hex only — handy for marking special hexes.',
  'Type': 'Track style: standard, narrow gauge (dashed) or dual.', 'Width_': '', 'Label': 'Text shown on the hex edge, e.g. a crossing cost.',
};
const ACT_TIPS = {
  ext: 'Add or remove a row or column on this side. Everything else stays where it is.',
  hexNone: 'Make hexes without a color transparent, e.g. to trace a background image.',
  bgFit: 'Scale the background image to cover the hex grid.', bgAdjust: 'Drag the image to move it; drag the blue corner handle to resize.',
  bgReplace: 'Choose a different background image.', bgRemove: 'Remove the background image.',
  delAsset: 'Delete this uploaded image from the map.', uploadIcon: 'Upload your own icons (PNG, JPG, SVG).',
  restoreHex: 'Bring this hex back onto the map.', voidHex: 'Take this hex off the map entirely (Ctrl Z undoes).',
  clearHex: 'Remove everything from this hex but keep the hex.', detachType: 'Copy the type’s contents into this hex so they can be changed here only.',
  typeFromHex: 'Create a reusable hex type from this hex’s color and contents.', editType: 'Edit this hex type — changes apply to every hex using it.',
  insLine: 'Insert blank rows or columns here; everything beyond moves over.', delLine: 'Delete this row or column and close the gap.', trDel: 'Delete this track segment.', trClear: 'Delete all track in this hex.', hexImgUp: 'Upload an image and use it to fill this hex.',
  backMap: 'Finish editing the type.', paintType: 'Switch to the Paint tool using this type.', dupType: 'Make a copy of this type.', delType: 'Delete this type.',
  sidesReset: 'Turn every side of the selected hex(es) back into a normal grid line.', sidesClearAll: 'Remove every hexside style from the whole map.',
  mCopy: 'Copy these hexes (Ctrl C). Point at a hex and press Ctrl V to paste.', mCut: 'Copy these hexes and clear them (Ctrl X).', mBrush: 'Paint all selected hexes with the current color or hex type.', mType: 'Create hex types from the different looks among these hexes.', mClear: 'Remove everything from these hexes but keep them on the map.', mVoid: 'Take these hexes off the map (Ctrl Z undoes).',
  coDup: 'Make a copy with the same stats and a new color.', coUp: 'Move this company up the list.', coDown: 'Move this company down the list.', coDel: 'Delete this company (its home marker leaves the map).',
  coPick: 'Go to the map and click a city to make it this company’s home.', coStyle: 'Use this logo style for the company’s tokens and cards.', coUpload: 'Upload a picture to use as this company’s logo.',
  detachRev: 'Turn this revenue bar into a free object you can place anywhere on the page.', trGeo: 'Switch this segment between curvilinear (arc) and Lawsonian (through the center).',
  'toggle-tips': 'Show or hide these hover tips.', coBulk: 'Create several companies at once from a list of names, all with these stats.', coCopyStats: 'Push this company’s shares, tokens, charter settings or logo style to every other company of the same type.',
  oFront: 'Draw this above other objects.', oBack: 'Draw this below other objects.', oDup: 'Make a copy (Ctrl D).', oDel: 'Delete this object (Del).',
  addIt: 'Add a new item to this hex or type.', itUp: 'Move back (drawn earlier).', itDown: 'Move forward (drawn on top).', itDup: 'Duplicate this item.', itDel: 'Delete this item.',
  new: 'Start a new map from a template. Your current map stays saved.', open: 'Browse maps in your library and in this browser.',
  save: 'Save to your library (Ctrl S).', saveas: 'Save a duplicate under a new name.', savefile: 'Download a .hexmap.json project file you can open later.',
  openfile: 'Open a .hexmap.json project file.', 'ins-market1': 'A one-dimensional share price or revenue track.', 'ins-market2': 'A 2D stock market grid with zones and ledges.',
  'ins-table': 'A table for costs, trains, phases or a legend — supports icons.', 'ins-text': 'A free text box for titles and notes.', 'ins-revbox': 'Phase revenue boxes for an off-board area, as a free object you can place anywhere.',
  'ins-image': 'Place an image anywhere on the page.', 'maker-import': 'Open a game file made with 18xx Maker: map, track, cities, terrain, companies, privates and stock market are converted.', 'maker-export': 'Save this map, its companies, privates and stock market as an 18xx Maker game file.', 'upload-icon': 'Upload your own icons to stamp on hexes.', 'upload-bg': 'Put an image behind the hex grid.',
};
const TOP_TIPS = {
  '#projName': 'Map name — click to rename.', '#undoBtn': 'Undo (Ctrl Z)', '#redoBtn': 'Redo (Ctrl Shift Z)',
  '#saveBtn': 'Save to your library (Ctrl S). Changes are also autosaved in this browser.', '#exportBtn': 'Export as PNG, SVG or PDF (tiled printing supported).',
  '#saveState': 'Where and when this map was last saved.', '#zoomIn': 'Zoom in', '#zoomOut': 'Zoom out', '#zoomFit': 'Fit the whole page in view',
  '#palAdd': 'Add the current color to the palette.', '#curColor': 'Pick any color for painting.', '#curColorHex': 'Type a hex color code, e.g. #e0443e.',
  '#fileMenu [data-menu]': 'New, open, save and project files.', '#insertMenu [data-menu]': 'Add stock markets, tables, text, images and backgrounds.', '#helpMenu [data-menu]': 'Documentation and hover tips.',
};
S.tips = true; try { const t = localStorage.getItem('hexwright.tips'); if (t === '0') S.tips = false; } catch (e) {}
function setTips(on) { S.tips = on; try { localStorage.setItem('hexwright.tips', on ? '1' : '0'); } catch (e) {} if (!on) hideTip(); toast(on ? 'Hover tips on' : 'Hover tips off'); }
const tipEl = document.createElement('div'); tipEl.id = 'tip'; document.body.appendChild(tipEl);
let _tipT = 0, _tipFor = null;
function tipFor(el) {
  if (el.dataset.tip) return el.dataset.tip;
  if (el.title) { el.dataset.tip = esc(el.title); el.removeAttribute('title'); return el.dataset.tip; }
  if (el.dataset.act && ACT_TIPS[el.dataset.act]) return ACT_TIPS[el.dataset.act];
  return null;
}
function findTipTarget(t) {
  while (t && t !== document.body && t.nodeType === 1) {
    if (t.closest && t.closest('#stage') && !t.closest('.zoomctl')) return null;
    if (t.dataset && (t.dataset.tip || (t.title && t.tagName !== 'svg') || (t.dataset.act && ACT_TIPS[t.dataset.act]))) return t;
    t = t.parentElement;
  }
  return null;
}
function hideTip() { clearTimeout(_tipT); tipEl.classList.remove('show'); _tipFor = null; }
document.addEventListener('mouseover', (e) => {
  if (!S.tips) return;
  const el = findTipTarget(e.target);
  if (el === _tipFor) return;
  hideTip(); if (!el) return;
  const html = tipFor(el); if (!html) return;
  _tipFor = el;
  _tipT = setTimeout(() => {
    if (_tipFor !== el || !document.body.contains(el)) return;
    tipEl.innerHTML = html; tipEl.classList.add('show');
    const r = el.getBoundingClientRect(), tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
    let x = r.left + r.width / 2 - tw / 2, y = r.bottom + 8;
    if (y + th > innerHeight - 6) y = r.top - th - 8;
    x = clamp(x, 6, innerWidth - tw - 6);
    tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  }, 450);
});
document.addEventListener('pointerdown', hideTip, true);
document.addEventListener('wheel', hideTip, { passive: true, capture: true });
function applyStaticTips() {
  Object.entries(TOP_TIPS).forEach(([sel, t]) => { const el = $(sel); if (el) { el.dataset.tip = t; el.removeAttribute('title'); } });
  $$('.menu-list [data-act]').forEach((b) => { if (ACT_TIPS[b.dataset.act]) b.dataset.tip = ACT_TIPS[b.dataset.act]; });
}
// add tips to field labels in the props panel after each render
function tipProps() {
  $$('#props .f > label').forEach((lab) => { const k = lab.textContent.trim(); if (FIELD_TIPS[k]) lab.parentElement.dataset.tip = FIELD_TIPS[k]; });
  $$('#props .chk').forEach((c) => { if (!c.dataset.tip) { const t = c.textContent.trim(); const m = { 'Bold': 'Bold text', 'Italic': 'Italic text', 'Dashed outline': 'Draw the outline as a dashed line.', 'Smooth curves': 'Round off corners into smooth curves — good for coastlines and lakes.', 'Behind the hex grid': 'Draw this shape underneath the hexes instead of on top.', 'First row is a header': 'Style the first row as a header.', 'Grid lines': 'Draw lines between cells.', 'Show while editing': 'Show the background image on the canvas.', 'Include in exports': 'Include the background image in PNG, SVG and PDF exports.', 'Bold values': 'Make market values bold.', 'Par space': 'Mark this cell as a par value space (outlined).' }[t]; if (m) c.dataset.tip = m; } });
}
const _renderProps0 = renderProps;
renderProps = function () { _renderProps0(); tipProps(); };
const _renderLeft0 = renderLeft;
renderLeft = function () {
  _renderLeft0();
  $$('#tools .tool').forEach((b) => { const d = TOOL_DEFS.find((x) => x[0] === b.dataset.tool); if (d) { b.dataset.tip = `<b>${d[2]}</b> <kbd>${d[1]}</kbd><br>${TOOL_HINTS[d[0]] || ''}`; b.removeAttribute('title'); } });
  $$('#stampGallery .stamp').forEach((s) => { const t = s.getAttribute('title') || s.dataset.tip || ''; if (s.getAttribute('title')) { s.dataset.tip = `<b>${t}</b><br>Click to select, then click inside a hex to place it.`; s.removeAttribute('title'); } });
  $$('#typeList .stamp').forEach((s) => { const t = s.getAttribute('title'); if (t) { const nm = t.split(' — ')[0]; s.dataset.tip = `<b>${nm}</b><br>Click to paint with this hex type. Double-click to edit it.`; s.removeAttribute('title'); } });
  $$('#swatches .sw').forEach((s) => { const t = s.getAttribute('title'); if (t) { s.dataset.tip = `<b>${t}</b><br>Click to paint with this color. Right-click to remove it from the palette.`; s.removeAttribute('title'); } });
  const nt = $('#newType'); if (nt) nt.dataset.tip = 'Create a new hex type (preset color + contents).';
};
window.addEventListener('keydown', (e) => {
  if (isTyping()) return;
  if (e.key === '?' || e.key === 'F1') { e.preventDefault(); helpDialog(); }
});
