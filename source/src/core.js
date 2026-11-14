'use strict';
// =====================================================================
//  Hexcraft core: state, geometry, SVG string rendering
// =====================================================================
const SQ3 = Math.sqrt(3);
const SVGNS = 'http://www.w3.org/2000/svg';
const FONTS = {
  sans: 'Helvetica, Arial, sans-serif',
  serif: 'Times New Roman, Times, serif',
  mono: 'Courier New, Courier, monospace',
};
const ZONE_CODES = {
  y: ['Yellow', '#fbe27a'], o: ['Orange', '#f8b26a'], b: ['Brown', '#c99668'], r: ['Red', '#ef7a6f'],
  g: ['Green', '#9fd48a'], l: ['Blue', '#8cc4ef'], u: ['Purple', '#c3a3e0'], x: ['Gray', '#c4c4c4'],
  w: ['White', '#ffffff'], k: ['Black', '#333333'],
};
const PHASE_COLORS = { y: '#f6dc4a', g: '#6fbf5a', b: '#c07a45', x: '#a9a9a9', r: '#e0443e', w: '#ffffff', o: '#f39a3c', u: '#8e5bb5', l: '#4a9bd9', k: '#222222' };

const uid = (p = '') => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const clone = (o) => JSON.parse(JSON.stringify(o));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n2 = (v) => (Math.round(v * 100) / 100).toString();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let P = null; // the project

function defaultProject() {
  return {
    app: 'hexcraft', v: 1, id: uid('m'), name: 'Untitled map',
    grid: { cols: 14, rows: 10, size: 40, orient: 'pointy', stagger: 'odd' },
    style: {
      bg: '#f4efe2', hexFill: '#ece4cc', hexOpacity: 1, gridColor: '#6d6455', gridWidth: 1.2,
      coords: 'A1d', coordPos: 'border', coordColor: '#4a4338', coordSize: 1, pad: 40,
      clip: { on: false, t: 0.5, r: 0.5, b: 0.5, l: 0.5, line: '#3a332a', lw: 2.5 }, trackGeo: 'curve',
    },
    hexes: {}, voids: {}, edges: {}, objects: [], bgImage: null, types: [], companies: [], compStyle: null,
    palette: [...DEFAULT_PALETTE], assets: {},
  };
}
const DEFAULT_PALETTE = [
  '#ece4cc', '#ffffff', '#f6dc4a', '#6fbf5a', '#c07a45', '#a9a9a9', '#e0443e', '#79b8e8',
  '#b9d77d', '#d8b77e', '#a87b4f', '#7a5535', '#3b6fc4', '#8a4fb0', '#2b2b2b', '#f39a3c',
];

