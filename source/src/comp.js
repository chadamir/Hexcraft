// =====================================================================
//  Companies: logos, share certificates, charters, private cards, tokens
//  All component renderers work in millimetres.
// =====================================================================
const COMP_COLORS = ['#c62828', '#1565c0', '#2e7d32', '#f2b705', '#6a1b9a', '#ef6c00', '#00838f', '#263238', '#ad1457', '#5d4037', '#7cb342', '#3949ab'];
const LOGO_STYLES = [['disc', 'Solid'], ['ring', 'Ring'], ['band', 'Band'], ['split', 'Split'], ['stripe', 'Stripe'], ['star', 'Star'], ['diamond', 'Diamond'], ['mono', 'Monogram']];
const KIND_LABEL = { major: 'Major company', minor: 'Minor company', cube: 'Railroad', private: 'Private company' };
function defaultCompStyle() {
  return { theme: 'classic', game: '', shareW: 88, shareH: 63, charterW: 210, charterH: 148, tokenMM: 15, extraTokens: 2, homeOnMap: true,
    orOn: true, orSteps: 'Lay or upgrade track\nPlace a station token\nRun trains\nPay or withhold dividends\nBuy trains' };
}
function newCompany(i = (P.companies || []).length) {
  const c = COMP_COLORS[i % COMP_COLORS.length];
  return { id: uid('c'), name: 'New Railroad', abbr: 'NR', kind: 'major', color: c, color2: '#ffffff', textColor: '',
    logo: { mode: 'auto', style: LOGO_STYLES[i % 6][0], font: 'sans', text: '', ref: '' },
    shares: { pres: 20, pct: 10, total: 100, count: 5, custom: '' }, par: '',
    tokens: { count: 4, costs: 'Home, $40, $60, $80' }, cubes: 19, trains: 4,
    home: '', dest: '', cost: '', revenue: '', ability: '', notes: '' };
}
const CS = () => P.compStyle || (P.compStyle = defaultCompStyle());
const compFam = () => (CS().theme === 'classic' ? 'serif' : 'sans');

