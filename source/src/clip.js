// =====================================================================
//  Multi-hex selection and copy / cut / paste (Ctrl C / X / V)
// =====================================================================
S.clip = null; S.overStage = false;
stage.addEventListener('pointerenter', () => (S.overStage = true));
stage.addEventListener('pointerleave', () => (S.overStage = false));

function selKeys() {
  if (!S.sel) return [];
  if (S.sel.kind === 'hexes') return S.sel.keys.slice();
  if (S.sel.kind === 'hex') return [S.sel.k];
  return [];
}
function selectKeys(keys) {
  keys = [...new Set(keys)];
  if (!keys.length) select(null);
  else if (keys.length === 1) select({ kind: 'hex', k: keys[0] });
  else select({ kind: 'hexes', keys });
}
function hexesInRect(x0, y0, x1, y1) {
  const out = [], g = P.grid;
  const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)], [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
    const [x, y] = center(c, r); if (x >= ax && x <= bx && y >= ay && y <= by) out.push(key(c, r));
  }
  return out;
}

// ---------- building the clipboard ----------
function clipFromHexes(keys) {
  if (!keys.length) return null;
  const pts = keys.map((k) => ({ k, xy: center(...unkey(k)) }));
  pts.sort((a, b) => a.xy[1] - b.xy[1] || a.xy[0] - b.xy[0]);
  const [ax, ay] = pts[0].xy, s = R();
  const types = {}, assets = {};
  const noteAsset = (ref) => { if (ref && P.assets[ref]) assets[ref] = P.assets[ref]; };
  const hexes = pts.map(({ k, xy }) => {
    const [c, r] = unkey(k), h = P.hexes[k];
    const data = h ? clone(h) : null;
    if (h && h.type) { const t = hexType(h); if (t) { types[t.id] = clone(t); (t.items || []).forEach((it) => it.t === 'img' && noteAsset(it.ref)); if (t.img) noteAsset(t.img.ref); } }
    if (h) { (h.items || []).forEach((it) => it.t === 'img' && noteAsset(it.ref)); if (h.img) noteAsset(h.img.ref); }
    const edges = [];
    for (let i = 0; i < 6; i++) { const e = P.edges[edgeKey(c, r, i)]; if (e) edges.push({ i, e: clone(e) }); }
    return { dx: (xy[0] - ax) / s, dy: (xy[1] - ay) / s, data, void: !!P.voids[k], edges };
  });
  return { hexcraft: 'hexes', v: 1, orient: P.grid.orient, hexes, types, assets };
}
function clipFromObject(o) {
  const assets = {}; if (o.t === 'img' && P.assets[o.ref]) assets[o.ref] = P.assets[o.ref];
  return { hexcraft: 'objects', v: 1, objects: [clone(o)], assets };
}
function buildClip() {
  if (S.view2 === 'comp' || !S.sel) return null;
  if (S.sel.kind === 'obj') { const o = P.objects.find((x) => x.id === S.sel.id); return o ? clipFromObject(o) : null; }
  const keys = selKeys(); return keys.length ? clipFromHexes(keys) : null;
}

