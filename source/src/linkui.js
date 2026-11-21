// =====================================================================
//  Point-to-point links: the Link tool (L), selection, panel, overlay.
//  Drawing lives in core.js (linksStr) so exports and the Node renderer share it.
// =====================================================================
S.linkOpts = { color: '#3a332a', w: 1, style: 'solid' };
S.linkStart = null; S.linkCursor = null;

TOOL_DEFS.splice(TOOL_DEFS.findIndex((t) => t[0] === 'pan'), 0,
  ['link', 'L', 'Links: connect cities and towns (point-to-point)', '<circle cx="4.5" cy="15.5" r="2.6" fill="currentColor"/><circle cx="15.5" cy="4.5" r="2.6" fill="currentColor"/><path d="M6.4 13.6L13.6 6.4" stroke="currentColor" stroke-width="2" stroke-dasharray="2.2 1.6"/>']);
TOOL_HINTS.link = 'Click a city or town, then another, to connect them. Keep clicking to chain links from the last place; Esc stops. Clicking a hex with no city links its centre. Click a link to edit its cost, length and look.';

function renderLinks() { if (L.links) setHTML(L.links, linksStr({ editor: true })); }
let _lkRaf = 0;
function scheduleLinks() { if (!(P.links && P.links.length) || _lkRaf) return; _lkRaf = requestAnimationFrame(() => { _lkRaf = 0; renderLinks(); }); }
{
  const _ra = renderAll; renderAll = function (...a) { const r = _ra.apply(this, a); renderLinks(); return r; };
  const _rh = renderHex; renderHex = function (...a) { const r = _rh.apply(this, a); scheduleLinks(); return r; };
  const _st = setTool; setTool = function (t) { if (t !== 'link') { S.linkStart = null; } return _st(t); };
  const _ds = deleteSel; deleteSel = function () {
    if (S.sel && S.sel.kind === 'link') { checkpoint(); P.links = (P.links || []).filter((l) => l.id !== S.sel.id); renderLinks(); select(null); schedulePaper(); toast('Link deleted (Ctrl Z to undo)'); return; }
    return _ds();
  };
  const _ro = renderOverlay; renderOverlay = function (extra = '') { return _ro(extra + linkOverlay()); };
  const _rto = renderToolOpts; renderToolOpts = function () { if (S.tool !== 'link') return _rto(); linkToolOpts(); };
}
window.addEventListener('keydown', (e) => {
  if (S.linkStart && e.key === 'Escape' && !isTyping()) { S.linkStart = null; renderOverlay(); e.stopImmediatePropagation(); }
}, true);

