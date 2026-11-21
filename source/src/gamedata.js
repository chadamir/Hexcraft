// =====================================================================
//  Game data export: what the map means, for programs that play the game
//  (File › Export game data). The drawing is for people; this file is for
//  software: every hex with its coordinate, terrain kind, build cost and
//  tags; cities and towns with names, slots, values and home companies;
//  hexsides as pairs of hexes; named regions; companies.
// =====================================================================

const GAME_DATA_FORMAT = 'hexcraft-game-data', GAME_DATA_VERSION = 1;
// Suggested terrain kinds (any word may be used; these are only offered in the editor)
const HEX_KINDS = ['plain', 'rough', 'hill', 'mountain', 'forest', 'swamp', 'desert', 'water', 'lake', 'river', 'coast', 'offboard', 'city', 'town', 'port'];

// "coal, port , start" -> ['coal', 'port', 'start']
const splitTags = (s) => String(s || '').split(',').map((t) => t.trim()).filter(Boolean);
// every number in a string: "20/30/40" -> [20, 30, 40]; "$60" -> [60]
const numbersIn = (s) => (String(s ?? '').match(/-?\d+(\.\d+)?/g) || []).map(Number);
// "40.44, -79.99" -> [40.44, -79.99] (latitude, longitude), or null
function placeOf(s) {
  const n = numbersIn(s);
  return n.length === 2 && Math.abs(n[0]) <= 90 && Math.abs(n[1]) <= 180 ? n : null;
}
// A cost printed on the hex (a Cost stamp: triangle or wave label, or a label like "$60"), as a number
function printedCost(items) {
  for (const it of items || []) {
    if (it.t !== 'text') continue;
    const txt = String(it.text || '').trim();
    if (it.style === 'triangle' || it.style === 'wave' || /^\$\s?\d+$/.test(txt)) { const n = numbersIn(txt); if (n.length === 1) return n[0]; }
  }
  return null;
}
// "y20 g30 b40 x60" -> [{phase:'yellow', value:20}, …]
function phaseValues(s) {
  return String(s || '').trim().split(/[\s,]+/).filter(Boolean).map((tok) => {
    const m = tok.match(/^([a-z]*)(-?\d+)/i); if (!m) return null;
    const code = (m[1] || '').toLowerCase(), zone = ZONE_CODES[code];
    return { phase: zone ? zone[0].toLowerCase() : code || null, value: Number(m[2]) };
  }).filter(Boolean);
}
// Is a point inside a polygon (list of [x, y])?
function insidePolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function gameData() {
  const hexId = (c, r) => coordLabel(c, r) || key(c, r);
  const ref = (c, r) => ({ id: hexId(c, r), col: c, row: r });
  // which company has its home in which city slot: 'c,r|item|slot' -> company id
  const homeOf = {};
  (P.companies || []).forEach((co) => { if (co.home) homeOf[co.home] = co.id; });

  const hexes = [];
  for (let r = 0; r < P.grid.rows; r++) for (let c = 0; c < P.grid.cols; c++) {
    if (!exists(c, r)) continue;
    const k = key(c, r), h = P.hexes[k] || null, ty = hexType(h);
    const items = [...((ty && ty.items) || []), ...((h && h.items) || [])];
    const typeCount = ((ty && ty.items) || []).length;   // items from the type come first; the hex's own items follow
    const [x, y] = center(c, r);
    const cost = h && h.cost !== undefined && h.cost !== '' ? numbersIn(h.cost)[0] ?? null
      : ty && ty.cost !== undefined && ty.cost !== '' ? numbersIn(ty.cost)[0] ?? null
      : printedCost(items);
    const out = {
      ...ref(c, r), x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100,
      kind: (h && h.kind) || (ty && ty.kind) || (h || ty ? null : 'plain'),
      cost: cost ?? null,
      tags: [...new Set([...splitTags(ty && ty.tags), ...splitTags(h && h.tags)])],
      type: ty ? ty.name : null,
      color: effFill(h) || null,
      label: ((h && h.items) || []).filter((it) => it.nm && it.text).map((it) => it.text)[0] || null,
      cities: [], towns: [], revenues: [], texts: [], track: [],
    };
    items.forEach((it, i) => {
      // the index used by company homes counts only this hex's own items
      const own = i - typeCount;
      if (it.t === 'city') {
        const homes = [];
        if (own >= 0) for (let slot = 0; slot < (it.slots || 1); slot++) { const id = homeOf[`${k}|${own}|${slot}`]; if (id) homes.push({ slot, company: id }); }
        out.cities.push({ name: it.name || null, slots: it.slots || 1, values: numbersIn(it.rev), revenue: it.rev || null,
          marks: splitTags(it.labels), homes, tags: splitTags(it.tags), place: placeOf(it.place) });
      } else if (it.t === 'town') {
        out.towns.push({ name: it.name || null, values: numbersIn(it.rev), revenue: it.rev || null, style: it.style || 'dot',
          tags: splitTags(it.tags), place: placeOf(it.place) });
      } else if (it.t === 'phases') {
        out.revenues.push(...phaseValues(it.values));
      } else if (it.t === 'text' && !it.nm && it.text) {
        out.texts.push(String(it.text));
      }
    });
    (h && h.track || []).forEach((t) => out.track.push({ from: t.a, to: t.b, color: t.color || null, style: t.style || null }));
    if (!out.label && out.cities.length === 1 && out.cities[0].name) out.label = out.cities[0].name;
    if (!out.label && out.towns.length === 1 && out.towns[0].name) out.label = out.towns[0].name;
    hexes.push(out);
  }

  // hexsides with a style, as the two hexes they separate (b is null at the map's edge)
  const sides = [];
  for (const ek in P.edges) {
    const e = P.edges[ek]; if (!e || !e.t || e.t === 'plain') continue;
    const { c, r, i } = edgeFromKey(ek);
    if (!exists(c, r)) continue;
    const [nc, nr] = neighbor(c, r, i);
    sides.push({ a: ref(c, r), b: exists(nc, nr) ? ref(nc, nr) : null, side: i,
      type: e.t === 'hide' ? 'merged' : e.t, label: e.label || null });
  }

  // regions drawn with the Region tool, with the hexes whose centres they contain
  const regions = (P.objects || []).filter((o) => o.t === 'region' && o.pts && o.pts.length > 2).map((o, n) => {
    const pts = o.pts.map(([px, py]) => [px + (o.x || 0), py + (o.y || 0)]);
    return { name: o.name || `Region ${n + 1}`, tags: splitTags(o.tags), color: o.fill || null,
      hexes: hexes.filter((hx) => insidePolygon(hx.x, hx.y, pts)).map((hx) => hx.id) };
  });

  const companies = (P.companies || []).map((co) => {
    let home = null;
    if (co.home) { const [hk, i, sl] = co.home.split('|'); const [c, r] = unkey(hk); home = { ...ref(c, r), city: +i, slot: +sl }; }
    return { id: co.id, abbr: co.abbr || null, name: co.name || null, kind: co.kind || null, color: co.color || null,
      textColor: co.textColor || null, home, destination: co.dest ? hexId(...unkey(co.dest)) : null,
      tokens: co.tokens ? co.tokens.count : null, tokenCosts: co.tokens ? co.tokens.costs || null : null };
  });

  // free text on the page (titles, sea names…) with its position
  const labels = (P.objects || []).filter((o) => o.t === 'text' && o.text).map((o) => ({ text: o.text, x: Math.round(o.x || 0), y: Math.round(o.y || 0) }));

  const b = hexBoundsExisting();
  return {
    format: GAME_DATA_FORMAT, version: GAME_DATA_VERSION, app: 'hexcraft', name: P.name, exported: new Date().toISOString(),
    grid: { orient: P.grid.orient, stagger: P.grid.stagger, cols: P.grid.cols, rows: P.grid.rows, size: P.grid.size, coords: P.style.coords,
      bounds: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) } },
    hexes, sides, regions, companies, labels,
  };
}

