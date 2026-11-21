// =====================================================================
//  Files, uploads, saving (cloud library + browser), export, presets
// =====================================================================

// ---------------- Downloads ----------------
let _dl = null;
function dlCap() {
  if (_dl === null) _dl = window.claude && typeof window.claude.use === 'function' ? Promise.resolve(window.claude.use('downloads')).catch(() => null) : Promise.resolve(null);
  return _dl;
}
async function saveBlob(filename, data, mime) {
  const dl = await Promise.race([dlCap(), new Promise((r) => setTimeout(() => r(undefined), 1500))]);
  if (dl) {
    try { await dl.save({ filename, data }); toast('Saved ' + filename); return true; }
    catch (e) {
      if (e && e.code === 'declined') { toast('Download cancelled'); return false; }
      if (e && e.code === 'rate_limited') { toast('A download prompt is already open — finish that one first.', true); return false; }
      if (e && e.code === 'too_large') { toast('That file is too large to download here. Try a smaller scale.', true); return false; }
      console.warn('downloads.save failed, falling back', e);
    }
  }
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000); toast('Downloaded ' + filename);
  return true;
}
const slug = (s) => (String(s || 'map').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'map');

// ---------------- File picking & uploads ----------------
function pickFiles(accept, multiple, cb) {
  const fi = $('#fileInput'); fi.accept = accept; fi.multiple = !!multiple; fi.value = '';
  fi.onchange = () => { const f = [...fi.files]; if (f.length) cb(f); };
  fi.click();
}
const readDataURL = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
const readText = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); });
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not read image')); i.src = src; });
function rasterize(img, maxSide, type = 'image/png', q = 0.9) {
  let w = img.naturalWidth || img.width || maxSide, h = img.naturalHeight || img.height || maxSide;
  const k = Math.min(1, maxSide / Math.max(w, h)); if (img.src.startsWith('data:image/svg')) { const k2 = maxSide / Math.max(w, h); w *= k2; h *= k2; } else { w *= k; h *= k; }
  const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w)); cv.height = Math.max(1, Math.round(h));
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  return { data: cv.toDataURL(type, q), w: cv.width, h: cv.height };
}
async function addAssets(files, kind = 'icon') {
  const ids = [];
  busy(true, 'Reading images…');
  try {
    for (const f of files) {
      if (!/^image\//.test(f.type) && !/\.(svg|png|jpe?g|gif|webp)$/i.test(f.name)) continue;
      let data = await readDataURL(f);
      if (/\.svg$/i.test(f.name) && !data.startsWith('data:image/svg')) data = 'data:image/svg+xml;base64,' + data.split(',')[1];
      const img = await loadImg(data);
      const isSvg = data.startsWith('data:image/svg');
      const maxSide = kind === 'bg' ? 4096 : 1024;
      const a = { name: f.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'icon', kind, w: img.naturalWidth || 512, h: img.naturalHeight || 512, data };
      if (isSvg) { const r = rasterize(img, kind === 'bg' ? 3000 : 512); a.png = r.data; if (!img.naturalWidth) { a.w = r.w; a.h = r.h; } }
      else if (Math.max(a.w, a.h) > maxSide || f.size > (kind === 'bg' ? 6e6 : 1.5e6)) { const jpg = /jpe?g/i.test(f.type); const r = rasterize(img, maxSide, jpg ? 'image/jpeg' : 'image/png', 0.88); a.data = r.data; a.w = r.w; a.h = r.h; }
      // unique name
      let nm = a.name, n = 2; while (Object.values(P.assets).some((x) => x.name === nm)) nm = a.name + '-' + n++; a.name = nm;
      const id = uid('a'); P.assets[id] = a; ids.push(id);
    }
  } catch (e) { toast('Could not read that image: ' + e.message, true); }
  busy(false);
  if (ids.length) { markDirty(); renderLeft(); }
  return ids;
}
function uploadIconsDialog() {
  pickFiles('image/*,.svg', true, async (files) => {
    const ids = await addAssets(files, 'icon');
    if (ids.length) { S.stamp = { kind: 'asset', ref: ids[0] }; S.tool = 'stamp'; renderLeft(); renderProps(); toast(`Added ${ids.length} icon${ids.length > 1 ? 's' : ''} — find them under Stamps › Your uploads`); }
  });
}
async function uploadBackground(file) {
  const ids = await addAssets([file], 'bg'); if (!ids.length) return;
  checkpoint();
  const old = P.bgImage && P.bgImage.ref; if (old && P.assets[old] && P.assets[old].kind === 'bg') delete P.assets[old];
  const a = P.assets[ids[0]], gb = hexBoundsExisting(), asp = a.w / a.h;
  let w = gb.w, h = gb.w / asp; if (h < gb.h) { h = gb.h; w = gb.h * asp; }
  P.bgImage = { ref: ids[0], x: gb.x + (gb.w - w) / 2, y: gb.y + (gb.h - h) / 2, w, h, opacity: 1, show: true, exp: true };
  renderBgImage(); schedulePaper(); renderProps(); renderLeft();
  toast('Background added. Lower hex opacity or set hex color to transparent to see it through the grid.');
}
function insertImageObject() {
  pickFiles('image/*,.svg', false, async (files) => {
    const ids = await addAssets(files, 'icon'); if (!ids.length) return;
    checkpoint(); const [x, y] = viewCenterWorld(); const a = P.assets[ids[0]]; const w = Math.min(400, a.w);
    const o = { id: uid('o'), t: 'img', ref: ids[0], w, h: w * a.h / a.w, x: x - w / 2, y: y - (w * a.h / a.w) / 2 };
    P.objects.push(o); renderObject(o.id); select({ kind: 'obj', id: o.id }); setTool('select'); schedulePaper();
  });
}
function deleteAsset(ref) {
  delete P.assets[ref];
  for (const k in P.hexes) { const h = P.hexes[k]; if (h.img && h.img.ref === ref) delete h.img; if (h.items.some((i) => i.t === 'img' && i.ref === ref)) { for (let i = h.items.length - 1; i >= 0; i--) if (h.items[i].t === 'img' && h.items[i].ref === ref) removeItem(k, i); } cleanHex(k); }
  (P.types || []).forEach((t) => { t.items = t.items.filter((i) => !(i.t === 'img' && i.ref === ref)); if (t.img && t.img.ref === ref) delete t.img; });
  P.objects = P.objects.filter((o) => !(o.t === 'img' && o.ref === ref));
  if (P.bgImage && P.bgImage.ref === ref) P.bgImage = null;
  if (S.stamp.kind === 'asset' && S.stamp.ref === ref) S.stamp = { kind: 'icon', icon: 'mountain' };
  renderAll(); renderLeft(); renderProps();
}

// ---------------- Browser storage (IndexedDB) ----------------
const IDB = {
  _db: null,
  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((res, rej) => {
      try {
        const rq = indexedDB.open('hexwright', 1);
        rq.onupgradeneeded = () => { const d = rq.result; if (!d.objectStoreNames.contains('projects')) d.createObjectStore('projects'); if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv'); };
        rq.onsuccess = () => { this._db = rq.result; res(this._db); }; rq.onerror = () => rej(rq.error);
      } catch (e) { rej(e); }
    });
  },
  async tx(store, mode, fn) { const d = await this.open(); return new Promise((res, rej) => { const t = d.transaction(store, mode); const st = t.objectStore(store); const r = fn(st); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); },
  get(store, k) { return this.tx(store, 'readonly', (s) => s.get(k)); },
  put(store, k, v) { return this.tx(store, 'readwrite', (s) => s.put(v, k)); },
  del(store, k) { return this.tx(store, 'readwrite', (s) => s.delete(k)); },
  async all(store) { const d = await this.open(); return new Promise((res, rej) => { const out = []; const t = d.transaction(store, 'readonly'); const rq = t.objectStore(store).openCursor(); rq.onsuccess = () => { const c = rq.result; if (c) { out.push(c.value); c.continue(); } }; t.oncomplete = () => res(out); t.onerror = () => rej(t.error); }); },
};

// ---------------- Cloud library (per-person, private) ----------------
const Cloud = {
  ready: false, db: null, uid: null,
  async init() {
    try {
      if (!window.claude || typeof window.claude.use !== 'function') return;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return;
      const id = await user.id(); if (!id) return;
      this.db = db; this.uid = id; this.ready = true; updateSaveState();
    } catch (e) { console.warn('cloud init', e); }
  },
  col() { return this.db.collection('data/users/' + this.uid); },
  async retry(fn) { try { return await fn(); } catch (e) { if (e && e.code === 'unavailable') { await new Promise((r) => setTimeout(r, 400 + Math.random() * 600)); return fn(); } throw e; } },
  async list() { const snap = await this.retry(() => this.col().where('kind', '==', 'meta').get()); return snap.docs.map((d) => ({ id: d.id.slice(2), ...d.data() })); },
  async save(pid, name, json, thumb) {
    const CH = 150000, n = Math.max(1, Math.ceil(json.length / CH)); const col = this.col();
    let oldN = 0; try { const m = await col.doc('m_' + pid).get(); if (m.exists) oldN = m.data().chunks || 0; } catch (e) {}
    for (let i = 0; i < n; i++) { const part = json.slice(i * CH, (i + 1) * CH); await this.retry(() => col.doc(`c_${pid}_${i}`).set({ kind: 'chunk', pid, i, s: part })); }
    await this.retry(() => col.doc('m_' + pid).set({ kind: 'meta', name, updated: Date.now(), chunks: n, size: json.length, thumb: thumb && thumb.length < 60000 ? thumb : '' }));
    for (let i = n; i < oldN; i++) { try { await col.doc(`c_${pid}_${i}`).delete(); } catch (e) {} }
  },
  async load(pid) {
    const col = this.col(); const m = await this.retry(() => col.doc('m_' + pid).get()); if (!m.exists) throw new Error('Map not found');
    const n = m.data().chunks; const parts = [];
    for (let i = 0; i < n; i++) { const d = await this.retry(() => col.doc(`c_${pid}_${i}`).get()); if (!d.exists) throw new Error('Part of this map is missing'); parts.push(d.data().s); }
    return parts.join('');
  },
  async remove(pid) { const col = this.col(); const m = await col.doc('m_' + pid).get(); const n = m.exists ? m.data().chunks || 0 : 0; await col.doc('m_' + pid).delete(); for (let i = 0; i < n; i++) { try { await col.doc(`c_${pid}_${i}`).delete(); } catch (e) {} } },
};

// ---------------- Save / autosave ----------------
S.cloudLinked = false; S.lastSaved = 0; S.saving = false;
let _autoT = 0, _cloudT = 0;
function fullJSON() { return JSON.stringify(P); }
function scheduleAutosave() {
  clearTimeout(_autoT); _autoT = setTimeout(autosaveLocal, 1200);
  if (S.cloudLinked && Cloud.ready) { clearTimeout(_cloudT); _cloudT = setTimeout(() => doSave({ silent: true }), 8000); }
}
async function autosaveLocal() {
  try {
    const json = fullJSON();
    await IDB.put('kv', 'current', { json, cloud: S.cloudLinked });
    const prev = await IDB.get('projects', P.id).catch(() => null);
    await IDB.put('projects', P.id, { id: P.id, name: P.name, updated: Date.now(), size: json.length, thumb: prev && prev.thumb || '', json });
    S.localSaved = Date.now(); updateSaveState();
  } catch (e) { console.warn('autosave failed', e); }
}
function updateSaveState() {
  const el = $('#saveState'); if (!el) return;
  const t = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (S.saving) { el.textContent = 'Saving…'; el.className = ''; return; }
  if (S.dirty && S.cloudLinked) { el.textContent = 'Unsaved changes'; el.className = 'dirty'; return; }
  if (S.cloudLinked && S.lastSaved) { el.textContent = 'Saved to your library · ' + t(S.lastSaved); el.className = ''; return; }
  if (S.localSaved) { el.textContent = 'Autosaved in this browser · ' + t(S.localSaved); el.className = ''; return; }
  el.textContent = Cloud.ready ? 'Not saved to your library' : 'Not saved yet'; el.className = '';
}
async function makeThumb() {
  try {
    const b = contentBounds(true); const W = 280, H = Math.max(1, Math.round(W * b.h / b.w));
    const svg = buildExportSVG({ bg: true, pxW: W, pxH: Math.min(H, 400) , bounds: b });
    const cv = await svgToCanvas(svg, W, Math.min(H, 400)); return cv.toDataURL('image/jpeg', 0.72);
  } catch (e) { return ''; }
}
async function doSave(opts = {}) {
  if (S.saving) return;
  S.saving = true; updateSaveState();
  try {
    const json = fullJSON(); const thumb = await makeThumb();
    await IDB.put('projects', P.id, { id: P.id, name: P.name, updated: Date.now(), size: json.length, thumb, json }).catch(() => {});
    await IDB.put('kv', 'current', { json, cloud: true }).catch(() => {});
    if (Cloud.ready) {
      await Cloud.save(P.id, P.name, json, thumb);
      S.cloudLinked = true; S.lastSaved = Date.now(); S.dirty = false;
      if (!opts.silent) toast('Saved “' + P.name + '” to your library');
    } else {
      S.localSaved = Date.now(); S.dirty = false;
      if (!opts.silent) toast('Saved in this browser. Use File › Download project file to keep a copy anywhere.');
    }
  } catch (e) {
    console.error(e);
    toast(e && e.code === 'quota_exceeded' ? 'Your library is full — delete some maps or download this one as a file.' : 'Could not save to your library (' + (e.message || e.code || e) + '). Your work is still kept in this browser.', true);
  }
  S.saving = false; updateSaveState();
}
function migrate(obj) {
  const d = defaultProject();
  const p = Object.assign(d, obj);
  p.grid = Object.assign(defaultProject().grid, obj.grid || {});
  p.style = Object.assign(defaultProject().style, obj.style || {});
  p.hexes = p.hexes || {}; for (const k in p.hexes) { const h = p.hexes[k]; h.items = h.items || []; h.track = h.track || []; }
  p.voids = p.voids || {}; p.edges = p.edges || {}; p.objects = p.objects || []; p.assets = p.assets || {}; p.types = p.types || []; p.palette = p.palette && p.palette.length ? p.palette : [...DEFAULT_PALETTE];
  p.companies = (p.companies || []).map((c) => { const d = newCompanyShape(); return Object.assign(d, c, { logo: Object.assign(d.logo, c.logo || {}), shares: Object.assign(d.shares, c.shares || {}), tokens: Object.assign(d.tokens, c.tokens || {}) }); });
  p.compStyle = Object.assign(defaultCompStyle(), p.compStyle || {});
  return p;
}
function newCompanyShape() { const keep = P; try { P = P || { companies: [] }; return newCompany(0); } finally { P = keep; } }
function loadProject(json, opts = {}) {
  let obj; try { obj = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { toast('That file is not a valid map project.', true); return false; }
  if (typeof isMakerGame === 'function' && isMakerGame(obj)) {
    try { obj = importMaker(obj); } catch (e) { console.error(e); toast('Could not import that 18xx Maker file: ' + e.message, true); return false; }
    opts = { ...opts, quiet: true }; setTimeout(() => toast(`Imported “${obj.name}” from 18xx Maker — ${Object.keys(obj.hexes).length} hexes, ${obj.companies.length} companies`), 50);
  }
  if (!obj || typeof obj !== 'object' || !obj.grid) { toast('That file is not a Hexcraft map project or 18xx Maker game.', true); return false; }
  P = migrate(obj); _relKey = '';
  S.undo = []; S.redo = []; S.sel = null; S.dirty = false; S.bgAdjust = false; S.compSel = (P.companies[0] || {}).id || null;
  S.cloudLinked = !!opts.cloud; S.lastSaved = opts.cloud ? Date.now() : 0;
  renderAll(); renderLeft(); renderProps(); updateUndoBtns(); updateSaveState();
  if (S.view2 === 'comp') renderCompAll();
  setTimeout(fitView, 20);
  if (!opts.quiet) toast('Opened “' + P.name + '”');
  autosaveLocal();
  return true;
}

// ---------------- Open dialog ----------------
async function openDialog() {
  closeMenus();
  const fmt = (ms) => ms ? new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  const size = (n) => n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1000)) + ' KB';
  const item = (p, src) => `<div class="pitem"><div style="width:64px;height:44px;flex:none;border-radius:5px;background:#0003 ${p.thumb ? `url(${p.thumb}) center/cover` : ''}"></div>
    <div class="nm"><b>${esc(p.name || 'Untitled')}</b><small>${fmt(p.updated)} · ${size(p.size || 0)}${p.id === P.id ? ' · open now' : ''}</small></div>
    <button class="btn sm pri" data-open="${src}:${p.id}">Open</button><button class="btn sm danger" data-del="${src}:${p.id}">Delete</button></div>`;
  openModal('Your maps', `<div class="tabs"><button class="on" data-tab="cloud">Your library</button><button data-tab="local">This browser</button></div><div id="plist" class="plist"><div class="empty">Loading…</div></div>`,
    [{ label: 'Open project file…', onClick: () => { closeModal(); openFileFlow(); } }, { label: 'Close', onClick: closeModal }]);
  let tab = Cloud.ready ? 'cloud' : 'local';
  const show = async () => {
    $$('#modalBody [data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    const pl = $('#plist'); pl.innerHTML = '<div class="empty">Loading…</div>';
    try {
      if (tab === 'cloud') {
        if (!Cloud.ready) { pl.innerHTML = '<div class="empty">Your online library isn’t available in this view. Maps are still autosaved in this browser, and you can download project files.</div>'; return; }
        const list = (await Cloud.list()).sort((a, b) => b.updated - a.updated);
        pl.innerHTML = list.length ? list.map((p) => item(p, 'cloud')).join('') : '<div class="empty">No maps saved to your library yet. Press Save (Ctrl S) to add this one.</div>';
      } else {
        const list = (await IDB.all('projects')).sort((a, b) => b.updated - a.updated);
        pl.innerHTML = list.length ? list.map((p) => item(p, 'local')).join('') + '<div class="help">Maps here live only in this browser on this device.</div>' : '<div class="empty">Nothing stored in this browser yet.</div>';
      }
    } catch (e) { pl.innerHTML = `<div class="empty">Couldn’t load the list (${esc(e.message || e.code || e)}).</div>`; }
    $$('#plist [data-open]').forEach((b) => (b.onclick = async () => {
      const [src, id] = b.dataset.open.split(':'); busy(true, 'Opening…');
      try {
        if (src === 'cloud') { const json = await Cloud.load(id); closeModal(); loadProject(json, { cloud: true }); }
        else { const rec = await IDB.get('projects', id); closeModal(); loadProject(rec.json, { cloud: false }); }
      } catch (e) { toast('Could not open: ' + (e.message || e.code), true); }
      busy(false);
    }));
    $$('#plist [data-del]').forEach((b) => (b.onclick = async () => {
      if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Confirm'; return; }
      const [src, id] = b.dataset.del.split(':');
      try { if (src === 'cloud') await Cloud.remove(id); else await IDB.del('projects', id); if (id === P.id && src === 'cloud') S.cloudLinked = false; } catch (e) { toast('Delete failed: ' + (e.message || e.code), true); }
      show();
    }));
  };
  $$('#modalBody [data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; show(); }));
  show();
}
function openFileFlow() { pickFiles('.json,application/json', false, async (files) => { const txt = await readText(files[0]); loadProject(txt, { cloud: false }); }); }
async function saveAsCopy() {
  P = clone(P); P.id = uid('m'); P.name = P.name + ' copy'; S.cloudLinked = false; $('#projName').value = P.name;
  await doSave();
}

// ---------------- New map dialog ----------------
const PRESET_PALETTES = {
  '18xx': ['#ece4cc', '#ffffff', '#f6dc4a', '#6fbf5a', '#c07a45', '#a9a9a9', '#e0443e', '#79b8e8', '#d9c7a3', '#b8d8a0', '#2b6cb0', '#8e5bb5', '#f39a3c', '#2b2b2b', '#f5b7b1', '#c9a77c'],
  aos: ['#b9d77d', '#d8b77e', '#a87b4f', '#7a5535', '#79b8e8', '#d9473f', '#3b6fc4', '#f2cf3a', '#8a4fb0', '#2b2b2b', '#9a9a9a', '#ffffff', '#e8e0c8', '#c62828', '#6aa84f', '#f4a261'],
  cube: ['#e3d7b8', '#ffffff', '#b7c99a', '#9c7a54', '#6e8fb5', '#c0504d', '#4f81bd', '#9bbb59', '#f79646', '#8064a2', '#2b2b2b', '#d9d9d9', '#f2dcdb', '#ddd9c3', '#c6efce', '#ffeb9c'],
};
function presetTypes(p) {
  const T = (name, fill, items = []) => ({ id: uid('t'), name, fill, items });
  if (p === '18xx') return [
    T('Mountain $60', '#e0d2b0', [{ t: 'icon', icon: 'mountain', x: 0, y: -0.18, s: 0.62 }, { t: 'text', text: '$60', style: 'plain', size: 0.22, x: 0, y: 0.42 }]),
    T('Hills $40', '#e3dcb8', [{ t: 'icon', icon: 'hills', x: 0, y: -0.15, s: 0.6 }, { t: 'text', text: '$40', style: 'plain', size: 0.22, x: 0, y: 0.42 }]),
    T('Water $40', '#d6e8f2', [{ t: 'text', text: '$40', style: 'wave', size: 0.22, color: '#1d4f7a', x: 0, y: 0.05 }]),
    T('Off-board', '#e0443e', [{ t: 'phases', values: 'y30 g40 b60 x80', x: 0, y: 0 }]),
    T('No build (gray)', '#b0aca2'),
    T('Lake', '#79b8e8'),
  ];
  if (p === 'aos') return [
    T('Hills $3', '#d8b77e', [{ t: 'icon', icon: 'hills', x: 0, y: 0, s: 0.75 }]),
    T('Mountain $4', '#a87b4f', [{ t: 'icon', icon: 'mountain', x: 0, y: 0, s: 0.8, color: '#7a5535' }]),
    T('River $3', '#b9d77d', [{ t: 'icon', icon: 'river', x: 0, y: 0, s: 1.05 }]),
    T('Lake (impassable)', '#79b8e8'),
    T('Town', '#b9d77d', [{ t: 'town', style: 'disc', x: 0, y: 0 }]),
    T('Red city', '#d9473f'), T('Blue city', '#3b6fc4'), T('Yellow city', '#f2cf3a'), T('Purple city', '#8a4fb0'), T('Black city', '#2b2b2b'), T('Gray new city', '#9a9a9a'),
  ];
  if (p === 'cube') return [
    T('Forest +1', '#b7c99a', [{ t: 'icon', icon: 'forest', x: 0, y: -0.1, s: 0.65 }, { t: 'text', text: '+1', size: 0.22, x: 0, y: 0.45 }]),
    T('Mountain +2', '#9c7a54', [{ t: 'icon', icon: 'mountain', x: 0, y: -0.1, s: 0.65 }, { t: 'text', text: '+2', size: 0.22, x: 0, y: 0.45, color: '#ffffff' }]),
    T('City', '#ffffff', [{ t: 'city', slots: 1, x: 0, y: -0.05, s: 0.9 }]),
    T('Water', '#6e8fb5'),
  ];
  return [];
}
const PRESETS = {
  '18xx': { label: '18xx', desc: 'Pointy hexes, A1/A3/B2 coordinates around the edges, terrain cost types, red off-boards.', grid: { cols: 16, rows: 11, size: 40, orient: 'pointy', stagger: 'odd' }, style: { bg: '#f4efe2', hexFill: '#ece4cc', gridColor: '#6d6455', coords: 'A1d', coordPos: 'border' } },
  aos: { label: 'Age of Steam', desc: 'Flat hexes on green plains, hills & mountains, goods-colored city types, white-disc towns.', grid: { cols: 13, rows: 11, size: 40, orient: 'flat', stagger: 'odd' }, style: { bg: '#e6edda', hexFill: '#b9d77d', gridColor: '#4f6b35', gridWidth: 1, coords: 'A1', coordPos: 'border', coordColor: '#33461f' } },
  cube: { label: 'Cube rails', desc: 'Compact pointy map with terrain cost markers and starting cities.', grid: { cols: 12, rows: 9, size: 42, orient: 'pointy', stagger: 'odd' }, style: { bg: '#efe6d2', hexFill: '#e3d7b8', gridColor: '#7d6f55', coords: 'A1', coordPos: 'border' } },
  blank: { label: 'Blank', desc: 'Plain grid. Set everything up yourself.', grid: { cols: 12, rows: 10, size: 40, orient: 'pointy', stagger: 'odd' }, style: { bg: '#ffffff', hexFill: '#f2f2f2', gridColor: '#555555', coords: 'A1', coordPos: 'border' } },
};
function makePreset(pk, name, cols, rows) {
  const p = defaultProject(); const pr = PRESETS[pk];
  Object.assign(p.grid, pr.grid); Object.assign(p.style, pr.style);
  if (cols) p.grid.cols = cols; if (rows) p.grid.rows = rows;
  p.name = name || 'Untitled map'; p.types = presetTypes(pk); p.palette = [...(PRESET_PALETTES[pk] || DEFAULT_PALETTE)];
  return p;
}
// rows needed for a round map N hexes across, so the circle fills the grid both ways
function globeRows(n, orient) { return Math.max(3, Math.round(orient === 'flat' ? (n * 1.5) / SQ3 + 0.6 : (n * SQ3) / 1.5 + 0.3)); }
function newDialog() {
  closeMenus(); let pk = '18xx', shape = 'rect';
  openModal('New map', `<div class="presets">${Object.entries(PRESETS).map(([k, v]) => `<button class="preset ${k === pk ? 'on' : ''}" data-pk="${k}"><b>${v.label}</b><small>${v.desc}</small></button>`).join('')}</div>
    <div class="f"><label>Name</label><input type="text" id="nmName" value="Untitled map"></div>
    <div class="f"><label>Shape</label><div class="seg" id="nmShape"><button type="button" data-v="rect" class="on">Rectangle</button><button type="button" data-v="circle">Circle (globe)</button></div></div>
    <div class="btngrid" id="nmRect"><div class="f full"><label>Columns</label><input type="number" id="nmCols" min="1" value="${PRESETS[pk].grid.cols}"></div><div class="f full"><label>Rows</label><input type="number" id="nmRows" min="1" value="${PRESETS[pk].grid.rows}"></div></div>
    <div id="nmCirc" style="display:none"><div class="f"><label>Hexes across</label><input type="number" id="nmAcross" min="5" value="25"></div>
      <div class="help" style="margin-top:0">The map starts as a circle with a smooth round edge and globe shading. Size, shading and latitude lines can be changed under Map edge.</div></div>
    <div class="help">Your current map stays saved — find it under File › Open saved maps. Everything here can be changed later.</div>`,
    [{ label: 'Cancel', onClick: closeModal }, { label: 'Create map', cls: 'pri', onClick: () => {
      const nm = $('#nmName').value.trim() || 'Untitled map';
      let p;
      if (shape === 'circle') {
        const n = Math.max(5, +$('#nmAcross').value || 25), o = PRESETS[pk].grid.orient || 'pointy';
        p = makePreset(pk, nm, n, globeRows(n, o));
        Object.assign(p.style.clip, { shape: 'circle', cpct: 100, on: true, shade: true, grat: false });
      } else p = makePreset(pk, nm, Math.max(1, +$('#nmCols').value || 12), Math.max(1, +$('#nmRows').value || 10));
      closeModal(); loadProject(JSON.stringify(p), { quiet: true });
      if (shape === 'circle') { applyShapeVoids(); S.undo = []; S.redo = []; updateUndoBtns(); renderAll(); if (typeof fitView === 'function') fitView(); }
      toast('New map created');
    } }]);
  $$('.preset').forEach((b) => (b.onclick = () => { pk = b.dataset.pk; $$('.preset').forEach((x) => x.classList.toggle('on', x === b)); $('#nmCols').value = PRESETS[pk].grid.cols; $('#nmRows').value = PRESETS[pk].grid.rows; }));
  $$('#nmShape button').forEach((b) => (b.onclick = () => { shape = b.dataset.v; $$('#nmShape button').forEach((x) => x.classList.toggle('on', x === b)); $('#nmRect').style.display = shape === 'rect' ? '' : 'none'; $('#nmCirc').style.display = shape === 'circle' ? '' : 'none'; }));
}

// ---------------- Export ----------------
function buildExportSVG(o = {}) {
  const b = o.bounds || contentBounds(true); const view = o.view || b;
  const pxW = o.pxW || view.w, pxH = o.pxH || view.h, pdf = !!o.pdf;
  let s = `<svg xmlns="${SVGNS}" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${n2(pxW)}" height="${n2(pxH)}" viewBox="${n2(view.x)} ${n2(view.y)} ${n2(view.w)} ${n2(view.h)}">`;
  s += `<title>${esc(P.name)}</title>`;
  if (o.bg !== false) s += `<rect x="${n2(b.x)}" y="${n2(b.y)}" width="${n2(b.w)}" height="${n2(b.h)}" fill="${P.style.bg}"/>`;
  s += bgImageStr({ export: true, pdf });
  s += P.objects.filter((ob) => ob.t === 'region' && ob.under).map((ob) => objectStr(ob, { pdf })).join('');
  const clip = clipOn(); if (clip) s += `<defs>${clipDefStr('mapclipx')}</defs><g clip-path="url(#mapclipx)">`;
  s += baseFillStr();
  let fills = '', contents = '';
  for (const k in P.hexes) { const [c, r] = unkey(k); if (P.voids[k] || !inGrid(c, r)) continue; const h = P.hexes[k]; fills += hexFillStr(c, r, h, { pdf, idp: 'x' }); contents += hexContentStr(c, r, h, { pdf }); }
  s += fills + gridStr() + edgesStr() + contents;
  if (clip) s += '</g>' + frameStr();
  s += coordsStr();
  s += P.objects.filter((ob) => !(ob.t === 'region' && ob.under)).map((ob) => objectStr(ob, { pdf })).join('');
  return s + '</svg>';
}
async function svgToCanvas(svg, w, h) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = await loadImg(url); const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d'); if (!ctx) throw new Error('canvas too large'); ctx.drawImage(img, 0, 0, w, h); return cv;
  } finally { URL.revokeObjectURL(url); }
}
const canvasToBlob = (cv) => new Promise((res) => cv.toBlob(res, 'image/png'));
const PAPERS = { letter: ['Letter', 215.9, 279.4], legal: ['Legal', 215.9, 355.6], tabloid: ['Tabloid 11×17', 279.4, 431.8], a4: ['A4', 210, 297], a3: ['A3', 297, 420], a2: ['A2', 420, 594], a1: ['A1', 594, 841], a0: ['A0', 841, 1189] };
const EX = { fmt: 'png', bg: true, scale: 2, pdfMode: 'tile', hexMM: 38.1, paper: 'letter', orient: 'auto', margin: 8, overlap: 10 };
function exportDialog() {
  closeMenus();
  const b = contentBounds(true);
  const body = () => {
    const pxPerMM = (SQ3 * R()) / EX.hexMM, mapW = b.w / pxPerMM, mapH = b.h / pxPerMM;
    let info = '', opts = '';
    if (EX.fmt === 'svg') { opts = '<div class="help">Vector file for Inkscape, Illustrator, Affinity or a browser. Text stays editable.</div>'; info = `${Math.round(b.w)} × ${Math.round(b.h)} units`; }
    if (EX.fmt === 'png') {
      const sc = EX.scale; opts = `<div class="f"><label>Resolution</label><div class="seg" id="exScale">${[1, 2, 3, 4, 6].map((s) => `<button data-v="${s}" class="${s === sc ? 'on' : ''}">${s}×</button>`).join('')}</div></div>`;
      info = `${Math.round(b.w * sc).toLocaleString()} × ${Math.round(b.h * sc).toLocaleString()} px`;
    }
    if (EX.fmt === 'pdf') {
      opts = `<div class="f"><label>Layout</label><select id="exMode"><option value="tile">Tile across sheets — print & assemble</option><option value="fit">One page at true print size</option><option value="page">Shrink to fit one sheet</option></select></div>
        ${EX.pdfMode !== 'page' ? `<div class="f"><label>Hex size</label><div class="row"><input type="number" id="exHex" step="0.1" min="5" value="${EX.hexMM}" style="width:90px"><span class="help" style="margin:0">mm across flats (${(EX.hexMM / 25.4).toFixed(2)}″). 18xx tiles are usually 38 mm.</span></div></div>` : ''}
        ${EX.pdfMode !== 'fit' ? `<div class="f"><label>Paper</label><select id="exPaper">${Object.entries(PAPERS).map(([k, v]) => `<option value="${k}" ${EX.paper === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
        <div class="f"><label>Orientation</label><div class="seg" id="exOrient">${[['auto', 'Auto'], ['p', 'Portrait'], ['l', 'Landscape']].map(([v, l]) => `<button data-v="${v}" class="${EX.orient === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        <div class="btngrid"><div class="f full"><label>Margin (mm)</label><input type="number" id="exMargin" min="0" value="${EX.margin}"></div>${EX.pdfMode === 'tile' ? `<div class="f full"><label>Overlap (mm)</label><input type="number" id="exOverlap" min="0" value="${EX.overlap}"></div>` : ''}</div>` : ''}`;
      if (EX.pdfMode === 'fit') info = `Page: ${Math.round(mapW)} × ${Math.round(mapH)} mm (${(mapW / 25.4).toFixed(1)}″ × ${(mapH / 25.4).toFixed(1)}″)`;
      if (EX.pdfMode === 'tile') { const t = tileLayout(b); info = `Map prints at ${Math.round(mapW)} × ${Math.round(mapH)} mm on ${t.nx * t.ny} sheet${t.nx * t.ny > 1 ? 's' : ''} (${t.nx} × ${t.ny})`; }
      if (EX.pdfMode === 'page') info = `Scaled to fit one ${PAPERS[EX.paper][0]} sheet`;
    }
    return `<div class="tabs" id="exFmt">${['png', 'svg', 'pdf'].map((f) => `<button data-v="${f}" class="${EX.fmt === f ? 'on' : ''}">${f.toUpperCase()}</button>`).join('')}</div>
      ${opts}<label class="chk"><input type="checkbox" id="exBg" ${EX.bg ? 'checked' : ''}>Include background color${EX.fmt === 'png' ? ' (off = transparent)' : ''}</label>
      <div class="card" style="font:12.5px var(--mono);color:var(--ink2)">${info}</div>
      <div class="help">Exports include everything inside the page area (map, coordinates, markets, tables, text). Removed hexes and editing outlines are left out.</div>`;
  };
  const wire = () => {
    $$('#exFmt button').forEach((x) => (x.onclick = () => { EX.fmt = x.dataset.v; refresh(); }));
    $$('#exScale button').forEach((x) => (x.onclick = () => { EX.scale = +x.dataset.v; refresh(); }));
    $$('#exOrient button').forEach((x) => (x.onclick = () => { EX.orient = x.dataset.v; refresh(); }));
    const m = $('#exMode'); if (m) { m.value = EX.pdfMode; m.onchange = () => { EX.pdfMode = m.value; refresh(); }; }
    const on = (id, k) => { const el = $('#' + id); if (el) el.onchange = () => { const v = +el.value; if (!isNaN(v) && v >= 0) { EX[k] = v; refresh(); } }; };
    on('exHex', 'hexMM'); on('exMargin', 'margin'); on('exOverlap', 'overlap');
    const p = $('#exPaper'); if (p) p.onchange = () => { EX.paper = p.value; refresh(); };
    $('#exBg').onchange = (e) => (EX.bg = e.target.checked);
  };
  const refresh = () => { $('#modalBody').innerHTML = body(); wire(); };
  openModal('Export map', body(), [{ label: 'Cancel', onClick: closeModal }, { label: 'Export', cls: 'pri', onClick: () => { closeModal(); runExport(); } }]);
  wire();
}
function tileLayout(b) {
  const [, pw0, ph0] = PAPERS[EX.paper]; const pxPerMM = (SQ3 * R()) / EX.hexMM;
  const mapW = b.w / pxPerMM, mapH = b.h / pxPerMM;
  const opts = EX.orient === 'auto' ? [[pw0, ph0], [ph0, pw0]] : EX.orient === 'l' ? [[ph0, pw0]] : [[pw0, ph0]];
  let best = null;
  opts.forEach(([pw, ph]) => {
    const aw = pw - 2 * EX.margin, ah = ph - 2 * EX.margin, st = Math.max(1, aw - EX.overlap), sh = Math.max(1, ah - EX.overlap);
    const nx = Math.max(1, Math.ceil((mapW - EX.overlap) / st)), ny = Math.max(1, Math.ceil((mapH - EX.overlap) / sh));
    if (!best || nx * ny < best.nx * best.ny) best = { nx, ny, pw, ph, aw, ah, st, sh, pxPerMM };
  });
  return best;
}
async function runExport() {
  const base = slug(P.name); select(S.sel);
  try {
    if (EX.fmt === 'svg') { await saveBlob(base + '.svg', buildExportSVG({ bg: EX.bg }), 'image/svg+xml'); return; }
    if (EX.fmt === 'png') {
      busy(true, 'Rendering PNG…'); const b = contentBounds(true);
      let sc = EX.scale; const maxSide = 16000, maxArea = 160e6;
      while (sc > 0.25 && (b.w * sc > maxSide || b.h * sc > maxSide || b.w * b.h * sc * sc > maxArea)) sc *= 0.8;
      const w = Math.round(b.w * sc), h = Math.round(b.h * sc);
      const cv = await svgToCanvas(buildExportSVG({ bg: EX.bg, pxW: w, pxH: h }), w, h);
      const blob = await canvasToBlob(cv); busy(false);
      if (!blob) { toast('This map is too large for a PNG in this browser. Try a smaller resolution or SVG/PDF.', true); return; }
      if (sc < EX.scale) toast(`Map is very large — PNG was reduced to ${w.toLocaleString()} × ${h.toLocaleString()} px.`);
      await saveBlob(base + '.png', blob, 'image/png'); return;
    }
    if (EX.fmt === 'pdf') { busy(true, 'Building PDF…'); const blob = await buildPDF(); busy(false); if (blob) await saveBlob(base + '.pdf', blob, 'application/pdf'); }
  } catch (e) { console.error(e); busy(false); toast('Export failed: ' + (e.message || e), true); }
}
async function svgIntoPdf(doc, svgStr, x, y, w, h) {
  const holder = document.createElement('div'); holder.style.cssText = 'position:absolute;left:-100000px;top:0;width:10px;height:10px;overflow:hidden';
  document.body.appendChild(holder);
  try {
    holder.innerHTML = svgStr; const el = holder.querySelector('svg');
    if (window.svg2pdf && window.svg2pdf.svg2pdf) await window.svg2pdf.svg2pdf(el, doc, { x, y, width: w, height: h });
    else await doc.svg(el, { x, y, width: w, height: h });
  } finally { holder.remove(); }
}
async function buildPDF() {
  if (!window.jspdf) { toast('PDF library failed to load.', true); return null; }
  const { jsPDF } = window.jspdf; const b = contentBounds(true); const PT = 72 / 25.4;
  const bgOn = EX.bg; let doc;
  if (EX.pdfMode === 'fit') {
    const pxPerMM = (SQ3 * R()) / EX.hexMM; let wPt = (b.w / pxPerMM) * PT, hPt = (b.h / pxPerMM) * PT;
    const lim = 14400; if (wPt > lim || hPt > lim) { const k = lim / Math.max(wPt, hPt); wPt *= k; hPt *= k; toast('Map is larger than the PDF page limit (200 in) — it was scaled down to fit.'); }
    doc = new jsPDF({ unit: 'pt', format: [wPt, hPt], orientation: wPt > hPt ? 'l' : 'p', compress: true });
    await svgIntoPdf(doc, buildExportSVG({ bg: bgOn, pdf: true, pxW: wPt, pxH: hPt }), 0, 0, wPt, hPt);
  } else if (EX.pdfMode === 'page') {
    const [, pw0, ph0] = PAPERS[EX.paper]; let pw = pw0, ph = ph0;
    if (EX.orient === 'l' || (EX.orient === 'auto' && b.w > b.h)) { pw = ph0; ph = pw0; }
    const aw = (pw - 2 * EX.margin) * PT, ah = (ph - 2 * EX.margin) * PT; const k = Math.min(aw / b.w, ah / b.h);
    const w = b.w * k, h = b.h * k;
    doc = new jsPDF({ unit: 'pt', format: [pw * PT, ph * PT], orientation: pw > ph ? 'l' : 'p', compress: true });
    await svgIntoPdf(doc, buildExportSVG({ bg: bgOn, pdf: true, pxW: w, pxH: h }), (pw * PT - w) / 2, (ph * PT - h) / 2, w, h);
  } else {
    const t = tileLayout(b); const pxmm = t.pxPerMM;
    doc = new jsPDF({ unit: 'pt', format: [t.pw * PT, t.ph * PT], orientation: t.pw > t.ph ? 'l' : 'p', compress: true });
    let first = true; const total = t.nx * t.ny;
    for (let j = 0; j < t.ny; j++) for (let i = 0; i < t.nx; i++) {
      if (!first) doc.addPage([t.pw * PT, t.ph * PT], t.pw > t.ph ? 'l' : 'p'); first = false;
      busy(true, `Building PDF… sheet ${j * t.nx + i + 1} of ${total}`);
      const view = { x: b.x + i * t.st * pxmm, y: b.y + j * t.sh * pxmm, w: t.aw * pxmm, h: t.ah * pxmm };
      await svgIntoPdf(doc, buildExportSVG({ bg: bgOn, pdf: true, bounds: b, view, pxW: t.aw * PT, pxH: t.ah * PT }), EX.margin * PT, EX.margin * PT, t.aw * PT, t.ah * PT);
      // trim guides + label
      doc.setDrawColor(150); doc.setLineWidth(0.4);
      const m = EX.margin * PT, x1 = m + t.aw * PT, y1 = m + t.ah * PT, L2 = Math.min(10, m * 0.8);
      if (L2 > 1) [[m, m], [x1, m], [m, y1], [x1, y1]].forEach(([x, y]) => { doc.line(x - L2, y, x - 1, y); doc.line(x + 1, y, x + L2, y); doc.line(x, y - L2, x, y - 1); doc.line(x, y + 1, x, y + L2); });
      if (EX.overlap > 0) { doc.setLineDashPattern([2, 2], 0); doc.setDrawColor(190); if (i < t.nx - 1) doc.line(x1 - EX.overlap * PT, m, x1 - EX.overlap * PT, y1); if (j < t.ny - 1) doc.line(m, y1 - EX.overlap * PT, x1, y1 - EX.overlap * PT); doc.setLineDashPattern([], 0); }
      doc.setFontSize(7); doc.setTextColor(120);
      if (m > 6) doc.text(`${P.name} — sheet ${j * t.nx + i + 1}/${total} (row ${j + 1}, col ${i + 1})${EX.overlap ? ' · dashed line = overlap edge' : ''}`, m, m - 3);
    }
  }
  return doc.output('blob');
}

// ---------------- Demo map ----------------
function demoProject() {
  const p = makePreset('18xx', 'Lakeshore Lines (sample)', 14, 9);
  P = p; // geometry helpers read P
  const T = (n) => p.types.find((t) => t.name === n).id;
  const set = (c, r, h) => { p.hexes[key(c, r)] = Object.assign({ items: [], track: [] }, h); };
  // shape: remove a few corners
  ['13,0', '13,1', '12,0', '0,8', '1,8', '13,8'].forEach((k) => (p.voids[k] = 1));
  // lake on the east
  [[12, 2], [13, 2], [12, 3], [13, 3], [13, 4], [12, 4], [13, 5]].forEach(([c, r]) => set(c, r, { type: T('Lake') }));
  // mountain band
  [[6, 0], [7, 1], [6, 2], [7, 2], [5, 7], [6, 8], [7, 7], [6, 7]].forEach(([c, r]) => set(c, r, { type: T('Mountain $60') }));
  [[8, 1], [5, 6]].forEach(([c, r]) => set(c, r, { type: T('Hills $40') }));
  set(10, 6, { type: T('Water $40') }); set(9, 7, { type: T('Water $40') });
  set(2, 7, { type: T('No build (gray)') });
  // off-board west
  set(0, 3, { type: T('Off-board'), items: [{ t: 'text', nm: true, text: 'West', style: 'plain', size: 0.22, x: 0, y: 0.48, color: '#ffffff' }, { t: 'wedge', e: 0, x: 0, y: 0 }] });
  set(0, 4, { type: T('Off-board'), items: [{ t: 'wedge', e: 0, x: 0, y: 0 }, { t: 'wedge', e: 5, x: 0, y: 0 }], track: [] });
  // cities
  set(3, 2, { items: [{ t: 'city', slots: 1, x: 0, y: 0, rev: '20', name: 'Ashford' }] });
  set(9, 4, { fill: '#f6dc4a', items: [{ t: 'city', slots: 2, x: 0, y: 0, rev: '30', name: 'Port Lyle' }, { t: 'text', text: 'P', style: 'plain', size: 0.26, x: 0.62, y: -0.32 }], track: [{ a: 'i0.0', b: 'e3' }, { a: 'i0.1', b: 'e0' }] });
  set(10, 4, { fill: '#f6dc4a', track: [{ a: 'e3', b: 'e0' }] });
  set(11, 4, { fill: '#f6dc4a', items: [{ t: 'icon', icon: 'port', x: 0.15, y: -0.35, s: 0.45 }], track: [{ a: 'e3', b: 'e1' }] });
  set(4, 5, { items: [{ t: 'town', style: 'dot', x: 0, y: 0, rev: '10', name: 'Millbrook' }] });
  set(7, 5, { items: [{ t: 'town', style: 'bar', x: 0, y: 0, r: 30 }, { t: 'town', style: 'bar', x: 0.0, y: 0.4, r: 30 }] });
  set(2, 4, { items: [{ t: 'city', slots: 3, x: 0, y: 0, rev: '40', name: 'Kingsport', nb: true }, { t: 'text', text: 'K', style: 'plain', size: 0.3, x: 0.62, y: -0.45 }] });
  set(10, 1, { items: [{ t: 'city', slots: 1, x: 0, y: 0, rev: '20', name: 'Hollow Gap' }, { t: 'icon', icon: 'mine', x: 0.55, y: -0.3, s: 0.35 }] });
  set(5, 3, { items: [{ t: 'icon', icon: 'forest', x: 0, y: 0, s: 0.8 }] });
  set(4, 1, { items: [{ t: 'icon', icon: 'farm', x: 0.1, y: 0, s: 0.6 }] });
  // rivers & borders
  const E = (c, r, i, e) => (p.edges[edgeKey(c, r, i)] = e);
  E(8, 2, 1, { t: 'river' }); E(8, 3, 2, { t: 'river' }); E(8, 3, 1, { t: 'river' }); E(8, 4, 2, { t: 'river', label: '$20' }); E(8, 5, 1, { t: 'river' });
  E(4, 6, 0, { t: 'impassable' }); E(4, 6, 5, { t: 'impassable' });
  // objects
  const gb = hexBoundsExisting();
  p.objects.push({ id: uid('o'), t: 'text', x: gb.x, y: gb.y - 120, text: 'Lakeshore Lines', fs: 46, bold: true, font: 'serif', color: '#3a2f22' });
  p.objects.push({ id: uid('o'), t: 'text', x: gb.x + 4, y: gb.y - 66, text: 'Sample map — click anything to edit, or start fresh with File › New map', fs: 16, italic: true, color: '#6d6455' });
  p.objects.push({ id: uid('o'), t: 'market2', x: gb.x + gb.w + 110, y: gb.y - 120, title: 'Stock market', cw: 44, ch: 38, fs: 12.5, valPos: 'tl', zones: {}, data: [
    '64y 70 76 84 92 102 114 128 144 162 182',
    '58y 64y 70 76p 84 92 102 114 128 144',
    '52o 58y 64y 70p 76 84 92 102 114',
    '46o 52o 58y 64p 70 76 84 92',
    '40b 46o 52o 58yp 64 70 76',
    '32b 40b 46o 52o 58y 64',
    '24b 32b 40b 46o 52o'].join('\n') });
  p.objects.push({ id: uid('o'), t: 'table', x: gb.x + gb.w + 110, y: gb.y + 250, title: 'Terrain & costs', fs: 14, pad: 6, stripe: '#f1ede3', text: 'Symbol | Meaning | Cost\n:mountain: | Mountain | $60\n:hills: | Hills | $40\n:water: | Water | $40\n[#e0443e] | Off-board | 30/40/60/80\n:port: | Port bonus | +$20' });
  p.companies = []; p.compStyle = defaultCompStyle(); p.compStyle.game = 'Lakeshore Lines';
  const mk = (name, abbr, color, style, home, extra = {}) => { const c = newCompany(p.companies.length); Object.assign(c, { name, abbr, color, home }, extra); c.logo.style = style; p.companies.push(c); return c; };
  mk('Kingsport Central', 'KC', '#c62828', 'disc', '2,4|0|0');
  mk('Port Lyle Railway', 'PLR', '#1565c0', 'band', '9,4|0|0', { color2: '#f2b705' });
  mk('Ashford & Northern', 'A&N', '#2e7d32', 'ring', '3,2|0|0');
  mk('Hollow Gap Line', 'HGL', '#4e342e', 'star', '10,1|0|0', { color2: '#f2b705', tokens: { count: 3, costs: 'Home, $40, $100' } });
  mk('Lakeshore Coal Co.', 'LCC', '#455a64', 'mono', '', { kind: 'private', cost: '$40', revenue: '$10', ability: 'Owning company may lay a tile in Hollow Gap for free once per game.' });
  p.objects.push({ id: uid('o'), t: 'market1', x: gb.x, y: gb.y + gb.h + 70, title: 'Revenue track', layout: 'wrap', perRow: 26, cw: 34, ch: 30, fs: 11, zones: {}, data: Array.from({ length: 52 }, (_, i) => String(i * 10) + (i % 10 === 0 ? 'x' : '')).join(' ') });
  return p;
}

// ---------------- Menus & top bar ----------------
function closeMenus() { $$('.menu').forEach((m) => m.classList.remove('open')); }
$$('.menu [data-menu]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); const m = b.parentElement; const was = m.classList.contains('open'); closeMenus(); if (!was) m.classList.add('open'); }));
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.menu')) closeMenus(); });
const ACTS = {
  new: newDialog, open: openDialog, save: () => doSave(), saveas: saveAsCopy,
  savefile: () => saveBlob(slug(P.name) + '.hexmap.json', fullJSON(), 'application/json'),
  'gamedata-export': () => exportGameData(),
  openfile: openFileFlow,
  'maker-import': () => pickFiles('.json,application/json', false, async (files) => { const txt = await readText(files[0]); loadProject(txt, { cloud: false }); }),
  'maker-export': () => { try { const g = exportMaker(); saveBlob(slug(P.name) + '.18xxmaker.json', JSON.stringify(g, null, 2), 'application/json'); } catch (e) { console.error(e); toast('18xx Maker export failed: ' + e.message, true); } },
  'ins-market1': () => insertObject('market1'), 'ins-market2': () => insertObject('market2'), 'ins-table': () => insertObject('table'), 'ins-text': () => insertObject('text'),
  'toggle-tips': () => { setTips(!S.tips); $('#tipsToggle').textContent = 'Hover tips: ' + (S.tips ? 'on' : 'off'); },
  'ins-revbox': () => { checkpoint(); const [x, y] = viewCenterWorld(); const o = { id: uid('o'), t: 'revbox', values: 'y20 g30 b40 x60', cw: R() * 0.42, x: x - R() * 0.84, y }; P.objects.push(o); renderObject(o.id); select({ kind: 'obj', id: o.id }); setTool('select'); schedulePaper(); },
  'ins-image': insertImageObject, 'upload-icon': uploadIconsDialog, 'upload-bg': () => pickFiles('image/*,.svg', false, (f) => uploadBackground(f[0])),
};
document.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b || b.closest('#props')) return; if (b.dataset.act.startsWith('help-')) { closeMenus(); helpDialog(b.dataset.act.slice(5)); return; } const fn = ACTS[b.dataset.act]; if (fn) { closeMenus(); fn(); } });
$('#saveBtn').onclick = () => doSave();
$('#exportBtn').onclick = () => (S.view2 === 'comp' ? compExportDialog() : exportDialog());
$('#undoBtn').onclick = undo; $('#redoBtn').onclick = redo;
$('#projName').addEventListener('input', (e) => { checkpoint('name'); P.name = e.target.value; });
$('#projName').addEventListener('change', () => renderProps());
// drag & drop project files / images onto the canvas
$('#main').addEventListener('dragover', (e) => { e.preventDefault(); });
$('#main').addEventListener('drop', async (e) => {
  e.preventDefault(); const files = [...(e.dataTransfer.files || [])]; if (!files.length) return;
  const proj = files.find((f) => /\.json$/i.test(f.name)); if (proj) { loadProject(await readText(proj)); return; }
  const ids = await addAssets(files, 'icon');
  if (ids.length) { S.stamp = { kind: 'asset', ref: ids[0] }; S.tool = 'stamp'; renderLeft(); toast(`Added ${ids.length} icon${ids.length > 1 ? 's' : ''} to Stamps › Your uploads`); }
});
function updateStatusSize() { const g = P.grid; $('#stSize').textContent = `${g.cols}×${g.rows} hexes`; }
window.addEventListener('beforeunload', () => { try { autosaveLocal(); } catch (e) {} });

// ---------------- Init ----------------
async function init() {
  dlCap(); Cloud.init();
  let restored = false;
  try { const a = await IDB.get('kv', 'current'); if (a && a.json) { const obj = JSON.parse(a.json); if (obj && obj.grid) { P = migrate(obj); restored = true; S.cloudLinked = !!a.cloud; } } } catch (e) { console.warn('restore failed', e); }
  if (!restored) P = demoProject();
  S.brush = { kind: 'color', color: P.palette[2] || '#f6dc4a' };
  applyStaticTips(); $('#tipsToggle').textContent = 'Hover tips: ' + (S.tips ? 'on' : 'off');
  renderAll(); renderLeft(); renderProps(); updateUndoBtns(); updateSaveState(); applyView();
  requestAnimationFrame(() => { fitView(); });
  if (restored) toast('Welcome back — restored your last map');
  else setTimeout(() => toast('New here? Press ? or open Help for a quick tour. Hover over anything to see what it does.'), 900);
}
init();