const sameEnd = (a, b) => a.k === b.k && (a.i ?? null) === (b.i ?? null);
// the city or town nearest the click in hex c,r (own items only), else the hex centre
function placeAt(c, r, wx, wy) {
  const k = key(c, r), h = P.hexes[k]; let best = null, bd = Infinity;
  ((h && h.items) || []).forEach((it, i) => {
    if (it.t !== 'city' && it.t !== 'town') return;
    const [x, y] = itemPos(c, r, it), d = Math.hypot(x - wx, y - wy); if (d < bd) { bd = d; best = i; }
  });
  return { k, i: best };
}
function placeName(e) {
  const it = linkItem(e), [c, r] = unkey(e.k), co = coordLabel(c, r) || e.k;
  const lbl = ((P.hexes[e.k] || {}).items || []).find((x) => x.nm && x.text);
  const nm = (it && it.name) || (lbl && lbl.text) || '';
  return `${nm ? nm + ' ' : ''}(${co}${it ? '' : ', hex centre'})`;
}
function linkDown(e, tgt, wx, wy, c, r) {
  if (!S.linkStart) { const lEl = tgt.closest('[data-link]'); if (lEl) { select({ kind: 'link', id: lEl.dataset.link }); return; } }
  if (!exists(c, r)) { S.linkStart = null; renderOverlay(); return; }
  const p = placeAt(c, r, wx, wy);
  if (!S.linkStart) { S.linkStart = p; S.linkCursor = [wx, wy]; renderOverlay(); return; }
  if (sameEnd(S.linkStart, p)) { S.linkStart = null; renderOverlay(); return; }
  P.links = P.links || [];
  const dup = P.links.find((l) => (sameEnd(l.a, S.linkStart) && sameEnd(l.b, p)) || (sameEnd(l.a, p) && sameEnd(l.b, S.linkStart)));
  if (dup) { S.linkStart = p; select({ kind: 'link', id: dup.id }); toast('Those two places are already linked'); return; }
  checkpoint();
  const o = S.linkOpts, l = { id: uid('l'), a: { ...S.linkStart }, b: { ...p }, cost: '', length: '', color: o.color, w: o.w, style: o.style };
  P.links.push(l); renderLinks(); schedulePaper();
  S.linkStart = p; select({ kind: 'link', id: l.id });
}
function linkOverlay() {
  const z = S.view.z; let s = '';
  if (S.sel && S.sel.kind === 'link') {
    const l = (P.links || []).find((x) => x.id === S.sel.id);
    if (l && linkOk(l)) {
      const g = linkGeom(l);
      s += `<path d="${g.d}" fill="none" stroke="#f0a830" stroke-opacity=".55" stroke-width="${n2(Math.max(8 / z, (l.w || 1) * R() * 0.09 * 3))}" stroke-linecap="round" pointer-events="none"/>`;
      [g.p0, g.p1].forEach((p) => (s += `<circle cx="${n2(p.x)}" cy="${n2(p.y)}" r="${n2(6 / z)}" fill="#f0a830" stroke="#1a1405" stroke-width="${n2(1 / z)}" pointer-events="none"/>`));
    }
  }
  if (S.tool === 'link' && S.linkStart && exists(...unkey(S.linkStart.k))) {
    const p = linkEnd(S.linkStart), q = S.linkCursor || [p.x, p.y];
    s += `<path d="M${n2(p.x)} ${n2(p.y)}L${n2(q[0])} ${n2(q[1])}" stroke="#f0a830" stroke-width="${n2(2.5 / z)}" stroke-dasharray="${n2(6 / z)} ${n2(4 / z)}" pointer-events="none"/>` +
      `<circle cx="${n2(p.x)}" cy="${n2(p.y)}" r="${n2(7 / z)}" fill="#f0a830" stroke="#1a1405" stroke-width="${n2(1 / z)}" pointer-events="none"/>`;
  }
  return s;
}
function linkToolOpts() {
  const o = S.linkOpts, el = $('#toolOpts');
  el.innerHTML = `<h3>New links</h3>
    <div class="f"><label>Color</label><input type="color" id="lkColor" value="${o.color}"></div>
    <div class="f"><label>Width</label><div class="row"><input type="range" id="lkW" min="0.3" max="4" step="0.1" value="${o.w}"><span class="echo" style="font:11px var(--mono);color:var(--ink3);width:36px;text-align:right">${o.w}</span></div></div>
    <div class="f"><label>Style</label><select id="lkStyle">${LINK_STYLES.map(([v, t]) => `<option value="${v}" ${o.style === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="help">${esc(TOOL_HINTS.link)}</div>`;
  $('#lkColor').oninput = (e) => (o.color = e.target.value);
  $('#lkW').oninput = (e) => { o.w = +e.target.value; e.target.nextElementSibling.textContent = o.w; };
  $('#lkStyle').onchange = (e) => (o.style = e.target.value);
}
function linkPanel(l) {
  const after = () => { renderLinks(); renderOverlay(); schedulePaper(); };
  const auto = hexSteps(l.a.k, l.b.k);
  return sec('Link', `<div class="help" style="margin-top:0"><b>From</b> ${esc(placeName(l.a))}<br><b>To</b> ${esc(placeName(l.b))}</div>
    <div ${bind('lk', () => l, after)}>
      ${F('Cost', I.text('cost', l.cost, 'e.g. 4 or $40'))}
      ${F('Length', I.text('length', l.length, `${auto} (hexes apart)`))}
      ${F('Show', I.seg('show', l.show || 'cost', [['cost', 'Cost'], ['length', 'Length'], ['both', 'Both'], ['none', 'None']]))}
      ${F('Line color', I.color('color', l.color || '#3a332a'))}
      ${F('Line width', I.range('w', l.w || 1, 0.3, 4, 0.1))}
      ${F('Line style', I.select('style', l.style || 'solid', LINK_STYLES))}
      ${F('Bend', I.range('bend', l.bend || 0, -1, 1, 0.05))}
      ${F('Label size', I.range('ls', l.ls || 1, 0.5, 2.5, 0.05))}
      ${F('Link tags', I.text('tags', l.tags, 'e.g. ferry, double'))}
    </div>
    <div class="help">Cost and length go to <b>File › Export game data</b> as numbers; leave Length empty to use the number of hexes between the two places.</div>
    <div class="btngrid" style="margin-top:6px"><button class="btn sm" data-act="lkFlip">Bend the other way</button><button class="btn sm danger" data-act="lkDel">Delete link</button></div>`);
}
handlers.lkDel = () => deleteSel();
handlers.lkFlip = () => { const l = (P.links || []).find((x) => x.id === S.sel.id); if (!l) return; checkpoint(); l.bend = -(l.bend || 0.3); renderLinks(); renderOverlay(); renderProps(); schedulePaper(); };

// keep links attached when rows/columns move or hex items are removed or reordered
function remapLinkHexes(mk) { (P.links || []).forEach((l) => { l.a.k = mk(l.a.k); l.b.k = mk(l.b.k); }); }
function dropLinksAt(pred) { P.links = (P.links || []).filter((l) => !pred(...unkey(l.a.k)) && !pred(...unkey(l.b.k))); }
function remapLinkItems(k, mapIdx) {
  (P.links || []).forEach((l) => [l.a, l.b].forEach((e) => { if (e.k === k && e.i != null) { const ni = mapIdx(e.i); e.i = ni == null ? null : ni; } }));
}
