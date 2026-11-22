// =====================================================================
//  Companies workspace UI
// =====================================================================
S.view2 = 'map'; S.compSel = null; S.compZoom = 1; S.pickHome = null;
const SHARE_PRESETS = [['88x63', 'Poker card 88×63 mm'], ['89x57', 'Bridge/business 89×57 mm'], ['70x45', 'Mini 70×45 mm'], ['120x70', 'Tarot 120×70 mm'], ['63x88', 'Portrait poker 63×88 mm']];
const CHARTER_PRESETS = [['210x148', 'A5 landscape 210×148 mm'], ['216x140', 'Half-letter 216×140 mm'], ['279x216', 'Letter landscape'], ['148x105', 'A6 148×105 mm'], ['180x120', 'Compact 180×120 mm']];
function curCo() { return (P.companies || []).find((c) => c.id === S.compSel) || null; }
function setView(v) {
  S.view2 = v;
  $('#main').hidden = v !== 'map'; $('#compMain').hidden = v !== 'comp';
  $('#mapLeft').hidden = v !== 'map'; $('#compLeft').hidden = v !== 'comp';
  $$('#viewTabs button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
  if (v === 'comp') { P.companies = P.companies || []; if (!curCo() && P.companies.length) S.compSel = P.companies[0].id; renderCompAll(); }
  else { renderProps(); requestAnimationFrame(() => renderOverlay()); }
}
$$('#viewTabs button').forEach((b) => (b.onclick = () => setView(b.dataset.view)));
function renderCompAll() { renderCompLeft(); renderCompPreview(); renderProps(); }

// ---------- left panel ----------
function miniLogo(co, px = 28) { return `<svg width="${px}" height="${px}" viewBox="-10.5 -10.5 21 21">${logoSVG(co, 10)}</svg>`; }
function renderCompLeft() {
  const list = P.companies || [], cs = CS();
  let h = `<div class="sec"><h3>Companies <span class="grow"></span><button class="btn sm" id="coAdd">+ Add</button></h3>`;
  h += list.length ? `<div class="colist">${list.map((c) => `<div class="coitem ${c.id === S.compSel ? 'on' : ''}" data-id="${c.id}">${miniLogo(c)}<div class="nm"><b>${esc(c.name)}</b><small>${esc(c.abbr || '')} · ${KIND_LABEL[c.kind] || ''}</small></div><button class="btn icon sm codup" data-dup="${c.id}" data-tip="Duplicate this company (new color, same stats)">⧉</button></div>`).join('')}</div>`
    : `<div class="empty">No companies yet. Add one, or start with a sample set.</div><button class="btn" id="coSamples">Add 4 sample companies</button>`;
  if (list.length) h += `<div class="btngrid" style="margin-top:8px"><button class="btn sm" id="coDupSel">Duplicate selected</button><button class="btn sm" id="coBulk">Make copies…</button></div>`;
  h += `</div><div class="sec" ${bind('cs', CS, (f) => { renderCompPreview(); if (f === 'homeOnMap') renderAllHexes(); if (f === 'sharePreset' || f === 'charterPreset') renderCompLeft(); })}><h3>Component style</h3>
    ${F('Look', I.seg('theme', cs.theme, [['classic', 'Classic'], ['modern', 'Modern']]))}
    ${F('Game title', I.text('game', cs.game, 'Printed small on cards'))}
    ${F('Share card', `<select data-cspreset="share">${SHARE_PRESETS.map(([v, l]) => `<option value="${v}" ${v === cs.shareW + 'x' + cs.shareH ? 'selected' : ''}>${l}</option>`).join('')}<option value="" ${SHARE_PRESETS.some(([v]) => v === cs.shareW + 'x' + cs.shareH) ? '' : 'selected'}>Custom</option></select>`)}
    <div class="btngrid">${F('Width mm', I.num('shareW', cs.shareW, 30, 300, 1), 'full')}${F('Height mm', I.num('shareH', cs.shareH, 30, 300, 1), 'full')}</div>
    ${F('Charter', `<select data-cspreset="charter">${CHARTER_PRESETS.map(([v, l]) => `<option value="${v}" ${v === cs.charterW + 'x' + cs.charterH ? 'selected' : ''}>${l}</option>`).join('')}<option value="" ${CHARTER_PRESETS.some(([v]) => v === cs.charterW + 'x' + cs.charterH) ? '' : 'selected'}>Custom</option></select>`)}
    <div class="btngrid">${F('Width mm', I.num('charterW', cs.charterW, 60, 600, 1), 'full')}${F('Height mm', I.num('charterH', cs.charterH, 40, 600, 1), 'full')}</div>
    ${F('Token disc', I.seg('tokenMM', cs.tokenMM, [[12, '12 mm'], [15, '15 mm'], [16, '16 mm'], [20, '20 mm']], 'num'))}
    ${F('Extra tokens', I.num('extraTokens', cs.extraTokens, 0, 20, 1))}
    ${I.check('homeOnMap', cs.homeOnMap !== false, 'Show home logos on the map')}
    ${I.check('orOn', cs.orOn, 'Print turn order on charters')}
    <div class="f full">${I.area('orSteps', cs.orSteps, 5)}</div>
    <div class="help">Extra tokens are added per company for the stock market and par markers. Stickers print 0.5 mm smaller than the disc so they sit cleanly.</div></div>
    ${charterTextSec()}
    <div class="sec"><button class="btn pri" id="coExport" style="width:100%">Print / export components…</button></div>`;
  $('#compLeft').innerHTML = h;
  $$('#compLeft .coitem').forEach((el) => (el.onclick = (e) => { if (e.target.closest('[data-dup]')) { duplicateCompany(e.target.closest('[data-dup]').dataset.dup); return; } S.compSel = el.dataset.id; renderCompAll(); }));
  const add = $('#coAdd'); if (add) add.onclick = () => { checkpoint(); const c = newCompany(); P.companies.push(c); S.compSel = c.id; renderCompAll(); setTimeout(() => { const n = $('#props [data-f="name"]'); n && (n.focus(), n.select()); }, 40); };
  const smp = $('#coSamples'); if (smp) smp.onclick = () => { checkpoint(); sampleCompanies().forEach((c) => P.companies.push(c)); S.compSel = P.companies[0].id; renderCompAll(); renderAllHexes(); };
  $('#coExport').onclick = compExportDialog;
  const ds = $('#coDupSel'); if (ds) ds.onclick = () => curCo() && duplicateCompany(curCo().id);
  const bk = $('#coBulk'); if (bk) bk.onclick = () => bulkCopyDialog();
  $$('#compLeft [data-cspreset]').forEach((sel) => (sel.onchange = () => {
    if (!sel.value) return; const [w, hh] = sel.value.split('x').map(Number); checkpoint();
    if (sel.dataset.cspreset === 'share') { cs.shareW = w; cs.shareH = hh; } else { cs.charterW = w; cs.charterH = hh; }
    renderCompLeft(); renderCompPreview();
  }));
  const cta = $('#ctArea'); if (cta) cta.onchange = () => { S.ctArea = cta.value; renderCompLeft(); };
  const ctr = $('#ctReset'); if (ctr) ctr.onclick = () => { const ct = CS().charterText || {}; if (!ct[S.ctArea]) return; checkpoint(); delete ct[S.ctArea]; renderCompLeft(); renderCompPreview(); };
  tipComp();
}
// Charter text: size, bold, italic, font and colour for each text area of the charters
function charterTextSec() {
  const cs = CS(), area = S.ctArea || (S.ctArea = 'notes'), d = ctDefault(area);
  const st = (cs.charterText || {})[area] || {};
  const tgt = () => { const c = CS(); c.charterText = c.charterText || {}; return (c.charterText[area] = c.charterText[area] || {}); };
  return `<div class="sec"><h3>Charter text</h3>
    ${F('Text area', `<select id="ctArea">${CT_AREAS.map(([v, l]) => `<option value="${v}" ${v === area ? 'selected' : ''}>${l}${(cs.charterText || {})[v] && Object.keys(cs.charterText[v]).length ? ' •' : ''}</option>`).join('')}</select>`)}
    <div ${bind('ct', tgt, () => { renderCompPreview(); const r = $('#ctReset'); if (r) r.disabled = false; })}>
      ${F('Text size', I.range('size', st.size || 1, 0.5, 3, 0.05))}
      ${I.check('bold', st.bold !== undefined ? st.bold : !!d.bold, 'Bold')}${I.check('italic', st.italic !== undefined ? st.italic : !!d.italic, 'Italic')}
      ${F('Font', I.select('font', st.font || '', [['', 'Default'], ['company', 'Card font (serif for Classic)'], ['sans', 'Sans serif'], ['serif', 'Serif'], ['mono', 'Typewriter']]))}
      ${F('Text color', I.optColor('color', st.color, '#1d1a16', 'Custom'))}
    </div>
    <div class="help">Applies to this part of every charter. The company name still shrinks to fit; special rules get more room as the text grows (up to about half the card).</div>
    <button class="btn sm" id="ctReset" ${Object.keys(st).length ? '' : 'disabled'}>Reset ${esc((CT_AREAS.find((x) => x[0] === area) || [])[1] || '')} to default</button></div>`;
}
// reuse props binding logic for the left panel
$('#compLeft').addEventListener('input', (e) => {
  const el = e.target; const host = el.closest('[data-bind]'); if (!host) return; const b = BT[host.dataset.bind]; if (!b) return; const tgt = b.get();
  if (el.dataset.optc) { checkpoint('l:' + host.dataset.bind + el.dataset.optc); const ci = el.parentElement.parentElement.querySelector(`[data-f="${el.dataset.optc}"]`); if (el.checked) tgt[el.dataset.optc] = ci.value; else delete tgt[el.dataset.optc]; b.after && b.after(el.dataset.optc); return; }
  const f = el.dataset.f; if (!f) return; const v = parseVal(el); if (v === undefined) return;
  checkpoint('l:' + host.dataset.bind + f); tgt[f] = v; b.after && b.after(f);
});
$('#compLeft').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-segf] button'); if (!btn) return; const seg = btn.parentElement, host = seg.closest('[data-bind]'); const b = host && BT[host.dataset.bind]; if (!b) return;
  let v = btn.dataset.v; if (seg.dataset.t === 'num') v = +v; checkpoint(); b.get()[seg.dataset.segf] = v; $$('button', seg).forEach((x) => x.classList.toggle('on', x === btn)); b.after && b.after(seg.dataset.segf, true);
});
function sampleCompanies() {
  const defs = [['Lakeshore & Western', 'L&W', 'disc'], ['Northern Valley', 'NV', 'ring'], ['Port Lyle Railway', 'PLR', 'band'], ['Kingsport Central', 'KC', 'star']];
  const cities = citySlotsOnMap();
  return defs.map(([n, a, st], i) => { const c = newCompany((P.companies || []).length + i); c.name = n; c.abbr = a; c.logo.style = st; if (cities[i * 2]) c.home = cities[i * 2].ref; return c; });
}