// ---------------- Geometry ----------------
const R = () => P.grid.size;
const isPointy = () => P.grid.orient === 'pointy';
function shifted(i) { return P.grid.stagger === 'odd' ? (i & 1) === 1 : (i & 1) === 0; }
function center(c, r) {
  const s = R();
  if (isPointy()) { const w = SQ3 * s; return [w * (c + (shifted(r) ? 0.5 : 0)) + w / 2, 1.5 * s * r + s]; }
  const h = SQ3 * s; return [1.5 * s * c + s, h * (r + (shifted(c) ? 0.5 : 0)) + h / 2];
}
function cornerAngle(i) { return ((isPointy() ? 60 * i - 30 : 60 * i) * Math.PI) / 180; }
function edgeAngle(i) { return ((isPointy() ? 60 * i : 60 * i + 30) * Math.PI) / 180; }
function corners(cx, cy, s = R()) {
  const out = [];
  for (let i = 0; i < 6; i++) { const a = cornerAngle(i); out.push([cx + s * Math.cos(a), cy + s * Math.sin(a)]); }
  return out;
}
function hexPathAt(cx, cy, s = R()) {
  const c = corners(cx, cy, s);
  return 'M' + c.map((p) => n2(p[0]) + ' ' + n2(p[1])).join('L') + 'Z';
}
let _relHex = null, _relKey = '';
function relHexPath() {
  const k = P.grid.orient + R();
  if (k === _relKey) return _relHex;
  const c = corners(0, 0);
  let s = '';
  for (let i = 1; i < 6; i++) s += 'l' + n2(c[i][0] - c[i - 1][0]) + ' ' + n2(c[i][1] - c[i - 1][1]);
  _relKey = k; _relHex = { start: c[0], d: s + 'z' };
  return _relHex;
}
function pixelToHex(x, y) {
  const s = R(); let best = null, bd = Infinity;
  if (isPointy()) {
    const w = SQ3 * s, r0 = Math.round((y - s) / (1.5 * s));
    for (let r = r0 - 1; r <= r0 + 1; r++) {
      const c0 = Math.round((x - w / 2) / w - (shifted(r) ? 0.5 : 0));
      for (let c = c0 - 1; c <= c0 + 1; c++) {
        const [hx, hy] = center(c, r), d = (hx - x) ** 2 + (hy - y) ** 2;
        if (d < bd) { bd = d; best = [c, r]; }
      }
    }
  } else {
    const h = SQ3 * s, c0 = Math.round((x - s) / (1.5 * s));
    for (let c = c0 - 1; c <= c0 + 1; c++) {
      const r0 = Math.round((y - h / 2) / h - (shifted(c) ? 0.5 : 0));
      for (let r = r0 - 1; r <= r0 + 1; r++) {
        const [hx, hy] = center(c, r), d = (hx - x) ** 2 + (hy - y) ** 2;
        if (d < bd) { bd = d; best = [c, r]; }
      }
    }
  }
  return best;
}
const key = (c, r) => c + ',' + r;
const unkey = (k) => k.split(',').map(Number);
const inGrid = (c, r) => c >= 0 && r >= 0 && c < P.grid.cols && r < P.grid.rows;
const exists = (c, r) => inGrid(c, r) && !P.voids[key(c, r)];
function neighbor(c, r, i) {
  const [x, y] = center(c, r), a = edgeAngle(i), d = SQ3 * R();
  return pixelToHex(x + d * Math.cos(a), y + d * Math.sin(a));
}
function edgeKey(c, r, i) {
  const [nc, nr] = neighbor(c, r, i);
  if (r < nr || (r === nr && c < nc)) return c + ',' + r + ',' + i;
  return nc + ',' + nr + ',' + ((i + 3) % 6);
}
function edgeFromKey(k) { const [c, r, i] = k.split(',').map(Number); return { c, r, i }; }
function edgeMidLocal(i) { const a = edgeAngle(i), d = (SQ3 / 2) * R(); return [d * Math.cos(a), d * Math.sin(a)]; }
function nearestEdge(c, r, x, y) {
  const [cx, cy] = center(c, r); let best = 0, bd = Infinity;
  for (let i = 0; i < 6; i++) {
    const [mx, my] = edgeMidLocal(i), d = (cx + mx - x) ** 2 + (cy + my - y) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return { i: best, d: Math.sqrt(bd) };
}
function gridBounds() {
  const s = R(); const g = P.grid;
  if (isPointy()) { const w = SQ3 * s; return { x: 0, y: 0, w: w * g.cols + w / 2, h: 1.5 * s * (g.rows - 1) + 2 * s }; }
  const h = SQ3 * s; return { x: 0, y: 0, w: 1.5 * s * (g.cols - 1) + 2 * s, h: h * g.rows + h / 2 };
}
function hexBoundsExisting() {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const s = R(), hw = isPointy() ? (SQ3 / 2) * s : s, hh = isPointy() ? s : (SQ3 / 2) * s;
  const g = P.grid;
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
    if (P.voids[key(c, r)]) continue;
    const [x, y] = center(c, r);
    if (x - hw < x0) x0 = x - hw; if (x + hw > x1) x1 = x + hw;
    if (y - hh < y0) y0 = y - hh; if (y + hh > y1) y1 = y + hh;
  }
  if (x0 === Infinity) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// ---------------- Coordinates ----------------
function letters(n) { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function coordParts(c, r) {
  const st = P.style.coords;
  if (st === 'A1') return [letters(r), String(c + 1)];
  if (st === 'A1d') {
    if (isPointy()) return [letters(r), String(2 * c + 1 + (shifted(r) ? 1 : 0))];
    return [String(2 * r + 1 + (shifted(c) ? 1 : 0)), letters(c)]; // flat: letters across the top, doubled numbers down the side (18xx Maker style)
  }
  if (st === '1A') return [String(r + 1), letters(c)];
  if (st === '0101') return [String(r + 1).padStart(2, '0'), String(c + 1).padStart(2, '0')];
  if (st === 'num') return [String(r + 1), String(c + 1)];
  return null;
}
function coordLabel(c, r) {
  const p = coordParts(c, r); if (!p) return '';
  const st = P.style.coords;
  if (st === '0101') return p[1] + p[0];
  if (st === 'num') return p[1] + '.' + p[0];
  if (st === '1A') return p[1] + p[0];
  if (st === 'A1d' && !isPointy()) return p[1] + p[0];
  return p[0] + p[1];
}

// ---------------- Text measurement ----------------
const _mctx = document.createElement('canvas').getContext('2d');
function measure(text, fs, bold, fam = 'sans', italic = false) {
  _mctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${fs}px ${FONTS[fam] || FONTS.sans}`;
  return _mctx.measureText(String(text)).width;
}
function textEl(x, y, str, o = {}) {
  const fs = o.fs || 12, fam = FONTS[o.fam || 'sans'] || FONTS.sans;
  const lines = String(str).split('\n');
  const lh = fs * (o.lh || 1.2);
  let y0 = y;
  if (o.vcenter) y0 = y - ((lines.length - 1) * lh) / 2 + fs * 0.35;
  const attrs = `font-family="${fam}" font-size="${n2(fs)}"${o.bold ? ' font-weight="bold"' : ''}${o.italic ? ' font-style="italic"' : ''} fill="${o.fill || '#111'}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.extra || ''}`;
  if (lines.length === 1) return `<text x="${n2(x)}" y="${n2(y0)}" ${attrs}>${esc(lines[0])}</text>`;
  return `<text ${attrs}>` + lines.map((l, i) => `<tspan x="${n2(x)}" y="${n2(y0 + i * lh)}">${esc(l) || ' '}</tspan>`).join('') + '</text>';
}

// ---------------- Assets ----------------
function assetHref(ref, forPdf) {
  const a = P.assets[ref]; if (!a) return '';
  return forPdf && a.png ? a.png : a.data;
}
function assetAspect(ref) { const a = P.assets[ref]; return a && a.w && a.h ? a.w / a.h : 1; }
function imageEl(ref, x, y, w, h, extra = '', forPdf = false) {
  const href = assetHref(ref, forPdf); if (!href) return '';
  return `<image x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" preserveAspectRatio="xMidYMid meet" xlink:href="${href}"${extra}/>`;
}

// ---------------- Hex content rendering ----------------
function getHex(k, create) {
  let h = P.hexes[k];
  if (!h && create) { h = P.hexes[k] = { items: [], track: [] }; }
  return h;
}
function hexIsEmpty(h) { return !h || (!h.fill && !h.img && !h.type && !(h.items && h.items.length) && !(h.track && h.track.length) && !(h.outline && h.outline.color)); }
function hexType(h) { return h && h.type ? (P.types || []).find((t) => t.id === h.type) : null; }
function effFill(h) { const t = hexType(h); return (h && h.fill) || (t && t.fill) || null; }
function cleanHex(k) { const h = P.hexes[k]; if (hexIsEmpty(h)) delete P.hexes[k]; }

function hexFillStr(c, r, h, o = {}) {
  if (!h) return '';
  const [cx, cy] = center(c, r); let s = '';
  const op = P.style.hexOpacity < 1 ? ` fill-opacity="${P.style.hexOpacity}"` : '';
  const f = effFill(h);
  if (f) s += `<path d="${hexPathAt(cx, cy)}" fill="${f}"${op}/>`;
  const himg = h.img || (hexType(h) || {}).img;
  if (himg && P.assets[himg.ref]) {
    const id = 'hc' + (o.idp || '') + c + '_' + r, s2 = R();
    const asp = assetAspect(himg.ref), bw = 2 * s2, bh = 2 * s2;
    let w = bw, hh = bw / asp; if (hh < bh) { hh = bh; w = bh * asp; }
    s += `<clipPath id="${id}"><path d="${hexPathAt(cx, cy)}"/></clipPath>` +
      `<g clip-path="url(#${id})"${himg.opacity != null && himg.opacity < 1 ? ` opacity="${himg.opacity}"` : ''}>` +
      `<image x="${n2(cx - w / 2)}" y="${n2(cy - hh / 2)}" width="${n2(w)}" height="${n2(hh)}" preserveAspectRatio="none" xlink:href="${assetHref(himg.ref, o.pdf)}"/></g>`;
  }
  return s;
}

const CITY_LAYOUT = {
  1: [[0, 0]], 2: [[-1, 0], [1, 0]], 3: [[0, -1.1547], [-1, 0.57735], [1, 0.57735]],
  4: [[-1, -1], [1, -1], [1, 1], [-1, 1]],
  6: [[-2, 0], [-1, -1.732], [1, -1.732], [2, 0], [1, 1.732], [-1, 1.732]],
};
function citySlotPositions(it) {
  const rs = R() * 0.24 * (it.s || 1); const lay = CITY_LAYOUT[it.slots] || CITY_LAYOUT[1];
  const rot = ((it.r || 0) * Math.PI) / 180, cs = Math.cos(rot), sn = Math.sin(rot);
  return lay.map(([x, y]) => [(x * cs - y * sn) * rs, (x * sn + y * cs) * rs]);
}
function itemPos(c, r, it) { const [cx, cy] = center(c, r); return [cx + (it.x || 0) * R(), cy + (it.y || 0) * R()]; }

function revBadge(x, y, rr, text, o = {}) {
  return `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(rr)}" fill="${o.fill || '#ffffff'}" stroke="${o.stroke || '#111'}" stroke-width="${n2(rr * 0.14)}"/>` +
    textEl(x, y + rr * 0.36, text, { fs: rr * (String(text).length > 2 ? 0.8 : 1.02), bold: true, anchor: 'middle', fill: o.color || '#111' });
}
function sidePos(pos, ex, ey, rr, gap) {
  switch (pos) {
    case 'right': return [ex + rr + gap, 0];
    case 'top': return [0, -ey - rr - gap];
    case 'bottom': return [0, ey + rr + gap];
    case 'tl': return [-ex * 0.75 - rr * 0.5, -ey * 0.75 - rr * 0.5];
    case 'tr': return [ex * 0.75 + rr * 0.5, -ey * 0.75 - rr * 0.5];
    default: return [-ex - rr - gap, 0];
  }
}
function nameLabel(px, py, it, ey) {
  if (!it.name) return '';
  const fs = R() * 0.24 * (it.ns || 1);
  const below = it.namePos !== 'above';
  const y = below ? py + ey + fs * 1.05 : py - ey - fs * 0.35;
  return textEl(px, y, it.name, { fs, bold: !!it.nb, anchor: 'middle', fill: it.nameColor || '#111', vcenter: false });
}

function itemStr(c, r, it, idx, o) {
  const s = R(); const [px, py] = itemPos(c, r, it); const sc = it.s || 1;
  const wrap = (inner) => (o.editor ? `<g data-k="${c},${r}" data-i="${idx}" class="it">${inner}</g>` : inner);
  switch (it.t) {
    case 'icon': {
      const k = (s * 0.9 * sc) / 100;
      return wrap(`<g transform="translate(${n2(px)} ${n2(py)}) rotate(${it.r || 0}) scale(${n2(k * 100) / 100}) translate(-50 -50)">${iconSVG(it.icon, it.color)}</g>`);
    }
    case 'img': {
      const asp = assetAspect(it.ref); const box = s * 0.9 * sc; let w = box, h = box;
      if (asp > 1) h = box / asp; else w = box * asp;
      return wrap(`<g transform="translate(${n2(px)} ${n2(py)}) rotate(${it.r || 0})">${imageEl(it.ref, -w / 2, -h / 2, w, h, '', o.pdf) || `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="#ccc"/>`}</g>`);
    }
    case 'city': {
      const rs = s * 0.24 * sc, sw = Math.max(1, s * 0.04 * sc);
      const pts = citySlotPositions(it);
      let g = '';
      if (pts.length > 1) {
        const d = 'M' + pts.map((p) => n2(px + p[0]) + ' ' + n2(py + p[1])).join('L') + (pts.length > 2 ? 'Z' : '');
        g += `<path d="${d}" fill="${it.stroke || '#111'}" stroke="${it.stroke || '#111'}" stroke-width="${n2(2 * rs + 2 * sw)}" stroke-linejoin="round" stroke-linecap="round"/>`;
        g += `<path d="${d}" fill="${it.fill || '#fff'}" stroke="${it.fill || '#fff'}" stroke-width="${n2(2 * rs)}" stroke-linejoin="round" stroke-linecap="round"/>`;
      }
      const labels = String(it.labels || '').split(',').map((x) => x.trim());
      const homes = !o.typeItem && typeof homesAt === 'function' && (P.compStyle || {}).homeOnMap !== false ? homesAt(key(c, r), idx) : {};
      pts.forEach((p, i) => {
        g += `<circle cx="${n2(px + p[0])}" cy="${n2(py + p[1])}" r="${n2(rs)}" fill="${it.fill || '#fff'}" stroke="${it.stroke || '#111'}" stroke-width="${n2(sw)}"/>`;
        if (homes[i]) { g += `<g transform="translate(${n2(px + p[0])} ${n2(py + p[1])})">${logoSVG(homes[i], rs * 0.86, { pdf: o.pdf })}</g>`; return; }
        if (labels[i]) g += textEl(px + p[0], py + p[1] + rs * 0.25, labels[i], { fs: rs * (labels[i].length > 3 ? 0.55 : 0.72), bold: true, anchor: 'middle', fill: it.labelColor || '#111' });
      });
      let ex = 0, ey = 0; pts.forEach((p) => { ex = Math.max(ex, Math.abs(p[0]) + rs); ey = Math.max(ey, Math.abs(p[1]) + rs); });
      if (it.rev) { const rr = s * 0.17 * sc; const [dx, dy] = sidePos(it.revPos, ex, ey, rr, s * 0.03); g += revBadge(px + dx, py + dy, rr, it.rev); }
      g += nameLabel(px, py, it, ey);
      return wrap(g);
    }
    case 'town': {
      let g = '', ex, ey;
      if (it.style === 'bar') {
        const w = s * 0.55 * sc, h = s * 0.15 * sc;
        g += `<rect x="${n2(px - w / 2)}" y="${n2(py - h / 2)}" width="${n2(w)}" height="${n2(h)}" fill="${it.fill || '#111'}" transform="rotate(${it.r || 0} ${n2(px)} ${n2(py)})"/>`;
        ex = w / 2; ey = h / 2 + s * 0.08;
      } else if (it.style === 'disc') {
        const rr = s * 0.22 * sc;
        g += `<circle cx="${n2(px)}" cy="${n2(py)}" r="${n2(rr)}" fill="${it.fill || '#fff'}" stroke="${it.stroke || '#111'}" stroke-width="${n2(Math.max(1, s * 0.04 * sc))}"/>`;
        ex = ey = rr;
      } else {
        const rr = s * 0.13 * sc;
        g += `<circle cx="${n2(px)}" cy="${n2(py)}" r="${n2(rr)}" fill="${it.fill || '#111'}"/>`;
        ex = ey = rr;
      }
      if (it.rev) { const rr = s * 0.15 * sc; const [dx, dy] = sidePos(it.revPos, ex, ey, rr, s * 0.04); g += revBadge(px + dx, py + dy, rr, it.rev); }
      g += nameLabel(px, py, it, ey);
      return wrap(g);
    }
    case 'text': return wrap(textBadge(px, py, it, s));
    case 'wedge': {
      const [cx, cy] = center(c, r), e = (it.e || 0) % 6, a = edgeAngle(e), ap = (SQ3 / 2) * s, k = it.s || 1;
      const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
      const shape = (hw, tip) => { const bx = cx + ux * ap, by = cy + uy * ap, tx = cx + ux * ap * (1 - tip * k), ty = cy + uy * ap * (1 - tip * k);
        return `M${n2(bx + vx * hw)} ${n2(by + vy * hw)}L${n2(tx)} ${n2(ty)}L${n2(bx - vx * hw)} ${n2(by - vy * hw)}Z`; };
      return wrap(`<path d="${shape(ap * 0.107 * k, 0.47)}" fill="${it.border || '#ffffff'}"/><path d="${shape(ap * 0.08 * k, 0.36)}" fill="${it.color || '#111111'}"/>`);
    }
    case 'phases': {
      const toks = String(it.values || '').trim().split(/[\s,]+/).filter(Boolean);
      const bw = s * 0.42 * sc, bh = s * 0.32 * sc, fs = bh * 0.62;
      const tot = toks.length * bw; let g = '';
      const x0 = px - tot / 2, y0 = py - bh / 2;
      toks.forEach((t, i) => {
        const m = t.match(/^([a-z])?(.*)$/i); let col = '#ffffff', v = t;
        if (m && m[1] && PHASE_COLORS[m[1].toLowerCase()] && m[2] !== '') { col = PHASE_COLORS[m[1].toLowerCase()]; v = m[2]; }
        g += `<rect x="${n2(x0 + i * bw)}" y="${n2(y0)}" width="${n2(bw)}" height="${n2(bh)}" fill="${col}" stroke="#111" stroke-width="${n2(Math.max(0.8, s * 0.025))}"/>`;
        g += textEl(x0 + i * bw + bw / 2, y0 + bh / 2 + fs * 0.36, v, { fs: v.length > 3 ? fs * 0.8 : fs, bold: true, anchor: 'middle', fill: Color.contrast(col) });
      });
      return wrap(g);
    }
  }
  return '';
}
function textBadge(px, py, it, s) {
  const fs = s * (it.size || 0.28), bold = it.bold !== false, fam = it.font || 'sans';
  const lines = String(it.text ?? '').split('\n');
  const w = Math.max(...lines.map((l) => measure(l, fs, bold, fam, it.italic)), fs * 0.6);
  const h = lines.length * fs * 1.2;
  const fill = it.color || '#111', bg = it.bg || '#ffffff', bc = it.border || '#111';
  const sw = Math.max(0.8, s * 0.03);
  let g = '';
  const rot = it.r ? ` transform="rotate(${it.r} ${n2(px)} ${n2(py)})"` : '';
  switch (it.style) {
    case 'box': { const pw = w + fs * 0.6, ph = h + fs * 0.3; g += `<rect x="${n2(px - pw / 2)}" y="${n2(py - ph / 2)}" width="${n2(pw)}" height="${n2(ph)}" rx="${n2(fs * 0.15)}" fill="${bg}" stroke="${bc}" stroke-width="${n2(sw)}"/>`; break; }
    case 'circle': { const rr = Math.max(w, h) / 2 + fs * 0.32; g += `<circle cx="${n2(px)}" cy="${n2(py)}" r="${n2(rr)}" fill="${bg}" stroke="${bc}" stroke-width="${n2(sw)}"/>`; break; }
    case 'hexagon': { const rr = Math.max(w, h) / 2 + fs * 0.4; g += `<path d="${hexPathAt(px, py, rr)}" fill="${bg}" stroke="${bc}" stroke-width="${n2(sw)}"/>`; break; }
    case 'triangle': {
      const tw = Math.max(w + fs * 1.2, fs * 2.2), th = tw * 0.82;
      const by = py + h / 2 + fs * 0.25;
      g += `<path d="M${n2(px)} ${n2(by - th)}L${n2(px + tw / 2)} ${n2(by)}L${n2(px - tw / 2)} ${n2(by)}Z" fill="${it.bg || '#c49563'}" stroke="${it.border || '#6b4a2b'}" stroke-width="${n2(sw)}" stroke-linejoin="round"/>`;
      break;
    }
    case 'wave': {
      const ww = Math.max(w, fs * 1.6), y = py - h / 2 - fs * 0.25, a = fs * 0.22, n = 4, st = ww / n;
      let d = `M${n2(px - ww / 2)} ${n2(y)}`;
      for (let i = 0; i < n; i++) d += ` q${n2(st / 2)} ${n2(i % 2 ? a : -a)} ${n2(st)} 0`;
      g += `<path d="${d}" fill="none" stroke="${it.bg || '#2f7fc1'}" stroke-width="${n2(fs * 0.18)}" stroke-linecap="round"/>`;
      break;
    }
    case 'flag': { const pw = w + fs * 0.6, ph = h + fs * 0.3; g += `<rect x="${n2(px - pw / 2)}" y="${n2(py - ph / 2)}" width="${n2(pw)}" height="${n2(ph)}" fill="${bg}"/>`; break; }
  }
  g += textEl(px, py, it.text ?? '', { fs, bold, italic: it.italic, fam, anchor: 'middle', fill, vcenter: true });
  return rot ? `<g${rot}>${g}</g>` : g;
}

// ---- track ----
function endpointPos(c, r, h, ep) {
  const [cx, cy] = center(c, r);
  if (ep[0] === 'e') {
    const i = +ep.slice(1), [mx, my] = edgeMidLocal(i), a = edgeAngle(i);
    return { x: cx + mx, y: cy + my, nx: -Math.cos(a), ny: -Math.sin(a), edge: true };
  }
  if (ep === 'c') return { x: cx, y: cy };
  if (ep[0] === 'i') {
    const [ii, sl] = ep.slice(1).split('.').map(Number); const it = h.items[ii];
    if (!it) return { x: cx, y: cy, bad: true };
    const [px, py] = itemPos(c, r, it);
    if (it.t === 'city' && sl != null && !isNaN(sl)) { const p = citySlotPositions(it)[sl] || [0, 0]; return { x: px + p[0], y: py + p[1] }; }
    return { x: px, y: py };
  }
  return { x: cx, y: cy };
}
function trackPath(c, r, h, t) {
  const A = endpointPos(c, r, h, t.a), B = endpointPos(c, r, h, t.b);
  if (A.edge && B.edge && (t.geo || P.style.trackGeo || 'curve') === 'lawson') {
    const [cx, cy] = center(c, r); return `M${n2(A.x)} ${n2(A.y)}L${n2(cx)} ${n2(cy)}L${n2(B.x)} ${n2(B.y)}`;
  }
  if (A.edge && B.edge) {
    const ia = +t.a.slice(1), ib = +t.b.slice(1), d = (ib - ia + 6) % 6;
    if (d === 3) return `M${n2(A.x)} ${n2(A.y)}L${n2(B.x)} ${n2(B.y)}`;
    const [cx, cy] = center(c, r); const cross = (A.x - cx) * (B.y - cy) - (A.y - cy) * (B.x - cx);
    const rad = (d === 1 || d === 5 ? 0.5 : 1.5) * R();
    return `M${n2(A.x)} ${n2(A.y)}A${n2(rad)} ${n2(rad)} 0 0 ${cross > 0 ? 0 : 1} ${n2(B.x)} ${n2(B.y)}`;
  }
  return `M${n2(A.x)} ${n2(A.y)}L${n2(B.x)} ${n2(B.y)}`;
}
function trackStr(c, r, h, t) {
  const d = trackPath(c, r, h, t), s = R(), w = s * 0.13 * (t.w || 1);
  let g = '';
  if (t.casing) g += `<path d="${d}" fill="none" stroke="${t.casing}" stroke-width="${n2(w * 1.34)}" stroke-linecap="butt" stroke-linejoin="round"/>`;
  if (t.style === 'dual') {
    g += `<path d="${d}" fill="none" stroke="${t.color || '#111'}" stroke-width="${n2(w * 1.6)}"/>`;
    g += `<path d="${d}" fill="none" stroke="${t.inner || '#ffffff'}" stroke-width="${n2(w * 0.5)}"/>`;
  } else {
    g += `<path d="${d}" fill="none" stroke="${t.color || '#111'}" stroke-width="${n2(w)}" stroke-linejoin="round"${t.style === 'narrow' ? ` stroke-dasharray="${n2(w * 1.6)} ${n2(w * 0.9)}"` : ''}/>`;
  }
  return g;
}

function hexContentStr(c, r, h, o = {}) {
  if (!h) return '';
  let s = '';
  const ty = hexType(h);
  if (ty && ty.items && ty.items.length) {
    const to = Object.assign({}, o, { editor: false, typeItem: true });
    let ts = '';
    ty.items.forEach((it, i) => { if (it.t === 'icon' || it.t === 'img') ts += itemStr(c, r, it, i, to); });
    ty.items.forEach((it, i) => { if (it.t !== 'icon' && it.t !== 'img') ts += itemStr(c, r, it, i, to); });
    s += o.editor ? `<g pointer-events="none">${ts}</g>` : ts;
  }
  const items = h.items || [];
  items.forEach((it, i) => { if (it.t === 'icon' || it.t === 'img') s += itemStr(c, r, it, i, o); });
  (h.track || []).forEach((t, ti) => {
    const g = trackStr(c, r, h, t);
    s += o.editor ? `<g data-k="${c},${r}" data-tr="${ti}">${g}</g>` : g;
  });
  items.forEach((it, i) => { if (it.t !== 'icon' && it.t !== 'img') s += itemStr(c, r, it, i, o); });
  return s;
}

// ---------------- Edges (hexsides) ----------------
const EDGE_STYLES = {
  plain: { label: 'Plain (remove style)', color: '#888888', w: 0.1 },
  river: { label: 'River', color: '#2f7fc1', w: 0.09 },
  water: { label: 'Coast / water', color: '#2f7fc1', w: 0.16 },
  impassable: { label: 'Impassable', color: '#c62828', w: 0.15 },
  wall: { label: 'Colored line', color: '#222222', w: 0.1 },
  hide: { label: 'Hide grid line (merge hexes)', color: '#ffffff', w: 0.1 },
  border: { label: 'Dashed border', color: '#222222', w: 0.08 },
  dotted: { label: 'Dotted border', color: '#d4a017', w: 0.1 },
};
function edgeStr(k, e) {
  if (e.t === 'hide' || e.t === 'plain') return '';
  const { c, r, i } = edgeFromKey(k);
  const [cx, cy] = center(c, r); const cs = corners(cx, cy);
  const a = cs[i], b = cs[(i + 1) % 6], s = R();
  const st = EDGE_STYLES[e.t] || EDGE_STYLES.wall;
  const col = e.color || st.color, w = s * st.w * (e.w || 1);
  let g = '';
  if (e.t === 'river') {
    const n = 4, dx = (b[0] - a[0]) / n, dy = (b[1] - a[1]) / n, len = Math.hypot(dx, dy), px = -dy / len, py = dx / len, amp = s * 0.07;
    let d = `M${n2(a[0])} ${n2(a[1])}`;
    for (let j = 0; j < n; j++) {
      const sx = a[0] + dx * j, sy = a[1] + dy * j, sg = j % 2 ? 1 : -1;
      d += `Q${n2(sx + dx / 2 + px * amp * sg)} ${n2(sy + dy / 2 + py * amp * sg)} ${n2(sx + dx)} ${n2(sy + dy)}`;
    }
    g += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${n2(w)}" stroke-linecap="round"/>`;
  } else {
    let dash = '';
    if (e.t === 'border') dash = ` stroke-dasharray="${n2(w * 2.2)} ${n2(w * 1.4)}"`;
    if (e.t === 'dotted') dash = ` stroke-dasharray="0.01 ${n2(w * 2)}"`;
    g += `<path d="M${n2(a[0])} ${n2(a[1])}L${n2(b[0])} ${n2(b[1])}" fill="none" stroke="${col}" stroke-width="${n2(w)}" stroke-linecap="round"${dash}/>`;
  }
  if (e.label) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, fs = s * 0.22, tw = measure(e.label, fs, true) + fs * 0.5;
    g += `<rect x="${n2(mx - tw / 2)}" y="${n2(my - fs * 0.65)}" width="${n2(tw)}" height="${n2(fs * 1.3)}" rx="${n2(fs * 0.2)}" fill="#ffffff" stroke="${col}" stroke-width="${n2(s * 0.025)}"/>` +
      textEl(mx, my + fs * 0.35, e.label, { fs, bold: true, anchor: 'middle', fill: '#111' });
  }
  return g;
}
function edgesStr() { let s = outlinesStr(); for (const k in P.edges) s += edgeStr(k, P.edges[k]); return s; }

// ---------------- Base layers ----------------
function baseFillStr() {
  const g = P.grid, rel = relHexPath(); let d = '';
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
    if (P.voids[key(c, r)]) continue;
    const [x, y] = center(c, r); d += 'M' + n2(x + rel.start[0]) + ' ' + n2(y + rel.start[1]) + rel.d;
  }
  if (!d) return '';
  const op = P.style.hexOpacity < 1 ? ` fill-opacity="${P.style.hexOpacity}"` : '';
  return P.style.hexFill === 'none' ? '' : `<path d="${d}" fill="${P.style.hexFill}"${op}/>`;
}
function gridStr() {
  if (!(P.style.gridWidth > 0)) return '';
  const g = P.grid, rel = relHexPath(); let d = '';
  const hidden = {}; let anyHidden = false;
  for (const k in P.edges) if (P.edges[k].t === 'hide') { hidden[k] = 1; anyHidden = true; }
  if (!anyHidden) {
    for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
      if (P.voids[key(c, r)]) continue;
      const [x, y] = center(c, r); d += 'M' + n2(x + rel.start[0]) + ' ' + n2(y + rel.start[1]) + rel.d;
    }
  } else {
    for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
      if (P.voids[key(c, r)]) continue;
      const [x, y] = center(c, r); const cs = corners(x, y);
      for (let i = 0; i < 6; i++) {
        const [nc, nr] = neighbor(c, r, i); const nOwn = exists(nc, nr) && (nr < r || (nr === r && nc < c));
        if (nOwn) continue;
        if (hidden[edgeKey(c, r, i)]) continue;
        const a = cs[i], b = cs[(i + 1) % 6]; d += `M${n2(a[0])} ${n2(a[1])}L${n2(b[0])} ${n2(b[1])}`;
      }
    }
  }
  if (!d) return '';
  return `<path d="${d}" fill="none" stroke="${P.style.gridColor}" stroke-width="${P.style.gridWidth}" stroke-linejoin="round" stroke-linecap="round"/>`;
}
function outlinesStr() {
  let s = '';
  for (const k in P.hexes) {
    const h = P.hexes[k]; if (!h.outline || !h.outline.color) continue; const [c, r] = unkey(k); if (!exists(c, r)) continue;
    const [x, y] = center(c, r); const w = (h.outline.w || 2) * Math.max(1, P.style.gridWidth || 1);
    s += `<path d="${hexPathAt(x, y, R() - w / 2)}" fill="none" stroke="${h.outline.color}" stroke-width="${n2(w)}" stroke-linejoin="round"/>`;
  }
  return s;
}
function coordsStr() {
  const st = P.style; if (st.coords === 'none' || st.coordPos === 'none') return '';
  const g = P.grid, s = R(), fs = s * 0.24 * (st.coordSize || 1);
  let out = '';
  if (st.coordPos === 'inhex' || st.coordPos === 'both') {
    for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
      if (P.voids[key(c, r)]) continue;
      const [x, y] = center(c, r);
      const ty = isPointy() ? y - s * 0.6 : y - (SQ3 / 2) * s * 0.66;
      out += textEl(x, ty + fs * 0.35, coordLabel(c, r), { fs: st.coordPos === 'both' ? fs * 0.8 : fs, anchor: 'middle', fill: st.coordColor });
    }
    if (st.coordPos === 'inhex') return out;
  }
  // border: column labels top/bottom, row labels left/right, each side on one line
  const cols = new Map(), rows = new Map();
  let gx0 = Infinity, gx1 = -Infinity, gy0 = Infinity, gy1 = -Infinity;
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
    const p = coordParts(c, r); if (!p) continue;
    const [x, y] = center(c, r);
    gx0 = Math.min(gx0, x); gx1 = Math.max(gx1, x); gy0 = Math.min(gy0, y); gy1 = Math.max(gy1, y);
    if (!cols.has(p[1])) cols.set(p[1], x);
    if (!rows.has(p[0])) rows.set(p[0], y);
  }
  const offV = isPointy() ? s * 1.4 : s * 1.3, offH = isPointy() ? s * 1.3 : s * 1.45;
  const o = { fs, anchor: 'middle', fill: st.coordColor, bold: true };
  let ty = gy0 - offV, by = gy1 + offV, lx = gx0 - offH, rx = gx1 + offH, cr = null;
  if (clipOn()) { cr = clipRect(); ty = cr.y - fs * 0.9; by = cr.y + cr.h + fs * 0.9; lx = cr.x - fs * 1.1; rx = cr.x + cr.w + fs * 1.1; }
  cols.forEach((x, label) => { if (cr && (x < cr.x || x > cr.x + cr.w)) return; out += textEl(x, ty + fs * 0.35, label, o) + textEl(x, by + fs * 0.35, label, o); });
  rows.forEach((y, label) => { if (cr && (y < cr.y || y > cr.y + cr.h)) return; out += textEl(lx, y + fs * 0.35, label, o) + textEl(rx, y + fs * 0.35, label, o); });
  return out;
}
function coordsBounds() {
  const st = P.style; const gb = gridBounds(); const s = R();
  if (st.coords === 'none' || (st.coordPos !== 'border' && st.coordPos !== 'both')) return null;
  if (clipOn()) { const r = clipRect(), f = s * 0.24 * (st.coordSize || 1) * 2; return { x: r.x - f, y: r.y - f, w: r.w + 2 * f, h: r.h + 2 * f }; }
  const m = s * 1.6;
  return { x: gb.x - m, y: gb.y - m, w: gb.w + 2 * m, h: gb.h + 2 * m };
}

