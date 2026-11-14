// ---------- Built-in icon library (100x100 box, centered at 50,50) ----------
// Each icon: key -> {label, color (default primary), cat, draw(c, h)} where h = color helpers
const ICONS = (() => {
  const S = (d, fill, stroke, sw, extra = '') =>
    `<path d="${d}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"` : ''}${extra}/>`;
  const L = (d, stroke, sw, extra = '') =>
    `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
  const I = {};
  const def = (key, label, cat, color, draw) => (I[key] = { key, label, cat, color, draw });

  // ---- Terrain ----
  def('mountain', 'Mountain', 'Terrain', '#8b6b4a', (c, h) =>
    S('M6 84 L38 26 L52 50 L63 34 L94 84 Z', c, h.dark(c, .45), 3) +
    S('M38 26 L30.2 40 L35 37.5 L39 41.5 L43 37.5 L46 40.6 Z', '#ffffff', null) +
    S('M63 34 L55.5 45 L59.5 43 L63 46 L66.5 43 L69.3 45 Z', '#ffffff', null));
  def('mountain1', 'Peak', 'Terrain', '#8b6b4a', (c, h) =>
    S('M10 84 L50 16 L90 84 Z', c, h.dark(c, .45), 3) +
    S('M50 16 L39 34.7 L45 31 L50 36 L55 31 L61 34.7 Z', '#ffffff', null));
  def('hills', 'Hills', 'Terrain', '#9fb35d', (c, h) =>
    S('M4 80 Q28 26 56 80 Z', c, h.dark(c, .4), 3) +
    S('M38 80 Q68 36 96 80 Z', h.dark(c, .12), h.dark(c, .4), 3));
  def('water', 'Water', 'Terrain', '#2f7fc1', (c) =>
    L('M10 34 q10 -10 20 0 t20 0 t20 0 t20 0', c, 6) +
    L('M10 52 q10 -10 20 0 t20 0 t20 0 t20 0', c, 6) +
    L('M10 70 q10 -10 20 0 t20 0 t20 0 t20 0', c, 6));
  def('lake', 'Lake', 'Terrain', '#4a9bd9', (c, h) =>
    `<ellipse cx="50" cy="54" rx="42" ry="27" fill="${c}" stroke="${h.dark(c, .4)}" stroke-width="3"/>` +
    L('M28 50 q6 -6 12 0 t12 0', h.light(c, .6), 4) + L('M48 62 q6 -6 12 0 t12 0', h.light(c, .6), 4));
  def('river', 'River', 'Terrain', '#2f7fc1', (c, h) =>
    L('M8 92 C 34 72, 18 52, 50 50 S 66 26, 92 8', h.dark(c, .35), 13) +
    L('M8 92 C 34 72, 18 52, 50 50 S 66 26, 92 8', c, 8));
  def('forest', 'Forest', 'Terrain', '#2e7d32', (c, h) => {
    const t = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">` +
      `<rect x="-4" y="22" width="8" height="12" fill="#6b4a2b"/>` +
      S('M0 -34 L18 -6 L9 -6 L24 22 L-24 22 L-9 -6 L-18 -6 Z', c, h.dark(c, .45), 3 / s) + '</g>';
    return t(32, 52, .85) + t(66, 46, 1);
  });
  def('tree', 'Tree', 'Terrain', '#5aa042', (c, h) =>
    `<rect x="45" y="52" width="10" height="36" fill="#6b4a2b"/>` +
    `<circle cx="50" cy="40" r="28" fill="${c}" stroke="${h.dark(c, .45)}" stroke-width="3"/>` +
    `<circle cx="40" cy="32" r="7" fill="${h.light(c, .25)}"/>`);
  def('palm', 'Jungle', 'Terrain', '#2f9e44', (c, h) =>
    L('M52 90 Q46 60 56 30', '#7a5230', 7) +
    S('M56 30 Q40 14 18 24 Q38 22 56 30 Z', c, h.dark(c, .4), 2.5) +
    S('M56 30 Q72 12 92 22 Q72 22 56 30 Z', c, h.dark(c, .4), 2.5) +
    S('M56 30 Q34 34 22 52 Q38 36 56 30 Z', c, h.dark(c, .4), 2.5) +
    S('M56 30 Q80 34 88 54 Q74 36 56 30 Z', c, h.dark(c, .4), 2.5));
  def('swamp', 'Swamp', 'Terrain', '#4f7a3a', (c) =>
    L('M10 80 q8 -7 16 0 t16 0 t16 0 t16 0 t16 0', '#3c83c4', 5) +
    L('M34 72 L30 30 M44 72 L46 20 M56 72 L62 34 M66 72 L73 46', c, 5) +
    `<ellipse cx="46" cy="28" rx="4.5" ry="11" fill="#6b4a2b"/><ellipse cx="62" cy="40" rx="4" ry="9" fill="#6b4a2b"/>`);
  def('desert', 'Desert', 'Terrain', '#5f9a3a', (c, h) =>
    L('M8 86 Q30 80 50 86 T92 86', '#c9a25c', 5) +
    `<rect x="42" y="14" width="16" height="72" rx="8" fill="${c}" stroke="${h.dark(c, .4)}" stroke-width="3"/>` +
    L('M42 56 H32 a6 6 0 0 1 -6 -6 V36', h.dark(c, .4), 15) + L('M42 56 H32 a6 6 0 0 1 -6 -6 V36', c, 10) +
    L('M58 46 H68 a6 6 0 0 0 6 -6 V26', h.dark(c, .4), 15) + L('M58 46 H68 a6 6 0 0 0 6 -6 V26', c, 10));
  def('grass', 'Plains', 'Terrain', '#6a994e', (c) => {
    const tuft = (x, y) => L(`M${x} ${y} l-8 -18 M${x} ${y} l0 -24 M${x} ${y} l8 -18`, c, 5);
    return tuft(28, 76) + tuft(52, 60) + tuft(74, 80);
  });
  def('snow', 'Snow', 'Terrain', '#5b9bd5', (c) => {
    let s = '';
    for (let i = 0; i < 3; i++) {
      s += `<g transform="rotate(${i * 60} 50 50)">` + L('M50 12 V88', c, 6) +
        L('M50 24 l-9 -9 M50 24 l9 -9 M50 76 l-9 9 M50 76 l9 9', c, 5) + '</g>';
    }
    return s;
  });
  def('cliff', 'Rough', 'Terrain', '#7d6e60', (c, h) =>
    S('M8 84 L20 50 L32 62 L44 30 L58 56 L70 40 L92 84 Z', c, h.dark(c, .45), 3) +
    L('M20 50 L26 70 M44 30 L48 60 M70 40 L74 64', h.dark(c, .35), 2.5));

  // ---- Features / Industry ----
  def('port', 'Port', 'Features', '#1d3557', (c) =>
    `<circle cx="50" cy="17" r="8" fill="none" stroke="${c}" stroke-width="6"/>` +
    L('M50 25 V86 M34 37 H66 M20 60 Q22 86 50 86 Q78 86 80 60', c, 7) +
    S('M12 64 L20 52 L28 64 Z', c, null) + S('M72 64 L80 52 L88 64 Z', c, null));
  def('mine', 'Mine', 'Features', '#4a4a4a', (c) =>
    `<g transform="rotate(40 50 50)"><rect x="46" y="22" width="8" height="70" rx="2" fill="#8b5a2b"/>` +
    S('M22 26 Q50 6 78 26 L74 30 Q50 16 26 30 Z', c, null) + '</g>' +
    `<g transform="rotate(-40 50 50)"><rect x="46" y="22" width="8" height="70" rx="2" fill="#8b5a2b"/>` +
    `<rect x="34" y="12" width="32" height="16" rx="3" fill="${c}"/></g>`);
  def('coal', 'Coal', 'Features', '#222222', (c, h) =>
    S('M14 80 L22 58 L40 52 L50 66 L44 82 Z', c, h.light(c, .3), 2) +
    S('M44 82 L50 66 L66 58 L84 66 L86 82 Z', h.light(c, .1), h.light(c, .3), 2) +
    S('M34 54 L42 34 L60 30 L68 46 L62 58 L50 64 Z', c, h.light(c, .3), 2));
  def('oil', 'Oil', 'Features', '#333333', (c) =>
    L('M30 88 L46 14 L54 14 L70 88 M36 62 H64 M40 42 H60 M34 72 L60 42 M66 72 L42 42 M22 88 H78', c, 5));
  def('factory', 'Factory', 'Features', '#8a5a44', (c, h) =>
    S('M8 86 V48 L28 60 V48 L48 60 V48 L66 60 V22 H80 V86 Z', c, h.dark(c, .45), 3) +
    `<rect x="16" y="68" width="8" height="8" fill="#ffe08a"/><rect x="36" y="68" width="8" height="8" fill="#ffe08a"/><rect x="56" y="68" width="8" height="8" fill="#ffe08a"/>` +
    `<circle cx="76" cy="14" r="5" fill="#9a9a9a"/><circle cx="86" cy="8" r="4" fill="#bbbbbb"/>`);
  def('farm', 'Grain', 'Features', '#d4a017', (c, h) => {
    let s = L('M50 92 V20', h.dark(c, .3), 4);
    for (let i = 0; i < 4; i++) {
      const y = 26 + i * 14;
      s += `<ellipse cx="40" cy="${y + 6}" rx="6" ry="10" transform="rotate(-35 40 ${y + 6})" fill="${c}"/>`;
      s += `<ellipse cx="60" cy="${y + 6}" rx="6" ry="10" transform="rotate(35 60 ${y + 6})" fill="${c}"/>`;
    }
    return s + `<ellipse cx="50" cy="16" rx="5" ry="9" fill="${c}"/>`;
  });
  def('cattle', 'Ranch', 'Features', '#7a4e2d', (c) =>
    S('M20 40 H70 Q82 40 84 30 L92 34 Q88 50 78 52 V78 H70 V62 H32 V78 H24 V56 Q14 52 20 40 Z', c, null) +
    S('M80 28 L84 18 M88 30 L94 22', 'none', c, 4));
  def('vineyard', 'Vineyard', 'Features', '#6a2c70', (c) => {
    let s = L('M50 10 Q56 18 50 26', '#4a7a2a', 5) + S('M54 18 Q70 8 76 20 Q64 26 54 18 Z', '#4a7a2a', null);
    const pts = [[38, 34], [50, 34], [62, 34], [44, 46], [56, 46], [38, 58], [50, 58], [62, 58], [44, 70], [56, 70], [50, 82]];
    pts.forEach(([x, y]) => (s += `<circle cx="${x}" cy="${y}" r="7" fill="${c}"/>`));
    return s;
  });
  def('cube', 'Goods cube', 'Features', '#d62828', (c, h) =>
    S('M50 14 L84 32 L50 50 L16 32 Z', h.light(c, .3), h.dark(c, .5), 2.5) +
    S('M16 32 L50 50 L50 88 L16 70 Z', c, h.dark(c, .5), 2.5) +
    S('M84 32 L50 50 L50 88 L84 70 Z', h.dark(c, .25), h.dark(c, .5), 2.5));
  def('coin', 'Money', 'Features', '#e9b824', (c, h) =>
    `<circle cx="50" cy="50" r="38" fill="${c}" stroke="${h.dark(c, .4)}" stroke-width="4"/>` +
    `<circle cx="50" cy="50" r="29" fill="none" stroke="${h.dark(c, .25)}" stroke-width="2"/>` +
    `<text x="50" y="65" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="44" fill="${h.dark(c, .5)}">$</text>`);

  // ---- Rail & settlements ----
  def('station', 'Station', 'Rail', '#c0504d', (c, h) =>
    S('M14 50 L50 18 L86 50 V88 H14 Z', c, h.dark(c, .45), 3) +
    `<rect x="42" y="62" width="16" height="26" fill="${h.dark(c, .55)}"/>` +
    `<rect x="22" y="58" width="12" height="12" fill="#ffe08a"/><rect x="66" y="58" width="12" height="12" fill="#ffe08a"/>`);
  def('skyline', 'Big city', 'Rail', '#4a5568', (c, h) =>
    S('M8 88 V56 H22 V40 H36 V62 H44 V22 H60 V50 H70 V34 H84 V60 H92 V88 Z', c, h.dark(c, .4), 2.5) +
    [[48, 30], [54, 30], [48, 40], [54, 40], [26, 48], [74, 42], [74, 52]].map(([x, y]) =>
      `<rect x="${x}" y="${y}" width="4" height="5" fill="#ffe08a"/>`).join(''));
  def('star', 'Capital', 'Rail', '#d62828', (c, h) => {
    const p = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 17 : 42;
      p.push((50 + r * Math.cos(a)).toFixed(1) + ' ' + (54 + r * Math.sin(a)).toFixed(1));
    }
    return S('M' + p.join(' L') + ' Z', c, h.dark(c, .4), 3);
  });
  def('loco', 'Locomotive', 'Rail', '#222222', (c, h) =>
    `<rect x="12" y="44" width="52" height="24" rx="3" fill="${c}"/>` +
    `<rect x="60" y="28" width="28" height="40" rx="2" fill="${c}"/><rect x="66" y="34" width="16" height="12" fill="#ffe08a"/>` +
    `<rect x="20" y="28" width="9" height="16" fill="${c}"/><rect x="17" y="24" width="15" height="6" fill="${c}"/>` +
    S('M8 68 L4 78 H14 Z', c, null) +
    `<circle cx="28" cy="76" r="9" fill="${h.light(c, .2)}" stroke="${c}" stroke-width="3"/><circle cx="50" cy="76" r="9" fill="${h.light(c, .2)}" stroke="${c}" stroke-width="3"/><circle cx="76" cy="76" r="7" fill="${h.light(c, .2)}" stroke="${c}" stroke-width="3"/>`);
  def('bridge', 'Bridge', 'Rail', '#7a6a5a', (c, h) =>
    S('M6 40 H94 V50 H86 Q78 64 70 64 Q62 64 54 50 H46 Q38 64 30 64 Q22 64 14 50 H6 Z', c, h.dark(c, .45), 2.5) +
    `<rect x="26" y="62" width="8" height="26" fill="${c}"/><rect x="66" y="62" width="8" height="26" fill="${c}"/>` +
    L('M4 92 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0', '#3c83c4', 4));
  def('tunnel', 'Tunnel', 'Rail', '#8b6b4a', (c, h) =>
    S('M8 88 V46 Q50 -6 92 46 V88 Z', c, h.dark(c, .45), 3) +
    S('M30 88 V60 Q50 34 70 60 V88 Z', '#1b1b1b', null) +
    L('M40 88 L44 68 M60 88 L56 68', '#9a9a9a', 3));
  def('ship', 'Ship', 'Rail', '#1d3557', (c, h) =>
    S('M10 62 H90 L78 82 H22 Z', c, h.dark(c, .4), 2.5) +
    `<rect x="48" y="14" width="4" height="48" fill="#5a3d22"/>` +
    S('M54 18 L82 56 H54 Z', '#f4f1e8', '#888', 2) + S('M46 26 L24 56 H46 Z', '#f4f1e8', '#888', 2) +
    L('M6 90 q8 -5 16 0 t16 0 t16 0 t16 0 t16 0 t16 0', '#3c83c4', 3.5));
  def('arrow', 'Off-board arrow', 'Rail', '#c62828', (c, h) =>
    S('M10 38 H56 V18 L92 50 L56 82 V62 H10 Z', c, h.dark(c, .4), 3));
  def('chevron', 'Exit chevron', 'Rail', '#222222', (c) =>
    S('M28 20 L62 50 L28 80 L40 80 L74 50 L40 20 Z', c, null));
  def('compass', 'Compass', 'Rail', '#333333', (c) =>
    `<circle cx="50" cy="50" r="40" fill="#ffffff" stroke="${c}" stroke-width="3"/>` +
    S('M50 8 L58 50 L50 92 L42 50 Z', '#ffffff', c, 2.5) +
    S('M50 8 L58 50 L42 50 Z', c, null) +
    S('M8 50 L50 44 L92 50 L50 56 Z', '#ffffff', c, 2) +
    `<text x="50" y="7" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="13" fill="${c}">N</text>`);
  def('anchorpt', 'Lighthouse', 'Rail', '#c62828', (c) =>
    S('M40 88 L44 30 H56 L60 88 Z', '#ffffff', '#333', 2.5) +
    `<rect x="42" y="44" width="16" height="10" fill="${c}"/><rect x="41" y="66" width="18" height="10" fill="${c}"/>` +
    `<rect x="42" y="18" width="16" height="12" fill="#ffe08a" stroke="#333" stroke-width="2.5"/>` +
    S('M38 18 L50 8 L62 18 Z', c, '#333', 2.5) + L('M30 22 L10 16 M70 22 L90 16', '#f2b705', 3));
  return I;
})();

const ICON_CATS = ['Terrain', 'Features', 'Rail'];

// color helpers
const Color = {
  parse(c) {
    if (!c || c[0] !== '#') return [128, 128, 128];
    let h = c.slice(1);
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  },
  hex(r, g, b) {
    return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  },
  dark(c, a) { const [r, g, b] = Color.parse(c); return Color.hex(r * (1 - a), g * (1 - a), b * (1 - a)); },
  light(c, a) { const [r, g, b] = Color.parse(c); return Color.hex(r + (255 - r) * a, g + (255 - g) * a, b + (255 - b) * a); },
  lum(c) { const [r, g, b] = Color.parse(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; },
  contrast(c) { return Color.lum(c) > 0.55 ? '#111111' : '#ffffff'; },
};

function iconSVG(key, color) {
  const ic = ICONS[key];
  if (!ic) return '';
  return ic.draw(color || ic.color, Color);
}