// ---------- pasting ----------
function mergeClipAssets(clip) {
  for (const [id, a] of Object.entries(clip.assets || {})) if (!P.assets[id]) P.assets[id] = clone(a);
}
function pasteTargetHex() {
  if (S.overStage && S.hover && inGrid(S.hover[0], S.hover[1])) return S.hover;
  const keys = selKeys(); if (keys.length) { const pts = keys.map((k) => ({ k, xy: center(...unkey(k)) })).sort((a, b) => a.xy[1] - b.xy[1] || a.xy[0] - b.xy[0]); return unkey(pts[0].k); }
  return null;
}
function pasteClip(clip) {
  if (!clip || !clip.hexcraft) return false;
  if (clip.hexcraft === 'objects') {
    checkpoint(); mergeClipAssets(clip);
    let tx = null, ty = null;
    if (S.overStage && S._lastWorld) [tx, ty] = S._lastWorld;
    const o0 = clip.objects[0], dx = tx != null ? tx - o0.x : 24, dy = ty != null ? ty - o0.y : 24;
    const made = clip.objects.map((o) => { const n = clone(o); n.id = uid('o'); n.x += dx; n.y += dy; return n; });
    made.forEach((n) => { P.objects.push(n); renderObject(n.id); });
    select({ kind: 'obj', id: made[0].id }); schedulePaper(); toast('Pasted'); return true;
  }
  if (clip.hexcraft !== 'hexes') return false;
  if (clip.orient && clip.orient !== P.grid.orient) { toast(`Those hexes were copied from a ${clip.orient === 'flat' ? 'flat-top' : 'pointy-top'} map and can't be pasted into a ${isPointy() ? 'pointy-top' : 'flat-top'} map.`, true); return false; }
  const T = pasteTargetHex();
  if (!T) { toast('Point at a hex (or select one) to paste onto.', true); return false; }
  checkpoint(); mergeClipAssets(clip);
  // bring in hex types the clipboard uses (from another map)
  const typeMap = {};
  for (const [id, t] of Object.entries(clip.types || {})) {
    if ((P.types || []).some((x) => x.id === id)) typeMap[id] = id;
    else { const same = (P.types || []).find((x) => JSON.stringify({ ...x, id: '' }) === JSON.stringify({ ...t, id: '' })); if (same) typeMap[id] = same.id; else { P.types = P.types || []; P.types.push(clone(t)); typeMap[id] = id; } }
  }
  const [tx, ty] = center(T[0], T[1]), s = R();
  const pasted = []; let skipped = 0, baseDirty = false;
  clip.hexes.forEach((hx) => {
    const [c, r] = pixelToHex(tx + hx.dx * s, ty + hx.dy * s); const k = key(c, r);
    if (!inGrid(c, r)) { skipped++; return; }
    if (hx.void) { if (!P.voids[k]) { P.voids[k] = 1; baseDirty = true; } delete P.hexes[k]; pasted.push(k); return; }
    if (P.voids[k]) { delete P.voids[k]; baseDirty = true; }
    if (hx.data) { const d = clone(hx.data); if (d.type && typeMap[d.type]) d.type = typeMap[d.type]; P.hexes[k] = d; } else delete P.hexes[k];
    hx.edges.forEach(({ i, e }) => (P.edges[edgeKey(c, r, i)] = clone(e)));
    pasted.push(k);
  });
  if (baseDirty || clip.hexes.some((h) => h.edges.some((e) => e.e.t === 'hide'))) renderBase();
  pasted.forEach(renderHex); renderEdges(); renderLeft();
  selectKeys(pasted.filter((k) => !P.voids[k]));
  schedulePaper();
  toast(`Pasted ${pasted.length} hex${pasted.length === 1 ? '' : 'es'}${skipped ? ` — ${skipped} fell outside the grid and were skipped (grow the map first)` : ''}`);
  return true;
}
function doCopy(cut) {
  const clip = buildClip(); if (!clip) return null;
  S.clip = clip;
  if (cut) {
    checkpoint();
    if (clip.hexcraft === 'objects') { P.objects = P.objects.filter((o) => o.id !== S.sel.id); renderObject(S.sel.id); select(null); }
    else { selKeys().forEach((k) => { delete P.hexes[k]; renderHex(k); }); for (const k of selKeys()) { const [c, r] = unkey(k); for (let i = 0; i < 6; i++) delete P.edges[edgeKey(c, r, i)]; } renderEdges(); renderBase(); renderProps(); }
    schedulePaper();
  }
  const n = clip.hexcraft === 'hexes' ? clip.hexes.length : 1;
  toast(`${cut ? 'Cut' : 'Copied'} ${clip.hexcraft === 'hexes' ? `${n} hex${n === 1 ? '' : 'es'}` : 'object'} — point at a hex and press Ctrl V to paste`);
  return clip;
}

