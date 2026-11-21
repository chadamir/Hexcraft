// =====================================================================
//  Hexcraft editor: state, rendering into the stage, tools, panels
// =====================================================================
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const stage = $('#stage'), vpEl = $('#vp');
const L = {};
['bgcolor', 'bgimg', 'under', 'clip', 'frame', 'basefill', 'fills', 'grid', 'edges', 'links', 'content', 'coords', 'objects', 'overlay'].forEach((n) => (L[n] = $('#L-' + n)));

const S = {
  tool: 'select',
  brush: { kind: 'color', color: '#f6dc4a' },
  stamp: { kind: 'icon', icon: 'mountain' },
  stampOpts: { scale: 1, rot: 0, color: '', snap: 'points' },
  trackOpts: { color: '#111111', w: 1, style: 'std', casing: '#ffffff', geo: '' },
  edgeOpts: { t: 'river', color: '', w: 1, label: '' },
  eraseMode: 'all',
  textStyle: 'plain',
  sel: null, hover: null,
  view: { x: 40, y: 40, z: 1 },
  undo: [], redo: [], lastCk: { key: '', t: 0 },
  dirty: false, space: false, bgAdjust: false, showVoids: true,
};
const fillMap = new Map(), contentMap = new Map();

// ---------------- Undo / redo ----------------
function snapshot() { const a = P.assets; P.assets = undefined; const s = JSON.stringify(P); P.assets = a; return s; }
function checkpoint(k = '') {
  const now = Date.now();
  if (k && S.lastCk.key === k && now - S.lastCk.t < 900) { S.lastCk.t = now; markDirty(); return; }
  S.undo.push(snapshot()); if (S.undo.length > 120) S.undo.shift();
  S.redo = []; S.lastCk = { key: k, t: now }; markDirty(); updateUndoBtns();
}
function restore(str) {
  const assets = P.assets; P = JSON.parse(str); P.assets = assets; applyShapeVoids();
  if (S.sel && S.sel.kind === 'obj' && !P.objects.find((o) => o.id === S.sel.id)) S.sel = null;
  if (S.sel && S.sel.kind === 'type' && !(P.types || []).find((t) => t.id === S.sel.id)) S.sel = null;
  renderAll(); renderProps(); renderLeft(); markDirty();
  if (S.view2 === 'comp') { if (!curCo() && P.companies.length) S.compSel = P.companies[0].id; renderCompAll(); }
}
function undo() { if (!S.undo.length) return; S.redo.push(snapshot()); restore(S.undo.pop()); S.lastCk = { key: '', t: 0 }; updateUndoBtns(); }
function redo() { if (!S.redo.length) return; S.undo.push(snapshot()); restore(S.redo.pop()); S.lastCk = { key: '', t: 0 }; updateUndoBtns(); }
function updateUndoBtns() { $('#undoBtn').disabled = !S.undo.length; $('#redoBtn').disabled = !S.redo.length; }
function markDirty() { S.dirty = true; updateSaveState(); scheduleAutosave(); }

// ---------------- Rendering into the stage ----------------
function setHTML(el, html) { el.innerHTML = html; }
function applyClip() {
  const defs = $('#stageDefs');
  if (clipOn()) { defs.innerHTML = clipDefStr('mapclip'); L.clip.setAttribute('clip-path', 'url(#mapclip)'); }
  else { defs.innerHTML = ''; L.clip.removeAttribute('clip-path'); }
  setHTML(L.frame, frameStr());
}
function renderBase() {
  applyClip();
  setHTML(L.basefill, baseFillStr());
  setHTML(L.grid, gridStr());
  setHTML(L.coords, coordsStr());
  updateStatusSize();
}
function renderHex(k) {
  const [c, r] = unkey(k); const h = P.hexes[k];
  const vis = h && !P.voids[k] && inGrid(c, r);
  const fs = vis ? hexFillStr(c, r, h, { idp: 'e' }) : '';
  let g = fillMap.get(k);
  if (fs) { if (!g) { g = document.createElementNS(SVGNS, 'g'); L.fills.appendChild(g); fillMap.set(k, g); } g.innerHTML = fs; }
  else if (g) { g.remove(); fillMap.delete(k); }
  const cs = vis ? hexContentStr(c, r, h, { editor: true }) : '';
  g = contentMap.get(k);
  if (cs) { if (!g) { g = document.createElementNS(SVGNS, 'g'); L.content.appendChild(g); contentMap.set(k, g); } g.innerHTML = cs; }
  else if (g) { g.remove(); contentMap.delete(k); }
}
function renderAllHexes() {
  L.fills.innerHTML = ''; L.content.innerHTML = ''; fillMap.clear(); contentMap.clear();
  let fh = '', ch = ''; const keys = [];
  for (const k in P.hexes) {
    const [c, r] = unkey(k); if (P.voids[k] || !inGrid(c, r)) continue; const h = P.hexes[k];
    keys.push(k);
    fh += '<g>' + hexFillStr(c, r, h, { idp: 'e' }) + '</g>';
    ch += '<g>' + hexContentStr(c, r, h, { editor: true }) + '</g>';
  }
  L.fills.innerHTML = fh; L.content.innerHTML = ch;
  const fc = L.fills.children, cc = L.content.children;
  keys.forEach((k, i) => { fillMap.set(k, fc[i]); contentMap.set(k, cc[i]); });
}
function renderHexesOfType(id) { for (const k in P.hexes) if (P.hexes[k].type === id) renderHex(k); }
function renderEdges() { setHTML(L.edges, edgesStr()); }
const isUnder = (o) => o.t === 'region' && o.under;
function renderObjects() {
  setHTML(L.under, P.objects.filter(isUnder).map((o) => objectStr(o, { editor: true })).join(''));
  setHTML(L.objects, P.objects.filter((o) => !isUnder(o)).map((o) => objectStr(o, { editor: true })).join(''));
}
function renderObject(id) {
  const o = P.objects.find((x) => x.id === id); const el = $(`#L-objects > [data-o="${id}"], #L-under > [data-o="${id}"]`);
  if (!o) { el && el.remove(); return; }
  const tmp = document.createElementNS(SVGNS, 'g'); tmp.innerHTML = objectStr(o, { editor: true });
  const n = tmp.firstChild; const layer = isUnder(o) ? L.under : L.objects;
  if (el && el.parentNode === layer) el.replaceWith(n); else { el && el.remove(); renderObjects(); }
}
function renderBgImage() { setHTML(L.bgimg, bgImageStr()); }
function renderAll() {
  stage.style.background = 'transparent';
  renderBgImage(); renderBase(); renderAllHexes(); renderEdges(); renderObjects(); renderPaper(); renderOverlay();
  $('#projName').value = P.name;
}
function contentBounds(forExport = true) {
  let b = clipOn() ? clipRect() : hexBoundsExisting();
  const add = (bb) => {
    if (!bb || !(bb.w > 0 || bb.h > 0)) return;
    if (!(b.w > 0 || b.h > 0)) { b = { ...bb }; return; }
    const x0 = Math.min(b.x, bb.x), y0 = Math.min(b.y, bb.y), x1 = Math.max(b.x + b.w, bb.x + bb.w), y1 = Math.max(b.y + b.h, bb.y + bb.h);
    b = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  const bb = (el) => { try { if (!el.childNodes.length) return null; const r = el.getBBox(); return { x: r.x, y: r.y, w: r.width, h: r.height }; } catch (e) { return null; } };
  add(coordsBounds()); add(bb(L.objects)); add(bb(L.under)); add(bb(L.coords)); add(bb(L.frame));
  if (!clipOn()) { add(bb(L.content)); add(bb(L.edges)); }
  if (P.bgImage && P.assets[P.bgImage.ref] && P.bgImage.show !== false && (!forExport || P.bgImage.exp !== false)) add({ x: P.bgImage.x, y: P.bgImage.y, w: P.bgImage.w, h: P.bgImage.h });
  const pad = P.style.pad ?? 40;
  return { x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad };
}
let _paperT = 0;
function renderPaper() {
  const b = contentBounds(false); const r = L.bgcolor;
  r.setAttribute('x', b.x); r.setAttribute('y', b.y); r.setAttribute('width', Math.max(1, b.w)); r.setAttribute('height', Math.max(1, b.h));
  r.setAttribute('fill', P.style.bg || '#ffffff');
  r.setAttribute('filter', ''); r.style.filter = 'drop-shadow(0 6px 24px rgba(0,0,0,.45))';
}
function schedulePaper() { clearTimeout(_paperT); _paperT = setTimeout(renderPaper, 120); }

// ---------------- Overlay ----------------
function renderOverlay(extra = '') {
  let s = '';
  const z = S.view.z, sw = `stroke-width="${n2(2 / z)}"`;
  if (S.showVoids) {
    let d = '';
    for (const k in P.voids) { const [c, r] = unkey(k); if (!inGrid(c, r)) continue; const [x, y] = center(c, r); d += hexPathAt(x, y); }
    if (d) s += `<path d="${d}" fill="none" stroke="#ffffff" stroke-opacity=".22" stroke-width="${n2(1 / z)}" stroke-dasharray="${n2(4 / z)} ${n2(4 / z)}" pointer-events="none"/>`;
  }
  if (S.hover && S.tool !== 'select' && S.tool !== 'pan') {
    const [c, r] = S.hover; if (inGrid(c, r)) { const [x, y] = center(c, r); s += `<path d="${hexPathAt(x, y)}" fill="#ffffff" fill-opacity=".12" stroke="#ffffff" stroke-opacity=".7" ${sw} pointer-events="none"/>`; }
  }
  if (S.sel && S.sel.kind === 'hexes') {
    let d = ''; S.sel.keys.forEach((k) => { const [c, r] = unkey(k); const [x, y] = center(c, r); d += hexPathAt(x, y); });
    s += `<path d="${d}" fill="#f0a830" fill-opacity=".10" stroke="#f0a830" stroke-width="${n2(3 / z)}" pointer-events="none"/>`;
  }
  if (S.sel && S.sel.kind === 'hex') {
    const [c, r] = unkey(S.sel.k); const [x, y] = center(c, r);
    s += `<path d="${hexPathAt(x, y)}" fill="none" stroke="#f0a830" stroke-width="${n2(3.5 / z)}" pointer-events="none"/>`;
    if (S.sel.item != null) {
      const el = L.content.querySelector(`[data-k="${S.sel.k}"][data-i="${S.sel.item}"]`);
      if (el) { try { const bb = el.getBBox(); s += `<rect x="${n2(bb.x - 3 / z)}" y="${n2(bb.y - 3 / z)}" width="${n2(bb.width + 6 / z)}" height="${n2(bb.height + 6 / z)}" fill="none" stroke="#f0a830" stroke-dasharray="${n2(4 / z)} ${n2(3 / z)}" ${sw} pointer-events="none"/>`; } catch (e) {} }
    }
  }
  if (S.sel && S.sel.kind === 'obj') {
    const el = $(`#L-objects > [data-o="${S.sel.id}"], #L-under > [data-o="${S.sel.id}"]`); const o = P.objects.find((x) => x.id === S.sel.id);
    if (el && o && o.t === 'region') {
      const hs = 6 / z; s += `<g transform="translate(${n2(o.x)} ${n2(o.y)})">`;
      s += `<path d="${regionPath(o.pts, true, o.smooth)}" fill="none" stroke="#f0a830" stroke-width="${n2(2 / z)}" stroke-dasharray="${n2(5 / z)} ${n2(3 / z)}" pointer-events="none"/>`;
      o.pts.forEach((p, i) => { s += `<circle data-vtx="${i}" cx="${n2(p[0])}" cy="${n2(p[1])}" r="${n2(hs)}" fill="#ffffff" stroke="#f0a830" stroke-width="${n2(2 / z)}" style="cursor:move"/>`; });
      o.pts.forEach((p, i) => { const q = o.pts[(i + 1) % o.pts.length]; s += `<circle data-mid="${i}" cx="${n2((p[0] + q[0]) / 2)}" cy="${n2((p[1] + q[1]) / 2)}" r="${n2(hs * 0.7)}" fill="#f0a830" fill-opacity=".55" style="cursor:copy"/>`; });
      s += '</g>';
    } else if (el && o) {
      try {
        const bb = el.getBBox(); const p = 4 / z;
        s += `<g transform="translate(${n2(o.x)} ${n2(o.y)})${o.rot ? ` rotate(${o.rot})` : ''}">`;
        s += `<rect x="${n2(bb.x - p)}" y="${n2(bb.y - p)}" width="${n2(bb.width + 2 * p)}" height="${n2(bb.height + 2 * p)}" fill="none" stroke="#f0a830" stroke-dasharray="${n2(5 / z)} ${n2(3 / z)}" ${sw} pointer-events="none"/>`;
        if (['img', 'icon', 'text'].includes(o.t)) { const hs = 10 / z; s += `<rect data-handle="1" x="${n2(bb.x + bb.width + p - hs / 2)}" y="${n2(bb.y + bb.height + p - hs / 2)}" width="${n2(hs)}" height="${n2(hs)}" fill="#f0a830" stroke="#1a1405" stroke-width="${n2(1 / z)}" style="cursor:nwse-resize"/>`; }
        if (S.sel.cell != null) {
          const ce = L.objects.querySelector(`[data-o="${o.id}"][data-cell="${S.sel.cell}"]`);
          if (ce) { const cb = ce.getBBox(); s += `<rect x="${n2(cb.x)}" y="${n2(cb.y)}" width="${n2(cb.width)}" height="${n2(cb.height)}" fill="none" stroke="#1e90ff" stroke-width="${n2(3 / z)}" pointer-events="none"/>`; }
        }
        s += '</g>';
      } catch (e) {}
    }
  }
  if (S.bgAdjust && P.bgImage) { const b = P.bgImage; s += `<rect x="${n2(b.x)}" y="${n2(b.y)}" width="${n2(b.w)}" height="${n2(b.h)}" fill="none" stroke="#1e90ff" stroke-dasharray="${n2(8 / z)} ${n2(4 / z)}" ${sw} pointer-events="none"/>`; const hs = 12 / z; s += `<rect data-bghandle="1" x="${n2(b.x + b.w - hs / 2)}" y="${n2(b.y + b.h - hs / 2)}" width="${n2(hs)}" height="${n2(hs)}" fill="#1e90ff" style="cursor:nwse-resize"/>`; }
  if (S.draft && S.draft.pts.length) {
    const d = S.draft, pts = d.cursor ? [...d.pts, d.cursor] : d.pts;
    s += `<path d="${regionPath(pts, false)}" fill="${S.regionOpts.fill || 'none'}" fill-opacity=".35" stroke="#f0a830" stroke-width="${n2(2.5 / z)}" pointer-events="none"/>`;
    d.pts.forEach((p, i) => (s += `<circle cx="${n2(p[0])}" cy="${n2(p[1])}" r="${n2((i === 0 ? 7 : 4) / z)}" fill="${i === 0 ? '#f0a830' : '#fff'}" stroke="#1a1405" stroke-width="${n2(1 / z)}" pointer-events="none"/>`));
  }
  L.overlay.innerHTML = s + extra;
}

// ---------------- Viewport ----------------
function applyView() { vpEl.setAttribute('transform', `translate(${n2(S.view.x)} ${n2(S.view.y)}) scale(${S.view.z})`); $('#zoomPct').textContent = Math.round(S.view.z * 100) + '%'; }
function toWorld(e) { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left - S.view.x) / S.view.z, (e.clientY - r.top - S.view.y) / S.view.z]; }
function zoomAt(f, sx, sy) {
  const z = clamp(S.view.z * f, 0.03, 12); const k = z / S.view.z;
  S.view.x = sx - (sx - S.view.x) * k; S.view.y = sy - (sy - S.view.y) * k; S.view.z = z; applyView(); renderOverlay();
}
function fitView() {
  const b = contentBounds(false); const r = stage.getBoundingClientRect();
  if (!r.width || !b.w) return;
  const z = Math.min((r.width - 40) / b.w, (r.height - 40) / b.h, 4);
  S.view.z = z; S.view.x = (r.width - b.w * z) / 2 - b.x * z; S.view.y = (r.height - b.h * z) / 2 - b.y * z; applyView(); renderOverlay();
}
stage.addEventListener('wheel', (e) => {
  e.preventDefault(); const r = stage.getBoundingClientRect();
  if (e.shiftKey && !e.ctrlKey) { S.view.x -= e.deltaY || e.deltaX; applyView(); return; }
  const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
  zoomAt(Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX - r.left, e.clientY - r.top);
}, { passive: false });
$('#zoomIn').onclick = () => { const r = stage.getBoundingClientRect(); zoomAt(1.25, r.width / 2, r.height / 2); };
$('#zoomOut').onclick = () => { const r = stage.getBoundingClientRect(); zoomAt(0.8, r.width / 2, r.height / 2); };
$('#zoomFit').onclick = fitView;