// ---------------- Logos (token art) ----------------
let _lgSeq = 0;
function logoSVG(co, r, opt = {}) {
  const c1 = co.color || '#888', c2 = co.color2 || '#ffffff';
  const tc = co.textColor || Color.contrast(c1);
  const L = co.logo || {}; const txt = String(L.text || co.abbr || '?');
  const edge = `<circle r="${n2(r)}" fill="none" stroke="${Color.dark(c1, 0.35)}" stroke-width="${n2(r * 0.05)}"/>`;
  const id = 'lg' + (opt.idp || '') + (++_lgSeq);
  if (L.mode === 'upload' && P.assets[L.ref]) {
    return `<clipPath id="${id}"><circle r="${n2(r)}"/></clipPath><circle r="${n2(r)}" fill="#ffffff"/>` +
      `<g clip-path="url(#${id})"><image x="${n2(-r)}" y="${n2(-r)}" width="${n2(2 * r)}" height="${n2(2 * r)}" preserveAspectRatio="xMidYMid slice" xlink:href="${assetHref(L.ref, opt.pdf)}"/></g>` +
      `<circle r="${n2(r * 0.97)}" fill="none" stroke="${c1}" stroke-width="${n2(r * 0.08)}"/>`;
  }
  const fam = L.font || 'sans';
  const fsFor = (t, k = 1, maxW = r * 1.55) => { let fs = r * (t.length <= 1 ? 1.2 : t.length === 2 ? 0.92 : t.length === 3 ? 0.7 : t.length === 4 ? 0.54 : 0.44) * k; const w = measure(t, fs, true, fam); return w > maxW ? fs * maxW / w : fs; };
  const T = (t, fill, k = 1, dy = 0, extra = '') => { const fs = fsFor(t, k); return textEl(0, dy + fs * 0.35, t, { fs, bold: true, fam, anchor: 'middle', fill, extra }); };
  const band = (h) => { const x = Math.sqrt(Math.max(0, r * r - h * h)); return `M${n2(-x)} ${n2(-h)}L${n2(x)} ${n2(-h)}A${n2(r)} ${n2(r)} 0 0 1 ${n2(x)} ${n2(h)}L${n2(-x)} ${n2(h)}A${n2(r)} ${n2(r)} 0 0 1 ${n2(-x)} ${n2(-h)}Z`; };
  let s = '';
  switch (L.style || 'disc') {
    case 'ring': s = `<circle r="${n2(r)}" fill="${c2}"/><circle r="${n2(r * 0.86)}" fill="none" stroke="${c1}" stroke-width="${n2(r * 0.28)}"/>` + T(txt, Color.lum(c2) > 0.55 ? c1 : '#ffffff', 0.82); break;
    case 'band': s = `<circle r="${n2(r)}" fill="${c1}"/><path d="${band(r * 0.38)}" fill="${c2}"/>` + T(txt, Color.contrast(c2), 0.8); break;
    case 'split': s = `<path d="M${n2(-r)} 0A${n2(r)} ${n2(r)} 0 0 1 ${n2(r)} 0Z" fill="${c1}"/><path d="M${n2(r)} 0A${n2(r)} ${n2(r)} 0 0 1 ${n2(-r)} 0Z" fill="${c2}"/>` +
      T(txt, '#111111', 1, 0, ` stroke="#111111" stroke-width="${n2(r * 0.16)}" stroke-linejoin="round"`) + T(txt, '#ffffff'); break;
    case 'stripe': s = `<circle r="${n2(r)}" fill="${c2}"/><path d="${band(r * 0.42)}" fill="${c1}" transform="rotate(-35)"/>` + T(txt, tc, 0.85); break;
    case 'star': {
      const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = (i % 2 ? 0.12 : 0.3) * r; p.push(n2(rr * Math.cos(a)) + ' ' + n2(-r * 0.42 + rr * Math.sin(a))); }
      s = `<circle r="${n2(r)}" fill="${c1}"/><path d="M${p.join('L')}Z" fill="${c2}"/>` + T(txt, tc, 0.72, r * 0.25); break;
    }
    case 'diamond': s = `<circle r="${n2(r)}" fill="${c1}"/><path d="M0 ${n2(-r * 0.84)}L${n2(r * 0.84)} 0L0 ${n2(r * 0.84)}L${n2(-r * 0.84)} 0Z" fill="${c2}"/>` + T(txt, Color.lum(c2) > 0.55 ? c1 : '#ffffff', 0.7); break;
    case 'mono': s = `<circle r="${n2(r)}" fill="${c1}"/><circle r="${n2(r * 0.8)}" fill="none" stroke="${c2}" stroke-width="${n2(r * 0.06)}"/>` + textEl(0, r * 0.42, txt[0], { fs: r * 1.25, bold: true, fam: 'serif', anchor: 'middle', fill: tc }); break;
    default: s = `<circle r="${n2(r)}" fill="${c1}"/>` + T(txt, tc);
  }
  return s + edge;
}
function tokenSVG(co, d, opt = {}) {
  const r = d / 2;
  return `<circle r="${n2(r)}" fill="none" stroke="#bbbbbb" stroke-width="0.15" stroke-dasharray="0.6 0.6"/>` + logoSVG(co, Math.max(1, r - 0.25), opt);
}