// ---------- keyboard & system clipboard ----------
let _pasteFallbackT = 0;
document.addEventListener('copy', (e) => { if (isTyping()) return; const clip = doCopy(false); if (clip && e.clipboardData) { e.preventDefault(); e.clipboardData.setData('text/plain', JSON.stringify(clip)); } });
document.addEventListener('cut', (e) => { if (isTyping()) return; const clip = doCopy(true); if (clip && e.clipboardData) { e.preventDefault(); e.clipboardData.setData('text/plain', JSON.stringify(clip)); } });
document.addEventListener('paste', (e) => {
  if (isTyping() || S.view2 === 'comp') return;
  clearTimeout(_pasteFallbackT);
  let clip = null; try { const t = e.clipboardData && e.clipboardData.getData('text/plain'); if (t && t.includes('"hexcraft"')) clip = JSON.parse(t); } catch (err) {}
  if (!clip) clip = S.clip; if (!clip) return;
  e.preventDefault(); pasteClip(clip);
});
window.addEventListener('keydown', (e) => {
  if (isTyping() || S.view2 === 'comp' || !(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  // fallbacks in case the browser doesn't fire copy/paste events in this frame
  if (k === 'c') { const before = S.clip; setTimeout(() => { if (S.clip === before) doCopy(false); }, 30); }
  if (k === 'x') { const before = S.clip; setTimeout(() => { if (S.clip === before) doCopy(true); }, 30); }
  if (k === 'v') { clearTimeout(_pasteFallbackT); _pasteFallbackT = setTimeout(() => { if (S.clip) pasteClip(S.clip); }, 60); }
});
stage.addEventListener('pointermove', (e) => { S._lastWorld = toWorld(e); });

// ---------- multi-hex panel ----------
// An object that, when a panel field writes to it, writes the same value to every selected hex.
// sub(h) picks a part of the hex (e.g. its outline); an empty value removes the field; '__mixed' changes nothing.
function multiTarget(keys, sub, onSet) {
  const each = (fn) => keys.forEach((k) => { if (P.voids[k]) return; const h = getHex(k, true); fn(h, sub ? sub(h) : h); cleanHex(k); });
  return new Proxy({}, {
    set(_, f, v) { if (v === '__mixed') return true; each((h, o) => { if (v === '' || v == null) delete o[f]; else o[f] = v; if (onSet) onSet(h, f, v); }); return true; },
    deleteProperty(_, f) { each((h, o) => delete o[f]); return true; },
    get() { return undefined; },
  });
}
// the value all selected hexes share for a field, or MIXED
const MIXED = Symbol('mixed');
function commonVal(keys, get) { let v, first = true; for (const k of keys) { const x = get(P.hexes[k] || null) ?? ''; if (first) { v = x; first = false; } else if (x !== v) return MIXED; } return v; }
function multiPanel(keys) {
  const n = keys.length, filled = keys.filter((k) => P.hexes[k]).length;
  const after = (f) => { keys.forEach((k) => renderHex(k)); if (f === 'outline' || f === 'color' || f === 'w') renderEdges(); renderOverlay(); schedulePaper(); if (f === 'type') renderProps(); };
  const ty = commonVal(keys, (h) => h && h.type), fill = commonVal(keys, (h) => h && h.fill);
  const olc = commonVal(keys, (h) => h && h.outline && h.outline.color);
  const gd = (f) => commonVal(keys, (h) => h && h[f]);
  const val = (v) => (v === MIXED ? '' : v), ph = (v, p) => (v === MIXED ? '(mixed — typing sets all)' : p);
  const kind = gd('kind'), cost = gd('cost'), tags = gd('tags');
  return sec(`${n} hexes selected`, `<div class="help" style="margin-top:0"><kbd>Shift</kbd>- or <kbd>Ctrl</kbd>-click hexes to add or remove them; drag across the map to select an area. Changes below apply to every selected hex (Ctrl Z undoes).</div>
    <div ${bind('mhx', () => multiTarget(keys, null, (h, f, v) => { if (f === 'type' && v) delete h.fill; }), after)}>
      ${F('Hex type', I.select('type', ty === MIXED ? '__mixed' : ty, [...(ty === MIXED ? [['__mixed', '— mixed —']] : []), ['', '— none —'], ...(P.types || []).map((t) => [t.id, t.name])]))}
      ${F('Color', I.optColor('fill', fill === MIXED ? '' : fill, fill && fill !== MIXED ? fill : '#c9a77c', fill === MIXED ? 'Mixed — set' : 'Custom'))}
    </div>
    <div class="help">Setting a hex type replaces each hex's own color, so the type's look shows. Their icons and labels stay.</div>
    <div ${bind('mhxol', () => multiTarget(keys, (h) => (h.outline = h.outline || {})), () => { renderEdges(); schedulePaper(); })}>
      ${F('Outline', I.optColor('color', olc === MIXED ? '' : olc, olc && olc !== MIXED ? olc : '#c62828', 'Color'))}
    </div>`) +
  sec('Game data', `<div ${bind('mhxgd', () => multiTarget(keys), () => schedulePaper())}>
      ${F('Kind', kindInput(val(kind), ph(kind, 'e.g. mountain')))}
      ${F('Build cost', I.text('cost', val(cost), ph(cost, 'e.g. 60')))}
      ${F('Tags', I.text('tags', val(tags), ph(tags, 'e.g. coal, port')))}
    </div><div class="help">For <b>File › Export game data</b>; not drawn. Empty uses each hex's type.</div>`) +
  sec('Actions', `<div class="btngrid">
      <button class="btn sm pri" data-act="mCopy">Copy (Ctrl C)</button><button class="btn sm" data-act="mCut">Cut (Ctrl X)</button>
      <button class="btn sm" data-act="mBrush">Apply current brush</button><button class="btn sm" data-act="mType">Save as hex types</button>
      <button class="btn sm" data-act="mClear">Clear contents</button><button class="btn sm" data-act="sidesReset">Reset hexsides</button>
      <button class="btn sm danger" data-act="mVoid" style="grid-column:span 2">Remove hexes</button>
    </div>
    <div class="help">${filled} of ${n} have content. To paste, point at a hex and press <kbd>Ctrl V</kbd> — the group keeps its shape, with the top-left hex landing under the pointer.</div>`);
}
handlers.mCopy = () => doCopy(false);
handlers.mCut = () => doCopy(true);
handlers.mClear = () => { checkpoint(); selKeys().forEach((k) => { delete P.hexes[k]; renderHex(k); }); renderProps(); schedulePaper(); toast('Cleared'); };
handlers.mVoid = () => { checkpoint(); const ks = selKeys(); ks.forEach((k) => { P.voids[k] = 1; delete P.hexes[k]; renderHex(k); }); renderBase(); select(null); schedulePaper(); toast(`Removed ${ks.length} hexes (Ctrl Z to undo)`); };
handlers.mBrush = () => { checkpoint(); selKeys().forEach((k) => { if (P.voids[k]) { delete P.voids[k]; } applyBrush(k); renderHex(k); }); renderBase(); renderProps(); schedulePaper(); };
handlers.mType = () => {
  const ks = selKeys().filter((k) => P.hexes[k]); if (!ks.length) { toast('None of these hexes has content yet.', true); return; }
  const seen = new Set(); let made = 0;
  ks.forEach((k) => { const sig = JSON.stringify([effFill(P.hexes[k]), (hexType(P.hexes[k]) || {}).items, P.hexes[k].items]); if (seen.has(sig)) return; seen.add(sig); newType(k); made++; });
  toast(`Made ${made} hex type${made === 1 ? '' : 's'}`);
};
const _rpClip = renderProps;
renderProps = function () {
  if (S.view2 !== 'comp' && S.sel && S.sel.kind === 'hexes') { BT = {}; propsEl.innerHTML = multiPanel(S.sel.keys); wireProps(); tipProps(); return; }
  _rpClip();
};