// ---------------- Tools ----------------
const TOOL_DEFS = [
  ['select', 'V', 'Select & move', '<path d="M5 3l12 7-5 1.5L9.5 17z" fill="currentColor"/>'],
  ['paint', 'B', 'Paint hexes', '<path d="M4 16c0-2 1.5-3 3-3s2.5 1.2 2.5 2.5S8 19 4 18.5zM9 12l7-8 1.5 1.5-7.5 7.5z" fill="currentColor"/>'],
  ['fill', 'G', 'Flood fill', '<path d="M10 3l7 7-6 6-7-7zM15.5 14s2 2.4 2 3.5a2 2 0 0 1-4 0c0-1.1 2-3.5 2-3.5z" fill="currentColor"/>'],
  ['erase', 'E', 'Erase', '<path d="M3 13l8-8 6 6-6 6H7zM8 17h9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'],
  ['stamp', 'S', 'Stamp icons, cities, towns', '<path d="M10 2.5a3 3 0 0 1 1.6 5.5V11h4.4v3H4v-3h4.4V8A3 3 0 0 1 10 2.5zM4 16h12v1.5H4z" fill="currentColor"/>'],
  ['text', 'T', 'Text & labels', '<path d="M4 4h12v3h-1.6L14 5.6h-3V15h2v1.5H7V15h2V5.6H6L5.6 7H4z" fill="currentColor"/>'],
  ['track', 'K', 'Draw pre-printed track', '<path d="M3 16C8 16 10 11 10 9S12 4 17 4" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M3 13.5v5M6.5 12.5v5M9.5 10l4 2.5M11 6.5l4 2M14.5 2.5v5" stroke="currentColor" stroke-width="1.2"/>'],
  ['hexside', 'X', 'Hexsides: rivers, borders, impassable', '<path d="M10 2.5l6.5 3.75v7.5L10 17.5l-6.5-3.75v-7.5z" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".55"/><path d="M16.5 6.25v7.5" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>'],
  ['shape', 'A', 'Add / remove hexes (map shape)', '<path d="M7 3.5l3.5 2v4L7 11.5l-3.5-2v-4z" fill="currentColor"/><path d="M13 8.5l3.5 2v4l-3.5 2-3.5-2v-4z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 1.5"/><path d="M13 11v3M11.5 12.5h3" stroke="currentColor" stroke-width="1.3"/>'],
  ['region', 'R', 'Region: freeform shapes (lakes, seas, merged hexes)', '<path d="M3 13l3-8 6 2 5-3-1 9-6 4z" fill="currentColor" fill-opacity=".35" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="3" cy="13" r="1.6" fill="currentColor"/><circle cx="6" cy="5" r="1.6" fill="currentColor"/><circle cx="17" cy="4" r="1.6" fill="currentColor"/>'],
  ['pan', 'H', 'Pan (or hold Space)', '<path d="M7 9V4.5a1.2 1.2 0 0 1 2.4 0V9m0-1V3.5a1.2 1.2 0 0 1 2.4 0V9m0-.5V4.5a1.2 1.2 0 0 1 2.4 0v6.5a6 6 0 0 1-6 6c-2.3 0-3.6-1.1-4.8-3L3.6 11a1.2 1.2 0 0 1 2-1.3L7 11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'],
  ['types', 'Y', 'Hex types (presets)', '<path d="M6 3l4 2.3v4.6L6 12.2 2 9.9V5.3zM14 3l4 2.3v4.6l-4 2.3-4-2.3V5.3zM10 10l4 2.3v4.6L10 19.2 6 16.9v-4.6z" fill="currentColor" opacity=".9"/>'],
];
const TOOL_HINTS = {
  select: 'Click a hex or object to edit it on the right. Shift-click or drag a box to select several hexes. Ctrl C / Ctrl X / Ctrl V copy, cut and paste hexes or objects. Drag objects and hex items to move them.',
  paint: 'Drag to paint hexes with the current color or hex type. Alt-click samples a hex. Painting a removed hex restores it.',
  fill: 'Click to fill all connected hexes that look the same.',
  erase: 'Drag across hexes. Choose what to erase below.',
  stamp: 'Click inside a hex to place the selected stamp there. Alt-click (or click off the grid) to place it freely on the page.',
  text: 'Click a hex to add a label (city names, letters, costs). Alt-click or click off the grid for a free text box.',
  track: 'Drag from a hex edge, center, city or town across hexes to lay track. End on a city/center to connect to it. Shift-drag removes track.',
  hexside: 'Click a hex edge to add or remove the side style. Drag along edges to paint several. Shift-click removes.',
  pan: 'Drag to move around the map. Mouse wheel zooms.',
  shape: 'Click or drag over hexes to remove them. Click a removed hex — or anywhere off the grid — to add a hex there. Build any outline: coastlines, ragged rows, islands.',
  region: 'Click to place points (they snap to hex corners and edge midpoints; hold Alt for free placement). Click the first point, double-click, or press Enter to finish. Esc cancels, Backspace removes the last point.',
  types: 'Hex types are reusable presets (color + icons + costs). Pick one to paint with it; edit a type and every hex using it updates.',
};
function setTool(t) {
  if (S.draft && t !== 'region') { S.draft = null; }
  if (t === 'types') { S.tool = 'paint'; renderLeft(); $('#typesSec')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
  S.tool = t; $('#main').classList.toggle('pan', t === 'pan'); renderLeft(); renderOverlay();
}

// ---------------- Pointer handling ----------------
let D = null;
const ITEM_KEYS = ['items'];
function hexAt(wx, wy) { return pixelToHex(wx, wy); }
function snapLocal(lx, ly, mode) {
  if (mode === 'free') return [lx, ly];
  if (mode === 'center') return [0, 0];
  const pts = [[0, 0]];
  for (let i = 0; i < 6; i++) { const a = edgeAngle(i); pts.push([0.48 * Math.cos(a), 0.48 * Math.sin(a)]); const b = cornerAngle(i); pts.push([0.55 * Math.cos(b), 0.55 * Math.sin(b)]); }
  let best = pts[0], bd = Infinity; pts.forEach((p) => { const d = (p[0] - lx) ** 2 + (p[1] - ly) ** 2; if (d < bd) { bd = d; best = p; } });
  return best.map((v) => Math.round(v * 1000) / 1000);
}
function localOf(c, r, wx, wy) { const [cx, cy] = center(c, r); return [(wx - cx) / R(), (wy - cy) / R()]; }

stage.addEventListener('contextmenu', (e) => e.preventDefault());
stage.addEventListener('pointerdown', (e) => {
  if (e.button === 2) return;
  if (isTyping()) document.activeElement.blur();   // so Delete and tool keys act on the map right after editing a field
  const [wx, wy] = toWorld(e);
  stage.setPointerCapture(e.pointerId);
  if (e.button === 1 || S.space || S.tool === 'pan') { D = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: S.view.x, vy: S.view.y }; $('#main').classList.add('panning'); return; }
  const tgt = e.target;
  const [c, r] = hexAt(wx, wy); const k = key(c, r);
  switch (S.tool) {
    case 'select': return selectDown(e, tgt, wx, wy, c, r);
    case 'paint': {
      if (tgt.closest('[data-cell]')) { const ce = tgt.closest('[data-cell]'); paintCell(ce.dataset.o, ce.dataset.cell); return; }
      if (e.altKey) { const h = P.hexes[k]; const f = effFill(h) || P.style.hexFill; if (f && f !== 'none') setBrushColor(f); return; }
      checkpoint(); D = { type: 'paint', last: [wx, wy], lastK: null }; paintAt(wx, wy); return;
    }
    case 'fill': if (inGrid(c, r)) { checkpoint(); floodFill(c, r); } return;
    case 'erase': checkpoint(); D = { type: 'erase', last: [wx, wy], lastK: null, baseDirty: false }; eraseAt(wx, wy); return;
    case 'stamp': return stampDown(e, wx, wy, c, r);
    case 'text': return textDown(e, wx, wy, c, r);
    case 'track': return trackDown(e, wx, wy, c, r);
    case 'hexside': return hexsideDown(e, wx, wy, c, r);
    case 'shape': return shapeDown(e, wx, wy, c, r);
    case 'region': return regionClick(e, wx, wy);
    case 'link': return linkDown(e, tgt, wx, wy, c, r);
  }
});
stage.addEventListener('dblclick', (e) => { if (S.tool === 'region' && S.draft) { if (S.draft.pts.length > 1) { const a = S.draft.pts[S.draft.pts.length - 1], b = S.draft.pts[S.draft.pts.length - 2]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6) S.draft.pts.pop(); } finishRegion(); } });
stage.addEventListener('pointermove', (e) => {
  const [wx, wy] = toWorld(e); const h = hexAt(wx, wy);
  const changed = !S.hover || S.hover[0] !== h[0] || S.hover[1] !== h[1];
  S.hover = h;
  $('#stHex').innerHTML = inGrid(h[0], h[1]) ? `<b>${coordLabel(h[0], h[1]) || '—'}</b> · col ${h[0] + 1}, row ${h[1] + 1}` : '—';
  if (!D) {
    if (S.tool === 'region' && S.draft) { S.draft.cursor = regionSnap(wx, wy, e.altKey); renderOverlay(); return; }
    if (S.tool === 'link' && S.linkStart) { S.linkCursor = [wx, wy]; renderOverlay(); return; }
    if (S.tool === 'hexside' && exists(h[0], h[1])) { const ne = nearestEdge(h[0], h[1], wx, wy); renderOverlay(edgeHighlight(h[0], h[1], ne.i)); }
    else if (changed) renderOverlay();
    return;
  }
  switch (D.type) {
    case 'pan': S.view.x = D.vx + e.clientX - D.sx; S.view.y = D.vy + e.clientY - D.sy; applyView(); return;
    case 'paint': strokeTo(wx, wy, paintAt); return;
    case 'erase': strokeTo(wx, wy, eraseAt); return;
    case 'item': {
      const [c, r] = unkey(D.k); const it = P.hexes[D.k].items[D.i];
      it.x = Math.round((D.ox + (wx - D.sx) / R()) * 1000) / 1000; it.y = Math.round((D.oy + (wy - D.sy) / R()) * 1000) / 1000;
      if (e.shiftKey) { const sn = snapLocal(it.x, it.y, 'points'); it.x = sn[0]; it.y = sn[1]; }
      renderHex(D.k); renderOverlay(); D.moved = true; return;
    }
    case 'obj': {
      const o = P.objects.find((x) => x.id === D.id); if (!o) return;
      let nx = D.ox + wx - D.sx, ny = D.oy + wy - D.sy;
      if (e.shiftKey) { nx = Math.round(nx / 10) * 10; ny = Math.round(ny / 10) * 10; }
      if (!D.moved && Math.hypot(wx - D.sx, wy - D.sy) * S.view.z < 3) return;
      if (!D.moved) checkpoint();
      o.x = nx; o.y = ny; D.moved = true;
      const el = $(`#L-objects > [data-o="${o.id}"], #L-under > [data-o="${o.id}"]`); el && el.setAttribute('transform', `translate(${n2(o.x)} ${n2(o.y)})${o.rot ? ` rotate(${o.rot})` : ''}`);
      renderOverlay(); return;
    }
    case 'resize': {
      const o = P.objects.find((x) => x.id === D.id); if (!o) return;
      const f = Math.max(0.05, (Math.hypot(wx - o.x, wy - o.y)) / D.d0);
      if (o.t === 'img') { o.w = Math.max(4, D.w0 * f); o.h = Math.max(4, D.h0 * f); }
      else if (o.t === 'icon') o.size = Math.max(4, D.s0 * f);
      else if (o.t === 'text') o.fs = Math.max(4, Math.round(D.s0 * f * 10) / 10);
      renderObject(o.id); renderOverlay(); return;
    }
    case 'bg': { const b = P.bgImage; b.x = D.ox + wx - D.sx; b.y = D.oy + wy - D.sy; renderBgImage(); renderOverlay(); return; }
    case 'bgresize': { const b = P.bgImage; const w = Math.max(10, wx - b.x); b.h = w * (D.h0 / D.w0); b.w = w; renderBgImage(); renderOverlay(); return; }
    case 'track': return trackMove(e, wx, wy);
    case 'box': {
      D.ex = wx; D.ey = wy;
      if (!D.moved && Math.hypot(wx - D.sx, wy - D.sy) * S.view.z < 6) return;
      D.moved = true; const z = S.view.z;
      renderOverlay(`<rect x="${n2(Math.min(D.sx, wx))}" y="${n2(Math.min(D.sy, wy))}" width="${n2(Math.abs(wx - D.sx))}" height="${n2(Math.abs(wy - D.sy))}" fill="#f0a830" fill-opacity=".08" stroke="#f0a830" stroke-width="${n2(1.5 / z)}" stroke-dasharray="${n2(5 / z)} ${n2(3 / z)}" pointer-events="none"/>`);
      return;
    }
    case 'shape': return shapeMove(wx, wy);
    case 'vtx': {
      const o = P.objects.find((x) => x.id === D.id); if (!o) return;
      if (!D.moved) { checkpoint(); D.moved = true; }
      const [sx, sy] = regionSnap(wx, wy, e.altKey); o.pts[D.i] = [Math.round((sx - o.x) * 100) / 100, Math.round((sy - o.y) * 100) / 100];
      renderObject(o.id); renderOverlay(); return;
    }
    case 'hexside': return hexsideMove(e, wx, wy);
  }
});
stage.addEventListener('pointerup', (e) => {
  if (!D) return;
  const d = D; D = null; $('#main').classList.remove('panning');
  const [wx, wy] = toWorld(e);
  switch (d.type) {
    case 'paint': case 'erase': if (d.baseDirty || d.edgesDirty) renderBase(); if (d.edgesDirty) renderEdges(); renderOverlay(); schedulePaper(); renderProps(); break;
    case 'item': if (d.moved) { schedulePaper(); renderProps(); } break;
    case 'obj': if (d.moved) { schedulePaper(); renderProps(); } break;
    case 'resize': schedulePaper(); renderProps(); break;
    case 'bg': case 'bgresize': schedulePaper(); renderProps(); break;
    case 'track': trackUp(e, wx, wy, d); break;
    case 'box': boxUp(d); renderOverlay(); break;
    case 'shape': if (d.grew || d.baseDirty) { renderBase(); } renderOverlay(); schedulePaper(); break;
    case 'vtx': schedulePaper(); break;
  }
});
stage.addEventListener('pointerleave', () => { if (!D) { S.hover = null; renderOverlay(); } });