// ---------------- Free objects ----------------
function parseCellToken(tok) {
  tok = tok.trim();
  if (tok === '' || tok === '.' || tok === '-' || tok === '_') return null;
  let v = tok, codes = '';
  const ci = tok.lastIndexOf(':');
  if (ci > 0) { v = tok.slice(0, ci); codes = tok.slice(ci + 1); }
  else { const m = tok.match(/^(.*?\d)([a-z^<>]+)$/i); if (m) { v = m[1]; codes = m[2]; } }
  const cell = { v: v.replace(/_/g, ' '), z: '', p: false };
  for (const ch of codes.toLowerCase()) { if (ch === 'p') cell.p = true; else if (ch === 'v') cell.a = 'down'; else if (ch === '^') cell.a = 'up'; else if (ch === '<') cell.a = 'left'; else if (ch === '>') cell.a = 'right'; else if (ZONE_CODES[ch]) cell.z = ch; }
  return cell;
}
function cellToToken(cell) {
  if (!cell) return '.';
  const codes = (cell.z || '') + (cell.p ? 'p' : '') + ({ down: 'v', up: '^', left: '<', right: '>' }[cell.a] || '');
  cell = { ...cell, v: String(cell.v).replace(/\s+/g, '_') };
  if (!codes) return /\d[a-z]+$/i.test(cell.v) || cell.v.includes(':') ? cell.v + ':' : cell.v || '0';
  return /\d$/.test(cell.v) ? cell.v + codes : cell.v + ':' + codes;
}
function parseMarket1(o) { return String(o.data || '').split(/[\s,]+/).filter((t) => t.trim() !== '').map(parseCellToken).map((c) => c || { v: '', z: '', p: false }); }
function parseMarket2(o) { return String(o.data || '').split('\n').map((line) => line.trim() === '' ? [] : line.trim().split(/[\s,]+/).map(parseCellToken)); }
function serializeMarket1(cells) { return cells.map(cellToToken).join(' '); }
function serializeMarket2(grid) { return grid.map((row) => row.map(cellToToken).join(' ')).join('\n'); }
function zoneColor(o, z) { return (o.zones && o.zones[z]) || (ZONE_CODES[z] && ZONE_CODES[z][1]) || null; }
function market1Layout(o, n) {
  const per = Math.max(1, o.perRow || 10), pos = [];
  const lay = o.layout || 'wrap';
  if (lay === 'row') for (let i = 0; i < n; i++) pos.push([i, 0]);
  else if (lay === 'column') for (let i = 0; i < n; i++) pos.push([0, i]);
  else if (lay === 'snake') for (let i = 0; i < n; i++) { const r = Math.floor(i / per), c = i % per; pos.push([r % 2 ? per - 1 - c : c, r]); }
  else if (lay === 'perimeter') {
    const W = Math.max(2, per), H = Math.max(2, Math.ceil((n - 2 * W) / 2) + 2);
    const ring = [];
    for (let c = 0; c < W; c++) ring.push([c, 0]);
    for (let r = 1; r < H - 1; r++) ring.push([W - 1, r]);
    for (let c = W - 1; c >= 0; c--) ring.push([c, H - 1]);
    for (let r = H - 2; r >= 1; r--) ring.push([0, r]);
    for (let i = 0; i < n; i++) pos.push(ring[i] || [0, 0]);
  } else for (let i = 0; i < n; i++) pos.push([i % per, Math.floor(i / per)]);
  return pos;
}
function marketCellStr(o, cell, x, y, w, h, attrs) {
  const base = o.cellBg || '#ffffff';
  const fill = (o.paint && o.paint[attrs.k]) || (cell.z && zoneColor(o, cell.z)) || base;
  const sw = o.borderW ?? 1.2;
  let g = `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" fill="${fill}" stroke="${o.border || '#222'}" stroke-width="${sw}"${attrs.editor ? ` data-o="${o.id}" data-cell="${attrs.k}"` : ''}/>`;
  if (cell.p) { const ins = Math.max(2, sw * 2); g += `<rect x="${n2(x + ins)}" y="${n2(y + ins)}" width="${n2(w - 2 * ins)}" height="${n2(h - 2 * ins)}" fill="none" stroke="${o.parColor || '#d62828'}" stroke-width="${n2(ins * 1.1)}" pointer-events="none"/>`; }
  const fs = o.fs || 14, fc = o.textColor === 'auto' || !o.textColor ? Color.contrast(fill) : o.textColor;
  let tx = x + w / 2, ty = y + h / 2 + fs * 0.35, anc = 'middle';
  if (o.valPos === 'tl') { tx = x + fs * 0.3; ty = y + fs * 1.0; anc = 'start'; }
  else if (o.valPos === 'top') { ty = y + fs * 1.05; }
  if (cell.v !== '') g += textEl(tx, ty, cell.v, { fs, bold: !!o.bold, anchor: anc, fill: fc, extra: ' pointer-events="none"' });
  if (cell.a) {
    const as = Math.min(w, h) * 0.16, pad = as * 0.7;
    const tri = { down: [[x + pad, y + h - pad - as], [x + pad + as, y + h - pad - as], [x + pad + as / 2, y + h - pad]], up: [[x + w - pad - as, y + h - pad], [x + w - pad, y + h - pad], [x + w - pad - as / 2, y + h - pad - as]],
      left: [[x + pad + as, y + h - pad - as], [x + pad + as, y + h - pad], [x + pad, y + h - pad - as / 2]], right: [[x + w - pad - as, y + h - pad - as], [x + w - pad - as, y + h - pad], [x + w - pad, y + h - pad - as / 2]] }[cell.a];
    if (tri) g += `<path d="M${tri.map((p) => n2(p[0]) + ' ' + n2(p[1])).join('L')}Z" fill="${fc}" pointer-events="none"/>`;
  }
  return g;
}
function marketTitle(o, w) {
  if (!o.title) return { s: '', h: 0 };
  const fs = o.titleSize || (o.fs || 14) * 1.3;
  return { s: textEl(o.titleAlign === 'center' ? w / 2 : 0, fs * 0.95, o.title, { fs, bold: true, fill: o.titleColor || '#111', anchor: o.titleAlign === 'center' ? 'middle' : 'start' }), h: fs * 1.45 };
}
function objectInnerStr(o, opt = {}) {
  switch (o.t) {
    case 'text': {
      const fs = o.fs || 24, lines = String(o.text ?? '').split('\n');
      const w = Math.max(...lines.map((l) => measure(l, fs, o.bold, o.font, o.italic)), 1);
      const lh = fs * 1.2, h = lines.length * lh, pad = o.bg ? (o.pad ?? fs * 0.3) : 0;
      const anc = o.align || 'start', ax = anc === 'middle' ? w / 2 : anc === 'end' ? w : 0;
      let s = '';
      if (o.bg) s += `<rect x="${n2(-pad)}" y="${n2(-pad)}" width="${n2(w + 2 * pad)}" height="${n2(h + 2 * pad - fs * 0.2)}" rx="${n2(o.radius || 0)}" fill="${o.bg}"${o.bgBorder ? ` stroke="${o.bgBorder}" stroke-width="${o.bgBorderW || 1.5}"` : ''}/>`;
      s += textEl(ax, fs * 0.9, o.text ?? '', { fs, bold: o.bold, italic: o.italic, fam: o.font, anchor: anc, fill: o.color || '#111' });
      return s;
    }
    case 'icon': { const k = (o.size || 60) / 100; return `<g transform="scale(${k})">${iconSVG(o.icon, o.color)}</g>`; }
    case 'img': {
      const w = o.w || 200, h = o.h || w / assetAspect(o.ref);
      return `<g${o.opacity != null && o.opacity < 1 ? ` opacity="${o.opacity}"` : ''}>${imageEl(o.ref, 0, 0, w, h, '', opt.pdf) || `<rect width="${w}" height="${h}" fill="#ccc"/>`}</g>`;
    }
    case 'market1': {
      const cells = parseMarket1(o), cw = o.cw || 44, ch = o.ch || 44, gap = o.gap || 0;
      const pos = market1Layout(o, cells.length);
      let mx = 0, my = 0; pos.forEach(([c, r]) => { mx = Math.max(mx, c + 1); my = Math.max(my, r + 1); });
      const W = mx * (cw + gap) - gap; const t = marketTitle(o, W);
      let s = t.s;
      cells.forEach((cell, i) => { const [c, r] = pos[i]; s += marketCellStr(o, cell, c * (cw + gap), t.h + r * (ch + gap), cw, ch, { k: String(i), editor: opt.editor }); });
      return s;
    }
    case 'market2': {
      const grid = parseMarket2(o), cw = o.cw || 44, ch = o.ch || 44, gap = o.gap || 0;
      const cols = Math.max(0, ...grid.map((r) => r.length));
      const W = cols * (cw + gap) - gap; const t = marketTitle(o, W);
      let s = t.s;
      grid.forEach((row, r) => row.forEach((cell, c) => {
        if (!cell) return;
        const ox = o.stagger && r % 2 ? (cw + gap) / 2 : 0;
        s += marketCellStr(o, cell, c * (cw + gap) + ox, t.h + r * (ch + gap), cw, ch, { k: r + ',' + c, editor: opt.editor });
      }));
      return s;
    }
    case 'table': return tableStr(o, opt);
    case 'revbox': {
      const toks = String(o.values || '').trim().split(/[\s,]+/).filter(Boolean);
      const bw = o.cw || 30, bh = bw * 0.76, fs = bh * 0.62; let g = '', y0 = 0;
      if (o.name) { const nfs = o.nameSize || bh * 0.62; g += textEl((toks.length * bw) / 2, nfs * 0.9, o.name, { fs: nfs, bold: true, anchor: 'middle', fill: o.nameColor || '#111' }); y0 = nfs * 1.3; }
      toks.forEach((t, i) => {
        const m = t.match(/^([a-z])?(.*)$/i); let col = '#ffffff', v = t;
        if (m && m[1] && PHASE_COLORS[m[1].toLowerCase()] && m[2] !== '') { col = PHASE_COLORS[m[1].toLowerCase()]; v = m[2]; }
        g += `<rect x="${n2(i * bw)}" y="${n2(y0)}" width="${n2(bw)}" height="${n2(bh)}" fill="${col}" stroke="#111" stroke-width="${n2(Math.max(0.8, bw * 0.04))}"/>`;
        g += textEl(i * bw + bw / 2, y0 + bh / 2 + fs * 0.36, v, { fs: v.length > 3 ? fs * 0.8 : fs, bold: true, anchor: 'middle', fill: Color.contrast(col) });
      });
      return g;
    }
    case 'region': {
      const d = regionPath(o.pts, true, o.smooth); if (!d) return '';
      const sw = o.sw ?? 2;
      return `<path d="${d}" fill="${o.fill || 'none'}"${o.opacity != null && o.opacity < 1 ? ` fill-opacity="${o.opacity}"` : ''} stroke="${sw > 0 ? o.stroke || '#222' : 'none'}" stroke-width="${sw}" stroke-linejoin="round"${o.dashed ? ` stroke-dasharray="${n2(sw * 3)} ${n2(sw * 2)}"` : ''}/>`;
    }
  }
  return '';
}
function parseTableCell(raw) {
  let s = raw.trim(), bg = null, bold = false;
  const m = s.match(/^\[(#[0-9a-f]{3,8})\]\s*/i); if (m) { bg = m[1]; s = s.slice(m[0].length); }
  if (/^\*\*.*\*\*$/.test(s) && s.length >= 4) { bold = true; s = s.slice(2, -2); }
  const segs = []; const re = /:([a-z0-9_-]+):/gi; let last = 0, mm;
  while ((mm = re.exec(s))) {
    const k = mm[1]; const asset = Object.entries(P.assets).find(([id, a]) => id === k || (a.name && a.name.toLowerCase() === k.toLowerCase()));
    if (ICONS[k] || asset) {
      if (mm.index > last) segs.push({ t: 'text', s: s.slice(last, mm.index) });
      segs.push(ICONS[k] ? { t: 'icon', k } : { t: 'asset', k: asset[0] });
      last = re.lastIndex;
    }
  }
  if (last < s.length) segs.push({ t: 'text', s: s.slice(last) });
  return { segs, bg, bold };
}
function tableStr(o, opt) {
  const fs = o.fs || 14, pad = o.pad ?? 6, fam = o.font || 'sans';
  const lines = String(o.text || '').split('\n').filter((l) => l.trim() !== '');
  const rows = lines.map((l) => l.split(/\t|\|/).map(parseTableCell));
  const ncol = Math.max(1, ...rows.map((r) => r.length));
  const isz = fs * 1.35, aligns = String(o.align || '').split(',').map((s) => s.trim().toLowerCase());
  const header = o.header !== false && rows.length > 0;
  const segW = (seg, bold) => seg.t === 'text' ? measure(seg.s, fs, bold, fam) : isz + fs * 0.15;
  const cellW = (cell, bold) => cell.segs.reduce((a, sg) => a + segW(sg, bold || cell.bold), 0);
  const colW = new Array(ncol).fill(o.minCol || 30);
  rows.forEach((row, ri) => row.forEach((cell, ci) => { colW[ci] = Math.max(colW[ci], cellW(cell, header && ri === 0) + 2 * pad); }));
  const rh = Math.max(fs * 1.3, isz) + 2 * pad * 0.8;
  const W = colW.reduce((a, b) => a + b, 0), title = marketTitle({ title: o.title, fs, titleSize: o.titleSize, titleColor: o.titleColor, titleAlign: o.titleAlign }, W);
  let s = title.s; const y0 = title.h;
  const H = rows.length * rh;
  s += `<rect x="0" y="${n2(y0)}" width="${n2(W)}" height="${n2(H)}" fill="${o.bg || '#ffffff'}"/>`;
  rows.forEach((row, ri) => {
    const y = y0 + ri * rh, isH = header && ri === 0;
    let rowBg = isH ? (o.headerBg || '#2b2b2b') : (ri % 2 === (header ? 0 : 1) && o.stripe ? o.stripe : null);
    if (rowBg) s += `<rect x="0" y="${n2(y)}" width="${n2(W)}" height="${n2(rh)}" fill="${rowBg}"/>`;
    let x = 0;
    for (let ci = 0; ci < ncol; ci++) {
      const cell = row[ci] || { segs: [], bg: null, bold: false }, cw = colW[ci];
      if (cell.bg) s += `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(cw)}" height="${n2(rh)}" fill="${cell.bg}"/>`;
      const bold = isH || cell.bold, fg = cell.bg ? Color.contrast(cell.bg) : isH ? (o.headerFg || '#ffffff') : (o.fg || '#111111');
      const tw = cellW(cell, isH);
      const al = aligns[ci] || (ci === 0 ? 'l' : 'c');
      let cx = al === 'r' ? x + cw - pad - tw : al === 'c' ? x + (cw - tw) / 2 : x + pad;
      const by = y + rh / 2 + fs * 0.36;
      cell.segs.forEach((sg) => {
        if (sg.t === 'text') { s += textEl(cx, by, sg.s, { fs, bold, fam, fill: fg, extra: ' xml:space="preserve"' }); cx += measure(sg.s, fs, bold, fam); }
        else if (sg.t === 'icon') { const k = isz / 100; s += `<g transform="translate(${n2(cx + fs * 0.07)} ${n2(y + (rh - isz) / 2)}) scale(${n2(k * 1000) / 1000})">${iconSVG(sg.k)}</g>`; cx += isz + fs * 0.15; }
        else { s += imageEl(sg.k, cx + fs * 0.07, y + (rh - isz) / 2, isz, isz, '', opt.pdf); cx += isz + fs * 0.15; }
      });
      x += cw;
    }
  });
  const bc = o.border || '#333333', bw = o.borderW ?? 1;
  if (o.grid !== false) {
    let d = ''; let x = 0;
    for (let ci = 0; ci < ncol - 1; ci++) { x += colW[ci]; d += `M${n2(x)} ${n2(y0)}V${n2(y0 + H)}`; }
    for (let ri = 1; ri < rows.length; ri++) d += `M0 ${n2(y0 + ri * rh)}H${n2(W)}`;
    if (d) s += `<path d="${d}" fill="none" stroke="${bc}" stroke-width="${n2(bw * 0.6)}"/>`;
  }
  s += `<rect x="0" y="${n2(y0)}" width="${n2(W)}" height="${n2(H)}" fill="none" stroke="${bc}" stroke-width="${bw * 1.4}"/>`;
  return s;
}
function objectStr(o, opt = {}) {
  const tr = `translate(${n2(o.x)} ${n2(o.y)})${o.rot ? ` rotate(${o.rot})` : ''}`;
  const inner = objectInnerStr(o, opt);
  return opt.editor ? `<g data-o="${o.id}" transform="${tr}">${inner}</g>` : `<g transform="${tr}">${inner}</g>`;
}

// ---------------- Map edge clipping (partial hexes) ----------------
function clipOn() { return !!(P.style.clip && P.style.clip.on); }
function clipRect() {
  const c = P.style.clip, s = R(), g = P.grid;
  // outer box of the full grid's hex shapes
  const hw = isPointy() ? (SQ3 / 2) * s : s, hh = isPointy() ? s : (SQ3 / 2) * s;
  const [x0] = center(0, 0), [, y0] = center(0, 0);
  const gb = gridBounds();
  const X0 = gb.x, Y0 = gb.y, X1 = gb.x + gb.w, Y1 = gb.y + gb.h;
  const x = X0 + (c.l || 0) * s, y = Y0 + (c.t || 0) * s;
  return { x, y, w: Math.max(1, X1 - (c.r || 0) * s - x), h: Math.max(1, Y1 - (c.b || 0) * s - y) };
}
function clipDefStr(id) { const r = clipRect(); return `<clipPath id="${id}"><rect x="${n2(r.x)}" y="${n2(r.y)}" width="${n2(r.w)}" height="${n2(r.h)}"/></clipPath>`; }
function frameStr() {
  if (!clipOn()) return ''; const c = P.style.clip; if (!(c.lw > 0)) return '';
  const r = clipRect(); return `<rect x="${n2(r.x)}" y="${n2(r.y)}" width="${n2(r.w)}" height="${n2(r.h)}" fill="none" stroke="${c.line || '#333'}" stroke-width="${c.lw}"/>`;
}

// ---------------- Regions (freeform shapes) ----------------
function regionPath(pts, closed = true, smooth = false) {
  if (!pts || pts.length < 2) return '';
  if (!smooth || pts.length < 3) return 'M' + pts.map((p) => n2(p[0]) + ' ' + n2(p[1])).join('L') + (closed ? 'Z' : '');
  const n = pts.length, P2 = (i) => pts[((i % n) + n) % n];
  let d = `M${n2(pts[0][0])} ${n2(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P2(i - 1), p1 = P2(i), p2 = P2(i + 1), p3 = P2(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${n2(c1[0])} ${n2(c1[1])} ${n2(c2[0])} ${n2(c2[1])} ${n2(p2[0])} ${n2(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}

// ---------------- Background image ----------------
function bgImageStr(opt = {}) {
  const b = P.bgImage; if (!b || !P.assets[b.ref] || b.show === false) return '';
  if (opt.export && b.exp === false) return '';
  return `<g${b.opacity != null && b.opacity < 1 ? ` opacity="${b.opacity}"` : ''}>` +
    `<image x="${n2(b.x)}" y="${n2(b.y)}" width="${n2(b.w)}" height="${n2(b.h)}" preserveAspectRatio="none" xlink:href="${assetHref(b.ref, opt.pdf)}"/></g>`;
}
