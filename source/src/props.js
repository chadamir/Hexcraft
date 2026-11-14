// =====================================================================
//  Right-hand properties panel
// =====================================================================
let BT = {}; // bind targets: key -> {get, after, ck}
const I = {
  text: (f, v, ph = '') => `<input type="text" data-f="${f}" value="${esc(v ?? '')}" placeholder="${esc(ph)}">`,
  num: (f, v, min = '', max = '', step = 'any') => `<input type="number" data-f="${f}" data-t="num" value="${v ?? ''}" min="${min}" max="${max}" step="${step}">`,
  range: (f, v, min, max, step) => `<div class="row"><input type="range" data-f="${f}" data-t="num" value="${v}" min="${min}" max="${max}" step="${step}" data-echo="1"><span class="echo" style="font:11px var(--mono);color:var(--ink3);width:36px;text-align:right">${v}</span></div>`,
  color: (f, v) => `<input type="color" data-f="${f}" data-t="color" value="${/^#[0-9a-f]{6}$/i.test(v || '') ? v : '#888888'}">`,
  optColor: (f, v, def, lbl = 'Custom') => `<div class="row"><label class="chk" style="margin:0"><input type="checkbox" data-optc="${f}" ${v ? 'checked' : ''}>${lbl}</label><input type="color" data-f="${f}" data-t="color" data-opt="1" value="${/^#[0-9a-f]{6}$/i.test(v || def || '') ? v || def : '#888888'}"></div>`,
  check: (f, v, lbl) => `<label class="chk"><input type="checkbox" data-f="${f}" data-t="bool" ${v ? 'checked' : ''}>${lbl}</label>`,
  select: (f, v, opts, t = '') => `<select data-f="${f}"${t ? ` data-t="${t}"` : ''}>${opts.map(([val, lab]) => `<option value="${esc(val)}" ${String(val) === String(v ?? '') ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>`,
  area: (f, v, rows = 5, ph = '') => `<textarea data-f="${f}" rows="${rows}" spellcheck="false" placeholder="${esc(ph)}">${esc(v ?? '')}</textarea>`,
  seg: (f, v, opts, t = '') => `<div class="seg" data-segf="${f}"${t ? ` data-t="${t}"` : ''}>${opts.map(([val, lab]) => `<button type="button" data-v="${esc(val)}" class="${String(val) === String(v) ? 'on' : ''}">${esc(lab)}</button>`).join('')}</div>`,
};
const F = (label, inner, cls = '') => `<div class="f ${cls}"><label>${label}</label>${inner}</div>`;
const sec = (title, body, extra = '') => `<div class="sec"><h3>${title}<span class="grow"></span>${extra}</h3>${body}</div>`;
function bind(key, get, after, opts = {}) { BT[key] = { get, after, ...opts }; return `data-bind="${key}"`; }

function parseVal(el) {
  const t = el.dataset.t;
  if (t === 'num') { const v = parseFloat(el.value); return isNaN(v) ? undefined : v; }
  if (t === 'bool') return el.checked;
  return el.value;
}
const propsEl = $('#props');
propsEl.addEventListener('input', (e) => {
  const el = e.target; const host = el.closest('[data-bind]'); if (!host) return;
  const b = BT[host.dataset.bind]; if (!b) return; const tgt = b.get(); if (!tgt) return;
  if (el.dataset.optc) {
    checkpoint('p:' + host.dataset.bind + el.dataset.optc);
    const ci = el.parentElement.parentElement.querySelector(`[data-f="${el.dataset.optc}"]`);
    if (el.checked) tgt[el.dataset.optc] = ci.value; else delete tgt[el.dataset.optc];
    b.after && b.after(el.dataset.optc); return;
  }
  const f = el.dataset.f; if (!f) return;
  const v = parseVal(el); if (v === undefined) return;
  checkpoint('p:' + host.dataset.bind + f);
  tgt[f] = v;
  if (el.dataset.opt) { const cb = el.parentElement.querySelector(`[data-optc="${f}"]`); if (cb) cb.checked = true; }
  if (el.dataset.echo) { const ec = el.parentElement.querySelector('.echo'); if (ec) ec.textContent = el.value; }
  b.after && b.after(f);
});
propsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-segf] button'); if (!btn) return;
  const seg = btn.parentElement, host = seg.closest('[data-bind]'); const b = host && BT[host.dataset.bind]; if (!b) return;
  const tgt = b.get(); const f = seg.dataset.segf; let v = btn.dataset.v; if (seg.dataset.t === 'num') v = +v;
  checkpoint(); tgt[f] = v; $$('button', seg).forEach((x) => x.classList.toggle('on', x === btn));
  b.after && b.after(f, true);
});

function renderProps() {
  BT = {};
  const s = S.sel; let html = '';
  try {
    if (!s) html = mapPanel();
    else if (s.kind === 'hex') html = hexPanel(s.k);
    else if (s.kind === 'obj') { const o = P.objects.find((x) => x.id === s.id); html = o ? objPanel(o) : mapPanel(); }
    else if (s.kind === 'type') { const t = (P.types || []).find((x) => x.id === s.id); html = t ? typePanel(t) : mapPanel(); }
  } catch (err) { console.error(err); html = `<div class="sec">Panel error: ${esc(err.message)}</div>`; }
  propsEl.innerHTML = html;
  wireProps();
}
const handlers = {};
function wireProps() {
  $$('#props [data-act]').forEach((b) => (b.onclick = (e) => { const fn = handlers[b.dataset.act]; fn && fn(b.dataset, e); }));
  if (S.sel && S.sel.kind === 'hex' && S.sel.item != null) { const c = $(`#props [data-item="${S.sel.item}"]`); c && c.scrollIntoView({ block: 'nearest' }); }
}

// ---------------- Map panel ----------------
function mapPanel() {
  const g = P.grid, st = P.style;
  const afterGrid = () => { _relKey = ''; renderAll(); renderLeft(); };
  const afterStyle = (f) => {
    if (['bg'].includes(f)) renderPaper();
    else if (['hexFill', 'hexOpacity', 'gridColor', 'gridWidth', 'coords', 'coordPos', 'coordColor', 'coordSize'].includes(f)) { renderBase(); if (f === 'hexOpacity') renderAllHexes(); schedulePaper(); if (f === 'hexFill') renderTypes(); }
    else if (f === 'pad') renderPaper();
  };
  const big = g.cols * g.rows;
  let h = '';
  h += sec('Map', `<div ${bind('proj', () => P, (f) => { if (f === 'name') $('#projName').value = P.name; })}>${F('Name', I.text('name', P.name))}</div>`);
  h += sec('Grid', `<div ${bind('grid', () => P.grid, afterGrid)}>
      <div class="btngrid">${F('Columns', I.num('cols', g.cols, 1, '', 1), 'full')}${F('Rows', I.num('rows', g.rows, 1, '', 1), 'full')}</div>
      ${big > 40000 ? `<div class="help" style="color:var(--accent2)">${big.toLocaleString()} hexes — very large maps work but may feel slower.</div>` : ''}
      ${F('Hex size', I.range('size', g.size, 12, 140, 1))}
      ${F('Orientation', I.seg('orient', g.orient, [['pointy', 'Pointy top'], ['flat', 'Flat top']]))}
      ${F('Offset', I.seg('stagger', g.stagger, [['odd', 'Odd'], ['even', 'Even']]))}
    </div>
    <div ${bind('style0', () => P.style, () => { renderAllHexes(); })}>${F('Track style', I.seg('trackGeo', P.style.trackGeo || 'curve', [['curve', 'Curvilinear'], ['lawson', 'Lawsonian']]))}</div>
    <div class="help" style="margin-top:8px">Grow or shrink from any side (contents stay put):</div>
    <div class="btngrid" style="margin-top:4px">
      <button class="btn sm" data-act="ext" data-side="top" data-n="1">+ Row on top</button><button class="btn sm" data-act="ext" data-side="top" data-n="-1">− Row on top</button>
      <button class="btn sm" data-act="ext" data-side="bottom" data-n="1">+ Row at bottom</button><button class="btn sm" data-act="ext" data-side="bottom" data-n="-1">− Row at bottom</button>
      <button class="btn sm" data-act="ext" data-side="left" data-n="1">+ Column left</button><button class="btn sm" data-act="ext" data-side="left" data-n="-1">− Column left</button>
      <button class="btn sm" data-act="ext" data-side="right" data-n="1">+ Column right</button><button class="btn sm" data-act="ext" data-side="right" data-n="-1">− Column right</button>
    </div>`);
  const cl = P.style.clip || (P.style.clip = { on: false, t: 0.5, r: 0.5, b: 0.5, l: 0.5, line: '#3a332a', lw: 2.5 });
  h += sec('Map edge', `<div ${bind('clip', () => P.style.clip, (f) => { renderBase(); schedulePaper(); if (f === 'on') renderProps(); })}>
      ${I.check('on', cl.on, 'Cut hexes at map edge (partial hexes)')}
      ${cl.on ? `${F('Trim top', I.range('t', cl.t, 0, 2, 0.05))}${F('Trim right', I.range('r', cl.r, 0, 2, 0.05))}${F('Trim bottom', I.range('b', cl.b, 0, 2, 0.05))}${F('Trim left', I.range('l', cl.l, 0, 2, 0.05))}
      ${F('Edge line', `<div class="row">${I.color('line', cl.line || '#333333')}<input type="number" data-f="lw" data-t="num" min="0" step="0.5" value="${cl.lw}" style="width:70px"></div>`)}` : ''}
      <div class="help">For irregular outlines use the <b>Add / remove hexes</b> tool <kbd>A</kbd>; for shapes that don’t follow the grid (lakes, seas, merged hexes) use the <b>Region</b> tool <kbd>R</kbd>.</div></div>`);
  h += sec('Hex coordinates', `<div ${bind('style1', () => P.style, afterStyle)}>
      ${F('Format', I.select('coords', st.coords, [['A1d', 'A1, A3, B2… (18xx)'], ['A1', 'A1, A2, B1… (letters = rows)'], ['1A', '1A, 2A… (letters = columns)'], ['0101', '0101, 0102… (wargame)'], ['num', '1.1, 1.2… (numbers)'], ['none', 'None']]))}
      ${F('Show', I.seg('coordPos', st.coordPos, [['border', 'Around edges'], ['inhex', 'In hexes'], ['both', 'Both']]))}
      ${F('Color', I.color('coordColor', st.coordColor))}
      ${F('Size', I.range('coordSize', st.coordSize || 1, 0.5, 3, 0.05))}
      <div class="help">Letters and numbers printed around the map let players call out hexes like “A8”. The hex under your cursor shows its name in the status bar.</div></div>`);
  h += sec('Colors', `<div ${bind('style2', () => P.style, afterStyle)}>
      ${F('Background', I.color('bg', st.bg))}
      ${F('Hex color', `<div class="row">${I.color('hexFill', st.hexFill === 'none' ? '#ffffff' : st.hexFill)}<button class="btn sm" data-act="hexNone">${st.hexFill === 'none' ? 'Transparent ✓' : 'No fill'}</button></div>`)}
      ${F('Hex opacity', I.range('hexOpacity', st.hexOpacity ?? 1, 0, 1, 0.05))}
      ${F('Grid lines', I.color('gridColor', st.gridColor))}
      ${F('Line width', I.range('gridWidth', st.gridWidth, 0, 8, 0.1))}
      ${F('Page margin', I.range('pad', st.pad ?? 40, 0, 300, 5))}</div>`);
  const b = P.bgImage;
  h += sec('Background image', b && P.assets[b.ref] ? `<div ${bind('bgimg', () => P.bgImage, () => { renderBgImage(); renderOverlay(); schedulePaper(); })}>
      <img src="${assetHref(b.ref)}" style="width:100%;max-height:120px;object-fit:contain;border-radius:6px;background:#0003;margin-bottom:6px">
      ${F('Opacity', I.range('opacity', b.opacity ?? 1, 0.05, 1, 0.05))}
      ${F('Left', I.num('x', Math.round(b.x)))}${F('Top', I.num('y', Math.round(b.y)))}
      ${F('Width', `<input type="number" data-act-input="bgw" value="${Math.round(b.w)}">`)}
      ${I.check('show', b.show !== false, 'Show while editing')}${I.check('exp', b.exp !== false, 'Include in exports')}
      <div class="btngrid" style="margin-top:6px"><button class="btn sm" data-act="bgFit">Fit to grid</button><button class="btn sm" data-act="bgAdjust">${S.bgAdjust ? 'Done adjusting' : 'Move with mouse'}</button>
      <button class="btn sm" data-act="bgReplace">Replace…</button><button class="btn sm danger" data-act="bgRemove">Remove</button></div>
      <div class="help">Trace a real map: set the hex color to transparent or lower hex opacity.</div></div>`
    : `<button class="btn" data-act="bgReplace">Upload background image…</button><div class="help">Put a geographic map or artwork behind the hexes.</div>`);
  const assets = Object.entries(P.assets).filter(([, a]) => a.kind !== 'bg');
  h += sec('Your uploaded icons', (assets.length ? assets.map(([id, a]) => `<div class="pitem" style="padding:5px 7px;margin:4px 0" ${bind('as' + id, () => P.assets[id], () => renderLeft())}><img src="${a.data}" style="width:30px;height:30px;object-fit:contain;background:#f3efe4;border-radius:4px">
      <div class="nm">${I.text('name', a.name)}</div><button class="btn sm danger" data-act="delAsset" data-id="${id}">✕</button></div>`).join('') + '<div class="help">Use an icon in a table cell by typing its name between colons, e.g. <code>:my-icon:</code>.</div>' : '<div class="empty">None yet.</div>') + `<button class="btn sm" data-act="uploadIcon" style="margin-top:6px">Upload icons…</button>`);
  h += sec('Tips', `<div class="help">Click any hex to edit it. Use <b>Hex types</b> on the left for presets like “Mountain $60”. Insert stock markets and tables from the <b>Insert</b> menu. Your work saves to your library with <kbd>Ctrl S</kbd> and autosaves in this browser.</div>`);
  setTimeout(() => { const w = $('[data-act-input="bgw"]'); if (w) w.onchange = () => { const v = +w.value; if (v > 0) { checkpoint(); const k = P.bgImage.h / P.bgImage.w; P.bgImage.w = v; P.bgImage.h = v * k; renderBgImage(); renderOverlay(); schedulePaper(); } }; }, 0);
  return h;
}
handlers.ext = (d) => extendGrid(d.side, +d.n);
handlers.hexNone = () => { checkpoint(); P.style.hexFill = P.style.hexFill === 'none' ? '#ece4cc' : 'none'; renderBase(); renderProps(); renderTypes(); };
handlers.bgFit = () => { checkpoint(); const gb = hexBoundsExisting(); const b = P.bgImage, asp = assetAspect(b.ref); b.w = gb.w; b.h = gb.w / asp; if (b.h < gb.h) { b.h = gb.h; b.w = gb.h * asp; } b.x = gb.x + (gb.w - b.w) / 2; b.y = gb.y + (gb.h - b.h) / 2; renderBgImage(); renderOverlay(); schedulePaper(); renderProps(); };
handlers.bgAdjust = () => { S.bgAdjust = !S.bgAdjust; if (S.bgAdjust) setTool('select'); renderOverlay(); renderProps(); };
handlers.bgReplace = () => pickFiles('image/*', false, (files) => uploadBackground(files[0]));
handlers.bgRemove = () => { checkpoint(); const ref = P.bgImage.ref; P.bgImage = null; if (P.assets[ref] && P.assets[ref].kind === 'bg') delete P.assets[ref]; S.bgAdjust = false; renderBgImage(); renderOverlay(); schedulePaper(); renderProps(); renderLeft(); };
handlers.delAsset = (d) => confirmBox('Delete upload', 'Remove this icon? Hexes and objects using it will lose it.', 'Delete', () => { checkpoint(); deleteAsset(d.id); });
handlers.uploadIcon = () => uploadIconsDialog();

function extendGrid(side, n, raw) {
  const g = P.grid; const s = R();
  if ((side === 'top' || side === 'bottom') && g.rows + n < 1) return;
  if ((side === 'left' || side === 'right') && g.cols + n < 1) return;
  if (!raw) checkpoint();
  let dx = 0, dy = 0, dc = 0, dr = 0;
  if (side === 'top') { dr = n; if (isPointy()) { dy = 1.5 * s * n; if (n % 2) g.stagger = g.stagger === 'odd' ? 'even' : 'odd'; } else dy = SQ3 * s * n; g.rows += n; }
  if (side === 'bottom') g.rows += n;
  if (side === 'left') { dc = n; if (isPointy()) dx = SQ3 * s * n; else { dx = 1.5 * s * n; if (n % 2) g.stagger = g.stagger === 'odd' ? 'even' : 'odd'; } g.cols += n; }
  if (side === 'right') g.cols += n;
  if (dc || dr) {
    const remap = (obj) => { const out = {}; for (const k in obj) { const [c, r] = unkey(k); out[key(c + dc, r + dr)] = obj[k]; } return out; };
    P.hexes = remap(P.hexes); P.voids = remap(P.voids);
    const ne = {}; for (const k in P.edges) { const [c, r, i] = k.split(',').map(Number); ne[(c + dc) + ',' + (r + dr) + ',' + i] = P.edges[k]; } P.edges = ne;
    P.objects.forEach((o) => { o.x += dx; o.y += dy; });
    if (P.bgImage) { P.bgImage.x += dx; P.bgImage.y += dy; }
    S.view.x -= dx * S.view.z; S.view.y -= dy * S.view.z; applyView();
  }
  // prune outside grid
  for (const k in P.hexes) { const [c, r] = unkey(k); if (!inGrid(c, r)) delete P.hexes[k]; }
  for (const k in P.voids) { const [c, r] = unkey(k); if (!inGrid(c, r)) delete P.voids[k]; }
  for (const k in P.edges) { const { c, r } = edgeFromKey(k); if (c < -1 || r < -1 || c > g.cols || r > g.rows) delete P.edges[k]; }
  if (raw) return;
  if (S.sel && S.sel.kind === 'hex') S.sel = null;
  renderAll(); renderProps();
}

// ---------------- Hex panel ----------------
const EDGE_NAMES = () => (isPointy() ? ['E', 'SE', 'SW', 'W', 'NW', 'NE'] : ['SE', 'S', 'SW', 'NW', 'N', 'NE']);
function epName(h, ep) {
  if (ep[0] === 'e') return EDGE_NAMES()[+ep.slice(1)] + ' edge';
  if (ep === 'c') return 'center';
  const [i, sl] = ep.slice(1).split('.'); const it = h.items[+i];
  if (!it) return '?';
  return it.t === 'city' ? (it.slots > 1 ? `city slot ${+sl + 1}` : 'city') : it.t === 'town' ? 'town' : it.t;
}
const ITEM_LABEL = { icon: 'Icon', img: 'Image', city: 'City', town: 'Town', text: 'Label', phases: 'Revenue bar', wedge: 'Off-board arrow' };
function itemSummary(it) {
  if (it.t === 'icon') return (ICONS[it.icon] || {}).label || it.icon;
  if (it.t === 'img') return (P.assets[it.ref] || {}).name || 'Upload';
  if (it.t === 'city') return `${it.slots} slot${it.slots > 1 ? 's' : ''}${it.rev ? ' · ' + it.rev : ''}${it.name ? ' · ' + it.name : ''}`;
  if (it.t === 'town') return `${it.style || 'dot'}${it.rev ? ' · ' + it.rev : ''}${it.name ? ' · ' + it.name : ''}`;
  if (it.t === 'text') return String(it.text || '').split('\n')[0];
  if (it.t === 'phases') return it.values;
  if (it.t === 'wedge') return EDGE_NAMES()[(it.e || 0) % 6] + ' edge';
  return '';
}
function iconOptions() { return ICON_CATS.flatMap((cat) => Object.values(ICONS).filter((i) => i.cat === cat).map((i) => [i.key, cat + ' · ' + i.label])); }
function assetOptions() { return Object.entries(P.assets).filter(([, a]) => a.kind !== 'bg').map(([id, a]) => [id, a.name || id]); }
function itemCards(items, ctxKey, after, selIdx) {
  if (!items.length) return '<div class="empty">Nothing here yet. Add icons, cities, towns or labels below — or use the Stamp and Text tools.</div>';
  return items.map((it, i) => {
    const bk = ctxKey + ':' + i;
    const pos = `${F('Left/right', I.range('x', it.x || 0, -1.2, 1.2, 0.01))}${F('Up/down', I.range('y', it.y || 0, -1.2, 1.2, 0.01))}`;
    const scale = F('Size', I.range('s', it.s || 1, 0.2, 3, 0.05));
    const rot = F('Rotate', I.range('r', it.r || 0, -180, 180, 5));
    const nameFields = `${F('Name', I.text('name', it.name, 'City name'))}${F('Name pos.', I.seg('namePos', it.namePos || 'below', [['below', 'Below'], ['above', 'Above']]))}${F('Name size', I.range('ns', it.ns || 1, 0.4, 3, 0.05))}`;
    const revFields = `${F('Revenue', I.text('rev', it.rev, 'e.g. 20'))}${F('Rev. side', I.select('revPos', it.revPos || 'left', [['left', 'Left'], ['right', 'Right'], ['top', 'Top'], ['bottom', 'Bottom'], ['tl', 'Top-left'], ['tr', 'Top-right']]))}`;
    let body = '';
    switch (it.t) {
      case 'icon': body = F('Icon', I.select('icon', it.icon, iconOptions())) + F('Color', I.optColor('color', it.color, (ICONS[it.icon] || {}).color)) + scale + rot + pos; break;
      case 'img': body = F('Image', I.select('ref', it.ref, assetOptions())) + scale + rot + pos; break;
      case 'city': body = F('Slots', I.seg('slots', it.slots, [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [6, '6']], 'num')) + revFields + F('Home marks', I.text('labels', it.labels, 'PRR, B&O (one per slot)')) + nameFields + F('Fill', I.optColor('fill', it.fill, '#ffffff')) + scale + rot + pos; break;
      case 'town': body = F('Style', I.seg('style', it.style || 'dot', [['dot', 'Dot'], ['bar', 'Bar'], ['disc', 'Disc']])) + revFields + nameFields + F('Color', I.optColor('fill', it.fill, it.style === 'disc' ? '#ffffff' : '#111111')) + scale + rot + pos; break;
      case 'text': body = `<div class="f full">${I.area('text', it.text, 2)}</div>` +
        F('Style', I.select('style', it.style || 'plain', [['plain', 'Plain'], ['box', 'Box'], ['circle', 'Circle'], ['hexagon', 'Hexagon'], ['triangle', 'Triangle (mountain cost)'], ['wave', 'Wave (water cost)'], ['flag', 'Background only']])) +
        F('Text size', I.range('size', it.size || 0.28, 0.08, 1.2, 0.01)) + F('Text color', I.color('color', it.color || '#111111')) +
        F('Shape color', I.optColor('bg', it.bg, it.style === 'triangle' ? '#c49563' : it.style === 'wave' ? '#2f7fc1' : '#ffffff')) + F('Outline', I.optColor('border', it.border, '#111111')) +
        `<div class="row">${I.check('bold', it.bold !== false, 'Bold')}${I.check('italic', it.italic, 'Italic')}</div>` + F('Font', I.select('font', it.font || 'sans', [['sans', 'Sans-serif'], ['serif', 'Serif'], ['mono', 'Monospace']])) + rot + pos; break;
      case 'phases': body = F('Values', I.text('values', it.values, 'y20 g30 b40 x60')) + `<div class="help">One box per value. Prefix a color letter: <code>y</code> yellow, <code>g</code> green, <code>b</code> brown, <code>x</code> gray, <code>r</code> red, <code>w</code> white. Drag it anywhere — even outside the hex.</div>` + scale + pos + (ctxKey.startsWith('h:') ? `<button class="btn sm" data-act="detachRev" data-ctx="${ctxKey}" data-i="${i}">Move to page as a free box</button>` : ''); break;
      case 'wedge': body = F('Edge', I.select('e', it.e || 0, EDGE_NAMES().map((n, j) => [j, n]), 'num')) + F('Color', I.color('color', it.color || '#111111')) + scale; break;
    }
    BT[bk] = { get: () => (ctxKey.startsWith('t:') ? (P.types.find((t) => t.id === ctxKey.slice(2)) || {}).items : P.hexes[ctxKey.slice(2)]?.items)?.[i], after: (f, structural) => { after(); ctxAfter(ctxKey); if (structural || ['text', 'name', 'rev', 'values', 'icon', 'style', 'slots', 'ref'].includes(f)) { const t = $(`#props [data-item="${i}"] .t`); if (t) t.textContent = itemSummary(BT[bk].get()); } } };
    return `<div class="card" data-item="${i}" data-bind="${bk}" style="${selIdx === i ? 'border-color:var(--accent)' : ''}">
      <div class="card-h"><span class="pill">${ITEM_LABEL[it.t] || it.t}</span><span class="t">${esc(itemSummary(it))}</span>
      <button class="btn icon sm" data-act="itUp" data-ctx="${ctxKey}" data-i="${i}" title="Move back">↑</button><button class="btn icon sm" data-act="itDown" data-ctx="${ctxKey}" data-i="${i}" title="Move forward">↓</button>
      <button class="btn icon sm" data-act="itDup" data-ctx="${ctxKey}" data-i="${i}" title="Duplicate">⧉</button><button class="btn icon sm danger" data-act="itDel" data-ctx="${ctxKey}" data-i="${i}" title="Delete">✕</button></div>
      ${body}</div>`;
  }).join('');
}
function addItemButtons(ctxKey) {
  return `<div class="btngrid3" style="margin-top:6px">
    <button class="btn sm" data-act="addIt" data-ctx="${ctxKey}" data-t="icon">+ Icon</button><button class="btn sm" data-act="addIt" data-ctx="${ctxKey}" data-t="city">+ City</button><button class="btn sm" data-act="addIt" data-ctx="${ctxKey}" data-t="town">+ Town</button>
    <button class="btn sm" data-act="addIt" data-ctx="${ctxKey}" data-t="text">+ Label</button><button class="btn sm" data-act="addIt" data-ctx="${ctxKey}" data-t="cost">+ Cost</button><button class="btn sm" data-act="addIt" data-ctx="${ctxKey}" data-t="phases">+ Revenues</button><button class="btn sm" data-act="addIt" data-ctx="${ctxKey}" data-t="wedge">+ Arrow</button>
    ${assetOptions().length ? `<button class="btn sm" data-act="addIt" data-ctx="${ctxKey}" data-t="img">+ Upload</button>` : ''}</div>`;
}
function ctxList(ctx, create) {
  if (ctx.startsWith('t:')) return (P.types.find((t) => t.id === ctx.slice(2)) || {}).items;
  const h = getHex(ctx.slice(2), create); return h ? h.items : null;
}
function ctxAfter(ctx) {
  if (ctx.startsWith('t:')) { renderHexesOfType(ctx.slice(2)); clearTimeout(ctxAfter._t); ctxAfter._t = setTimeout(renderTypes, 250); }
  else { renderHex(ctx.slice(2)); renderOverlay(); }
  schedulePaper();
}
handlers.addIt = (d) => {
  checkpoint(); const list = ctxList(d.ctx, true); let it;
  switch (d.t) {
    case 'icon': it = { t: 'icon', icon: 'mountain', x: 0, y: 0 }; break;
    case 'city': it = { t: 'city', slots: 1, x: 0, y: 0, rev: '' }; break;
    case 'town': it = { t: 'town', style: 'dot', x: 0, y: 0 }; break;
    case 'text': it = { t: 'text', text: 'Name', style: 'plain', size: 0.24, x: 0, y: 0.55 }; break;
    case 'cost': it = { t: 'text', text: '$60', style: 'triangle', size: 0.2, x: 0, y: -0.45 }; break;
    case 'phases': it = { t: 'phases', values: 'y20 g30 b40 x60', x: 0, y: 0 }; break;
    case 'wedge': it = { t: 'wedge', e: 0, x: 0, y: 0 }; break;
    case 'img': it = { t: 'img', ref: assetOptions()[0][0], x: 0, y: 0 }; break;
  }
  list.push(it); ctxAfter(d.ctx);
  if (!d.ctx.startsWith('t:')) S.sel = { kind: 'hex', k: d.ctx.slice(2), item: list.length - 1 };
  renderProps(); renderOverlay();
  if (d.t === 'text' || d.t === 'cost') focusItemText(list.length - 1);
};
handlers.itDel = (d) => {
  checkpoint();
  if (d.ctx.startsWith('t:')) ctxList(d.ctx).splice(+d.i, 1); else { removeItem(d.ctx.slice(2), +d.i); if (S.sel) S.sel.item = null; }
  ctxAfter(d.ctx); renderProps(); renderOverlay();
};
handlers.detachRev = (d) => {
  const k = d.ctx.slice(2), i = +d.i, h = P.hexes[k], it = h.items[i]; const [c, r] = unkey(k); const [px, py] = itemPos(c, r, it);
  checkpoint(); const n = String(it.values || '').trim().split(/[\s,]+/).filter(Boolean).length || 1; const cw = R() * 0.42 * (it.s || 1);
  const nm = h.items.find((x) => x.nm && x.text);
  const o = { id: uid('o'), t: 'revbox', values: it.values, cw, x: px - (n * cw) / 2, y: py - cw * 0.38 };
  removeItem(k, i); P.objects.push(o); renderHex(k); renderObject(o.id); select({ kind: 'obj', id: o.id }); schedulePaper();
  toast('Revenue box is now a free object — drag it anywhere.');
};
handlers.itDup = (d) => { checkpoint(); const l = ctxList(d.ctx); const n = clone(l[+d.i]); n.x = (n.x || 0) + 0.1; n.y = (n.y || 0) + 0.1; l.push(n); ctxAfter(d.ctx); renderProps(); };
handlers.itUp = (d) => { checkpoint(); if (d.ctx.startsWith('t:')) { const l = ctxList(d.ctx), i = +d.i; if (i > 0) [l[i], l[i - 1]] = [l[i - 1], l[i]]; } else moveItem(d.ctx.slice(2), +d.i, -1); ctxAfter(d.ctx); renderProps(); };
handlers.itDown = (d) => { checkpoint(); if (d.ctx.startsWith('t:')) { const l = ctxList(d.ctx), i = +d.i; if (i < l.length - 1) [l[i], l[i + 1]] = [l[i + 1], l[i]]; } else moveItem(d.ctx.slice(2), +d.i, 1); ctxAfter(d.ctx); renderProps(); };

function hexPanel(k) {
  const [c, r] = unkey(k); const h = P.hexes[k]; const ty = hexType(h);
  const label = coordLabel(c, r);
  let out = `<div class="sec"><h3>Hex ${label ? `<b style="color:var(--accent2);font-size:15px;letter-spacing:.04em">${label}</b>` : ''}<span class="grow"></span><span class="pill">col ${c + 1} · row ${r + 1}</span></h3>`;
  if (P.voids[k]) return out + `<div class="help">This hex is removed from the map.</div><button class="btn pri" data-act="restoreHex">Restore hex</button></div>`;
  out += `<div class="btngrid" style="margin-bottom:8px"><button class="btn sm danger" data-act="voidHex">Remove hex from map</button><button class="btn sm" data-act="clearHex">Clear contents</button></div>`;
  const nameIt = h && h.items ? h.items.findIndex((i) => i.nm) : -1;
  out += `<div ${bind('hx', () => getHex(k, true), (f) => { renderHex(k); renderOverlay(); schedulePaper(); if (f === 'type') renderProps(); })}>
    ${F('Hex type', `<div class="row">${I.select('type', h && h.type || '', [['', '— none —'], ...(P.types || []).map((t) => [t.id, t.name])])}${ty ? `<button class="btn sm" data-act="editType" data-id="${ty.id}">Edit</button>` : ''}</div>`)}
    ${F('Color', `<div class="row">${I.optColor('fill', h && h.fill, effFill(h) || (P.style.hexFill === 'none' ? '#ffffff' : P.style.hexFill), ty ? 'Override' : 'Custom')}</div>`)}
    </div>
    <div ${bind('hxname', () => nameItemFor(k), () => { renderHex(k); renderOverlay(); schedulePaper(); })}>
    ${F('Hex label', I.text('text', nameIt >= 0 ? h.items[nameIt].text : '', 'City name, “NY”, “B”…'))}
    </div>
    <div ${bind('hxol', () => { const h = getHex(k, true); h.outline = h.outline || {}; return h.outline; }, () => { renderEdges(); schedulePaper(); })}>${F('Outline', `<div class="row">${I.optColor('color', h && h.outline && h.outline.color, '#c62828', 'Color')}<input type="number" data-f="w" data-t="num" min="0.5" step="0.5" value="${(h && h.outline && h.outline.w) || 2}" style="width:60px"></div>`)}</div>
    ${F('Image fill', `<div class="row"><select data-act-sel="hexImg"><option value="">— none —</option>${Object.entries(P.assets).map(([id, a]) => `<option value="${id}" ${h && h.img && h.img.ref === id ? 'selected' : ''}>${esc(a.name || id)}</option>`).join('')}</select><button class="btn sm" data-act="hexImgUp">Upload</button></div>`)}
    ${ty && ty.items.length ? `<div class="help">Includes <b>${esc(ty.name)}</b> type contents (${ty.items.length} item${ty.items.length > 1 ? 's' : ''}). Items below are extras for this hex only.</div>` : ''}
  </div>`;
  const items = h ? h.items : [];
  out += sec(`This hex's items`, itemCards(items, 'h:' + k, () => {}, S.sel && S.sel.item) + addItemButtons('h:' + k));
  const tr = h && h.track ? h.track : [];
  out += sec('Track', (tr.length ? tr.map((t, i) => `<div class="trk"><svg width="22" height="10"><line x1="1" y1="5" x2="21" y2="5" stroke="${t.color || '#111'}" stroke-width="4"${t.style === 'narrow' ? ' stroke-dasharray="4 2"' : ''}/></svg><span>${epName(h, t.a)} → ${epName(h, t.b)}</span>
      ${t.a[0] === 'e' && t.b[0] === 'e' ? `<button class="btn sm" data-act="trGeo" data-i="${i}" title="Switch between curved and Lawsonian (through the center)">${(t.geo || P.style.trackGeo || 'curve') === 'lawson' ? 'Lawson' : 'Curve'}</button>` : ''}
      <input type="color" value="${t.color || '#111111'}" data-act-trc="${i}" style="width:26px;height:22px"><button class="btn icon sm danger" data-act="trDel" data-i="${i}">✕</button></div>`).join('') + `<button class="btn sm" data-act="trClear" style="margin-top:4px">Clear track</button>`
    : '<div class="empty">No track. Use the Track tool <kbd>K</kbd> and drag across hexes.</div>'));
  out += linesSection(k);
  out += sec('Actions', `<div class="btngrid"><button class="btn sm" data-act="typeFromHex">Save as hex type</button><button class="btn sm" data-act="clearHex">Clear hex</button>
    ${ty || (h && h.fill) ? `<button class="btn sm" data-act="detachType">${ty ? 'Detach from type' : 'Remove color'}</button>` : ''}</div>
    <div class="help" style="margin-top:6px"><kbd>Del</kbd> deletes the selected item, clears a hex, or removes an empty hex.</div>`);
  setTimeout(() => {
    $$('#insNSeg button').forEach((b) => (b.onclick = () => { S.insN = +b.dataset.v; renderProps(); }));
    const sel = $('[data-act-sel="hexImg"]'); if (sel) sel.onchange = () => { checkpoint(); const hh = getHex(k, true); if (sel.value) hh.img = { ref: sel.value }; else delete hh.img; cleanHex(k); renderHex(k); };
    $$('[data-act-trc]').forEach((inp) => (inp.oninput = () => { checkpoint('trc' + inp.dataset.actTrc); P.hexes[k].track[+inp.dataset.actTrc].color = inp.value; renderHex(k); }));
  }, 0);
  return out;
}
function nameItemFor(k) {
  const h = getHex(k, true); let it = h.items.find((i) => i.nm);
  if (!it) { it = { t: 'text', nm: true, text: '', style: 'plain', size: 0.24, x: 0, y: isPointy() ? 0.6 : 0.56 }; h.items.push(it); }
  return it;
}
handlers.restoreHex = () => { checkpoint(); delete P.voids[S.sel.k]; renderBase(); renderHex(S.sel.k); renderOverlay(); renderProps(); schedulePaper(); };
handlers.voidHex = () => { checkpoint(); const k = S.sel.k; P.voids[k] = 1; delete P.hexes[k]; renderBase(); renderHex(k); renderOverlay(); renderProps(); schedulePaper(); toast('Hex removed (Ctrl Z to undo)'); };
handlers.clearHex = () => { checkpoint(); const k = S.sel.k; delete P.hexes[k]; renderHex(k); renderOverlay(); renderProps(); schedulePaper(); };
handlers.detachType = () => {
  checkpoint(); const k = S.sel.k, h = P.hexes[k]; const ty = hexType(h);
  if (ty) { h.fill = h.fill || ty.fill; h.items = [...clone(ty.items), ...h.items]; h.track = (h.track || []).map((t) => { const sh = (ep) => ep[0] === 'i' ? 'i' + (parseInt(ep.slice(1)) + ty.items.length) + (ep.includes('.') ? '.' + ep.split('.')[1] : '') : ep; return { ...t, a: sh(t.a), b: sh(t.b) }; }); if (ty.img && !h.img) h.img = clone(ty.img); delete h.type; }
  else delete h.fill;
  cleanHex(k); renderHex(k); renderProps();
};
handlers.typeFromHex = () => newType(S.sel.k);
handlers.editType = (d) => select({ kind: 'type', id: d.id });
handlers.trDel = (d) => { checkpoint(); const k = S.sel.k; P.hexes[k].track.splice(+d.i, 1); cleanHex(k); renderHex(k); renderProps(); };
handlers.trGeo = (d) => { checkpoint(); const t = P.hexes[S.sel.k].track[+d.i]; const cur = t.geo || P.style.trackGeo || 'curve'; t.geo = cur === 'lawson' ? 'curve' : 'lawson'; renderHex(S.sel.k); renderProps(); };
handlers.trClear = () => { checkpoint(); const k = S.sel.k; P.hexes[k].track = []; cleanHex(k); renderHex(k); renderProps(); };
handlers.hexImgUp = () => pickFiles('image/*', true, async (files) => { const ids = await addAssets(files); if (ids.length) { checkpoint(); const k = S.sel.k; getHex(k, true).img = { ref: ids[0] }; renderHex(k); renderProps(); } });

// ---------------- Hex type panel ----------------
function typePanel(t) {
  const users = Object.values(P.hexes).filter((h) => h.type === t.id).length;
  let out = `<div class="sec"><h3>Hex type<span class="grow"></span><button class="btn sm" data-act="backMap">Done</button></h3>
    <div style="width:90px;height:90px;margin:0 auto 6px">${typePreview(t)}</div>
    <div ${bind('ty', () => t, (f) => { renderHexesOfType(t.id); clearTimeout(typePanel._t); typePanel._t = setTimeout(() => { renderTypes(); const pv = $('#props .sec div[style*="90px"]'); if (pv) pv.innerHTML = typePreview(t); }, 200); schedulePaper(); })}>
      ${F('Name', I.text('name', t.name))}
      ${F('Color', `<div class="row">${I.optColor('fill', t.fill, '#c9a77c', 'Fill')}</div>`)}
    </div>
    ${F('Image fill', `<select data-act-sel="typeImg"><option value="">— none —</option>${Object.entries(P.assets).map(([id, a]) => `<option value="${id}" ${t.img && t.img.ref === id ? 'selected' : ''}>${esc(a.name || id)}</option>`).join('')}</select>`)}
    <div class="help">Used by <b>${users}</b> hex${users === 1 ? '' : 'es'}. Changes here update all of them.</div>
    <div class="btngrid" style="margin-top:6px"><button class="btn sm pri" data-act="paintType" data-id="${t.id}">Paint with this type</button><button class="btn sm" data-act="dupType" data-id="${t.id}">Duplicate</button>
    <button class="btn sm danger" data-act="delType" data-id="${t.id}">Delete type</button></div></div>`;
  out += sec('Contents', itemCards(t.items, 't:' + t.id, () => {}, null) + addItemButtons('t:' + t.id));
  setTimeout(() => { const sel = $('[data-act-sel="typeImg"]'); if (sel) sel.onchange = () => { checkpoint(); if (sel.value) t.img = { ref: sel.value }; else delete t.img; renderHexesOfType(t.id); renderTypes(); }; }, 0);
  return out;
}
handlers.backMap = () => select(null);
handlers.paintType = (d) => { S.brush = { kind: 'type', id: d.id }; setTool('paint'); };
handlers.dupType = (d) => { checkpoint(); const t = clone(P.types.find((x) => x.id === d.id)); t.id = uid('t'); t.name += ' copy'; P.types.push(t); renderTypes(); select({ kind: 'type', id: t.id }); };
handlers.delType = (d) => confirmBox('Delete hex type', 'Hexes using this type keep their own items but lose the type’s color and contents. Delete it?', 'Delete', () => {
  checkpoint(); P.types = P.types.filter((t) => t.id !== d.id); for (const k in P.hexes) if (P.hexes[k].type === d.id) { delete P.hexes[k].type; cleanHex(k); }
  if (S.brush.kind === 'type' && S.brush.id === d.id) S.brush = { kind: 'color', color: '#f6dc4a' };
  renderAllHexes(); select(null); renderLeft();
});

// ---------------- Object panels ----------------
function objCommon(o) {
  return sec('Position', `<div ${bind('oc', () => o, () => { renderObject(o.id); renderOverlay(); schedulePaper(); })}>
    <div class="btngrid">${F('X', I.num('x', Math.round(o.x)), 'full')}${F('Y', I.num('y', Math.round(o.y)), 'full')}</div>
    ${F('Rotate', I.range('rot', o.rot || 0, -180, 180, 1))}</div>
    <div class="btngrid" style="margin-top:6px"><button class="btn sm" data-act="oFront">Bring to front</button><button class="btn sm" data-act="oBack">Send to back</button>
    <button class="btn sm" data-act="oDup">Duplicate</button><button class="btn sm danger" data-act="oDel">Delete</button></div>`);
}
handlers.oFront = () => { checkpoint(); const i = P.objects.findIndex((o) => o.id === S.sel.id); P.objects.push(P.objects.splice(i, 1)[0]); renderObjects(); renderOverlay(); };
handlers.oBack = () => { checkpoint(); const i = P.objects.findIndex((o) => o.id === S.sel.id); P.objects.unshift(P.objects.splice(i, 1)[0]); renderObjects(); renderOverlay(); };
handlers.oDup = () => duplicateSel();
handlers.oDel = () => deleteSel();
function objPanel(o) {
  const after = (f, structural) => { renderObject(o.id); renderOverlay(); schedulePaper(); if (structural) renderProps(); };
  let body = '';
  const T = { revbox: 'Off-board revenues', region: 'Region', text: 'Text box', icon: 'Icon', img: 'Image', market1: 'Stock market (1D)', market2: 'Stock market (2D)', table: 'Information table' }[o.t];
  if (o.t === 'text') {
    body = `<div ${bind('o', () => o, after)}><div class="f full">${I.area('text', o.text, 3)}</div>
      ${F('Size', I.range('fs', o.fs || 24, 6, 200, 1))}${F('Font', I.select('font', o.font || 'sans', [['sans', 'Sans-serif'], ['serif', 'Serif'], ['mono', 'Monospace']]))}
      ${F('Color', I.color('color', o.color || '#111111'))}<div class="row">${I.check('bold', o.bold, 'Bold')}${I.check('italic', o.italic, 'Italic')}</div>
      ${F('Align', I.seg('align', o.align || 'start', [['start', 'Left'], ['middle', 'Center'], ['end', 'Right']]))}
      ${F('Background', I.optColor('bg', o.bg, '#ffffff', 'Box'))}${F('Box border', I.optColor('bgBorder', o.bgBorder, '#222222', 'Line'))}${F('Corner', I.range('radius', o.radius || 0, 0, 40, 1))}</div>`;
  } else if (o.t === 'icon') {
    body = `<div ${bind('o', () => o, after)}>${F('Icon', I.select('icon', o.icon, iconOptions()))}${F('Color', I.optColor('color', o.color, (ICONS[o.icon] || {}).color))}${F('Size', I.range('size', Math.round(o.size || 60), 8, 600, 1))}</div>`;
  } else if (o.t === 'img') {
    body = `<div ${bind('o', () => o, after)}>${F('Image', I.select('ref', o.ref, Object.entries(P.assets).map(([id, a]) => [id, a.name || id])))}
      ${F('Width', `<input type="number" data-act-input="imgw" value="${Math.round(o.w)}">`)}${F('Opacity', I.range('opacity', o.opacity ?? 1, 0.05, 1, 0.05))}</div>`;
    setTimeout(() => { const w = $('[data-act-input="imgw"]'); if (w) w.onchange = () => { const v = +w.value; if (v > 0) { checkpoint(); const k = (o.h || o.w / assetAspect(o.ref)) / o.w; o.w = v; o.h = v * k; after(); } }; }, 0);
  } else if (o.t === 'market1' || o.t === 'market2') {
    body = marketPanel(o, after);
  } else if (o.t === 'revbox') {
    body = `<div ${bind('o', () => o, after)}>${F('Values', I.text('values', o.values, 'y20 g30 b40 x60'))}<div class="help">Prefix each value with a phase color letter: <code>y</code> <code>g</code> <code>b</code> <code>x</code> <code>r</code> <code>w</code>.</div>
      ${F('Name', I.text('name', o.name, 'e.g. Chicago (optional)'))}${F('Name color', I.color('nameColor', o.nameColor || '#111111'))}${F('Box size', I.range('cw', Math.round(o.cw || 30), 10, 120, 1))}</div>`;
  } else if (o.t === 'region') {
    body = `<div ${bind('o', () => o, (f) => { if (f === 'under') { renderObjects(); renderOverlay(); } else after(f); })}>
      ${F('Fill', I.optColor('fill', o.fill, '#79b8e8', 'Fill'))}${F('Fill opacity', I.range('opacity', o.opacity ?? 1, 0.05, 1, 0.05))}
      ${F('Outline', I.color('stroke', o.stroke || '#222222'))}${F('Line width', I.range('sw', o.sw ?? 2, 0, 20, 0.5))}
      ${I.check('dashed', o.dashed, 'Dashed outline')}${I.check('smooth', o.smooth, 'Smooth curves')}${I.check('under', o.under, 'Behind the hex grid')}</div>
      <div class="help">${o.pts.length} points. Drag points to reshape (they snap to hex corners; hold Alt to place freely). Click a small dot on an edge to add a point; Shift-click a point to remove it.</div>`;
  } else if (o.t === 'table') {
    body = `<div ${bind('o', () => o, after)}>${F('Title', I.text('title', o.title, 'Optional'))}
      <div class="f full"><label>Rows — separate cells with <code>|</code></label>${I.area('text', o.text, 8)}</div>
      <div class="help">First row is the header. Insert icons with <code>:mountain:</code>, <code>:water:</code>, <code>:forest:</code>… or your uploads by name. Start a cell with <code>[#ffcc00]</code> to color it, wrap in <code>**bold**</code> for bold.</div>
      <div class="help" style="margin-bottom:6px">Icon names: ${Object.keys(ICONS).map((k) => `<code>${k}</code>`).join(' ')}</div>
      ${I.check('header', o.header !== false, 'First row is a header')}${I.check('grid', o.grid !== false, 'Grid lines')}
      ${F('Text size', I.range('fs', o.fs || 14, 6, 60, 1))}${F('Padding', I.range('pad', o.pad ?? 6, 0, 30, 1))}
      ${F('Align', I.text('align', o.align, 'l,c,r per column'))}${F('Font', I.select('font', o.font || 'sans', [['sans', 'Sans-serif'], ['serif', 'Serif'], ['mono', 'Monospace']]))}
      ${F('Header', `<div class="row">${I.color('headerBg', o.headerBg || '#2b2b2b')}${I.color('headerFg', o.headerFg || '#ffffff')}</div>`)}
      ${F('Body', `<div class="row">${I.color('bg', o.bg || '#ffffff')}${I.color('fg', o.fg || '#111111')}</div>`)}
      ${F('Stripes', I.optColor('stripe', o.stripe, '#f1ede3', 'On'))}${F('Border', `<div class="row">${I.color('border', o.border || '#333333')}</div>`)}${F('Border width', I.range('borderW', o.borderW ?? 1, 0, 6, 0.1))}
      ${F('Title size', I.range('titleSize', o.titleSize || Math.round((o.fs || 14) * 1.3), 8, 80, 1))}</div>`;
  }
  return sec(T, body) + objCommon(o);
}
function marketPanel(o, after) {
  const is2 = o.t === 'market2';
  let h = `<div ${bind('o', () => o, (f, st) => { after(f, st); if (f === 'data') updateCellEditor(o); })}>${F('Title', I.text('title', o.title, 'Optional'))}
    <div class="f full"><label>${is2 ? 'Values — one row per line' : 'Values in order'}</label>${I.area('data', o.data, is2 ? 8 : 4)}</div>
    <div class="help">Add a color letter after a value: <code>40y</code> yellow, <code>o</code> orange, <code>b</code> brown, <code>r</code> red, <code>g</code> green, <code>l</code> blue, <code>u</code> purple, <code>x</code> gray. Add <code>p</code> for a par space (<code>100p</code>, <code>70yp</code>), <code>v</code> or <code>^</code> for a down/up ledge arrow (<code>75v</code>). ${is2 ? 'Use <code>.</code> for an empty space to make ledges.' : 'Words work too: <code>closed:x</code>.'}</div>
    ${is2 ? I.check('stagger', o.stagger, 'Offset alternate rows (brick layout)') : `${F('Layout', I.select('layout', o.layout || 'wrap', [['wrap', 'Rows (wrap)'], ['snake', 'Snake (zig-zag)'], ['row', 'Single row'], ['column', 'Single column'], ['perimeter', 'Around a border']]))}${F(o.layout === 'perimeter' ? 'Cells across' : 'Per row', I.num('perRow', o.perRow || 10, 1, 500, 1))}`}
    <div class="btngrid">${F('Cell width', I.num('cw', o.cw || 44, 10, 400, 1), 'full')}${F('Cell height', I.num('ch', o.ch || 44, 10, 400, 1), 'full')}</div>
    ${F('Gap', I.range('gap', o.gap || 0, 0, 20, 0.5))}${F('Text size', I.range('fs', o.fs || 14, 6, 60, 1))}
    ${F('Value spot', I.seg('valPos', o.valPos || 'center', [['center', 'Center'], ['top', 'Top'], ['tl', 'Corner']]))}
    ${I.check('bold', o.bold, 'Bold values')}
    ${F('Plain cells', I.color('cellBg', o.cellBg || '#ffffff'))}${F('Borders', `<div class="row">${I.color('border', o.border || '#222222')}</div>`)}${F('Border width', I.range('borderW', o.borderW ?? 1.2, 0, 6, 0.1))}
    ${F('Par outline', I.color('parColor', o.parColor || '#d62828'))}${F('Text color', I.optColor('textColor', o.textColor && o.textColor !== 'auto' ? o.textColor : '', '#111111', 'Fixed'))}
  </div>`;
  h += `<div ${bind('oz', () => (o.zones = o.zones || {}), after)}><div class="help" style="margin-top:8px">Zone colors</div><div class="row" style="flex-wrap:wrap;gap:6px">${Object.entries(ZONE_CODES).filter(([k]) => !['w', 'k'].includes(k)).map(([k, [nm, def]]) => `<label title="${nm} (${k})" style="display:flex;flex-direction:column;align-items:center;font:10px var(--mono);color:var(--ink3)">${I.color(k, (o.zones && o.zones[k]) || def)}${k}</label>`).join('')}</div></div>`;
  h += `<div id="cellEd"></div>`;
  setTimeout(() => updateCellEditor(o), 0);
  return h;
}
function updateCellEditor(o) {
  const el = $('#cellEd'); if (!el) return;
  const ck = S.sel && S.sel.kind === 'obj' && S.sel.id === o.id ? S.sel.cell : null;
  const paintN = Object.keys(o.paint || {}).length;
  if (ck == null) { el.innerHTML = `<div class="help" style="margin-top:10px">Click a cell on the map to edit it. With the Paint tool you can color individual cells.</div>${paintN ? `<button class="btn sm" id="clrPaint">Clear ${paintN} painted cell${paintN > 1 ? 's' : ''}</button>` : ''}`; const b = $('#clrPaint'); if (b) b.onclick = () => { checkpoint(); o.paint = {}; renderObject(o.id); updateCellEditor(o); }; return; }
  const is2 = o.t === 'market2';
  const data = is2 ? parseMarket2(o) : parseMarket1(o);
  let cell; if (is2) { const [r, c] = ck.split(',').map(Number); cell = data[r] && data[r][c]; } else cell = data[+ck];
  if (!cell) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="card" style="margin-top:10px"><div class="card-h"><span class="pill">Cell</span><span class="t">${is2 ? 'row ' + (+ck.split(',')[0] + 1) + ', col ' + (+ck.split(',')[1] + 1) : '#' + (+ck + 1)}</span></div>
    ${F('Value', `<input type="text" id="ceV" value="${esc(cell.v)}">`)}
    ${F('Zone', `<select id="ceZ"><option value="">None</option>${Object.entries(ZONE_CODES).map(([k, [nm]]) => `<option value="${k}" ${cell.z === k ? 'selected' : ''}>${nm}</option>`).join('')}</select>`)}
    <label class="chk"><input type="checkbox" id="ceP" ${cell.p ? 'checked' : ''}>Par space</label>
    ${F('Paint', `<div class="row"><label class="chk" style="margin:0"><input type="checkbox" id="cePc" ${o.paint && o.paint[ck] ? 'checked' : ''}>Custom</label><input type="color" id="ceC" value="${(o.paint && o.paint[ck]) || '#ffd966'}"></div>`)}
    ${is2 ? '<button class="btn sm danger" id="ceDel">Remove cell</button>' : ''}</div>`;
  const commit = () => {
    checkpoint('cell' + ck);
    cell.v = $('#ceV').value; cell.z = $('#ceZ').value; cell.p = $('#ceP').checked;
    o.data = is2 ? serializeMarket2(data) : serializeMarket1(data);
    o.paint = o.paint || {}; if ($('#cePc').checked) o.paint[ck] = $('#ceC').value; else delete o.paint[ck];
    const ta = $('#props textarea[data-f="data"]'); if (ta) ta.value = o.data;
    renderObject(o.id); renderOverlay();
  };
  ['ceV', 'ceZ', 'ceP', 'cePc'].forEach((id) => $('#' + id).addEventListener('input', commit));
  $('#ceC').addEventListener('input', () => { $('#cePc').checked = true; commit(); });
  const del = $('#ceDel'); if (del) del.onclick = () => { checkpoint(); const [r, c] = ck.split(',').map(Number); data[r][c] = null; o.data = serializeMarket2(data); S.sel.cell = null; renderObject(o.id); renderProps(); renderOverlay(); };
}

// ---------------- Insert objects ----------------
function viewCenterWorld() { const r = stage.getBoundingClientRect(); return [(r.width / 2 - S.view.x) / S.view.z, (r.height / 2 - S.view.y) / S.view.z]; }
function placeBesideMap(w, h) {
  const gb = hexBoundsExisting(); const others = P.objects.filter((o) => o.x > gb.x + gb.w);
  let y = gb.y; if (others.length) { try { const bb = L.objects.getBBox(); y = Math.max(gb.y, bb.y + bb.height + 30); } catch (e) {} }
  return [gb.x + gb.w + R() * 2.2, y];
}
function insertObject(t) {
  checkpoint(); let o;
  const [x, y] = placeBesideMap();
  if (t === 'market1') o = { id: uid('o'), t: 'market1', x, y, title: 'Share price', layout: 'wrap', perRow: 12, cw: 46, ch: 40, fs: 14, data: '0x 10x 20x 30o 40o 50o 60y 70y 80y 90p 100p 110p 120 130 140 150 165 180 195 210 230 250 275 300 330 360 400 450', zones: {} };
  if (t === 'market2') o = { id: uid('o'), t: 'market2', x, y, title: 'Stock market', cw: 46, ch: 40, fs: 13, valPos: 'tl', data: [
    '64y 70 76 84 92 102 114 128 144 162 182 205 230 260',
    '58y 64y 70 76p 84 92 102 114 128 144 162 182 205',
    '52o 58y 64y 70p 76 84 92 102 114 128 144',
    '46o 52o 58y 64p 70 76 84 92 102',
    '40b 46o 52o 58yp 64 70 76 84',
    '32b 40b 46o 52o 58y 64 70',
    '24b 32b 40b 46o 52o 58y',
    '. 24b 32b 40b 46o 52o'].join('\n'), zones: {} };
  if (t === 'table') o = { id: uid('o'), t: 'table', x, y, title: 'Terrain costs', fs: 15, pad: 7, stripe: '#f1ede3', text: 'Terrain | Cost\n:mountain: Mountains | $60\n:hills: Hills | $30\n:water: River crossing | $40\n:forest: Forest | $20\n[#e0443e] Off-board | —' };
  if (t === 'text') { const [cx, cy] = viewCenterWorld(); o = { id: uid('o'), t: 'text', x: cx - 80, y: cy - 20, text: P.name || 'Title', fs: 40, bold: true }; }
  P.objects.push(o); renderObject(o.id); schedulePaper(); select({ kind: 'obj', id: o.id }); setTool('select');
  ensureVisible(o);
}
function ensureVisible(o) {
  try { const el = L.objects.querySelector(`[data-o="${o.id}"]`); const bb = el.getBBox(); const r = stage.getBoundingClientRect();
    const sx = (o.x + bb.x) * S.view.z + S.view.x, sy = (o.y + bb.y) * S.view.z + S.view.y, sw = bb.width * S.view.z, sh = bb.height * S.view.z;
    if (sx < 0 || sy < 0 || sx + sw > r.width || sy + sh > r.height) fitView();
  } catch (e) {}
}

// ---------------- Insert / delete rows and columns inside the map ----------------
S.insN = 1;
function lineDelta(axis, n, sgn = 1) {
  const s = R(), w = SQ3 * s, h = SQ3 * s, odd = Math.abs(n) % 2 === 1;
  if (isPointy()) return axis === 'row' ? [odd ? sgn * w / 2 : 0, 1.5 * s * n] : [w * n, 0];
  return axis === 'col' ? [1.5 * s * n, odd ? sgn * h / 2 : 0] : [0, h * n];
}
function shiftLines(axis, index, n, opts = {}) {
  // move every hex at or beyond `index` on `axis` by n lines; n<0 closes a gap
  const g = P.grid, beyond = (c, r) => (axis === 'row' ? r >= index : c >= index);
  const oldPresent = new Set();
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) if (!P.voids[key(c, r)]) oldPresent.add(key(c, r));
  // pick a sideways direction that keeps everything on the grid
  let sgn = n > 0 ? 1 : -1, map;
  const build = (sg) => { const [dx, dy] = lineDelta(axis, n, sg); return (c, r) => { const [x, y] = center(c, r); return pixelToHex(x + dx, y + dy); }; };
  map = build(sgn);
  const movedKeys = [...oldPresent, ...Object.keys(P.hexes)];
  const anyNeg = () => movedKeys.some((k) => { const [c, r] = unkey(k); if (!beyond(c, r)) return false; const [nc, nr] = map(c, r); return nc < 0 || nr < 0; });
  if (anyNeg()) { sgn = -sgn; map = build(sgn); }
  const mk = (k) => { const [c, r] = unkey(k); if (!beyond(c, r)) return k; const [nc, nr] = map(c, r); return key(nc, nr); };
  // remap data
  const nh = {}; for (const k in P.hexes) nh[mk(k)] = P.hexes[k]; P.hexes = nh;
  const ne = {}; for (const k in P.edges) { const [c, r, i] = k.split(',').map(Number); const nk = mk(key(c, r)); ne[nk + ',' + i] = P.edges[k]; } P.edges = ne;
  (P.companies || []).forEach((co) => { if (co.home) { const [hk, i, sl] = co.home.split('|'); co.home = `${mk(hk)}|${i}|${sl}`; } if (co.dest) co.dest = mk(co.dest); });
  const newPresent = new Set([...oldPresent].map(mk));
  // grid size
  if (axis === 'row') g.rows += n; else g.cols += n;
  let maxC = g.cols - 1, maxR = g.rows - 1;
  newPresent.forEach((k) => { const [c, r] = unkey(k); maxC = Math.max(maxC, c); maxR = Math.max(maxR, r); });
  for (const k in P.hexes) { const [c, r] = unkey(k); maxC = Math.max(maxC, c); maxR = Math.max(maxR, r); }
  g.cols = maxC + 1; g.rows = maxR + 1;
  // inserted lines follow the outline of the rows/columns on either side
  if (n > 0) {
    for (let j = index; j < index + n; j++) {
      const len = axis === 'row' ? g.cols : g.rows;
      for (let t = 0; t < len; t++) {
        const [c, r] = axis === 'row' ? [t, j] : [j, t];
        const before = axis === 'row' ? key(t, index - 1) : key(index - 1, t), after = axis === 'row' ? key(t, index) : key(index, t);
        if (opts.full || oldPresent.has(before) || oldPresent.has(after)) newPresent.add(key(c, r));
      }
    }
  }
  P.voids = {};
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) if (!newPresent.has(key(c, r))) P.voids[key(c, r)] = 1;
  // free objects past the line move with the map
  const [dx, dy] = lineDelta(axis, n, sgn);
  const [lx, ly] = center(axis === 'row' ? 0 : index, axis === 'row' ? index : 0);
  P.objects.forEach((o) => { if (axis === 'row' ? o.y >= ly - R() : o.x >= lx - R()) { if (axis === 'row') o.y += dy; else o.x += dx; } });
  return mk;
}
function insertLines(axis, index, n) {
  checkpoint();
  const mk = shiftLines(axis, index, n);
  if (S.sel && S.sel.kind === 'hex') S.sel = { kind: 'hex', k: mk(S.sel.k) };
  _relKey = ''; renderAll(); renderProps();
  toast(`Inserted ${n} ${axis === 'row' ? 'row' : 'column'}${n > 1 ? 's' : ''}${n % 2 && ((isPointy() && axis === 'row') || (!isPointy() && axis === 'col')) ? ' — the far side moved half a hex to stay lined up' : ''}`);
}
function deleteLine(axis, index, n = 1) {
  checkpoint();
  const g = P.grid; n = Math.max(1, Math.min(n, axis === 'row' ? g.rows - index : g.cols - index));
  const inLine = (c, r) => { const t = axis === 'row' ? r : c; return t >= index && t < index + n; };
  for (const k in P.hexes) { const [c, r] = unkey(k); if (inLine(c, r)) delete P.hexes[k]; }
  for (const k in P.edges) { const [c, r] = k.split(',').map(Number); if (inLine(c, r)) delete P.edges[k]; }
  (P.companies || []).forEach((co) => { if (co.home) { const [c, r] = unkey(co.home.split('|')[0]); if (inLine(c, r)) co.home = ''; } if (co.dest) { const [c, r] = unkey(co.dest); if (inLine(c, r)) co.dest = ''; } });
  for (let j = index; j < index + n; j++) for (let t = 0; t < (axis === 'row' ? g.cols : g.rows); t++) P.voids[axis === 'row' ? key(t, j) : key(j, t)] = 1;
  shiftLines(axis, index + n, -n);
  const rowEmpty = (r) => { for (let c = 0; c < P.grid.cols; c++) if (!P.voids[key(c, r)]) return false; return true; };
  const colEmpty = (c) => { for (let r = 0; r < P.grid.rows; r++) if (!P.voids[key(c, r)]) return false; return true; };
  const hexIn = (pred) => Object.keys(P.hexes).some((k) => pred(...unkey(k)));
  while (P.grid.rows > 1 && rowEmpty(P.grid.rows - 1) && !hexIn((c, r) => r === P.grid.rows - 1)) P.grid.rows--;
  while (P.grid.cols > 1 && colEmpty(P.grid.cols - 1) && !hexIn((c) => c === P.grid.cols - 1)) P.grid.cols--;
  for (const k in P.voids) { const [c, r] = unkey(k); if (!inGrid(c, r)) delete P.voids[k]; }
  S.sel = null; _relKey = ''; renderAll(); renderProps();
  toast(`Deleted ${n} ${axis === 'row' ? 'row' : 'column'}${n > 1 ? 's' : ''} — everything beyond moved in to close the gap (Ctrl Z to undo)`);
}
function linesSection(k) {
  const [c, r] = unkey(k), staggerAxis = isPointy() ? 'row' : 'col';
  return sec('Rows & columns', `<div class="help" style="margin-top:0">Insert space inside the map; everything beyond moves over with its contents.</div>
    <div class="f"><label>How many</label><div class="seg" id="insNSeg">${[1, 2, 3, 4].map((n) => `<button data-v="${n}" class="${S.insN === n ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div class="btngrid">
      <button class="btn sm" data-act="insLine" data-axis="row" data-idx="${r}">Insert row above</button><button class="btn sm" data-act="insLine" data-axis="row" data-idx="${r + 1}">Insert row below</button>
      <button class="btn sm" data-act="insLine" data-axis="col" data-idx="${c}">Insert column left</button><button class="btn sm" data-act="insLine" data-axis="col" data-idx="${c + 1}">Insert column right</button>
      <button class="btn sm danger" data-act="delLine" data-axis="row" data-idx="${r}">Delete row${S.insN > 1 ? 's' : ''} from here</button><button class="btn sm danger" data-act="delLine" data-axis="col" data-idx="${c}">Delete column${S.insN > 1 ? 's' : ''} from here</button>
    </div>
    <div class="help">${staggerAxis === 'row' ? 'Rows' : 'Columns'} are offset in this layout, so inserting or deleting an odd number of ${staggerAxis === 'row' ? 'rows' : 'columns'} shifts the far side half a hex sideways. Use 2 to keep everything lined up. “How many” applies to deleting too.</div>`);
}
handlers.insLine = (d) => insertLines(d.axis, +d.idx, S.insN);
handlers.delLine = (d) => { const n = S.insN, w = d.axis === 'row' ? 'row' : 'column'; confirmBox(`Delete ${n} ${w}${n > 1 ? 's' : ''}`, `Delete every hex in ${n > 1 ? `these ${n} ${w}s (starting at this hex's ${w})` : `this ${w}`} and close the gap? Everything beyond moves in.`, 'Delete', () => deleteLine(d.axis, +d.idx, n)); };