// ---------------- Certificates ----------------
function certList(co) {
  const s = co.shares || {};
  if (co.kind === 'private') return [{ priv: true }];
  if (co.kind === 'minor' && !s.minorCerts) return [];
  if (co.kind === 'cube') { const n = Math.max(1, s.count || 5); return Array.from({ length: n }, (_, i) => ({ cube: true, shares: 1, n: i + 1, of: n })); }
  let pcts;
  if (s.custom && s.custom.trim()) pcts = s.custom.split(/[\s,]+/).map(Number).filter((v) => v > 0);
  else { const pres = s.pres ?? 20, pct = s.pct ?? 10, total = s.total ?? 100; pcts = [pres, ...Array(Math.max(0, Math.round((total - pres) / pct))).fill(pct)]; }
  const unit = Math.min(...pcts.slice(1).concat(pcts.length === 1 ? pcts : [])) || pcts[0];
  return pcts.map((p, i) => ({ pres: i === 0, pct: p, shares: Math.max(1, Math.round(p / unit)), n: i + 1, of: pcts.length }));
}
function shareSummary(co) {
  const list = certList(co);
  if (co.kind === 'private') return 'Private certificate';
  if (!list.length) return 'Charter only (no share certificates)';
  if (co.kind === 'cube') return `${list.length} shares`;
  const rest = list.slice(1), groups = {}; rest.forEach((c) => (groups[c.pct] = (groups[c.pct] || 0) + 1));
  const total = list.reduce((a, c) => a + c.pct, 0);
  return `${list[0].pct}% president` + Object.entries(groups).map(([p, n]) => ` + ${n} × ${p}%`).join('') + ` = ${list.length} certificates (${total}%)`;
}
function wrapText(text, maxW, fs, fam, bold) {
  const out = [];
  String(text || '').split('\n').forEach((para) => {
    const words = para.split(/\s+/).filter(Boolean); let line = '';
    if (!words.length) { out.push(''); return; }
    words.forEach((w) => { const t = line ? line + ' ' + w : w; if (measure(t, fs, bold, fam) > maxW && line) { out.push(line); line = w; } else line = t; });
    out.push(line);
  });
  return out;
}
function waveOrnament(x, y, w, h, color, n = 7) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const yy = y + (h * (i + 0.5)) / n, a = h / n * 0.9, steps = Math.max(4, Math.round(w / 8)), st = w / steps;
    let d = `M${n2(x)} ${n2(yy)}`;
    for (let j = 0; j < steps; j++) d += `q${n2(st / 2)} ${n2((j + i) % 2 ? a : -a)} ${n2(st)} 0`;
    s += `<path d="${d}" fill="none" stroke="${color}" stroke-width="0.18"/>`;
  }
  return s;
}
function roundRect(x, y, w, h, r, attrs) { return `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="${n2(r)}" ${attrs}/>`; }