// File › Export game data: checks the map, then downloads <name>.game.json
function exportGameData() {
  closeMenus();
  const data = gameData();
  const notes = [];
  const unnamed = data.hexes.reduce((n, h) => n + h.cities.filter((c) => !c.name).length + h.towns.filter((t) => !t.name).length, 0);
  if (unnamed) notes.push(`${unnamed} cit${unnamed === 1 ? 'y or town has' : 'ies or towns have'} no name`);
  const names = {}; data.hexes.forEach((h) => [...h.cities, ...h.towns].forEach((p) => { if (p.name) names[p.name] = (names[p.name] || 0) + 1; }));
  const dup = Object.keys(names).filter((n) => names[n] > 1);
  if (dup.length) notes.push(`names used more than once: ${dup.slice(0, 6).join(', ')}${dup.length > 6 ? '…' : ''}`);
  const noKind = data.hexes.filter((h) => !h.kind).length;
  if (noKind) notes.push(`${noKind} hex${noKind === 1 ? ' has' : 'es have'} no terrain kind (set Kind on the hex type or the hex)`);
  saveBlob(slug(P.name) + '.game.json', JSON.stringify(data, null, 1), 'application/json');
  if (notes.length) toast('Exported. Check: ' + notes.join('; ') + '.', true);
}
