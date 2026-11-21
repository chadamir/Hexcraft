// =====================================================================
//  File › Check game data: show on the canvas what the game data export
//  would warn about — hexes with no Kind, unnamed or duplicate cities and
//  towns, links that end at a bare hex — with a banner to step through them.
// =====================================================================
S.gdCheck = false; S.gdSeq = 0; S.gdPos = -1;
let _gdCache = null;
{
  const _md = markDirty; markDirty = function (...a) { S.gdSeq++; const r = _md.apply(this, a); if (S.gdCheck) scheduleGdBanner(); return r; };
  const _ro = renderOverlay; renderOverlay = function (extra = '') { return _ro(extra + (S.gdCheck ? gdOverlay() : '')); };
}
function gdIssues() {
  if (_gdCache && _gdCache.seq === S.gdSeq && _gdCache.n === P.grid.cols * P.grid.rows) return _gdCache;
  const noKind = [], unnamed = [], dupes = [], bare = [], byName = {};
  for (let r = 0; r < P.grid.rows; r++) for (let c = 0; c < P.grid.cols; c++) {
    if (!exists(c, r)) continue;
    const k = key(c, r), h = P.hexes[k] || null, ty = hexType(h);
    if (h || ty) { if (!((h && h.kind) || (ty && ty.kind))) noKind.push(k); }
    const own = (h && h.items) || [], tyItems = (ty && ty.items) || [];
    [...tyItems.map((it) => [it, true]), ...own.map((it) => [it, false])].forEach(([it]) => {
      if (it.t !== 'city' && it.t !== 'town') return;
      const [x, y] = itemPos(c, r, it), p = { k, x, y, t: it.t, name: it.name || '' };
      if (!it.name) unnamed.push(p); else (byName[it.name] = byName[it.name] || []).push(p);
    });
  }
  for (const n in byName) if (byName[n].length > 1) dupes.push(...byName[n]);
  (P.links || []).filter(linkOk).forEach((l) => { if (!linkItem(l.a) || !linkItem(l.b)) bare.push(l); });
  const list = [
    ...noKind.map((k) => ({ k, msg: 'no terrain Kind' })),
    ...unnamed.map((p) => ({ k: p.k, msg: `${p.t} with no name` })),
    ...dupes.map((p) => ({ k: p.k, msg: `name “${p.name}” used more than once` })),
    ...bare.map((l) => ({ k: linkItem(l.a) ? l.b.k : l.a.k, link: l.id, msg: 'link ends at a hex with no city or town' })),
  ];
  return (_gdCache = { seq: S.gdSeq, n: P.grid.cols * P.grid.rows, noKind, unnamed, dupes, bare, list });
}
function gdOverlay() {
  const z = S.view.z, is = gdIssues(); let s = '', d = '';
  is.noKind.forEach((k) => { const [x, y] = center(...unkey(k)); d += hexPathAt(x, y); });
  if (d) s += `<defs><pattern id="gdHatch" width="${n2(9 / z)}" height="${n2(9 / z)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${n2(3.5 / z)}" height="${n2(9 / z)}" fill="#e53935" fill-opacity=".5"/></pattern></defs>` +
    `<path d="${d}" fill="url(#gdHatch)" stroke="#e53935" stroke-width="${n2(1.5 / z)}" pointer-events="none"/>`;
  const ring = (p, col) => `<circle cx="${n2(p.x)}" cy="${n2(p.y)}" r="${n2(R() * 0.42)}" fill="none" stroke="${col}" stroke-width="${n2(3 / z)}" stroke-dasharray="${n2(5 / z)} ${n2(3 / z)}" pointer-events="none"/>`;
  is.unnamed.forEach((p) => (s += ring(p, '#ff9800')));
  is.dupes.forEach((p) => (s += ring(p, '#ab47bc')));
  is.bare.forEach((l) => { const g = linkGeom(l); s += `<path d="${g.d}" fill="none" stroke="#e53935" stroke-width="${n2(3 / z)}" stroke-dasharray="${n2(6 / z)} ${n2(4 / z)}" pointer-events="none"/>`; });
  return s;
}
let _gdT = 0;
function scheduleGdBanner() { clearTimeout(_gdT); _gdT = setTimeout(() => { if (S.gdCheck) { renderGdBanner(); renderOverlay(); } }, 150); }
function renderGdBanner() {
  let el = $('#gdBanner');
  if (!S.gdCheck) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('div'); el.id = 'gdBanner';
    el.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:5;background:var(--panel,#221d16);color:var(--ink,#eee);border:1px solid var(--line,#444);border-radius:10px;padding:7px 10px;display:flex;gap:10px;align-items:center;font-size:12.5px;box-shadow:0 6px 22px #0006;max-width:92%;flex-wrap:wrap';
    $('#main').appendChild(el);
  }
  const is = gdIssues(), chip = (n, col, txt) => `<span style="display:inline-flex;align-items:center;gap:5px"><i style="width:10px;height:10px;border-radius:50%;background:${col};display:inline-block"></i>${n} ${txt}</span>`;
  const parts = [];
  if (is.noKind.length) parts.push(chip(is.noKind.length, '#e53935', `hex${is.noKind.length === 1 ? '' : 'es'} with no Kind`));
  if (is.unnamed.length) parts.push(chip(is.unnamed.length, '#ff9800', `unnamed cit${is.unnamed.length === 1 ? 'y or town' : 'ies or towns'}`));
  if (is.dupes.length) parts.push(chip(is.dupes.length, '#ab47bc', 'places sharing a name'));
  if (is.bare.length) parts.push(chip(is.bare.length, '#e53935', `link${is.bare.length === 1 ? '' : 's'} to a bare hex`));
  el.innerHTML = `<b>Game data check</b>${parts.length ? parts.join('') : '<span style="color:#66bb6a">✓ Everything has a Kind and a name</span>'}
    ${is.list.length ? '<button class="btn sm" id="gdNext">Next problem ›</button>' : ''}<button class="btn sm" id="gdDone">Done</button>`;
  const nx = $('#gdNext'); if (nx) nx.onclick = gdNext;
  $('#gdDone').onclick = () => toggleGameDataCheck(false);
}
function gdNext() {
  const is = gdIssues(); if (!is.list.length) return;
  S.gdPos = (S.gdPos + 1) % is.list.length; const it = is.list[S.gdPos];
  const [x, y] = center(...unkey(it.k)), r = stage.getBoundingClientRect();
  S.view.x = r.width / 2 - x * S.view.z; S.view.y = r.height / 2 - y * S.view.z; applyView();
  if (S.tool !== 'select') setTool('select');
  select(it.link ? { kind: 'link', id: it.link } : { kind: 'hex', k: it.k });
  toast(`${S.gdPos + 1} of ${is.list.length}: ${coordLabel(...unkey(it.k)) || it.k} — ${it.msg}`);
}
function toggleGameDataCheck(on = !S.gdCheck) {
  S.gdCheck = on; S.gdPos = -1; _gdCache = null;
  renderGdBanner(); renderOverlay();
  const b = $('#gdCheckBtn'); if (b) b.textContent = on ? 'Stop checking game data' : 'Check game data on the map';
}