function strokeTo(wx, wy, fn) {
  const [lx, ly] = D.last; const dist = Math.hypot(wx - lx, wy - ly), step = R() * 0.4;
  const n = Math.max(1, Math.ceil(dist / step));
  for (let i = 1; i <= n; i++) fn(lx + ((wx - lx) * i) / n, ly + ((wy - ly) * i) / n);
  D.last = [wx, wy];
}
function setBrushColor(c) { S.brush = { kind: 'color', color: c }; renderLeft(); }
function applyBrush(k) {
  const h = getHex(k, true);
  if (S.brush.kind === 'type') { h.type = S.brush.id; delete h.fill; }
  else { h.fill = S.brush.color; }
}
function paintAt(wx, wy) {
  const [c, r] = hexAt(wx, wy); const k = key(c, r);
  if (!inGrid(c, r) || D.lastK === k) return; D.lastK = k;
  if (P.voids[k]) { delete P.voids[k]; D.baseDirty = true; }
  applyBrush(k); renderHex(k);
}
function eraseAt(wx, wy) {
  const [c, r] = hexAt(wx, wy); const k = key(c, r);
  if (!inGrid(c, r) || D.lastK === k) return; D.lastK = k;
  const h = P.hexes[k];
  switch (S.eraseMode) {
    case 'all': delete P.hexes[k]; break;
    case 'fill': if (h) { delete h.fill; delete h.type; delete h.img; cleanHex(k); } break;
    case 'items': if (h) { h.items = []; h.track = []; cleanHex(k); } break;
    case 'track': if (h) { h.track = []; cleanHex(k); } break;
    case 'sides': { const n = clearHexsides([k]); if (n) { D.edgesDirty = true; } break; }
    case 'void': if (!P.voids[k]) { P.voids[k] = 1; delete P.hexes[k]; D.baseDirty = true; } break;
    case 'restore': if (P.voids[k]) { delete P.voids[k]; D.baseDirty = true; } break;
  }
  renderHex(k);
}
function floodFill(c0, r0) {
  const sig = (k) => { if (P.voids[k]) return null; const h = P.hexes[k]; return (h && h.type ? 't' + h.type : '') + '|' + (h && h.fill ? h.fill : ''); };
  const k0 = key(c0, r0); const target = sig(k0); if (target == null) return;
  const seen = new Set([k0]), q = [[c0, r0]]; let n = 0;
  while (q.length && n < 500000) {
    const [c, r] = q.pop(); const k = key(c, r); applyBrush(k); renderHex(k); n++;
    for (let i = 0; i < 6; i++) {
      const [nc, nr] = neighbor(c, r, i); const nk = key(nc, nr);
      if (!inGrid(nc, nr) || seen.has(nk)) continue; seen.add(nk);
      if (sig(nk) === target) q.push([nc, nr]);
    }
  }
  schedulePaper(); renderProps();
}
function paintCell(oid, cellKey) {
  const o = P.objects.find((x) => x.id === oid); if (!o) return;
  checkpoint(); o.paint = o.paint || {};
  if (S.brush.kind === 'color') o.paint[cellKey] = S.brush.color;
  renderObject(oid); renderOverlay();
}