function shareSVG(co, cert, W, H, opt = {}) {
  if (cert.priv) return privateSVG(co, W, H, opt);
  const cs = CS(), classic = cs.theme === 'classic', fam = compFam();
  const c1 = co.color, paper = classic ? '#fbf6e9' : '#ffffff', ink = '#1d1a16', tint = Color.light(c1, 0.72);
  const landscape = W >= H, rad = Math.min(W, H) * 0.045;
  let s = roundRect(0, 0, W, H, rad, `fill="${paper}" stroke="${c1}" stroke-width="0.5"`);
  const id = 'sc' + (++_lgSeq);
  s += `<clipPath id="${id}">${roundRect(0, 0, W, H, rad, '')}</clipPath>`;
  let mx, my, mw, mh; // main area
  if (landscape) {
    const sw = Math.min(W * 0.27, H * 0.62);
    s += `<g clip-path="url(#${id})"><rect x="0" y="0" width="${n2(sw)}" height="${n2(H)}" fill="${c1}"/></g>`;
    const lr = Math.min(sw * 0.36, H * (cert.pres ? 0.19 : 0.26));
    const pctFs = Math.min(sw * 0.26, H * 0.14);
    const avail = H - pctFs * 1.8;
    if (cert.pres) { s += `<g transform="translate(${n2(sw / 2)} ${n2(avail * 0.3)})">${logoSVG(co, lr, opt)}</g><g transform="translate(${n2(sw / 2)} ${n2(avail * 0.3 + lr * 2.15)})">${logoSVG(co, lr, opt)}</g>`; }
    else s += `<g transform="translate(${n2(sw / 2)} ${n2(avail * 0.48)})">${logoSVG(co, lr, opt)}</g>`;
    const stripTxt = cert.cube ? String(cert.n) : cert.pct + '%';
    s += textEl(sw / 2, H - pctFs * 0.65, stripTxt, { fs: pctFs, bold: true, fam, anchor: 'middle', fill: co.textColor || Color.contrast(c1) });
    mx = sw + W * 0.045; my = H * 0.08; mw = W - mx - W * 0.045; mh = H - my * 2;
  } else {
    const sh = Math.min(H * 0.3, W * 0.55);
    s += `<g clip-path="url(#${id})"><rect x="0" y="0" width="${n2(W)}" height="${n2(sh)}" fill="${c1}"/></g>`;
    const lr = Math.min(sh * 0.36, W * 0.17);
    if (cert.pres) { s += `<g transform="translate(${n2(W / 2 - lr * 1.12)} ${n2(sh / 2)})">${logoSVG(co, lr, opt)}</g><g transform="translate(${n2(W / 2 + lr * 1.12)} ${n2(sh / 2)})">${logoSVG(co, lr, opt)}</g>`; }
    else s += `<g transform="translate(${n2(W / 2)} ${n2(sh / 2)})">${logoSVG(co, lr, opt)}</g>`;
    mx = W * 0.07; my = sh + H * 0.03; mw = W - 2 * mx; mh = H - my - H * 0.04;
  }
  if (classic) s += waveOrnament(mx, my + mh * 0.5, mw, mh * 0.32, tint, 6);
  if (cert.pres) {
    s += roundRect(1.4, 1.4, W - 2.8, H - 2.8, rad * 0.7, `fill="none" stroke="${c1}" stroke-width="0.35"`);
    s += roundRect(2.2, 2.2, W - 4.4, H - 4.4, rad * 0.5, `fill="none" stroke="#c9a227" stroke-width="0.3"`);
  }
  // text
  const nameFs = Math.min(mh * 0.17, (mw / Math.max(4, co.name.length)) * 1.9);
  const nfs = Math.min(nameFs, nameFs * mw / Math.max(1, measure(co.name, nameFs, true, fam)));
  const tx = landscape ? mx : W / 2, anc = landscape ? 'start' : 'middle';
  if (cs.game) s += textEl(landscape ? mx + mw : W / 2, my + mh * 0.04, cs.game, { fs: Math.min(2.2, mh * 0.06), fam, anchor: landscape ? 'end' : 'middle', fill: '#7a7266', italic: true });
  s += textEl(tx, my + mh * 0.26, co.name, { fs: nfs, bold: true, fam, anchor: anc, fill: ink });
  const sub = cert.cube ? 'SHARE' : cert.pres ? "PRESIDENT'S CERTIFICATE" : 'SHARE CERTIFICATE';
  const subFs = Math.min(mh * 0.075, 2.8);
  s += textEl(tx, my + mh * 0.26 + subFs * 1.8, sub, { fs: subFs, bold: true, fam: 'sans', anchor: anc, fill: Color.dark(c1, 0.15) });
  // big value bottom
  const bigFs = Math.min(mh * 0.34, mw * 0.32);
  const big = cert.cube ? '1' : cert.pct + '%';
  if (landscape) {
    s += textEl(mx, my + mh, big, { fs: bigFs, bold: true, fam, anchor: 'start', fill: c1 });
    const bw = measure(big, bigFs, true, fam);
    s += textEl(mx + bw + 2.2, my + mh - bigFs * 0.42, `${cert.shares} share${cert.shares > 1 ? 's' : ''}`, { fs: subFs * 1.05, fam: 'sans', fill: ink, bold: true });
    s += textEl(mx + bw + 2.2, my + mh, cert.cube ? `${co.abbr || ''}` : cert.pres ? '= 1 certificate' : `${co.abbr || ''}`, { fs: subFs * 0.85, fam: 'sans', fill: '#6b645a' });
  } else {
    s += textEl(W / 2, my + mh * 0.78, big, { fs: bigFs, bold: true, fam, anchor: 'middle', fill: c1 });
    s += textEl(W / 2, my + mh * 0.78 + subFs * 1.9, `${cert.shares} share${cert.shares > 1 ? 's' : ''}`, { fs: subFs * 1.05, fam: 'sans', anchor: 'middle', fill: ink, bold: true });
  }
  s += textEl(landscape ? mx + mw : W - mx, landscape ? my + mh : H - H * 0.035, `${cert.n} / ${cert.of}`, { fs: subFs * 0.85, fam: 'sans', anchor: 'end', fill: '#8a8174' });
  return s;
}
function privateSVG(co, W, H, opt = {}) {
  const cs = CS(), fam = compFam(), classic = cs.theme === 'classic';
  const c1 = co.color, paper = classic ? '#fbf6e9' : '#ffffff', rad = Math.min(W, H) * 0.045;
  const id = 'pv' + (++_lgSeq);
  let s = roundRect(0, 0, W, H, rad, `fill="${paper}" stroke="${c1}" stroke-width="0.5"`) + `<clipPath id="${id}">${roundRect(0, 0, W, H, rad, '')}</clipPath>`;
  const bh = H * 0.24; s += `<g clip-path="url(#${id})"><rect width="${n2(W)}" height="${n2(bh)}" fill="${c1}"/></g>`;
  const lr = bh * 0.36; s += `<g transform="translate(${n2(bh * 0.55)} ${n2(bh / 2)})">${logoSVG(co, lr, opt)}</g>`;
  const tc = co.textColor || Color.contrast(c1); const x0 = bh * 1.05, maxW = W - x0 - 3;
  let fs = Math.min(bh * 0.36, 5); fs = Math.min(fs, fs * maxW / Math.max(1, measure(co.name, fs, true, fam)));
  s += textEl(x0, bh * 0.52, co.name, { fs, bold: true, fam, fill: tc });
  s += textEl(x0, bh * 0.82, 'PRIVATE COMPANY', { fs: Math.min(2.4, bh * 0.16), bold: true, fam: 'sans', fill: tc });
  const sf = Math.min(3, H * 0.055); let y = bh + sf * 2;
  if (co.cost) { s += textEl(4, y, 'Cost', { fs: sf * 0.85, fam: 'sans', fill: '#6b645a' }) + textEl(4, y + sf * 1.4, co.cost, { fs: sf * 1.6, bold: true, fam, fill: '#1d1a16' }); }
  if (co.revenue) { s += textEl(W - 4, y, 'Revenue', { fs: sf * 0.85, fam: 'sans', anchor: 'end', fill: '#6b645a' }) + textEl(W - 4, y + sf * 1.4, co.revenue, { fs: sf * 1.6, bold: true, fam, anchor: 'end', fill: c1 }); }
  y += sf * 3.2;
  const lines = wrapText(co.ability || co.notes || '', W - 8, sf, fam, false);
  const maxLines = Math.max(1, Math.floor((H - y - 2) / (sf * 1.25)));
  lines.slice(0, maxLines).forEach((l, i) => (s += textEl(4, y + i * sf * 1.25, l, { fs: sf, fam, fill: '#1d1a16' })));
  return s;
}
function charterSVG(co, W, H, opt = {}) {
  const cs = CS(), classic = cs.theme === 'classic', fam = compFam();
  const c1 = co.color, tc = co.textColor || Color.contrast(c1), paper = classic ? '#fbf6e9' : '#ffffff', ink = '#1d1a16', mute = '#6b645a';
  const rad = 3, pad = Math.min(W, H) * 0.05, id = 'ch' + (++_lgSeq);
  let s = roundRect(0, 0, W, H, rad, `fill="${paper}" stroke="${c1}" stroke-width="0.7"`) + `<clipPath id="${id}">${roundRect(0, 0, W, H, rad, '')}</clipPath>`;
  const hh = H * 0.2;
  s += `<g clip-path="url(#${id})"><rect width="${n2(W)}" height="${n2(hh)}" fill="${c1}"/>${classic ? waveOrnament(0, hh * 0.12, W, hh * 0.76, Color.light(c1, 0.18), 5) : ''}</g>`;
  const lr = hh * 0.38;
  s += `<g transform="translate(${n2(pad + lr)} ${n2(hh / 2)})">${logoSVG(co, lr, opt)}</g>`;
  const nx = pad + lr * 2 + pad * 0.6, nmax = W - nx - pad;
  let nfs = hh * 0.38; nfs = Math.min(nfs, nfs * nmax / Math.max(1, measure(co.name, nfs, true, fam)));
  s += textEl(nx, hh * 0.52, co.name, { fs: nfs, bold: true, fam, fill: tc });
  const kindTxt = (KIND_LABEL[co.kind] || '') + (co.abbr ? ' · ' + co.abbr : '') + (cs.game ? ' · ' + cs.game : '');
  s += textEl(nx, hh * 0.8, kindTxt.toUpperCase(), { fs: Math.min(3.2, hh * 0.13), bold: true, fam: 'sans', fill: tc });
  // info row
  let y = hh + pad * 0.85; const fs = Math.min(3.4, H * 0.024);
  const info = [];
  const homeTxt = homeLabel(co.home); if (homeTxt) info.push(['Home', homeTxt]);
  if (co.dest) info.push(['Destination', destLabel(co.dest)]);
  if (co.kind === 'major' || (co.kind === 'minor' && (co.shares || {}).minorCerts) || co.kind === 'cube') info.push(['Shares', shareSummary(co).replace(/ = .*/, '')]);
  if (co.par) info.push(['Par', co.par]);
  let ix = pad;
  info.forEach(([k, v]) => { const kw = measure(k + ': ', fs, true, 'sans'), vw = measure(v, fs, false, fam); if (ix + kw + vw > W - pad && ix > pad) { ix = pad; y += fs * 1.6; } s += textEl(ix, y, k + ':', { fs, bold: true, fam: 'sans', fill: mute }) + textEl(ix + kw, y, v, { fs, fam, fill: ink }); ix += kw + vw + fs * 2; });
  y += fs * 1.2;
  const label = (x, yy, t) => textEl(x, yy, t, { fs: fs * 0.9, bold: true, fam: 'sans', fill: Color.dark(c1, 0.2) });
  const footH = cs.orOn && co.kind !== 'cube' ? fs * 4.2 : 0;
  // tokens / cubes row
  if (co.kind === 'cube') {
    const n = Math.max(0, co.cubes || 0); y += fs * 1.6; s += label(pad, y, `TRACK (${n})`); y += fs * 0.8;
    const cz = Math.min(8, (W - 2 * pad) / Math.min(Math.max(n, 1), 14) * 0.85), per = Math.max(1, Math.floor((W - 2 * pad) / (cz * 1.15)));
    for (let i = 0; i < n; i++) { const cx = pad + (i % per) * cz * 1.15, cy = y + Math.floor(i / per) * cz * 1.1; s += `<g transform="translate(${n2(cx)} ${n2(cy)}) scale(${n2(cz / 100)})">${iconSVG('cube', c1)}</g>`; }
    y += Math.ceil(n / per) * cz * 1.1 + fs;
  } else if ((co.tokens || {}).count > 0) {
    const n = co.tokens.count, costs = String(co.tokens.costs || '').split(',').map((x) => x.trim());
    y += fs * 1.6; s += label(pad, y, 'STATION TOKENS'); y += fs * 0.6;
    const tr = Math.min(H * 0.065, (W - 2 * pad) / n / 2.6), gap = tr * 0.6;
    for (let i = 0; i < n; i++) {
      const cx = pad + tr + i * (2 * tr + gap), cy = y + tr + 1;
      s += `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(tr)}" fill="#ffffff" stroke="${c1}" stroke-width="0.35" stroke-dasharray="${i === 0 ? 'none' : '1 0.8'}"/>`;
      s += `<g transform="translate(${n2(cx)} ${n2(cy)})" opacity="${i === 0 ? 1 : 0.28}">${logoSVG(co, tr * 0.86, opt)}</g>`;
      const lab = costs[i] || ''; if (lab) s += textEl(cx, cy + tr + fs * 1.15, lab, { fs: fs * 0.9, bold: i === 0, fam: 'sans', anchor: 'middle', fill: ink });
    }
    y += tr * 2 + fs * 2.4;
  }
  // boxes
  const boxTop = y + fs * 0.6, boxH = Math.max(fs * 6, H - boxTop - pad - footH - (co.notes ? Math.min(H * 0.16, fs * 5) : 0));
  const tw = (W - 2 * pad) * (co.kind === 'cube' ? 0.5 : 0.36);
  s += roundRect(pad, boxTop, tw, boxH, 2, `fill="none" stroke="${Color.light(c1, 0.25)}" stroke-width="0.4"`) + label(pad + 2, boxTop + fs * 1.3, 'TREASURY');
  if (co.kind === 'cube') {
    const x2 = pad + tw + pad * 0.6, w2 = W - pad - x2;
    s += roundRect(x2, boxTop, w2, boxH, 2, `fill="none" stroke="${Color.light(c1, 0.25)}" stroke-width="0.4"`) + label(x2 + 2, boxTop + fs * 1.3, 'INCOME / DIVIDENDS');
  } else {
    const x2 = pad + tw + pad * 0.6, w2 = W - pad - x2, nT = Math.max(1, co.trains || 4);
    s += label(x2, boxTop + fs * 1.3 - fs * 0.2, 'TRAINS');
    const sg = 2, slotW = (w2 - sg * (nT - 1)) / nT, slotTop = boxTop + fs * 2.1, slotH = boxH - fs * 2.1;
    for (let i = 0; i < nT; i++) s += roundRect(x2 + i * (slotW + sg), slotTop, slotW, slotH, 1.6, `fill="${Color.light(c1, 0.93)}" stroke="${Color.light(c1, 0.3)}" stroke-width="0.35" stroke-dasharray="1.2 0.8"`);
  }
  let ny = boxTop + boxH + fs * 1.3;
  if (co.notes) {
    const lines = wrapText(co.notes, W - 2 * pad, fs * 0.92, fam, false).slice(0, 4);
    lines.forEach((l, i) => (s += textEl(pad, ny + i * fs * 1.2, l, { fs: fs * 0.92, fam, fill: ink, italic: true })));
    ny += lines.length * fs * 1.2;
  }
  if (co.kind === 'minor' && !(co.shares || {}).minorCerts) s += textEl(W - pad, hh + pad * 0.85, 'This charter is the company’s certificate', { fs: fs * 0.85, fam: 'sans', anchor: 'end', fill: mute, italic: true });
  if (footH) {
    const steps = String(cs.orSteps || '').split('\n').map((x) => x.trim()).filter(Boolean);
    const fy = H - pad * 0.55 - fs * 0.4; let fx = pad; const ffs = fs * 0.82;
    s += `<line x1="${n2(pad)}" y1="${n2(fy - fs * 1.6)}" x2="${n2(W - pad)}" y2="${n2(fy - fs * 1.6)}" stroke="${Color.light(c1, 0.4)}" stroke-width="0.3"/>`;
    steps.forEach((st, i) => {
      const t = st, w = measure(t, ffs, false, 'sans');
      if (fx + ffs * 1.6 + w > W - pad) return;
      s += `<circle cx="${n2(fx + ffs * 0.6)}" cy="${n2(fy - ffs * 0.35)}" r="${n2(ffs * 0.62)}" fill="${c1}"/>` + textEl(fx + ffs * 0.6, fy - ffs * 0.35 + ffs * 0.33, String(i + 1), { fs: ffs * 0.8, bold: true, fam: 'sans', anchor: 'middle', fill: tc });
      s += textEl(fx + ffs * 1.5, fy, t, { fs: ffs, fam: 'sans', fill: ink }); fx += ffs * 1.5 + w + ffs * 1.4;
    });
  }
  return s;
}

