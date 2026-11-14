// =====================================================================
//  18xx Maker compatibility (https://github.com/18xx-maker/18xx-maker)
//  Import an 18xx Maker game JSON into Hexcraft, and export Hexcraft
//  maps, companies, privates and stock markets as an 18xx Maker game.
// =====================================================================
const MK = {
  U: 86.6025, // Hexcraft R (center→corner) in 18xx Maker units (flat-to-flat = 150)
  mapColors: { plain: '#fcefde', yellow: '#ffe600', green: '#59b578', brown: '#bf8156', gray: '#a9afb2', grey: '#a9afb2', offboard: '#ec2126', mountain: '#d1ae85', water: '#67a7c4', land: '#59b578', river: '#d4dbd7', orange: '#f58121', red: '#d1232a', white: '#ffffff', black: '#110a0c', blue: '#2165ae' },
  coColors: { appleGreen: '#95c120', black: '#030000', blue: '#2165ae', brightGreen: '#47ad33', lightGreen: '#47ad33', brown: '#7d3b2c', cherry: '#a61838', fuchsia: '#b9549c', gold: '#ca7b11', gray: '#7e8892', grey: '#7e8892', green: '#0d8743', inky: '#36286b', lavender: '#a08ac0', lightBlue: '#2c8dcd', cyan: '#2c8dcd', lightBrown: '#b96e72', lightGrey: '#abb8c1', lime: '#d2d755', natural: '#e0c6ae', navyBlue: '#365f9e', navy: '#365f9e', orange: '#e84b1c', pink: '#ec6280', red: '#d50f31', skyBlue: '#8dc8e7', tan: '#cfb98a', turmeric: '#fdc600', turquoise: '#147168', violet: '#694a98', purple: '#694a98', white: '#fbfcfb', yellow: '#fed119' },
  iconIn: { port: 'port', mining: 'mine', coal: 'coal', coalcar: 'coal', 'oil-derrick': 'oil', oilbarrel: 'oil', refinery: 'factory', steel: 'factory', tree: 'forest', wheat: 'farm', swamp: 'swamp', cactus: 'desert', bridge: 'bridge', tunnel: 'tunnel', boat: 'ship', steamboat: 'ship', ferry: 'ship', train: 'loco', mountain: 'mountain', river: 'river', water: 'water', home: 'station', 'cow-skull': 'cattle', meat: 'cattle' },
  iconOut: { port: 'port', mine: 'mining', coal: 'coal', oil: 'oil-derrick', factory: 'refinery', forest: 'tree', tree: 'tree', palm: 'tree', farm: 'wheat', swamp: 'swamp', desert: 'cactus', bridge: 'bridge', tunnel: 'tunnel', ship: 'boat', loco: 'train', station: 'home', cattle: 'cow-skull' },
  phaseIn: { yellow: 'y', green: 'g', brown: 'b', gray: 'x', grey: 'x', red: 'r', orange: 'o', white: 'w', black: 'k', blue: 'l', purple: 'u' },
  phaseOut: { y: 'yellow', g: 'green', b: 'brown', x: 'gray', r: 'red', o: 'orange', w: 'white', k: 'black', l: 'blue', u: 'purple' },
  zoneOut: { y: 'yellow', o: 'orange', b: 'brown', r: 'red', g: 'green', x: 'gray', w: 'white', k: 'black' },
};
function mkAlpha(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function mkAlphaToInt(a) { let n = 0; for (const ch of a) n = n * 26 + (ch.charCodeAt(0) - 64); return n; }
function mkParse(coord) { const m = /^([A-Z]+)(\d+)$/.exec(String(coord || '').trim()); return m ? [parseInt(m[2], 10), mkAlphaToInt(m[1])] : null; } // [x, y]
function mkCoord(c, r) { return isPointy() ? mkAlpha(r + 1) + (2 * c + 1 + (shifted(r) ? 1 : 0)) : mkAlpha(c + 1) + (2 * r + 1 + (shifted(c) ? 1 : 0)); }
const mkSideToEdge = (k) => (isPointy() ? (k + 2) % 6 : k % 6);
const mkEdgeToSide = (i) => (isPointy() ? ((i - 2 + 6) % 6) || 6 : i || 6);
function mkPosIn(o) {
  if (!o) return [0, 0];
  const A = ((o.angle || 0) * Math.PI) / 180, p = o.percent || 0;
  return [((-Math.sin(A) * p * 75) + (o.x || 0)) / MK.U, ((Math.cos(A) * p * 75) + (o.y || 0)) / MK.U];
}
function mkPosOut(it) { const o = {}; const x = Math.round((it.x || 0) * MK.U * 10) / 10, y = Math.round((it.y || 0) * MK.U * 10) / 10; if (x) o.x = x; if (y) o.y = y; return o; }
function mkColorIn(name, game, co) {
  if (!name) return null; if (/^#|^rgb/i.test(name)) return name;
  const gc = game.colors || {}; if (typeof gc[name] === 'string') return gc[name];
  if (co && gc.companies && typeof gc.companies[name] === 'string') return gc.companies[name];
  return (co ? MK.coColors[name] || MK.mapColors[name] : MK.mapColors[name] || MK.coColors[name]) || null;
}
const mkNum = (v) => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? null : n; };

// ---------------- IMPORT ----------------
function isMakerGame(obj) { return obj && typeof obj === 'object' && obj.app !== 'hexwright' && obj.app !== 'hexcraft' && obj.info && (obj.map || obj.companies || obj.stock); }
function importMaker(game) {
  const p = defaultProject();
  p.name = (game.info && (game.info.title || game.info.subtitle)) || 'Imported map';
  const horiz = game.info && game.info.orientation === 'horizontal';
  p.grid.orient = horiz ? 'flat' : 'pointy';
  p.style.coords = 'A1d'; p.style.coordPos = 'border';
  p.style.hexFill = mkColorIn('plain', game) || '#fcefde'; p.style.bg = '#ffffff'; p.style.gridColor = '#444444';
  p.palette = [...new Set(['#fcefde', '#ffe600', '#59b578', '#bf8156', '#a9afb2', '#ec2126', '#67a7c4', '#d1ae85', ...DEFAULT_PALETTE])].slice(0, 24);
  const currency = (game.info && game.info.currency) || '$#';
  const money = (v) => (v == null || v === '' ? '' : /^[0-9.]+$/.test(String(v)) ? currency.replace('#', v) : String(v));
  const gm = Array.isArray(game.map) ? game.map[0] : game.map;
  const groups = (gm && gm.hexes) || [];
  // coordinates → grid
  const all = []; groups.forEach((g) => (g.hexes || []).forEach((h) => { const xy = mkParse(h); if (xy) all.push(xy); }));
  const keep = P; P = p; // geometry helpers read P
  try {
    if (all.length) {
      const [fx, fy] = all[0]; p.grid.stagger = (fx + fy) % 2 === 0 ? 'odd' : 'even';
      const toCR = ([x, y]) => (horiz ? [y - 1, Math.floor((x - 1) / 2)] : [Math.floor((x - 1) / 2), y - 1]);
      let maxC = 0, maxR = 0; all.forEach((xy) => { const [c, r] = toCR(xy); maxC = Math.max(maxC, c); maxR = Math.max(maxR, r); });
      p.grid.cols = maxC + 1; p.grid.rows = maxR + 1;
      const present = new Set(all.map((xy) => key(...toCR(xy))));
      for (let r = 0; r < p.grid.rows; r++) for (let c = 0; c < p.grid.cols; c++) if (!present.has(key(c, r))) p.voids[key(c, r)] = 1;
      const pendingHomes = []; // [abbr, k, itemIdx, slot]
      const typeCache = new Map();
      groups.forEach((g) => {
        const built = mkBuildHex(g, game, money);
        const coords = (g.hexes || []).map(mkParse).filter(Boolean).map(toCR);
        // plain repeated terrain/color groups become hex types
        const typeable = coords.length >= 3 && !built.track.length && !built.items.some((i) => ['city', 'town', 'phases'].includes(i.t) || i.nm) && !built.homes.length && !built.edges.length;
        let typeId = null;
        if (typeable && (built.items.length || (built.fill && built.fill !== p.style.hexFill))) {
          const sig = JSON.stringify([built.fill, built.items]);
          if (!typeCache.has(sig)) {
            const nm = built.items.find((i) => i.t === 'icon') ? (ICONS[built.items.find((i) => i.t === 'icon').icon] || {}).label : (Object.entries(MK.mapColors).find(([, v]) => v === built.fill) || ['Terrain'])[0];
            const cost = built.items.find((i) => i.t === 'text' && /\d/.test(i.text));
            const t = { id: uid('t'), name: `${nm[0].toUpperCase()}${nm.slice(1)}${cost ? ' ' + cost.text : ''}`, fill: built.fill || null, items: built.items };
            p.types.push(t); typeCache.set(sig, t.id);
          }
          typeId = typeCache.get(sig);
        }
        coords.forEach(([c, r]) => {
          const k = key(c, r);
          const h = p.hexes[k] || (p.hexes[k] = { items: [], track: [] });
          if (typeId) { h.type = typeId; }
          else {
            if (built.fill && built.fill !== p.style.hexFill) h.fill = built.fill;
            const base = h.items.length;
            h.items.push(...clone(built.items));
            h.track.push(...built.track.map((t) => ({ ...t, a: shiftEp(t.a, base), b: shiftEp(t.b, base) })));
            built.homes.forEach(([abbr, ii, sl]) => pendingHomes.push([abbr, k, ii + base, sl]));
          }
          built.edges.forEach(([i, e]) => (p.edges[edgeKey(c, r, i)] = e));
          if (built.trackFromSides.length) built.trackFromSides.forEach(([k1, k2]) => mkAddTrack(h, k1, k2));
        });
      });
      // companies
      p.companies = (game.companies || []).map((mc, i) => mkCompanyIn(mc, i, game, money));
      pendingHomes.forEach(([abbr, k, ii, sl]) => { const co = p.companies.find((c) => c.abbr === abbr); if (co && !co.home) co.home = `${k}|${ii}|${sl}`; });
      p.companies.forEach((co, i) => {
        const mc = game.companies[i]; const hm = Array.isArray(mc.home) ? mc.home[0] : mc.home;
        if (!co.home && hm) { const xy = mkParse(hm); if (xy) { const k = key(...toCR(xy)); const h = p.hexes[k]; const ci = h ? h.items.findIndex((it) => it.t === 'city') : -1; if (ci >= 0) co.home = `${k}|${ci}|0`; } }
        if (mc.destination) { const xy = mkParse(mc.destination); if (xy) co.dest = key(...toCR(xy)); }
      });
    } else {
      p.companies = (game.companies || []).map((mc, i) => mkCompanyIn(mc, i, game, money));
    }
    (game.privates || []).forEach((pv, i) => {
      const co = newCompany(p.companies.length); co.kind = 'private'; co.name = pv.name || `Private ${i + 1}`; co.abbr = pv.id || ('P' + (i + 1));
      co.cost = money(pv.price ?? pv.cost ?? ''); co.revenue = money(pv.revenue ?? ''); co.ability = pv.description || pv.note || '';
      co.color = '#5d4037'; co.logo.style = 'mono'; p.companies.push(co);
    });
    p.compStyle = defaultCompStyle(); p.compStyle.game = p.name;
    // stock market
    const st = game.stock;
    if (st && Array.isArray(st.market) && st.market.length) {
      const gb = hexBoundsExisting(); const x = gb.x + gb.w + 120, y = gb.y;
      const legend = st.legend || [];
      const zoneOf = (name) => { if (!name) return ''; const z = Object.entries(MK.zoneOut).find(([, n]) => n === name); return z ? z[0] : ''; };
      const paints = {};
      const cellTok = (cell, k) => {
        if (cell == null) return '.';
        const o = typeof cell === 'object' ? cell : { label: cell };
        const v = String(o.label ?? o.value ?? '').replace(/\s+/g, '_') || '0';
        let colName = o.par ? (st.par && st.par.color) || 'gray' : Number.isInteger(o.legend) && legend[o.legend] ? legend[o.legend].color : o.color || (st.cell && st.cell.color) || '';
        let z = zoneOf(colName);
        if (colName && !z) { const hex = mkColorIn(colName, game); if (hex) paints[k] = hex; }
        const arr = Array.isArray(o.arrow) ? o.arrow[0] : o.arrow;
        const codes = z + (o.par ? 'p' : '') + ({ down: 'v', up: '^', left: '<', right: '>' }[arr] || '');
        return codes ? (/\d$/.test(v) ? v + codes : v + ':' + codes) : v;
      };
      const plainHex = mkColorIn('plain', game) || '#fcefde';
      if (st.type === '2D' || Array.isArray(st.market[0])) {
        const rows = st.market.map((row, r) => (Array.isArray(row) ? row : [row]).map((cell, c) => cellTok(cell, r + ',' + c)).join(' '));
        p.objects.push({ id: uid('o'), t: 'market2', x, y, title: 'Stock market', cw: 46, ch: 40, fs: 13, valPos: 'tl', zones: { y: mkColorIn('yellow', game), o: mkColorIn('orange', game), b: mkColorIn('brown', game), x: mkColorIn('gray', game), r: mkColorIn('red', game), g: mkColorIn('green', game) }, cellBg: plainHex, parColor: mkColorIn((st.par && st.par.color) || 'gray', game) || '#a9afb2', paint: paints, data: rows.join('\n') });
      } else {
        p.objects.push({ id: uid('o'), t: 'market1', x, y, title: 'Stock market', layout: 'wrap', perRow: 16, cw: 46, ch: 40, fs: 13, zones: { y: mkColorIn('yellow', game), o: mkColorIn('orange', game), b: mkColorIn('brown', game), x: mkColorIn('gray', game), r: mkColorIn('red', game), g: mkColorIn('green', game) }, cellBg: plainHex, parColor: mkColorIn((st.par && st.par.color) || 'gray', game) || '#a9afb2', paint: paints, data: st.market.map((cell, i) => cellTok(cell, String(i))).join(' ') });
      }
    }
    if (game.info && game.info.title) { const gb = hexBoundsExisting(); p.objects.push({ id: uid('o'), t: 'text', x: gb.x, y: gb.y - 90, text: game.info.title, fs: 44, bold: true, font: 'serif', color: '#222' }); }
  } finally { P = keep; }
  return p;
}
function shiftEp(ep, base) { if (ep && ep[0] === 'i') { const [a, b] = ep.slice(1).split('.'); return 'i' + (+a + base) + (b != null ? '.' + b : ''); } return ep; }
function mkAddTrack(h, ka, kb) { const a = 'e' + mkSideToEdge(ka), b = 'e' + mkSideToEdge(kb); if (!h.track.some((t) => (t.a === a && t.b === b) || (t.a === b && t.b === a))) h.track.push({ a, b }); }
function mkBuildHex(g, game, money) {
  const out = { fill: null, items: [], track: [], trackFromSides: [], homes: [], edges: [] };
  out.fill = mkColorIn(g.color || 'plain', game);
  const pos = (o, dx = 0, dy = 0) => { const has = o && (o.angle != null || o.percent != null || o.x != null || o.y != null); const [x, y] = has ? mkPosIn(o) : [dx, dy]; return { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 }; };
  const cities = g.cities || [];
  cities.forEach((ct, ci) => {
    const size = typeof ct.size === 'number' ? ct.size : parseInt(ct.size, 10) || 1;
    const dflt = cities.length > 1 ? [(ci - (cities.length - 1) / 2) * 0.55, 0] : [0, 0];
    const it = { t: 'city', slots: [1, 2, 3, 4, 6].includes(size) ? size : Math.min(4, size), ...pos(ct, ...dflt), rev: '' };
    if (ct.name && ct.name.name) it.name = ct.name.name;
    (ct.companies || []).forEach((co, sl) => { const ab = typeof co === 'string' ? co : co && co.label; if (ab) out.homes.push([ab, out.items.length, sl]); });
    out.items.push(it);
  });
  (g.centerTowns || []).forEach((t) => { const it = { t: 'town', style: 'dot', ...pos(t) }; if (t.name && t.name.name) it.name = t.name.name; out.items.push(it); });
  (g.towns || []).forEach((t) => { const it = { t: 'town', style: 'bar', ...pos(t), r: (t.rotation || t.rotate || 0) }; if (t.name && t.name.name) it.name = t.name.name; out.items.push(it); });
  // revenue values attach to the first city/town, else a badge
  (g.values || []).forEach((v, vi) => {
    const hasPos = v.angle != null || v.percent != null || v.x != null || v.y != null;
    const host = out.items.find((i) => (i.t === 'city' || i.t === 'town') && !i.rev);
    if (host && vi === 0 && !hasPos) host.rev = String(v.value);
    else out.items.push({ t: 'text', text: String(v.value), style: 'circle', size: 0.17, bold: true, ...pos(v, -0.5, -0.4) });
  });
  (g.terrain || []).forEach((t) => {
    const p0 = pos(t, 0, -0.1); const cost = t.cost != null && t.cost !== '' ? money(t.cost) : '';
    if (t.type === 'mountain') { out.items.push({ t: 'icon', icon: 'mountain1', s: t.size === 'large' ? 0.5 : t.size === 'small' ? 0.32 : 0.4, ...p0 }); if (cost) out.items.push({ t: 'text', text: cost, style: 'plain', size: 0.2, x: p0.x, y: Math.round((p0.y + 0.32) * 1000) / 1000 }); }
    else if (t.type === 'water' || t.type === 'river') { if (cost) out.items.push({ t: 'text', text: cost, style: 'wave', size: 0.22, color: '#1d4f7a', ...p0 }); else out.items.push({ t: 'icon', icon: 'river', s: 0.6, ...p0 }); }
    else if (ICONS[t.type] || MK.iconIn[t.type]) { out.items.push({ t: 'icon', icon: ICONS[t.type] ? t.type : MK.iconIn[t.type], s: 0.55, ...p0 }); if (cost) out.items.push({ t: 'text', text: cost, style: 'plain', size: 0.22, x: p0.x, y: p0.y + 0.4 }); }
    else if (cost) out.items.push({ t: 'text', text: cost, style: 'triangle', size: 0.2, ...p0 });
  });
  (g.icons || []).forEach((ic) => { const key2 = MK.iconIn[ic.type] || (ICONS[ic.type] ? ic.type : null); if (key2) out.items.push({ t: 'icon', icon: key2, s: 0.4, ...pos(ic, 0.4, -0.4) }); });
  (g.labels || []).forEach((lb) => out.items.push({ t: 'text', text: lb.label, style: 'plain', size: lb.size ? lb.size / 86 : 0.32, ...pos(lb, -0.55, -0.4) }));
  (g.names || []).forEach((nm) => nm.name && out.items.push({ t: 'text', nm: true, text: nm.name, style: 'plain', size: 0.22, ...pos(nm, 0, 0.6) }));
  (g.companies || []).forEach((co) => co.label && out.items.push({ t: 'text', text: co.label, style: 'circle', size: 0.18, ...pos(co, 0.5, 0.45) }));
  if (g.offBoardRevenue) {
    const ob = g.offBoardRevenue;
    const vals = (ob.revenues || []).map((rv) => (MK.phaseIn[rv.color] || 'w') + String(rv.cost ?? rv.value ?? rv.revenue ?? '')).join(' ');
    const pp = pos(ob, 0, -0.42);
    out.items.push({ t: 'phases', values: vals, s: 0.62, ...pp });
    if (ob.name && ob.name.name) out.items.push({ t: 'text', nm: true, text: ob.name.name, style: 'plain', size: 0.13, x: pp.x, y: Math.round((pp.y - 0.2) * 1000) / 1000, color: Color.contrast(out.fill || '#ec2126') });
  }
  // track
  (g.track || []).forEach((t) => {
    if (t.start != null || (t.end != null && t.end < 1) || ['stub', 'stop', 'mid', 'straightStop', 'gentleStop', 'gentleStopRev', 'sharpStop', 'sharpStopRev', 'custom', 'bent'].includes(t.type)) return;
    const k = t.side || 1;
    if (Array.isArray(t.sides) && t.sides.length >= 2) { out.trackFromSides.push([t.sides[0], t.sides[1]]); return; }
    const style = t.gauge === 'narrow' || t.gauge === 'dashed' ? { style: 'narrow' } : t.gauge === 'dual' ? { style: 'dual' } : {};
    if (t.type === 'straight' || t.type === 'straightLeft' || t.type === 'straightRight') out.track.push({ a: 'e' + mkSideToEdge(k), b: 'e' + mkSideToEdge(((k + 2) % 6) + 1), ...style });
    else if (t.type === 'gentle') out.track.push({ a: 'e' + mkSideToEdge(k), b: 'e' + mkSideToEdge(((k + 1) % 6) + 1), ...style });
    else if (t.type === 'sharp') out.track.push({ a: 'e' + mkSideToEdge(k), b: 'e' + mkSideToEdge((k % 6) + 1), ...style });
    else if (t.type === 'offboard') out.items.push({ t: 'wedge', e: mkSideToEdge(k), x: 0, y: 0 });
    else { // to the city / center (18xx Maker draws these to the hex center, under the city)
      const ei = mkSideToEdge(k);
      const centers = out.items.map((it, ii) => [it, ii]).filter(([it]) => it.t === 'city' || it.t === 'town');
      let ep = 'c';
      if (centers.length === 1) { const [it, ii] = centers[0]; if (Math.hypot(it.x, it.y) > 0.15) ep = it.t === 'city' ? `i${ii}.0` : 'i' + ii; }
      else if (centers.length > 1) {
        const a = (isPointy() ? 60 * ei : 60 * ei + 30) * Math.PI / 180, mid = [Math.cos(a) * 0.866, Math.sin(a) * 0.866]; let bd = Infinity;
        centers.forEach(([it, ii]) => { if (Math.hypot(it.x, it.y) < 0.15) return; const d = Math.hypot(it.x - mid[0], it.y - mid[1]); if (d < bd) { bd = d; ep = it.t === 'city' ? `i${ii}.0` : 'i' + ii; } });
      }
      out.track.push({ a: 'e' + ei, b: ep, ...style });
    }
  });
  out.track.forEach((t) => (t.casing = '#ffffff'));
  (g.borders || []).forEach((b) => { const c = mkColorIn(b.color, game) || '#222222'; out.edges.push([mkSideToEdge(b.side), { t: b.dashed ? 'border' : 'wall', color: c }]); });
  if (Array.isArray(g.removeBorders)) g.removeBorders.forEach((sd) => out.edges.push([mkSideToEdge(sd), { t: 'hide' }]));
  return out;
}
function citySlotPositionsLocal(it) { const lay = CITY_LAYOUT[it.slots] || CITY_LAYOUT[1]; const rs = 0.24 * (it.s || 1); return lay.map(([x, y]) => [x * rs, y * rs]); }
function mkCompanyIn(mc, i, game, money) {
  const co = newCompany(i);
  co.name = mc.name || mc.abbrev || `Company ${i + 1}`; co.abbr = mc.abbrev || co.abbr;
  co.color = mkColorIn(mc.color, game, true) || co.color; co.kind = mc.minor ? 'minor' : 'major';
  co.logo.style = 'disc';
  if (Array.isArray(mc.shares) && mc.shares.length) {
    const pcts = []; mc.shares.forEach((s) => { const pct = mkNum(s.percent); for (let q = 0; q < (s.quantity || 0); q++) pcts.push(pct || 10); });
    if (pcts.length) co.shares.custom = pcts.join(',');
    if (mc.minor) co.shares.minorCerts = true;
  }
  if (Array.isArray(mc.tokens)) { co.tokens.count = mc.tokens.length; co.tokens.costs = mc.tokens.map((t) => (typeof t === 'object' ? (t.cost ?? '') : t)).map((t) => (/^[0-9]+$/.test(String(t)) ? money(t) : String(t))).join(', '); }
  if (mc.ability) co.notes = mc.ability;
  return co;
}

// ---------------- EXPORT ----------------
function exportMaker() {
  const game = { info: { title: P.name, orientation: isPointy() ? 'vertical' : 'horizontal', currency: '$#' }, colors: { plain: P.style.hexFill === 'none' ? '#ffffff' : P.style.hexFill } };
  const custom = {}; let cn = 0;
  const near = (hex, table) => { const [r, g, b] = Color.parse(hex); let best = null, bd = 1e9; for (const [n, v] of Object.entries(table)) { const [r2, g2, b2] = Color.parse(v); const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2; if (d < bd) { bd = d; best = n; } } return [best, Math.sqrt(bd)]; };
  const colorName = (hex, table = MK.mapColors) => {
    if (!hex) return 'plain'; if (hex === P.style.hexFill) return 'plain';
    const [n, d] = near(hex, table); if (d < 18) return n;
    const k = hex.toLowerCase(); if (!custom[k]) custom[k] = 'hw' + (++cn); game.colors[custom[k]] = hex; return custom[k];
  };
  const groups = new Map();
  for (let r = 0; r < P.grid.rows; r++) for (let c = 0; c < P.grid.cols; c++) {
    if (!exists(c, r)) continue;
    const k = key(c, r), h = P.hexes[k];
    const def = mkHexOut(c, r, h, colorName);
    const sig = JSON.stringify(def);
    if (!groups.has(sig)) groups.set(sig, { ...def, hexes: [] });
    groups.get(sig).hexes.push(mkCoord(c, r));
  }
  game.map = { hexes: [...groups.values()] };
  const majors = (P.companies || []).filter((c) => c.kind !== 'private');
  if (majors.length) game.companies = majors.map((co) => {
    const out = { name: co.name, abbrev: co.abbr || co.name.slice(0, 3).toUpperCase(), color: colorName(co.color, MK.coColors) };
    if (co.kind === 'minor') out.minor = true;
    const certs = certList(co).filter((c) => !c.cube && !c.priv);
    if (certs.length) {
      const sh = [{ quantity: 1, label: "President's Certificate", percent: certs[0].pct, shares: certs[0].shares, president: true }];
      const rest = {}; certs.slice(1).forEach((c) => (rest[c.pct] = (rest[c.pct] || { n: 0, shares: c.shares }), rest[c.pct].n++));
      Object.entries(rest).forEach(([pct, v]) => sh.push({ quantity: v.n, percent: +pct, shares: v.shares }));
      out.shares = sh;
    }
    if (co.kind !== 'cube' && co.tokens && co.tokens.count) {
      const costs = String(co.tokens.costs || '').split(',').map((s) => s.trim());
      out.tokens = Array.from({ length: co.tokens.count }, (_, i) => { const t = costs[i] || ''; if (i === 0 && (!t || /home|free/i.test(t))) return 'Free'; const n = mkNum(t); return n != null && /^[^0-9]*\d+[^0-9]*$/.test(t) ? n : t || 0; });
    }
    if (co.home) { const [hk] = co.home.split('|'); const [c, r] = unkey(hk); out.home = mkCoord(c, r); }
    if (co.dest) { const [c, r] = unkey(co.dest); out.destination = mkCoord(c, r); }
    if (co.notes) out.ability = co.notes;
    return out;
  });
  const privs = (P.companies || []).filter((c) => c.kind === 'private');
  if (privs.length) game.privates = privs.map((co) => { const o = { name: co.name }; const pr = mkNum(co.cost), rv = mkNum(co.revenue); if (pr != null) o.price = pr; if (rv != null) o.revenue = rv; if (co.ability) o.description = co.ability; return o; });
  const mkt = P.objects.find((o) => o.t === 'market2') || P.objects.find((o) => o.t === 'market1');
  if (mkt) {
    const cellOut = (cell, k) => {
      if (!cell) return null;
      const n = mkNum(cell.v); const isNum = n != null && String(n) === String(cell.v);
      const col = (mkt.paint && mkt.paint[k]) ? colorName(mkt.paint[k]) : cell.z ? (MK.zoneOut[cell.z] || colorName(zoneColor(mkt, cell.z))) : null;
      if (!col && !cell.p && !cell.a && isNum) return n;
      const o = { label: cell.v }; if (col) o.color = col; if (cell.p) o.par = true; if (cell.a) o.arrow = cell.a; return o;
    };
    if (mkt.t === 'market2') game.stock = { type: '2D', market: parseMarket2(mkt).map((row, r) => row.map((cell, c) => cellOut(cell, r + ',' + c))) };
    else game.stock = { type: '1D', market: parseMarket1(mkt).map((cell, i) => cellOut(cell, String(i))) };
  }
  return game;
}
function mkHexOut(c, r, h, colorName) {
  const def = {};
  const fill = effFill(h);
  def.color = fill ? colorName(fill) : 'plain';
  if (!h) return def;
  const ty = hexType(h); const items = [...(ty ? ty.items : []).map((it) => ({ it, own: false })), ...(h.items || []).map((it, i) => ({ it, own: true, i }))];
  const k = key(c, r);
  const homes = typeof homesAt === 'function' ? (i) => homesAt(k, i) : () => ({});
  const add = (prop, v) => (def[prop] = def[prop] || []).push(v);
  let mountainSeen = false;
  items.forEach(({ it, own, i }) => {
    const pos = mkPosOut(it);
    switch (it.t) {
      case 'city': {
        const o = { ...(it.slots > 1 ? { size: it.slots } : {}), ...pos };
        if (it.name) o.name = { name: it.name };
        if (own) { const hm = homes(i); const n = (CITY_LAYOUT[it.slots] || [0]).length; const list = Array.from({ length: n }, (_, sl) => (hm[sl] ? hm[sl].abbr : null)); if (list.some(Boolean)) o.companies = list; }
        add('cities', o); if (it.rev) add('values', { value: mkNum(it.rev) ?? it.rev }); break;
      }
      case 'town': {
        const o = { ...pos }; if (it.name) o.name = { name: it.name };
        if (it.style === 'bar') { if (it.r) o.rotation = it.r; add('towns', o); } else add('centerTowns', o);
        if (it.rev) add('values', { value: mkNum(it.rev) ?? it.rev }); break;
      }
      case 'icon': {
        if (['mountain', 'mountain1', 'hills', 'cliff'].includes(it.icon)) { add('terrain', { type: 'mountain', ...pos }); mountainSeen = true; }
        else if (['water', 'river', 'lake'].includes(it.icon)) add('terrain', { type: 'water', ...pos });
        else if (MK.iconOut[it.icon]) add('icons', { type: MK.iconOut[it.icon], ...pos });
        break;
      }
      case 'text': {
        const t = String(it.text || '').trim(); if (!t) break; const n = mkNum(t);
        if (it.nm) { add('names', { name: t, ...pos }); break; }
        if (it.style === 'triangle' && n != null) { const tr = (def.terrain || []).find((x) => x.type === 'mountain' && x.cost == null); if (tr) tr.cost = n; else add('terrain', { type: 'mountain', cost: n, ...pos }); break; }
        if (it.style === 'wave' && n != null) { const tr = (def.terrain || []).find((x) => x.type === 'water' && x.cost == null); if (tr) tr.cost = n; else add('terrain', { type: 'water', cost: n, ...pos }); break; }
        if (/^\$?\d+$/.test(t) && n != null && (def.terrain || []).some((x) => x.cost == null)) { (def.terrain.find((x) => x.cost == null)).cost = n; break; }
        if (it.style === 'circle' && n != null) { add('values', { value: n, ...pos }); break; }
        add('labels', { label: t, ...pos }); break;
      }
      case 'wedge': add('track', { type: 'offboard', side: mkEdgeToSide((it.e || 0) % 6) }); break;
      case 'phases': {
        const toks = String(it.values || '').trim().split(/[\s,]+/).filter(Boolean);
        def.offBoardRevenue = { revenues: toks.map((tk) => { const m = tk.match(/^([a-z])?(.*)$/i); const col = m && m[1] && MK.phaseOut[m[1].toLowerCase()] && m[2] !== '' ? MK.phaseOut[m[1].toLowerCase()] : 'white'; return { color: col, cost: m && m[1] && m[2] !== '' ? m[2] : tk }; }), ...pos };
        const nmIt = items.find((x) => x.it.nm); if (nmIt) def.offBoardRevenue.name = { name: nmIt.it.text };
        break;
      }
    }
  });
  if (def.offBoardRevenue && def.names) delete def.names;
  // track
  (h.track || []).forEach((t) => {
    const ea = t.a[0] === 'e', eb = t.b[0] === 'e';
    const g = t.style === 'narrow' ? { gauge: 'narrow' } : t.style === 'dual' ? { gauge: 'dual' } : {};
    if (ea && eb && (t.geo || P.style.trackGeo || 'curve') === 'lawson') { add('track', { side: mkEdgeToSide(+t.a.slice(1)), ...g }); add('track', { side: mkEdgeToSide(+t.b.slice(1)), ...g }); }
    else if (ea && eb) {
      const ka = mkEdgeToSide(+t.a.slice(1)), kb = mkEdgeToSide(+t.b.slice(1)); const d = (kb - ka + 6) % 6;
      if (d === 3) add('track', { type: 'straight', side: Math.min(ka, kb), ...g });
      else if (d === 2) add('track', { type: 'gentle', side: ka, ...g }); else if (d === 4) add('track', { type: 'gentle', side: kb, ...g });
      else if (d === 1) add('track', { type: 'sharp', side: ka, ...g }); else if (d === 5) add('track', { type: 'sharp', side: kb, ...g });
    } else if (ea || eb) add('track', { side: mkEdgeToSide(+(ea ? t.a : t.b).slice(1)), ...g });
  });
  // borders owned by this hex
  for (let i = 0; i < 6; i++) {
    const ek = edgeKey(c, r, i); const e = P.edges[ek]; if (!e || ek !== `${c},${r},${i}`) continue;
    if (e.t === 'hide') (def.removeBorders = def.removeBorders || []).push(mkEdgeToSide(i));
    else { const b = { side: mkEdgeToSide(i), color: colorName(e.color || EDGE_STYLES[e.t].color) }; if (e.t === 'border' || e.t === 'dotted') b.dashed = true; add('borders', b); }
  }
  if (h.outline && h.outline.color) for (let sd = 1; sd <= 6; sd++) add('borders', { side: sd, color: colorName(h.outline.color) });
  return def;
}