// ----- select tool
function selectDown(e, tgt, wx, wy, c, r) {
  if (tgt.closest('[data-handle]') && S.sel && S.sel.kind === 'obj') {
    const o = P.objects.find((x) => x.id === S.sel.id); checkpoint();
    D = { type: 'resize', id: o.id, d0: Math.max(1, Math.hypot(wx - o.x, wy - o.y)), w0: o.w, h0: o.h || (o.w / assetAspect(o.ref)), s0: o.t === 'icon' ? o.size || 60 : o.fs || 24 };
    if (o.t === 'img' && !o.h) o.h = D.h0;
    return;
  }
  if (tgt.dataset && (tgt.dataset.vtx != null || tgt.dataset.mid != null) && S.sel && S.sel.kind === 'obj') {
    const o = P.objects.find((x) => x.id === S.sel.id);
    if (tgt.dataset.vtx != null) {
      const i = +tgt.dataset.vtx;
      if (e.shiftKey || e.altKey && false) { if (o.pts.length > 3) { checkpoint(); o.pts.splice(i, 1); renderObject(o.id); renderOverlay(); renderProps(); } return; }
      D = { type: 'vtx', id: o.id, i, moved: false }; return;
    }
    const i = +tgt.dataset.mid; checkpoint(); const p = o.pts[i], q = o.pts[(i + 1) % o.pts.length];
    o.pts.splice(i + 1, 0, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]); renderObject(o.id); renderOverlay();
    D = { type: 'vtx', id: o.id, i: i + 1, moved: true }; return;
  }
  if (tgt.closest('[data-bghandle]')) { checkpoint(); D = { type: 'bgresize', w0: P.bgImage.w, h0: P.bgImage.h }; return; }
  const itEl = !e.shiftKey && tgt.closest('[data-i]');
  if (itEl) {
    const k = itEl.dataset.k, i = +itEl.dataset.i; const it = P.hexes[k].items[i];
    checkpoint(); D = { type: 'item', k, i, sx: wx, sy: wy, ox: it.x || 0, oy: it.y || 0 };
    select({ kind: 'hex', k, item: i }); return;
  }
  const oEl = tgt.closest('[data-o]');
  if (oEl) {
    const id = oEl.dataset.o; const o = P.objects.find((x) => x.id === id);
    const cell = tgt.closest('[data-cell]') ? tgt.closest('[data-cell]').dataset.cell : null;
    select({ kind: 'obj', id, cell });
    D = { type: 'obj', id, sx: wx, sy: wy, ox: o.x, oy: o.y, moved: false };
    return;
  }
  const lEl = tgt.closest('[data-link]');
  if (lEl) { select({ kind: 'link', id: lEl.dataset.link }); return; }
  if (S.bgAdjust && P.bgImage) { const b = P.bgImage; if (wx >= b.x && wy >= b.y && wx <= b.x + b.w && wy <= b.y + b.h) { checkpoint(); D = { type: 'bg', sx: wx, sy: wy, ox: b.x, oy: b.y }; return; } }
  // hex click, shift-click toggle, or drag a box to select several hexes
  D = { type: 'box', sx: wx, sy: wy, ex: wx, ey: wy, shift: e.shiftKey, k: inGrid(c, r) ? key(c, r) : null, moved: false };
}
function boxUp(d) {
  if (d.moved) {
    const ks = hexesInRect(d.sx, d.sy, d.ex, d.ey).filter((k) => !P.voids[k]);
    selectKeys(d.shift ? [...selKeys(), ...ks] : ks); return;
  }
  if (!d.k) { if (!d.shift) select(null); return; }
  if (d.shift) { const cur = selKeys(); const i = cur.indexOf(d.k); if (i >= 0) cur.splice(i, 1); else cur.push(d.k); selectKeys(cur); return; }
  select({ kind: 'hex', k: d.k });
}
function select(sel) {
  const same = JSON.stringify(sel) === JSON.stringify(S.sel);
  S.sel = sel; renderOverlay(); if (!same) renderProps();
  $('#stSel').textContent = sel && sel.kind === 'link' ? 'Link selected' : sel ? (sel.kind === 'hex' ? 'Hex ' + (coordLabel(...unkey(sel.k)) || sel.k) : sel.kind === 'hexes' ? sel.keys.length + ' hexes selected' : sel.kind === 'obj' ? 'Object selected' : 'Editing hex type') : '';
}

// ----- stamp tool
function makeStampItem(st, lx, ly) {
  const o = S.stampOpts, base = { x: lx, y: ly };
  if (o.scale !== 1) base.s = o.scale;
  if (o.rot) base.r = o.rot;
  switch (st.kind) {
    case 'icon': return { t: 'icon', icon: st.icon, ...(o.color ? { color: o.color } : {}), ...base };
    case 'asset': return { t: 'img', ref: st.ref, ...base };
    case 'city': return { t: 'city', slots: st.slots, rev: '', ...base };
    case 'town': return { t: 'town', style: st.style, ...base };
    case 'phases': return { t: 'phases', values: 'y20 g30 b40 x60', ...base };
    case 'wedge': return { t: 'wedge', e: st.e || 0, x: 0, y: 0, ...(o.color ? { color: o.color } : {}) };
    case 'text': return { t: 'text', ...clone(TEXT_PRESETS[st.preset].item), ...base };
  }
}
const TEXT_PRESETS = {
  label: { label: 'City name', item: { text: 'Name', style: 'plain', size: 0.24 } },
  big: { label: 'Big label', item: { text: 'NY', style: 'plain', size: 0.42 } },
  mtn: { label: 'Mountain cost', item: { text: '$60', style: 'triangle', size: 0.2 } },
  water: { label: 'Water cost', item: { text: '$40', style: 'wave', size: 0.22, color: '#1d4f7a' } },
  circle: { label: 'Number badge', item: { text: '1', style: 'circle', size: 0.26 } },
  box: { label: 'Boxed label', item: { text: 'B', style: 'box', size: 0.26 } },
  hexagon: { label: 'Hexagon value', item: { text: '$20', style: 'hexagon', size: 0.2 } },
  cost: { label: 'Plain cost', item: { text: '$20', style: 'plain', size: 0.22 } },
};
function stampDown(e, wx, wy, c, r) {
  const st = S.stamp;
  if (!e.altKey && exists(c, r)) {
    const k = key(c, r); const [lx, ly] = localOf(c, r, wx, wy); const [sx, sy] = snapLocal(lx, ly, S.stampOpts.snap);
    checkpoint(); const h = getHex(k, true);
    const stx = st.kind === 'wedge' ? { ...st, e: nearestEdge(c, r, wx, wy).i } : st;
    h.items.push(makeStampItem(stx, sx, sy)); renderHex(k);
    select({ kind: 'hex', k, item: h.items.length - 1 }); renderProps(); schedulePaper(); return;
  }
  // free placement
  checkpoint();
  let o;
  const sz = R() * 0.9 * S.stampOpts.scale * 1.4;
  if (st.kind === 'icon') o = { id: uid('o'), t: 'icon', icon: st.icon, color: S.stampOpts.color || undefined, size: sz, x: wx - sz / 2, y: wy - sz / 2 };
  else if (st.kind === 'asset') { const w = sz * 1.6; o = { id: uid('o'), t: 'img', ref: st.ref, w, h: w / assetAspect(st.ref), x: wx - w / 2, y: wy - w / 2 }; }
  else if (st.kind === 'text') o = { id: uid('o'), t: 'text', text: TEXT_PRESETS[st.preset].item.text, fs: R() * 0.5, bold: true, x: wx, y: wy };
  else if (st.kind === 'phases') o = { id: uid('o'), t: 'revbox', values: 'y20 g30 b40 x60', cw: R() * 0.42, x: wx, y: wy };
  else { toast('Cities, towns and off-board arrows go inside a hex. Click inside the grid.'); S.undo.pop(); return; }
  P.objects.push(o); renderObject(o.id); select({ kind: 'obj', id: o.id }); schedulePaper();
}
function textDown(e, wx, wy, c, r) {
  if (!e.altKey && exists(c, r)) {
    const k = key(c, r); const [lx, ly] = localOf(c, r, wx, wy); const [sx, sy] = snapLocal(lx, ly, S.stampOpts.snap);
    checkpoint(); const h = getHex(k, true);
    const preset = TEXT_PRESETS[S.textStyle] || TEXT_PRESETS.label;
    h.items.push({ t: 'text', ...clone(preset.item), x: sx, y: sy }); renderHex(k);
    select({ kind: 'hex', k, item: h.items.length - 1 }); renderProps(); focusItemText(h.items.length - 1); schedulePaper(); return;
  }
  checkpoint(); const o = { id: uid('o'), t: 'text', text: 'Text', fs: 28, bold: true, x: wx, y: wy - 14 };
  P.objects.push(o); renderObject(o.id); select({ kind: 'obj', id: o.id }); schedulePaper();
  setTimeout(() => { const ta = $('#props textarea[data-f="text"]'); ta && (ta.focus(), ta.select()); }, 30);
}
function focusItemText(i) { setTimeout(() => { const el = $(`#props [data-item="${i}"] [data-f="text"]`) || $(`#props [data-item="${i}"] [data-f="name"]`); if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); el.select && el.select(); } }, 40); }