// ---------------- Home cities ----------------
function citySlotsOnMap() {
  const out = [];
  for (const k in P.hexes) {
    const [c, r] = unkey(k); if (!exists(c, r)) continue;
    (P.hexes[k].items || []).forEach((it, i) => {
      if (it.t !== 'city') return;
      const n = (CITY_LAYOUT[it.slots] || [0]).length;
      for (let sl = 0; sl < n; sl++) out.push({ ref: `${k}|${i}|${sl}`, label: `${coordLabel(c, r) || k}${it.name ? ' ' + it.name : ''}${n > 1 ? ` (slot ${sl + 1})` : ''}` });
    });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}
function revenueHexesOnMap() {
  const out = [];
  for (const k in P.hexes) {
    const [c, r] = unkey(k); if (!exists(c, r)) continue; const its = P.hexes[k].items || [];
    const nm = its.find((i) => i.name)?.name || its.find((i) => i.nm && i.text)?.text || '';
    if (its.some((i) => i.t === 'city' || i.t === 'town' || i.t === 'phases') || (hexType(P.hexes[k]) || {}).items?.some((i) => i.t === 'phases')) out.push({ ref: k, label: `${coordLabel(c, r) || k}${nm ? ' ' + nm : ''}` });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}
function homeLabel(ref) {
  if (!ref) return ''; const [k, i, sl] = ref.split('|'); const [c, r] = unkey(k); const it = P.hexes[k]?.items?.[+i];
  if (!it) return coordLabel(c, r) || k;
  return `${coordLabel(c, r) || k}${it.name ? ' ' + it.name : ''}`;
}
function destLabel(k) { if (!k) return ''; const [c, r] = unkey(k); const its = P.hexes[k]?.items || []; const nm = its.find((i) => i.name)?.name || its.find((i) => i.nm && i.text)?.text || ''; return `${coordLabel(c, r) || k}${nm ? ' ' + nm : ''}`; }
function homesAt(k, idx) {
  const m = {}; (P.companies || []).forEach((co) => { if (!co.home) return; const [hk, i, sl] = co.home.split('|'); if (hk === k && +i === idx) m[+sl] = co; });
  return m;
}
function fixHomesOnItemChange(k, mapIdx) {
  (P.companies || []).forEach((co) => {
    if (!co.home) return; const [hk, i, sl] = co.home.split('|'); if (hk !== k) return;
    const ni = mapIdx(+i); co.home = ni == null ? '' : `${hk}|${ni}|${sl}`;
  });
  if (typeof remapLinkItems === 'function') remapLinkItems(k, mapIdx);
}

function newCompanyShape() { const keep = P; try { P = P || { companies: [] }; return newCompany(0); } finally { P = keep; } }