// ---------- preview ----------
function compPreviewSVG(co, forExport = false) {
  const cs = CS(), gap = 8, lab = 4.2;
  const certs = certList(co);
  const nTok = co.kind === 'private' ? 0 : co.kind === 'cube' ? cs.extraTokens : (co.tokens.count || 0) + cs.extraTokens;
  const perRow = Math.max(1, Math.floor((Math.max(cs.charterW, 3 * cs.shareW + 2 * gap) + gap) / (cs.shareW + gap)));
  const W = Math.max(co.kind === 'private' ? 0 : cs.charterW, Math.min(certs.length, perRow) * (cs.shareW + gap) - gap, 120);
  let y = 0, s = '';
  const L = (t) => { s += textEl(0, y + lab * 0.8, t, { fs: lab * 0.8, bold: true, fam: 'sans', fill: forExport ? '#555' : '#b4ae9f' }); y += lab * 1.6; };
  if (co.kind !== 'private') { L(co.kind === 'cube' ? 'COMPANY CARD' : 'CHARTER'); s += `<g transform="translate(0 ${n2(y)})">${charterSVG(co, cs.charterW, cs.charterH)}</g>`; y += cs.charterH + gap * 1.5; }
  if (certs.length) {
    L(co.kind === 'private' ? 'PRIVATE COMPANY CARD' : `SHARE CERTIFICATES (${certs.length})`);
    certs.forEach((ct, i) => { const cx = (i % perRow) * (cs.shareW + gap), cy = y + Math.floor(i / perRow) * (cs.shareH + gap); s += `<g transform="translate(${n2(cx)} ${n2(cy)})">${shareSVG(co, ct, cs.shareW, cs.shareH)}</g>`; });
    y += Math.ceil(certs.length / perRow) * (cs.shareH + gap) + gap * 0.5;
  }
  if (nTok > 0) {
    L(`TOKENS (${nTok}) — ${cs.tokenMM} mm`);
    const d = cs.tokenMM, per = Math.max(1, Math.floor(W / (d + 3)));
    for (let i = 0; i < nTok; i++) s += `<g transform="translate(${n2((i % per) * (d + 3) + d / 2)} ${n2(y + Math.floor(i / per) * (d + 3) + d / 2)})">${tokenSVG(co, d)}</g>`;
    y += Math.ceil(nTok / per) * (d + 3);
  }
  return { s, w: W, h: y };
}
function renderCompPreview() {
  const el = $('#compCanvas'); if (!el) return;
  const co = curCo();
  if (!co) { el.innerHTML = `<div class="compempty"><h2>Companies</h2><p>Add the railroads in your game. Hexcraft designs their token logos, share certificates and charters, and marks their home cities on the map.</p><p>Use <b>+ Add</b> on the left, or add a sample set to see how it works.</p></div>`; $('#compZoomPct').textContent = ''; return; }
  const { s, w, h } = compPreviewSVG(co);
  const k = 3.2 * S.compZoom;
  el.innerHTML = `<svg xmlns="${SVGNS}" width="${n2(w * k)}" height="${n2(h * k)}" viewBox="-2 -2 ${n2(w + 4)} ${n2(h + 4)}" style="display:block">${s}</svg>`;
  $('#compZoomPct').textContent = Math.round(S.compZoom * 100) + '%';
}
$('#compZoomIn').onclick = () => { S.compZoom = Math.min(4, S.compZoom * 1.2); renderCompPreview(); };
$('#compZoomOut').onclick = () => { S.compZoom = Math.max(0.3, S.compZoom / 1.2); renderCompPreview(); };
$('#compZoomFit').onclick = () => { const co = curCo(); if (!co) return; const { w } = compPreviewSVG(co); const avail = $('#compScroll').clientWidth - 60; S.compZoom = clamp(avail / (w * 3.2), 0.3, 4); renderCompPreview(); };