// ----- track tool
function trackCandidates(c, r) {
  const k = key(c, r), h = P.hexes[k], [cx, cy] = center(c, r), out = [];
  for (let i = 0; i < 6; i++) { const [mx, my] = edgeMidLocal(i); out.push({ ep: 'e' + i, x: cx + mx, y: cy + my, edge: true }); }
  out.push({ ep: 'c', x: cx, y: cy });
  const all = h ? h.items : [];
  (all || []).forEach((it, i) => {
    if (it.t === 'city') { const [px, py] = itemPos(c, r, it); citySlotPositions(it).forEach((p, si) => out.push({ ep: `i${i}.${si}`, x: px + p[0], y: py + p[1] })); }
    else if (it.t === 'town') { const [px, py] = itemPos(c, r, it); out.push({ ep: 'i' + i, x: px, y: py }); }
  });
  return out;
}
function nearestCand(c, r, wx, wy, nonEdgeOnly) {
  let best = null, bd = Infinity;
  trackCandidates(c, r).forEach((cd) => { if (nonEdgeOnly && cd.edge) return; const d = Math.hypot(cd.x - wx, cd.y - wy); if (d < bd) { bd = d; best = cd; } });
  return best ? { ...best, d: bd } : null;
}
function trackDown(e, wx, wy, c, r) {
  if (!exists(c, r)) return;
  const st = nearestCand(c, r, wx, wy);
  checkpoint();
  D = { type: 'track', c, r, entry: st.ep, start: st, remove: e.shiftKey, last: [wx, wy], made: 0, path: [] };
  trackPreview(wx, wy);
}
function addSeg(c, r, a, b, remove) {
  if (a === b) return;
  const k = key(c, r);
  if (remove) {
    const h = P.hexes[k]; if (!h || !h.track) return;
    h.track = h.track.filter((t) => !((t.a === a && t.b === b) || (t.a === b && t.b === a))); cleanHex(k); renderHex(k); return;
  }
  const h = getHex(k, true); h.track = h.track || [];
  if (h.track.some((t) => (t.a === a && t.b === b) || (t.a === b && t.b === a))) return;
  const o = S.trackOpts; const t = { a, b };
  if (o.color && o.color !== '#111111') t.color = o.color;
  if (o.w !== 1) t.w = o.w;
  if (o.style !== 'std') t.style = o.style;
  if (o.casing) t.casing = o.casing;
  if (o.geo && o.geo !== (P.style.trackGeo || 'curve')) t.geo = o.geo;
  h.track.push(t); renderHex(k);
}
function trackMove(e, wx, wy) {
  const [lx, ly] = D.last; const dist = Math.hypot(wx - lx, wy - ly), step = R() * 0.25, n = Math.max(1, Math.ceil(dist / step));
  for (let i = 1; i <= n; i++) {
    const px = lx + ((wx - lx) * i) / n, py = ly + ((wy - ly) * i) / n;
    const [hc, hr] = hexAt(px, py);
    if (hc === D.c && hr === D.r) continue;
    // crossed into another hex: find shared edge
    let ei = -1; for (let j = 0; j < 6; j++) { const [nc, nr] = neighbor(D.c, D.r, j); if (nc === hc && nr === hr) { ei = j; break; } }
    if (ei < 0 || !exists(hc, hr)) { continue; }
    addSeg(D.c, D.r, D.entry, 'e' + ei, D.remove); D.made++;
    D.c = hc; D.r = hr; D.entry = 'e' + ((ei + 3) % 6);
  }
  D.last = [wx, wy];
  trackPreview(wx, wy);
}
function trackPreview(wx, wy) {
  const z = S.view.z; const a = endpointPos(D.c, D.r, P.hexes[key(D.c, D.r)] || { items: [] }, D.entry);
  const nc = nearestCand(D.c, D.r, wx, wy);
  let s = `<line x1="${n2(a.x)}" y1="${n2(a.y)}" x2="${n2(wx)}" y2="${n2(wy)}" stroke="${D.remove ? '#e5534b' : '#f0a830'}" stroke-width="${n2(3 / z)}" stroke-dasharray="${n2(6 / z)} ${n2(4 / z)}"/>`;
  s += `<circle cx="${n2(a.x)}" cy="${n2(a.y)}" r="${n2(5 / z)}" fill="#f0a830"/>`;
  if (nc) s += `<circle cx="${n2(nc.x)}" cy="${n2(nc.y)}" r="${n2(6 / z)}" fill="none" stroke="#f0a830" stroke-width="${n2(2 / z)}"/>`;
  renderOverlay(`<g pointer-events="none">${s}</g>`);
}
function trackUp(e, wx, wy, d) {
  const [hc, hr] = hexAt(wx, wy);
  if (hc === d.c && hr === d.r) {
    const endAny = nearestCand(d.c, d.r, wx, wy), endInner = nearestCand(d.c, d.r, wx, wy, true);
    let end = null;
    if (d.made === 0) end = endAny; // single-hex drag: any endpoint
    else if (endInner && endInner.d < R() * 0.4) end = endInner; // finished on a city/center
    if (end && end.ep !== d.entry) addSeg(d.c, d.r, d.entry, end.ep, d.remove);
  }
  if (!d.made && !(hc === d.c && hr === d.r)) { /* nothing */ }
  const k = key(d.c, d.r); if (P.hexes[k]) cleanHex(k);
  renderOverlay(); renderProps(); schedulePaper();
  if (S.undo.length && S.undo[S.undo.length - 1] === snapshot()) S.undo.pop();
}

// ----- hexside tool
function edgeHighlight(c, r, i) {
  const [cx, cy] = center(c, r); const cs = corners(cx, cy); const a = cs[i], b = cs[(i + 1) % 6];
  return `<path d="M${n2(a[0])} ${n2(a[1])}L${n2(b[0])} ${n2(b[1])}" stroke="#f0a830" stroke-width="${n2(6 / S.view.z)}" stroke-linecap="round" opacity=".8" pointer-events="none"/>`;
}
function hexsideDown(e, wx, wy, c, r) {
  if (!inGrid(c, r)) return;
  const ne = nearestEdge(c, r, wx, wy); const ek = edgeKey(c, r, ne.i);
  checkpoint();
  const cur = P.edges[ek];
  let mode = 'set';
  D = { type: 'hexside', hadHide: !!(cur && cur.t === 'hide') };
  if (e.shiftKey || S.edgeOpts.t === 'plain') mode = 'del'; else if (cur && cur.t === S.edgeOpts.t && (cur.label || '') === (S.edgeOpts.label || '')) mode = 'del';
  D = { type: 'hexside', mode, lastE: null, hadHide: D.hadHide };
  applyEdge(ek, mode);
}
function applyEdge(ek, mode) {
  if (D.lastE === ek) return; D.lastE = ek; const was = P.edges[ek]; if (was && was.t === 'hide') D.hadHide = true;
  if (mode === 'del') delete P.edges[ek];
  else { const o = S.edgeOpts; const e = { t: o.t }; if (o.color && o.t !== 'hide') e.color = o.color; if (o.w !== 1) e.w = o.w; if (o.label && o.t !== 'hide') e.label = o.label; P.edges[ek] = e; }
  renderEdges(); if (S.edgeOpts.t === 'hide' || D.hadHide) renderBase();
}
function hexsideMove(e, wx, wy) {
  const [c, r] = hexAt(wx, wy); if (!inGrid(c, r)) return;
  const ne = nearestEdge(c, r, wx, wy); if (ne.d > R() * 0.45) return;
  applyEdge(edgeKey(c, r, ne.i), D.mode);
  renderOverlay(edgeHighlight(c, r, ne.i));
}

// ----- add / remove hexes (map shape)
function growGridTo(c, r) {
  const g = P.grid; let nc = c, nr = r; const newVoid = [];
  const voidRow = (rr) => { for (let cc = 0; cc < g.cols; cc++) P.voids[key(cc, rr)] = 1; };
  const voidCol = (cc) => { for (let rr = 0; rr < g.rows; rr++) P.voids[key(cc, rr)] = 1; };
  if (nr < 0) { const n = -nr; extendGrid('top', n, true); for (let i = 0; i < n; i++) voidRow(i); nr += n; }
  if (nr >= g.rows) { const n = nr - g.rows + 1, old = g.rows; extendGrid('bottom', n, true); for (let i = old; i < old + n; i++) voidRow(i); }
  if (nc < 0) { const n = -nc; extendGrid('left', n, true); for (let i = 0; i < n; i++) voidCol(i); nc += n; }
  if (nc >= g.cols) { const n = nc - g.cols + 1, old = g.cols; extendGrid('right', n, true); for (let i = old; i < old + n; i++) voidCol(i); }
  delete P.voids[key(nc, nr)];
  return [nc, nr];
}
function shapeDown(e, wx, wy, c, r) {
  checkpoint();
  const mode = inGrid(c, r) && !P.voids[key(c, r)] ? 'remove' : 'add';
  D = { type: 'shape', mode, last: [wx, wy], lastK: null, grew: false, baseDirty: false };
  shapeAt(wx, wy);
}
function shapeAt(wx, wy) {
  let [c, r] = hexAt(wx, wy); let k = key(c, r); if (D.lastK === k) return; D.lastK = k;
  if (D.mode === 'remove') { if (inGrid(c, r) && !P.voids[k]) { P.voids[k] = 1; delete P.hexes[k]; renderHex(k); D.baseDirty = true; renderBase(); } return; }
  if (!inGrid(c, r)) {
    const far = c < -30 || r < -30 || c > P.grid.cols + 30 || r > P.grid.rows + 30; if (far) return;
    const before = [P.grid.cols, P.grid.rows]; [c, r] = growGridTo(c, r); D.grew = true;
    renderAll(); const [x, y] = center(c, r); D.last = [x, y]; D.lastK = key(c, r); return;
  }
  if (P.voids[k]) { delete P.voids[k]; D.baseDirty = true; renderBase(); renderHex(k); }
}
function shapeMove(wx, wy) {
  const [lx, ly] = D.last; const dist = Math.hypot(wx - lx, wy - ly), step = R() * 0.4, n = Math.max(1, Math.ceil(dist / step));
  for (let i = 1; i <= n; i++) shapeAt(lx + ((wx - lx) * i) / n, ly + ((wy - ly) * i) / n);
  D.last = [wx, wy];
}

// ----- regions
S.draft = null;
S.regionOpts = { fill: '#79b8e8', stroke: '#2f6f9f', sw: 2, smooth: false, under: false, opacity: 1 };
function regionSnap(wx, wy, free) {
  if (free) return [wx, wy];
  const [c, r] = hexAt(wx, wy); const [cx, cy] = center(c, r); const tol = 14 / S.view.z;
  let best = null, bd = tol;
  corners(cx, cy).forEach((p) => { const d = Math.hypot(p[0] - wx, p[1] - wy); if (d < bd) { bd = d; best = p; } });
  for (let i = 0; i < 6; i++) { const [mx, my] = edgeMidLocal(i); const d = Math.hypot(cx + mx - wx, cy + my - wy); if (d < bd) { bd = d; best = [cx + mx, cy + my]; } }
  { const d = Math.hypot(cx - wx, cy - wy); if (d < bd) { best = [cx, cy]; } }
  return best ? [Math.round(best[0] * 100) / 100, Math.round(best[1] * 100) / 100] : [wx, wy];
}
function regionClick(e, wx, wy) {
  const p = regionSnap(wx, wy, e.altKey);
  if (!S.draft) S.draft = { pts: [] };
  const d = S.draft;
  if (d.pts.length >= 3 && Math.hypot(p[0] - d.pts[0][0], p[1] - d.pts[0][1]) * S.view.z < 10) { finishRegion(); return; }
  d.pts.push(p); renderOverlay();
}
function finishRegion() {
  const d = S.draft; S.draft = null;
  if (!d || d.pts.length < 3) { renderOverlay(); if (d) toast('A region needs at least 3 points'); return; }
  checkpoint();
  const x0 = Math.min(...d.pts.map((p) => p[0])), y0 = Math.min(...d.pts.map((p) => p[1]));
  const o = { id: uid('o'), t: 'region', x: x0, y: y0, pts: d.pts.map((p) => [Math.round((p[0] - x0) * 100) / 100, Math.round((p[1] - y0) * 100) / 100]), ...clone(S.regionOpts) };
  P.objects.push(o); renderObjects(); select({ kind: 'obj', id: o.id }); schedulePaper();
  toast('Region added. Drag its points to adjust — click a small dot on an edge to add a point, Shift-click a point to remove it.');
}

// ----- reset hexsides to plain
function clearHexsides(keys) {
  let n = 0;
  keys.forEach((k) => { const [c, r] = unkey(k); for (let i = 0; i < 6; i++) { const ek = edgeKey(c, r, i); if (P.edges[ek]) { delete P.edges[ek]; n++; } } });
  return n;
}
function hexsideCount(keys) { const seen = new Set(); keys.forEach((k) => { const [c, r] = unkey(k); for (let i = 0; i < 6; i++) { const ek = edgeKey(c, r, i); if (P.edges[ek]) seen.add(ek); } }); return seen.size; }
function resetHexsides(keys) {
  if (!hexsideCount(keys)) { toast('Those hexsides are already plain.'); return; }
  checkpoint(); const n = clearHexsides(keys); renderBase(); renderEdges(); renderProps(); schedulePaper();
  toast(`Reset ${n} hexside${n === 1 ? '' : 's'} to plain`);
}
function clearAllHexsidesConfirm() {
  const n = Object.keys(P.edges).length; if (!n) { toast('There are no styled hexsides on this map.'); return; }
  confirmBox('Clear all hexsides', `Remove all ${n} hexside styles (rivers, borders, impassable sides, hidden grid lines) from the whole map? Ctrl Z undoes this.`, 'Clear all', () => { checkpoint(); P.edges = {}; renderBase(); renderEdges(); renderProps(); schedulePaper(); toast(`Cleared ${n} hexsides`); });
}

// ---------------- Keyboard ----------------
const isTyping = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable); };
window.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); doSave(); return; }
  if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); openDialog(); return; }
  if (isTyping()) { if (e.key === 'Escape') document.activeElement.blur(); return; }
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
  if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSel(); return; }
  if (S.draft) {
    if (e.key === 'Enter') { e.preventDefault(); finishRegion(); return; }
    if (e.key === 'Escape') { S.draft = null; renderOverlay(); return; }
    if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); S.draft.pts.pop(); if (!S.draft.pts.length) S.draft = null; renderOverlay(); return; }
  }
  if (e.key === ' ') { if (!S.space) { S.space = true; $('#main').classList.add('pan'); } e.preventDefault(); return; }
  if (e.key === 'Escape') { closeMenus(); if ($('#modal').classList.contains('open')) closeModal(); else select(null); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSel(); return; }
  if (e.key.startsWith('Arrow') && S.sel && S.sel.kind === 'obj') {
    e.preventDefault(); const o = P.objects.find((x) => x.id === S.sel.id); const st = e.shiftKey ? 10 : 1;
    checkpoint('nudge'); if (e.key === 'ArrowLeft') o.x -= st; if (e.key === 'ArrowRight') o.x += st; if (e.key === 'ArrowUp') o.y -= st; if (e.key === 'ArrowDown') o.y += st;
    renderObject(o.id); renderOverlay(); schedulePaper(); return;
  }
  if (mod || e.altKey) return;
  const t = TOOL_DEFS.find((d) => d[1].toLowerCase() === e.key.toLowerCase()); if (t) setTool(t[0]);
});
window.addEventListener('keyup', (e) => { if (e.key === ' ') { S.space = false; $('#main').classList.toggle('pan', S.tool === 'pan'); } });

function deleteSel() {
  if (!S.sel) return;
  if (S.sel.kind === 'hexes') {
    const ks = S.sel.keys; checkpoint();
    if (ks.some((k) => !hexIsEmpty(P.hexes[k]))) { ks.forEach((k) => { delete P.hexes[k]; renderHex(k); }); toast('Hexes cleared — press Delete again to remove them from the map'); renderProps(); }
    else { ks.forEach((k) => { P.voids[k] = 1; delete P.hexes[k]; renderHex(k); }); renderBase(); select(null); toast(`Removed ${ks.length} hexes (Ctrl Z to undo)`); }
    renderOverlay(); schedulePaper(); return;
  }
  if (S.sel.kind === 'obj') { checkpoint(); P.objects = P.objects.filter((o) => o.id !== S.sel.id); renderObject(S.sel.id); select(null); schedulePaper(); return; }
  if (S.sel.kind === 'hex') {
    const k = S.sel.k, h = P.hexes[k];
    if (P.voids[k]) { checkpoint(); delete P.voids[k]; renderBase(); renderHex(k); renderOverlay(); renderProps(); toast('Hex restored'); return; }
    checkpoint();
    if (S.sel.item != null && h && h.items[S.sel.item]) { removeItem(k, S.sel.item); S.sel.item = null; toast('Item deleted'); }
    else if (!hexIsEmpty(h)) { delete P.hexes[k]; toast('Hex cleared — press Delete again to remove the hex from the map'); }
    else { P.voids[k] = 1; delete P.hexes[k]; renderBase(); toast('Hex removed from the map (Ctrl Z to undo)'); }
    renderHex(k); renderOverlay(); renderProps(); schedulePaper();
  }
}
function duplicateSel() {
  if (!S.sel || S.sel.kind !== 'obj') return; const o = P.objects.find((x) => x.id === S.sel.id); if (!o) return;
  checkpoint(); const n = clone(o); n.id = uid('o'); n.x += 20; n.y += 20; P.objects.push(n); renderObject(n.id); select({ kind: 'obj', id: n.id }); schedulePaper();
}
function removeItem(k, i, list) {
  const h = P.hexes[k]; if (!h) return;
  h.items.splice(i, 1);
  if (typeof fixHomesOnItemChange === 'function') fixHomesOnItemChange(k, (n) => (n === i ? null : n > i ? n - 1 : n));
  h.track = (h.track || []).filter((t) => !([t.a, t.b].some((ep) => ep[0] === 'i' && parseInt(ep.slice(1)) === i))).map((t) => {
    const fix = (ep) => { if (ep[0] !== 'i') return ep; const [a, b] = ep.slice(1).split('.'); const n = +a > i ? +a - 1 : +a; return 'i' + n + (b != null ? '.' + b : ''); };
    return { ...t, a: fix(t.a), b: fix(t.b) };
  });
  cleanHex(k);
}
function moveItem(k, i, dir) {
  const h = P.hexes[k]; const j = i + dir; if (!h || j < 0 || j >= h.items.length) return;
  [h.items[i], h.items[j]] = [h.items[j], h.items[i]];
  if (typeof fixHomesOnItemChange === 'function') fixHomesOnItemChange(k, (n) => (n === i ? j : n === j ? i : n));
  const sw = (ep) => { if (ep[0] !== 'i') return ep; const [a, b] = ep.slice(1).split('.'); let n = +a; if (n === i) n = j; else if (n === j) n = i; return 'i' + n + (b != null ? '.' + b : ''); };
  h.track = (h.track || []).map((t) => ({ ...t, a: sw(t.a), b: sw(t.b) }));
}

// ---------------- Toast / modal / busy ----------------
let _toastT = 0;
function toast(msg, err) { const t = $('#toast'); t.textContent = msg; t.classList.toggle('err', !!err); t.classList.add('show'); clearTimeout(_toastT); _toastT = setTimeout(() => t.classList.remove('show'), err ? 5000 : 2600); }
function openModal(title, bodyHTML, buttons = []) {
  $('#modal .modal').classList.remove('wide'); $('#modalTitle').textContent = title; $('#modalBody').innerHTML = bodyHTML;
  const f = $('#modalFoot'); f.innerHTML = '';
  buttons.forEach((b) => { const el = document.createElement('button'); el.className = 'btn ' + (b.cls || ''); el.textContent = b.label; el.onclick = b.onClick; f.appendChild(el); });
  $('#modal').classList.add('open');
}
function closeModal() { $('#modal').classList.remove('open'); $('#modal .modal').classList.remove('wide'); }
$('#modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') closeModal(); });
function confirmBox(title, msg, okLabel, cb, danger = true) {
  openModal(title, `<p>${msg}</p>`, [{ label: 'Cancel', onClick: closeModal }, { label: okLabel, cls: danger ? 'pri' : 'pri', onClick: () => { closeModal(); cb(); } }]);
}
function busy(on, msg) { $('#busy').classList.toggle('open', on); if (msg) $('#busyMsg').textContent = msg; }