// ---------- right panel ----------
function compPanel() {
  const co = curCo();
  if (!co) return sec('Companies', '<div class="help">Select a company on the left or add a new one.</div>');
  const after = (f, structural) => {
    renderCompPreview(); clearTimeout(compPanel._t); compPanel._t = setTimeout(() => { renderCompLeft(); }, 250);
    if (['color', 'color2', 'textColor', 'abbr', 'home', 'style', 'mode', 'font', 'text', 'ref'].includes(f)) renderAllHexes();
    if (structural || ['kind', 'minorCerts', 'mode'].includes(f)) renderProps();
  };
  const isMaj = co.kind === 'major', isMin = co.kind === 'minor', isCube = co.kind === 'cube', isPriv = co.kind === 'private';
  let h = sec('Company', `<div ${bind('co', curCo, after)}>
    ${F('Name', I.text('name', co.name))}${F('Abbreviation', I.text('abbr', co.abbr, 'e.g. PRR'))}
    ${F('Type', I.seg('kind', co.kind, [['major', '18xx'], ['minor', 'Minor'], ['cube', 'Cube rails'], ['private', 'Private']]))}
    ${F('Main color', I.color('color', co.color))}${F('Accent', I.color('color2', co.color2 || '#ffffff'))}${F('Text color', I.optColor('textColor', co.textColor, Color.contrast(co.color), 'Fixed'))}</div>`);
  const L = co.logo;
  h += sec('Token logo', `<div ${bind('lg', () => curCo().logo, after)}>
    ${F('Logo', I.seg('mode', L.mode, [['auto', 'Generated'], ['upload', 'Your image']]))}
    ${L.mode === 'upload' ? `${F('Image', `<div class="row"><select data-f="ref"><option value="">— choose —</option>${Object.entries(P.assets).map(([id, a]) => `<option value="${id}" ${L.ref === id ? 'selected' : ''}>${esc(a.name || id)}</option>`).join('')}</select><button class="btn sm" data-act="coUpload">Upload</button></div>`)}`
    : `<div class="logostyles">${LOGO_STYLES.map(([st, lbl]) => `<button class="lgs ${L.style === st ? 'on' : ''}" data-act="coStyle" data-st="${st}" title="${lbl}">${miniLogo({ ...co, logo: { ...L, style: st, mode: 'auto' } }, 38)}</button>`).join('')}</div>
      ${F('Font', I.seg('font', L.font || 'sans', [['sans', 'Sans'], ['serif', 'Serif']]))}${F('Logo text', I.text('text', L.text, co.abbr || 'Abbreviation'))}`}
  </div>`);
  if (isPriv) {
    h += sec('Private company', `<div ${bind('co2', curCo, after)}>${F('Cost', I.text('cost', co.cost, '$40'))}${F('Revenue', I.text('revenue', co.revenue, '$10'))}<div class="f full"><label>Special ability</label>${I.area('ability', co.ability, 4)}</div></div>`);
  } else {
    const sh = co.shares;
    let shareBody = '';
    if (isCube) shareBody = F('Shares', I.num('count', sh.count || 5, 1, 30, 1));
    else if (isMaj || (isMin && sh.minorCerts)) shareBody = `${F("President's %", I.select('pres', sh.pres ?? 20, [[20, '20%'], [30, '30%'], [40, '40%'], [50, '50%'], [10, '10%']], 'num'))}${F('Share %', I.select('pct', sh.pct ?? 10, [[10, '10%'], [20, '20%'], [5, '5%'], [25, '25%'], [50, '50%']], 'num'))}${F('Total %', I.num('total', sh.total ?? 100, 10, 200, 5))}${F('Custom list', I.text('custom', sh.custom, 'e.g. 20,10,10,10,10,10,10,10,10'))}`;
    if (isMin) shareBody = I.check('minorCerts', sh.minorCerts, 'Also make share certificates') + shareBody;
    h += sec('Shares', `<div ${bind('sh', () => curCo().shares, after)}>${shareBody}</div><div class="help" style="margin-top:6px"><b>${esc(shareSummary(co))}</b>${isMaj ? '. The president’s certificate shows two logos and a double border, and counts as one certificate.' : ''}</div>`);
    h += sec(isCube ? 'Company card' : 'Charter', `<div ${bind('co3', curCo, after)}>
      ${isCube ? F('Track cubes', I.num('cubes', co.cubes ?? 19, 0, 60, 1)) : F('Train slots', I.num('trains', co.trains ?? 4, 1, 10, 1))}
      ${F('Par value', I.text('par', co.par, 'Optional, e.g. $67'))}
      <div class="f full"><label>Notes / special rules (printed)</label>${I.area('notes', co.notes, 3)}</div></div>
      ${!isCube ? `<div ${bind('tk', () => curCo().tokens, after)}>${F('Station tokens', I.num('count', co.tokens.count ?? 4, 0, 12, 1))}${F('Token costs', I.text('costs', co.tokens.costs, 'Home, $40, $60, $80'))}</div>` : ''}`);
    const homes = citySlotsOnMap(), dests = revenueHexesOnMap();
    h += sec('Home & destination', `<div ${bind('co4', curCo, after)}>
      ${F('Home city', `<select data-f="home"><option value="">— none —</option>${homes.map((o) => `<option value="${o.ref}" ${co.home === o.ref ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`)}
      ${F('Destination', `<select data-f="dest"><option value="">— none —</option>${dests.map((o) => `<option value="${o.ref}" ${co.dest === o.ref ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`)}</div>
      <button class="btn sm" data-act="coPick">Pick home on the map…</button>
      <div class="help">${homes.length ? 'The home logo is printed in that city slot on the map.' : 'Add cities to the map first (Stamp tool → Cities & towns).'}</div>`);
  }
  h += sec('Reuse these stats', `<div class="btngrid"><button class="btn sm pri" data-act="coDup">Duplicate</button><button class="btn sm" data-act="coBulk">Make copies…</button></div>
    <button class="btn sm" data-act="coCopyStats" style="width:100%;margin-top:5px">Copy stats to other ${KIND_LABEL[co.kind].toLowerCase()}s…</button>
    <div class="help">Duplicates keep every stat and get a new color. <kbd>Ctrl D</kbd> duplicates the selected company.</div>`);
  h += sec('Actions', `<div class="btngrid"><button class="btn sm" data-act="coUp">Move up</button><button class="btn sm" data-act="coDown">Move down</button><button class="btn sm danger" data-act="coDel">Delete company</button></div>`);
  return h;
}
handlers.coStyle = (d) => { checkpoint(); curCo().logo.style = d.st; curCo().logo.mode = 'auto'; renderCompAll(); renderAllHexes(); };
handlers.coUpload = () => pickFiles('image/*,.svg', false, async (files) => { const ids = await addAssets(files, 'icon'); if (ids.length) { checkpoint(); curCo().logo.ref = ids[0]; curCo().logo.mode = 'upload'; renderCompAll(); renderAllHexes(); } });
handlers.coPick = () => { S.pickHome = S.compSel; setView('map'); setTool('select'); toast(`Click a city on the map to set ${curCo().abbr || curCo().name}'s home. Esc cancels.`); $('#main').classList.add('picking'); };
handlers.coUp = () => { const l = P.companies, i = l.findIndex((c) => c.id === S.compSel); if (i > 0) { checkpoint(); [l[i - 1], l[i]] = [l[i], l[i - 1]]; renderCompLeft(); } };
handlers.coDown = () => { const l = P.companies, i = l.findIndex((c) => c.id === S.compSel); if (i < l.length - 1) { checkpoint(); [l[i + 1], l[i]] = [l[i], l[i + 1]]; renderCompLeft(); } };
function nextCompanyColor() {
  const used = new Set((P.companies || []).map((c) => (c.color || '').toLowerCase()));
  const free = COMP_COLORS.find((c) => !used.has(c.toLowerCase()));
  if (free) return free;
  const h = Math.floor(Math.random() * 360) / 360, f = (n) => { const k = (n + h * 12) % 12, a = 0.55 * Math.min(0.42, 1 - 0.42); return Math.round(255 * (0.42 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return Color.hex(f(0), f(8), f(4));
}
function uniqueAbbr(base) { const taken = new Set((P.companies || []).map((c) => c.abbr)); let a = base || 'CO', n = 2; while (taken.has(a)) a = (base || 'CO').replace(/\d+$/, '') + n++; return a; }
function cloneCompany(src, name, abbr) {
  const c = clone(src); c.id = uid('c'); c.home = ''; c.dest = '';
  c.color = nextCompanyColor(); c.name = name || src.name + ' copy'; c.abbr = uniqueAbbr(abbr || src.abbr);
  if (c.logo && c.logo.text && !abbr) c.logo.text = '';
  if (c.logo && c.logo.mode === 'upload') { /* keep uploaded art reference */ }
  return c;
}
function duplicateCompany(id) {
  const src = P.companies.find((c) => c.id === id); if (!src) return;
  checkpoint(); const c = cloneCompany(src); const i = P.companies.indexOf(src); P.companies.splice(i + 1, 0, c); S.compSel = c.id; renderCompAll();
  toast(`Duplicated ${src.abbr || src.name} — rename it and pick a home city`);
  setTimeout(() => { const n = $('#props [data-f="name"]'); n && (n.focus(), n.select()); }, 40);
}
function bulkCopyDialog() {
  const src = curCo(); if (!src) return;
  openModal('Make copies of ' + (src.abbr || src.name), `<p class="help" style="font-size:13px">New companies copy every stat from <b>${esc(src.name)}</b> — type, shares, tokens and costs, charter settings, logo style — and each gets its own color. Homes are left empty.</p>
    <div class="f full"><label>One company per line: <code>Name | ABBR</code> (abbreviation optional)</label><textarea id="bulkNames" rows="7" spellcheck="false" placeholder="Pennsylvania Railroad | PRR&#10;New York Central | NYC&#10;Baltimore & Ohio | B&O"></textarea></div>
    <div class="f"><label>Or just make</label><div class="row"><input type="number" id="bulkN" min="1" max="30" value="3" style="width:80px"><span class="help" style="margin:0">numbered copies (when the list is empty)</span></div></div>`,
    [{ label: 'Cancel', onClick: closeModal }, { label: 'Create', cls: 'pri', onClick: () => {
      const lines = $('#bulkNames').value.split('\n').map((l) => l.trim()).filter(Boolean);
      const specs = lines.length ? lines.map((l) => { const [n, a] = l.split('|').map((x) => x.trim()); return [n, a || n.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 4)]; })
        : Array.from({ length: clamp(+$('#bulkN').value || 1, 1, 30) }, (_, i) => [`${src.name} ${i + 2}`, (src.abbr || 'CO') + (i + 2)]);
      closeModal(); checkpoint();
      const i = P.companies.indexOf(src); const made = [];
      specs.forEach(([n, a], j) => { const c = cloneCompany(src, n, a); P.companies.splice(i + 1 + j, 0, c); made.push(c); });
      S.compSel = made[0].id; renderCompAll(); toast(`Created ${made.length} compan${made.length > 1 ? 'ies' : 'y'} from ${src.abbr || src.name}`);
    } }]);
  setTimeout(() => $('#bulkNames') && $('#bulkNames').focus(), 30);
}
function copyStatsDialog() {
  const src = curCo(); if (!src) return;
  const others = P.companies.filter((c) => c.id !== src.id && c.kind === src.kind);
  if (!others.length) { toast(`No other ${KIND_LABEL[src.kind].toLowerCase()}s to copy to.`, true); return; }
  openModal('Copy stats from ' + (src.abbr || src.name), `<p class="help" style="font-size:13px">Copy settings from <b>${esc(src.name)}</b> to the other ${others.length} ${KIND_LABEL[src.kind].toLowerCase()}${others.length > 1 ? 's' : ''}. Names, colors, logos' text and homes stay as they are.</p>
    <label class="chk"><input type="checkbox" id="cpShares" checked>Share structure</label>
    ${src.kind !== 'cube' && src.kind !== 'private' ? '<label class="chk"><input type="checkbox" id="cpTokens" checked>Station tokens & costs</label>' : ''}
    ${src.kind !== 'private' ? '<label class="chk"><input type="checkbox" id="cpCharter" checked>Charter settings (train slots / track cubes, par value)</label>' : '<label class="chk"><input type="checkbox" id="cpPriv">Cost & revenue</label>'}
    <label class="chk"><input type="checkbox" id="cpLogo">Logo style, font & accent color</label>
    <label class="chk"><input type="checkbox" id="cpNotes">Notes / special rules</label>
    <div class="help">Applies to: ${others.map((c) => esc(c.abbr || c.name)).join(', ')}</div>`,
    [{ label: 'Cancel', onClick: closeModal }, { label: 'Copy stats', cls: 'pri', onClick: () => {
      const on = (id) => $('#' + id) && $('#' + id).checked;
      const o = { sh: on('cpShares'), tk: on('cpTokens'), ch: on('cpCharter'), lg: on('cpLogo'), nt: on('cpNotes'), pv: on('cpPriv') };
      closeModal(); checkpoint();
      others.forEach((c) => {
        if (o.sh) c.shares = clone(src.shares);
        if (o.tk) c.tokens = clone(src.tokens);
        if (o.ch) { c.trains = src.trains; c.cubes = src.cubes; c.par = src.par; }
        if (o.lg) { c.logo.style = src.logo.style; c.logo.font = src.logo.font; c.logo.mode = src.logo.mode === 'upload' ? c.logo.mode : src.logo.mode; c.color2 = src.color2; }
        if (o.nt) c.notes = src.notes;
        if (o.pv) { c.cost = src.cost; c.revenue = src.revenue; }
      });
      renderCompAll(); renderAllHexes(); toast(`Copied stats to ${others.length} compan${others.length > 1 ? 'ies' : 'y'}`);
    } }]);
}
handlers.coDup = () => duplicateCompany(S.compSel);
handlers.coBulk = () => bulkCopyDialog();
handlers.coCopyStats = () => copyStatsDialog();
handlers.coDel = () => confirmBox('Delete company', `Delete ${esc(curCo().name)}? Its home marker is removed from the map.`, 'Delete', () => { checkpoint(); P.companies = P.companies.filter((c) => c.id !== S.compSel); S.compSel = P.companies[0] ? P.companies[0].id : null; renderCompAll(); renderAllHexes(); });

const _rpBase = renderProps;
renderProps = function () {
  if (S.view2 === 'comp') { const keep = BT.cs, keepCt = BT.ct; BT = {}; if (keep) BT.cs = keep; if (keepCt) BT.ct = keepCt; try { propsEl.innerHTML = compPanel(); } catch (e) { console.error(e); propsEl.innerHTML = `<div class="sec">Panel error: ${esc(e.message)}</div>`; } wireProps(); tipProps(); tipComp(); return; }
  _rpBase();
};
function tipComp() {
  const T = { 'Text area': 'Which part of the charter to format: the name, the type line, the home/shares row, section headings, token costs, special rules or the turn order.',
    'Text size': 'Size of this text area, from half to three times the normal size.', 'Font': 'Typeface for this text area. Default keeps the card’s own choice.', 'Text color': 'Color for this text area. Untick for the default.',
    'Abbreviation': 'Short name used on tokens and cards, e.g. PRR.', 'Type': '18xx majors get charters with station tokens; minors use their charter as the certificate; cube rails get a company card with track cubes; privates get a single card.',
    'Main color': 'Company color for tokens, card stripes and charter header.', 'Accent': 'Second color used by some logo styles (ring, band, split, stripe, star, diamond).', 'Text color': 'Force the logo text color instead of choosing black or white automatically.',
    'Logo': 'Generate a token logo from the abbreviation, or use your own picture (cropped to a circle).', 'Logo text': 'Text on the token. Defaults to the abbreviation.',
    "President's %": "Size of the president's certificate. Some games use 30% or 40%.", 'Share %': 'Size of each regular certificate.', 'Total %': 'Total of all certificates, normally 100%.',
    'Custom list': 'Override with an exact list of certificate sizes, first one is the president’s.', 'Shares': 'Number of share cards to make.', 'Track cubes': 'Number of cubes shown on the company card.',
    'Train slots': 'Spaces for train cards on the charter.', 'Par value': 'Optional par value printed on the charter.', 'Station tokens': 'Station token spaces on the charter, including the home token.',
    'Token costs': 'Label under each token space, comma separated. The first is usually “Home”.', 'Home city': 'City slot where this company starts. Its logo is printed there on the map.', 'Destination': 'Optional destination hex printed on the charter.',
    'Cost': 'Purchase price of the private company.', 'Revenue': 'Income paid each operating round.', 'Look': 'Classic: cream paper, serif type and engraved lines. Modern: clean white cards with sans-serif type.',
    'Game title': 'Printed in small type on every card.', 'Share card': 'Size of share certificates.', 'Charter': 'Size of charters / company cards.', 'Token disc': 'Diameter of the wooden discs the token stickers go on.', 'Extra tokens': 'Additional tokens per company for stock market and par markers.' };
  $$('#props .f > label, #compLeft .f > label').forEach((lab) => { const k = lab.textContent.trim(); if (T[k]) lab.parentElement.dataset.tip = T[k]; });
}

// ---------- pick home on the map ----------
stage.addEventListener('pointerdown', (e) => {
  if (!S.pickHome) return;
  e.stopImmediatePropagation(); e.preventDefault();
  const [wx, wy] = toWorld(e); const [c, r] = hexAt(wx, wy); const k = key(c, r); const h = P.hexes[k];
  let best = null, bd = Infinity;
  (h && h.items || []).forEach((it, i) => { if (it.t !== 'city') return; const [px, py] = itemPos(c, r, it); citySlotPositions(it).forEach((p, sl) => { const d = Math.hypot(px + p[0] - wx, py + p[1] - wy); if (d < bd) { bd = d; best = `${k}|${i}|${sl}`; } }); });
  if (!best) { toast('That hex has no city. Click a hex with a city (or press Esc).', true); return; }
  const co = P.companies.find((x) => x.id === S.pickHome); checkpoint(); co.home = best; S.pickHome = null; $('#main').classList.remove('picking');
  renderAllHexes(); toast(`${co.abbr || co.name} home set to ${homeLabel(best)}`); setTimeout(() => setView('comp'), 350);
}, true);
window.addEventListener('keydown', (e) => {
  if (S.view2 === 'comp' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && !isTyping()) { e.preventDefault(); e.stopImmediatePropagation(); if (curCo()) duplicateCompany(curCo().id); }
}, true);
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.pickHome) { S.pickHome = null; $('#main').classList.remove('picking'); toast('Home pick cancelled'); setView('comp'); } }, true);

// ---------- export / print ----------
const CEX = { scope: 'all', charters: true, certs: true, tokens: true, paper: 'letter', margin: 10, fmt: 'pdf' };
function compExportDialog() {
  closeMenus();
  const list = P.companies || [];
  if (!list.length) { toast('Add a company first.', true); return; }
  const body = () => `<div class="tabs" id="cexFmt">${[['pdf', 'PDF print sheets'], ['svg', 'SVG (selected)'], ['png', 'PNG (selected)']].map(([v, l]) => `<button data-v="${v}" class="${CEX.fmt === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${CEX.fmt === 'pdf' ? `<div class="f"><label>Companies</label><div class="seg" id="cexScope"><button data-v="all" class="${CEX.scope === 'all' ? 'on' : ''}">All (${list.length})</button><button data-v="sel" class="${CEX.scope === 'sel' ? 'on' : ''}">Selected only</button></div></div>
      <label class="chk"><input type="checkbox" id="cexCh" ${CEX.charters ? 'checked' : ''}>Charters / company cards</label>
      <label class="chk"><input type="checkbox" id="cexCe" ${CEX.certs ? 'checked' : ''}>Share certificates & private cards</label>
      <label class="chk"><input type="checkbox" id="cexTo" ${CEX.tokens ? 'checked' : ''}>Token stickers</label>
      <div class="btngrid"><div class="f full"><label>Paper</label><select id="cexPaper">${Object.entries(PAPERS).map(([k, v]) => `<option value="${k}" ${CEX.paper === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div><div class="f full"><label>Margin (mm)</label><input type="number" id="cexMargin" min="3" value="${CEX.margin}"></div></div>
      <div class="help">Cards print at their real size with thin cut lines. Each section starts on a new page.</div>` : `<div class="help">Exports the selected company's components as one image sheet.</div>`}`;
  const wire = () => {
    $$('#cexFmt button').forEach((b) => (b.onclick = () => { CEX.fmt = b.dataset.v; refresh(); }));
    $$('#cexScope button').forEach((b) => (b.onclick = () => { CEX.scope = b.dataset.v; refresh(); }));
    const ck = (id, k) => { const el = $('#' + id); if (el) el.onchange = () => (CEX[k] = el.checked); };
    ck('cexCh', 'charters'); ck('cexCe', 'certs'); ck('cexTo', 'tokens');
    const p = $('#cexPaper'); if (p) p.onchange = () => (CEX.paper = p.value);
    const m = $('#cexMargin'); if (m) m.onchange = () => (CEX.margin = Math.max(3, +m.value || 10));
  };
  const refresh = () => { $('#modalBody').innerHTML = body(); wire(); };
  openModal('Print & export components', body(), [{ label: 'Cancel', onClick: closeModal }, { label: 'Export', cls: 'pri', onClick: () => { closeModal(); runCompExport(); } }]);
  wire();
}
function shelfPack(items, aw, ah, gap) {
  const pages = []; let page = [], x = 0, y = 0, rowH = 0;
  items.forEach((it) => {
    let w = it.w, h = it.h, k = 1;
    if (w > aw || h > ah) { k = Math.min(aw / w, ah / h); w *= k; h *= k; }
    if (x > 0 && x + w > aw + 0.01) { x = 0; y += rowH + gap; rowH = 0; }
    if (y > 0 && y + h > ah + 0.01) { pages.push(page); page = []; x = 0; y = 0; rowH = 0; }
    page.push({ ...it, x, y, k }); x += w + gap; rowH = Math.max(rowH, h);
  });
  if (page.length) pages.push(page);
  return pages;
}
async function runCompExport() {
  const base = slug(P.name) + '-companies';
  try {
    if (CEX.fmt !== 'pdf') {
      const co = curCo() || P.companies[0]; const { s, w, h } = compPreviewSVG(co, true);
      const svg = `<svg xmlns="${SVGNS}" xmlns:xlink="http://www.w3.org/1999/xlink" width="${n2(w + 8)}mm" height="${n2(h + 8)}mm" viewBox="-4 -4 ${n2(w + 8)} ${n2(h + 8)}"><rect x="-4" y="-4" width="${n2(w + 8)}" height="${n2(h + 8)}" fill="#ffffff"/>${s}</svg>`;
      if (CEX.fmt === 'svg') { await saveBlob(slug(co.abbr || co.name) + '-components.svg', svg, 'image/svg+xml'); return; }
      busy(true, 'Rendering PNG…'); const k = 11.81; const W = Math.round((w + 8) * k), H = Math.round((h + 8) * k);
      const cv = await svgToCanvas(svg.replace(/width="[^"]+mm" height="[^"]+mm"/, `width="${W}" height="${H}"`), W, H); const blob = await canvasToBlob(cv); busy(false);
      await saveBlob(slug(co.abbr || co.name) + '-components.png', blob, 'image/png'); return;
    }
    busy(true, 'Building print sheets…');
    const cs = CS(), list = CEX.scope === 'sel' && curCo() ? [curCo()] : P.companies;
    const [, pw0, ph0] = PAPERS[CEX.paper]; const m = CEX.margin;
    const sections = [];
    if (CEX.charters) sections.push({ gap: 4, items: list.filter((c) => c.kind !== 'private').map((co) => ({ w: cs.charterW, h: cs.charterH, svg: charterSVG(co, cs.charterW, cs.charterH, { pdf: true }), cut: true })) });
    if (CEX.certs) sections.push({ gap: 0, items: list.flatMap((co) => certList(co).map((ct) => ({ w: cs.shareW, h: cs.shareH, svg: shareSVG(co, ct, cs.shareW, cs.shareH, { pdf: true }), cut: true }))) });
    if (CEX.tokens) sections.push({ gap: 2.5, items: list.flatMap((co) => { const n = co.kind === 'private' ? 0 : co.kind === 'cube' ? cs.extraTokens : (co.tokens.count || 0) + cs.extraTokens; return Array.from({ length: n }, () => ({ w: cs.tokenMM, h: cs.tokenMM, svg: `<g transform="translate(${cs.tokenMM / 2} ${cs.tokenMM / 2})">${tokenSVG(co, cs.tokenMM, { pdf: true })}</g>` })); }) });
    // choose orientation per section that fits more
    const { jsPDF } = window.jspdf; const PT = 72 / 25.4; let doc = null; let pageCount = 0;
    for (const sec2 of sections) {
      if (!sec2.items.length) continue;
      const tryO = [[pw0, ph0], [ph0, pw0]].map(([pw, ph]) => ({ pw, ph, pages: shelfPack(sec2.items, pw - 2 * m, ph - 2 * m, sec2.gap) }));
      const best = tryO[0].pages.length <= tryO[1].pages.length ? tryO[0] : tryO[1];
      for (const pg of best.pages) {
        const fmt = [best.pw * PT, best.ph * PT], ori = best.pw > best.ph ? 'l' : 'p';
        if (!doc) doc = new jsPDF({ unit: 'pt', format: fmt, orientation: ori, compress: true }); else doc.addPage(fmt, ori);
        pageCount++; busy(true, `Building print sheets… page ${pageCount}`);
        let inner = '';
        pg.forEach((it) => {
          inner += `<g transform="translate(${n2(m + it.x)} ${n2(m + it.y)}) scale(${n2(it.k)})">${it.svg}</g>`;
          if (it.cut) inner += `<rect x="${n2(m + it.x)}" y="${n2(m + it.y)}" width="${n2(it.w * it.k)}" height="${n2(it.h * it.k)}" fill="none" stroke="#9a9a9a" stroke-width="0.15"/>`;
        });
        const svg = `<svg xmlns="${SVGNS}" xmlns:xlink="http://www.w3.org/1999/xlink" width="${n2(fmt[0])}" height="${n2(fmt[1])}" viewBox="0 0 ${best.pw} ${best.ph}">${inner}</svg>`;
        await svgIntoPdf(doc, svg, 0, 0, fmt[0], fmt[1]);
      }
    }
    busy(false);
    if (!doc) { toast('Nothing to export — choose at least one component type.', true); return; }
    await saveBlob(base + '.pdf', doc.output('blob'), 'application/pdf');
  } catch (e) { console.error(e); busy(false); toast('Export failed: ' + (e.message || e), true); }
}