// ---------------- Left panel ----------------
function stampPreview(st) {
  if (st.kind === 'icon') return `<svg viewBox="0 0 100 100">${iconSVG(st.icon, '')}</svg>`;
  if (st.kind === 'asset') return `<img src="${assetHref(st.ref)}" alt="">`;
  const it = makeStampItem(st, 0, 0); delete it.s; delete it.r; if (it.t === 'city' || it.t === 'town') it.rev = '';
  if (it.t === 'wedge') { const [cx0, cy0] = center(0, 0), s0 = R(); return `<svg viewBox="${n2(cx0 - s0 * 1.05)} ${n2(cy0 - s0 * 1.05)} ${n2(2.1 * s0)} ${n2(2.1 * s0)}"><path d="${hexPathAt(cx0, cy0)}" fill="#e0443e" stroke="#555" stroke-width="${s0 * 0.04}"/>${itemStr(0, 0, it, 0, {})}</svg>`; }
  const [cx, cy] = center(0, 0), s = R();
  const ex = it.t === 'phases' ? 1.0 : it.t === 'text' ? 0.65 : it.t === 'city' && it.slots > 2 ? 0.75 : 0.62;
  return `<svg viewBox="${n2(cx - s * ex)} ${n2(cy - s * ex)} ${n2(2 * s * ex)} ${n2(2 * s * ex)}">${itemStr(0, 0, it, 0, {})}</svg>`;
}
function typePreview(t) {
  const [cx, cy] = center(0, 0), s = R(); const h = { type: t.id, items: [], track: [] };
  return `<svg viewBox="${n2(cx - s * 1.05)} ${n2(cy - s * 1.05)} ${n2(2.1 * s)} ${n2(2.1 * s)}"><path d="${hexPathAt(cx, cy)}" fill="${P.style.hexFill === 'none' ? '#ffffff' : P.style.hexFill}"/>${hexFillStr(0, 0, h, { idp: 'tp' + t.id })}${hexContentStr(0, 0, h, {})}<path d="${hexPathAt(cx, cy)}" fill="none" stroke="#555" stroke-width="${s * 0.04}"/></svg>`;
}
const STAMP_GROUPS = () => [
  ['Cities & towns', [
    { kind: 'city', slots: 1, label: 'City (1 slot)' }, { kind: 'city', slots: 2, label: 'City (2 slots)' }, { kind: 'city', slots: 3, label: 'City (3 slots)' },
    { kind: 'city', slots: 4, label: 'City (4 slots)' }, { kind: 'town', style: 'dot', label: 'Town (dot)' }, { kind: 'town', style: 'bar', label: 'Town (bar)' },
    { kind: 'town', style: 'disc', label: 'Town (white disc, Age of Steam)' }, { kind: 'phases', label: 'Off-board phase revenues (Alt-click off the hex for a free box)' },
    { kind: 'wedge', e: isPointy() ? 0 : 5, label: 'Off-board arrow — click near the edge it should sit on' },
  ]],
  ['Labels & costs', Object.entries(TEXT_PRESETS).map(([k, v]) => ({ kind: 'text', preset: k, label: v.label }))],
  ...ICON_CATS.map((cat) => [cat, Object.values(ICONS).filter((i) => i.cat === cat).map((i) => ({ kind: 'icon', icon: i.key, label: i.label }))]),
  ['Your uploads', Object.entries(P.assets).filter(([, a]) => a.kind !== 'bg').map(([id, a]) => ({ kind: 'asset', ref: id, label: a.name || 'Upload' }))],
];
const sameStamp = (a, b) => a.kind === b.kind && a.icon === b.icon && a.slots === b.slots && a.style === b.style && a.preset === b.preset && a.ref === b.ref;
function renderLeft() {
  // tools
  $('#tools').innerHTML = TOOL_DEFS.map(([id, k, label, svg]) => `<button class="tool ${S.tool === id ? 'on' : ''}" data-tool="${id}" title="${label} (${k})"><svg viewBox="0 0 20 20">${svg}</svg><kbd>${k}</kbd></button>`).join('');
  $$('#tools .tool').forEach((b) => (b.onclick = () => setTool(b.dataset.tool)));
  $('#toolHint').textContent = TOOL_HINTS[S.tool] || '';
  renderToolOpts();
  // palette
  const cur = S.brush.kind === 'color' ? S.brush.color : null;
  $('#curColor').value = cur && /^#[0-9a-f]{6}$/i.test(cur) ? cur : '#888888'; $('#curColorHex').value = cur || '';
  $('#swatches').innerHTML = P.palette.map((c, i) => `<div class="sw ${cur && cur.toLowerCase() === c.toLowerCase() ? 'on' : ''}" style="background:${c}" data-i="${i}" title="${c}"></div>`).join('');
  $$('#swatches .sw').forEach((el) => {
    el.onclick = () => { setBrushColor(P.palette[+el.dataset.i]); if (!['paint', 'fill'].includes(S.tool)) setTool('paint'); };
    el.oncontextmenu = (e) => { e.preventDefault(); checkpoint(); P.palette.splice(+el.dataset.i, 1); renderLeft(); };
  });
  // stamps
  const groups = STAMP_GROUPS();
  $('#stampGallery').innerHTML = groups.filter(([, list]) => list.length).map(([cat, list], gi) => `<div class="cat">${cat}</div><div class="stamps">` +
    list.map((st, i) => `<div class="stamp ${S.tool === 'stamp' && sameStamp(st, S.stamp) ? 'on' : ''}" data-g="${gi}" data-i="${i}" title="${esc(st.label)}">${stampPreview(st)}${st.kind === 'asset' ? `<span class="x" data-del="${st.ref}">×</span>` : ''}</div>`).join('') + '</div>').join('') +
    (Object.keys(P.assets).filter((k) => P.assets[k].kind !== 'bg').length ? '' : '<div class="help" style="margin-top:8px">Upload your own icons (PNG, JPG, SVG) to stamp them on hexes or use them in tables as <code>:name:</code>.</div>');
  const gl = groups.filter(([, list]) => list.length);
  $$('#stampGallery .stamp').forEach((el) => {
    el.onclick = (e) => {
      if (e.target.dataset.del) { const ref = e.target.dataset.del; confirmBox('Delete upload', 'Remove this uploaded image from the map? Hexes and objects using it will lose it.', 'Delete', () => { checkpoint(); deleteAsset(ref); }); return; }
      S.stamp = gl[+el.dataset.g][1][+el.dataset.i]; S.tool = 'stamp'; renderLeft();
    };
  });
  // hex types
  renderTypes();
}
function renderToolOpts() {
  const el = $('#toolOpts'); let h = '';
  const t = S.tool;
  if (t === 'paint' || t === 'fill') {
    h = `<h3>Brush</h3><div class="row" style="gap:10px"><div style="width:44px;height:44px;flex:none">${S.brush.kind === 'type' && (P.types || []).find((x) => x.id === S.brush.id) ? typePreview(P.types.find((x) => x.id === S.brush.id)) : `<svg viewBox="-11 -11 22 22"><path d="${'M0 -10L8.66 -5L8.66 5L0 10L-8.66 5L-8.66 -5Z'}" fill="${S.brush.color}" stroke="#555"/></svg>`}</div>
      <div class="help" style="margin:0">${S.brush.kind === 'type' ? 'Painting hex type <b>' + esc((P.types.find((x) => x.id === S.brush.id) || {}).name || '') + '</b>' : 'Painting color <code>' + S.brush.color + '</code>'}. Pick a color or a hex type below.</div></div>`;
  } else if (t === 'erase') {
    h = `<h3>Erase</h3><select id="eraseMode">
      <option value="all">Everything in the hex</option><option value="fill">Color / hex type only</option><option value="items">Icons, labels & track</option><option value="track">Track only</option><option value="sides">Hexsides only (back to plain)</option>
      <option value="void">Remove hex from the map</option><option value="restore">Restore removed hexes</option></select>
      <div class="help">Removing hexes lets you shape coastlines and irregular maps. Removed hexes show as dashed outlines while editing and are not exported.</div>`;
  } else if (t === 'stamp' || t === 'text') {
    h = `<h3>${t === 'stamp' ? 'Stamp options' : 'Label options'}</h3>
      ${t === 'text' ? `<div class="f"><label>Style</label><select id="textStyle">${Object.entries(TEXT_PRESETS).map(([k, v]) => `<option value="${k}" ${S.textStyle === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>` : ''}
      <div class="f"><label>Placement</label><div class="seg" id="snapSeg"><button data-v="points">Snap</button><button data-v="center">Center</button><button data-v="free">Free</button></div></div>
      ${t === 'stamp' ? `<div class="f"><label>Size</label><input type="range" id="stScale" min="0.3" max="2.5" step="0.05" value="${S.stampOpts.scale}"></div>
      <div class="f"><label>Rotation</label><input type="range" id="stRot" min="0" max="345" step="15" value="${S.stampOpts.rot}"></div>
      <div class="f"><label>Icon color</label><div class="row"><label class="chk" style="margin:0"><input type="checkbox" id="stColOn" ${S.stampOpts.color ? 'checked' : ''}>Custom</label><input type="color" id="stCol" value="${S.stampOpts.color || '#8b6b4a'}"></div></div>` : ''}
      <div class="help">Snap places items at the center or one of 12 standard positions. Hold <kbd>Shift</kbd> while dragging an item to snap it.</div>`;
  } else if (t === 'track') {
    const o = S.trackOpts;
    const geo = o.geo || P.style.trackGeo || 'curve';
    h = `<h3>Track style</h3>
      <div class="f"><label>Geometry</label><div class="seg" id="trkGeo"><button data-v="curve" class="${geo === 'curve' ? 'on' : ''}">Curvilinear</button><button data-v="lawson" class="${geo === 'lawson' ? 'on' : ''}">Lawsonian</button></div></div>
      <div class="f"><label>Type</label><div class="seg" id="trkStyle"><button data-v="std">Standard</button><button data-v="narrow">Narrow</button><button data-v="dual">Dual</button></div></div>
      <div class="f"><label>Color</label><div class="row"><input type="color" id="trkColor" value="${o.color}"><button class="btn sm" data-tc="#111111">Black</button><button class="btn sm" data-tc="#c0392b">Red</button><button class="btn sm" data-tc="#7a7a7a">Gray</button></div></div>
      <div class="f"><label>Width</label><input type="range" id="trkW" min="0.4" max="2" step="0.05" value="${o.w}"></div>
      <div class="f"><label>Outline</label><div class="row"><label class="chk" style="margin:0"><input type="checkbox" id="trkCasOn" ${o.casing ? 'checked' : ''}>White edge</label></div></div>
      <div class="help"><b>Curvilinear</b>: smooth arcs edge to edge (straight, gentle and sharp curves). <b>Lawsonian</b>: every track runs straight into the hex center. Set the map-wide default under map settings; edit single segments in the hex panel.</div>`;
  } else if (t === 'hexside') {
    const o = S.edgeOpts;
    h = `<h3>Hexside style</h3>
      <div class="f"><label>Style</label><select id="edgeT">${Object.entries(EDGE_STYLES).map(([k, v]) => `<option value="${k}" ${o.t === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>
      <div class="f"><label>Color</label><div class="row"><label class="chk" style="margin:0"><input type="checkbox" id="edgeColOn" ${o.color ? 'checked' : ''}>Custom</label><input type="color" id="edgeCol" value="${o.color || EDGE_STYLES[o.t].color}"></div></div>
      <div class="f"><label>Width</label><input type="range" id="edgeW" min="0.4" max="3" step="0.1" value="${o.w}"></div>
      ${o.t === 'plain' ? '' : `<div class="f"><label>Label</label><input type="text" id="edgeLabel" placeholder="e.g. $40 or +20" value="${esc(o.label)}"></div>`}
      <div class="help">${o.t === 'plain' ? 'Click or drag along edges to turn them back into normal grid lines.' : 'Click an edge to add this style; click it again (or Shift-click) to remove it. Choose <b>Plain</b> above to clear edges by dragging.'}</div>
      <button class="btn sm" id="edgeClearAll" style="margin-top:4px">Clear all hexsides on the map…</button>`;
  } else if (t === 'shape') {
    h = `<h3>Map shape</h3><div class="help">Removed hexes are hidden from the map and exports. Dragging off the edge of the grid keeps adding hexes, so you can grow the map in any direction one hex at a time.</div>
      <label class="chk"><input type="checkbox" id="showVoids" ${S.showVoids ? 'checked' : ''}>Show removed hexes as outlines</label>
      <div class="help">Need partial hexes cut off by the board edge? Turn on <b>Cut hexes at map edge</b> in the map settings (click empty canvas).</div>`;
  } else if (t === 'region') {
    const o = S.regionOpts;
    h = `<h3>New region style</h3>
      <div class="f"><label>Fill</label><div class="row"><label class="chk" style="margin:0"><input type="checkbox" id="rgFillOn" ${o.fill ? 'checked' : ''}>Fill</label><input type="color" id="rgFill" value="${o.fill || '#79b8e8'}"></div></div>
      <div class="f"><label>Outline</label><div class="row"><input type="color" id="rgStroke" value="${o.stroke}"><input type="number" id="rgSw" min="0" step="0.5" value="${o.sw}" style="width:64px"></div></div>
      <label class="chk"><input type="checkbox" id="rgSmooth" ${o.smooth ? 'checked' : ''}>Smooth curves (coastlines, lakes)</label>
      <label class="chk"><input type="checkbox" id="rgUnder" ${o.under ? 'checked' : ''}>Place behind the hex grid</label>
      <div class="help">Use regions for lakes and seas, off-board areas spanning several hexes, merged “double” hexes, or borders that don’t follow the grid. Over the grid with a fill, a region hides the hex lines beneath it.</div>`;
  } else if (t === 'select') {
    h = `<h3>Options</h3><label class="chk"><input type="checkbox" id="showVoids" ${S.showVoids ? 'checked' : ''}>Show removed hexes as outlines</label>
      ${P.bgImage ? `<label class="chk"><input type="checkbox" id="bgAdj" ${S.bgAdjust ? 'checked' : ''}>Move / resize background image</label>` : ''}
      <div class="help"><kbd>Del</kbd> deletes the selection · <kbd>Ctrl D</kbd> duplicates an object · arrow keys nudge.</div>`;
  } else h = '<h3>Pan</h3><div class="help">Hold Space with any tool to pan temporarily.</div>';
  el.innerHTML = h;
  // wire
  const on = (id, ev, fn) => { const x = $('#' + id); if (x) x.addEventListener(ev, fn); };
  if ($('#eraseMode')) { $('#eraseMode').value = S.eraseMode; on('eraseMode', 'change', (e) => (S.eraseMode = e.target.value)); }
  on('textStyle', 'change', (e) => (S.textStyle = e.target.value));
  $$('#snapSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.v === S.stampOpts.snap); b.onclick = () => { S.stampOpts.snap = b.dataset.v; renderToolOpts(); }; });
  on('stScale', 'input', (e) => (S.stampOpts.scale = +e.target.value));
  on('stRot', 'input', (e) => (S.stampOpts.rot = +e.target.value));
  on('stColOn', 'change', (e) => { S.stampOpts.color = e.target.checked ? $('#stCol').value : ''; });
  on('stCol', 'input', (e) => { S.stampOpts.color = e.target.value; $('#stColOn').checked = true; });
  $$('#trkGeo button').forEach((b) => (b.onclick = () => { S.trackOpts.geo = b.dataset.v; renderToolOpts(); }));
  $$('#trkStyle button').forEach((b) => { b.classList.toggle('on', b.dataset.v === S.trackOpts.style); b.onclick = () => { S.trackOpts.style = b.dataset.v; renderToolOpts(); }; });
  on('trkColor', 'input', (e) => (S.trackOpts.color = e.target.value));
  $$('[data-tc]').forEach((b) => (b.onclick = () => { S.trackOpts.color = b.dataset.tc; renderToolOpts(); }));
  on('trkW', 'input', (e) => (S.trackOpts.w = +e.target.value));
  on('trkCasOn', 'change', (e) => (S.trackOpts.casing = e.target.checked ? '#ffffff' : ''));
  on('edgeT', 'change', (e) => { S.edgeOpts.t = e.target.value; renderToolOpts(); });
  on('edgeColOn', 'change', (e) => (S.edgeOpts.color = e.target.checked ? $('#edgeCol').value : ''));
  on('edgeCol', 'input', (e) => { S.edgeOpts.color = e.target.value; $('#edgeColOn').checked = true; });
  on('edgeW', 'input', (e) => (S.edgeOpts.w = +e.target.value));
  on('edgeLabel', 'input', (e) => (S.edgeOpts.label = e.target.value));
  on('edgeClearAll', 'click', () => clearAllHexsidesConfirm());
  on('showVoids', 'change', (e) => { S.showVoids = e.target.checked; renderOverlay(); });
  on('rgFillOn', 'change', (e) => (S.regionOpts.fill = e.target.checked ? $('#rgFill').value : ''));
  on('rgFill', 'input', (e) => { S.regionOpts.fill = e.target.value; $('#rgFillOn').checked = true; });
  on('rgStroke', 'input', (e) => (S.regionOpts.stroke = e.target.value));
  on('rgSw', 'input', (e) => (S.regionOpts.sw = +e.target.value || 0));
  on('rgSmooth', 'change', (e) => (S.regionOpts.smooth = e.target.checked));
  on('rgUnder', 'change', (e) => (S.regionOpts.under = e.target.checked));
  on('bgAdj', 'change', (e) => { S.bgAdjust = e.target.checked; renderOverlay(); });
}
function renderTypes() {
  let sec = $('#typesSec');
  if (!sec) { sec = document.createElement('div'); sec.className = 'sec'; sec.id = 'typesSec'; $('#paletteSec').after(sec); }
  const types = P.types || [];
  sec.innerHTML = `<h3>Hex types <span class="grow"></span><button class="btn sm" id="newType">+ New</button></h3>
    <div class="stamps" id="typeList">${types.map((t) => `<div class="stamp ${S.brush.kind === 'type' && S.brush.id === t.id ? 'on' : ''}" data-id="${t.id}" title="${esc(t.name)} — click to paint, double-click to edit" style="background:transparent;border-color:transparent">${typePreview(t)}</div>`).join('')}</div>
    ${types.length ? `<div class="help">Click to paint with a type. Double-click to edit it — every hex using it updates.</div>` : `<div class="help">Make presets like “Mountain $60” or “Off-board” and paint them on. You can still add extra things to any single hex.</div>`}`;
  $('#newType').onclick = () => newType();
  $$('#typeList .stamp').forEach((el) => {
    el.onclick = () => { S.brush = { kind: 'type', id: el.dataset.id }; if (!['paint', 'fill'].includes(S.tool)) S.tool = 'paint'; renderLeft(); };
    el.ondblclick = () => select({ kind: 'type', id: el.dataset.id });
  });
}
function newType(fromHexKey) {
  checkpoint();
  const t = { id: uid('t'), name: 'New type', fill: S.brush.kind === 'color' ? S.brush.color : '#c9a77c', items: [] };
  if (fromHexKey) {
    const h = P.hexes[fromHexKey]; const ty = hexType(h);
    t.fill = effFill(h) || P.style.hexFill; t.items = clone([...(ty ? ty.items : []), ...(h ? h.items : [])]);
    if (h && h.img) t.img = clone(h.img);
    t.name = (t.items.find((i) => i.t === 'icon') ? ICONS[t.items.find((i) => i.t === 'icon').icon]?.label : 'Custom') + ' hex';
  }
  P.types = P.types || []; P.types.push(t);
  S.brush = { kind: 'type', id: t.id };
  renderLeft(); select({ kind: 'type', id: t.id });
  setTimeout(() => { const n = $('#props [data-f="name"]'); n && (n.focus(), n.select()); }, 40);
  return t;
}

// ---------------- Palette inputs ----------------
$('#curColor').addEventListener('input', (e) => { S.brush = { kind: 'color', color: e.target.value }; $('#curColorHex').value = e.target.value; $$('#swatches .sw').forEach((s) => s.classList.remove('on')); renderToolOpts(); });
$('#curColor').addEventListener('change', () => renderLeft());
$('#curColorHex').addEventListener('change', (e) => { const v = e.target.value.trim(); if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) setBrushColor(v); });
$('#palAdd').onclick = () => { if (S.brush.kind !== 'color') return; if (!P.palette.includes(S.brush.color)) { checkpoint(); P.palette.push(S.brush.color); renderLeft(); } };
