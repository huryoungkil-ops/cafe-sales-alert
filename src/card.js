// 보고서 이미지 — 사이트의 보고서 카드와 같은 디자인을 SVG 로 그려 PNG 로 굽는다 (resvg + Pretendard).
//   full   : 전체 보고서 (디스코드 첨부)
//   square : 핵심만 정사각 (카카오톡 카드 — 카톡은 세로로 긴 그림을 잘라 보여 준다)
// 그림 안에는 이모지를 쓰지 않는다 (서버에 컬러 이모지 글꼴이 없음) — 아이콘은 도형으로 그린다.
const path = require('node:path');
const fs = require('node:fs');
const R = require('./report');

const FONT_DIR = path.join(__dirname, '..', 'fonts');
const FONTS = fs.existsSync(FONT_DIR) ? fs.readdirSync(FONT_DIR).filter((f) => f.endsWith('.otf')).map((f) => path.join(FONT_DIR, f)) : [];
const W = 720, PAD = 40, IN = W - PAD * 2;
const C = { bg: '#110b07', card1: '#22170f', card2: '#1a120c', line: '#33251a', text: '#fbf3ea', mute: '#c4ad98', dim: '#8d7563', cara: '#ffb35c', cream: '#ffe2b8', up: '#5fe3a1', down: '#ff7f7f', track: '#2b1e14', box: '#24190f', cold: '#7cc7ff', hot: '#ff9d6c', other: '#c9b29c' };
const fmt = R.fmt;
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 글자 폭 어림 (Pretendard) — 가운데·오른쪽 정렬 말고 «글자 뒤에 이어 붙일 때» 만 쓴다
function textW(s, size, weight = 700) {
  let w = 0;
  for (const ch of String(s)) {
    if (/[0-9]/.test(ch)) w += 0.6;
    else if (/[,.:]/.test(ch)) w += 0.27;
    else if (/[가-힣ㄱ-ㅎ]/.test(ch)) w += 0.93;
    else if (ch === ' ') w += 0.27;
    else if (/[A-Z▲▼%]/.test(ch)) w += 0.68;
    else w += 0.55;
  }
  return w * size * (weight >= 800 ? 1.04 : 1);
}
const T = (x, y, s, size, { w = 700, fill = C.text, anchor = 'start', ls = 0 } = {}) =>
  `<text x="${x}" y="${y}" font-family="Pretendard" font-size="${size}" font-weight="${w}" fill="${fill}" text-anchor="${anchor}"${ls ? ` letter-spacing="${ls}"` : ''}>${esc(s)}</text>`;
const rect = (x, y, w, h, r, fill, extra = '') => `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" rx="${r}" fill="${fill}" ${extra}/>`;
const cut = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));

// 작은 아이콘 (도형)
const ICON = {
  cup: (x, y, c = C.cara) => `<g transform="translate(${x},${y})"><path d="M2 8h16v6a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7z" fill="${c}"/><path d="M18 10h2a3 3 0 0 1 0 6h-2" fill="none" stroke="${c}" stroke-width="2"/></g>`,
  chart: (x, y) => `<g transform="translate(${x},${y})"><rect x="1" y="12" width="5" height="9" rx="1.5" fill="#8a5a33"/><rect x="9" y="7" width="5" height="14" rx="1.5" fill="#c4823f"/><rect x="17" y="2" width="5" height="19" rx="1.5" fill="${C.cara}"/></g>`,
  trophy: (x, y) => `<g transform="translate(${x},${y})"><path d="M5 2h14v6a7 7 0 0 1-14 0z" fill="${C.cara}"/><path d="M5 4H1v2a4 4 0 0 0 4 4M19 4h4v2a4 4 0 0 1-4 4" fill="none" stroke="${C.cara}" stroke-width="2"/><rect x="10" y="14" width="4" height="4" fill="${C.cara}"/><rect x="6" y="18" width="12" height="3" rx="1" fill="${C.cara}"/></g>`,
  drop: (x, y) => `<g transform="translate(${x},${y})"><path d="M12 1C8 7 5 11 5 15a7 7 0 0 0 14 0c0-4-3-8-7-14z" fill="#ff9d6c"/></g>`,
  cal: (x, y) => `<g transform="translate(${x},${y})"><rect x="1" y="4" width="22" height="18" rx="4" fill="${C.cara}"/><rect x="1" y="4" width="22" height="6" rx="3" fill="#ff8a3d"/><rect x="6" y="1" width="3" height="6" rx="1.5" fill="${C.cream}"/><rect x="15" y="1" width="3" height="6" rx="1.5" fill="${C.cream}"/></g>`,
};

function chipSvg(x, y, now, before) {
  if (!before) return { svg: '', w: 0 };
  const c = R.change(now, before);
  const up = c.startsWith('▲');
  const w = textW(c, 30, 900) + 34;
  return { w, svg: rect(x, y - 36, w, 50, 25, up ? 'rgba(95,227,161,0.13)' : 'rgba(255,127,127,0.13)') + T(x + w / 2, y - 1, c, 30, { w: 900, fill: up ? C.up : C.down, anchor: 'middle' }) };
}

function header(y, left, store, icon) {
  return ICON[icon](PAD, y - 22) + T(PAD + 34, y, left, 23, { w: 800, fill: C.cara }) + T(W - PAD, y, cut(store, 16), 22, { w: 600, fill: C.mute, anchor: 'end' });
}

function bigNumber(y, label, money, prev) {
  let s = T(PAD, y, label, 20, { w: 500, fill: C.mute });
  const ny = y + 86;
  // «원» 은 같은 글줄에 이어 붙이고(글자 폭을 어림하지 않게), 증감 칩은 오른쪽 끝에 붙인다
  s += `<text x="${PAD - 2}" y="${ny}" font-family="Pretendard" fill="${C.text}"><tspan font-size="84" font-weight="900" letter-spacing="-3">${fmt(money)}</tspan><tspan dx="12" font-size="32" font-weight="700" fill="${C.mute}">원</tspan></text>`;
  const chip = chipSvg(W - PAD - chipSvg(0, 0, money, prev).w, ny - 12, money, prev);
  return { svg: s + chip.svg, y: ny };
}

function monthBox(y, m) {
  const h = 150;
  let s = rect(PAD, y, IN, h, 24, 'rgba(255,179,92,0.06)', `stroke="rgba(255,179,92,0.22)" stroke-width="1.5"`);
  s += T(PAD + 26, y + 46, '이번 달 누적', 22, { w: 500, fill: C.text });
  s += T(PAD + 26 + textW('이번 달 누적 ', 22, 500), y + 46, `${fmt(m.money)}원`, 22, { w: 800 });
  if (m.projected) {
    s += T(W - PAD - 26, y + 46, `${fmt(m.projected)}원`, 22, { w: 800, fill: C.cara, anchor: 'end' });
    s += T(W - PAD - 26 - textW(`${fmt(m.projected)}원`, 22, 800) - 8, y + 46, '예상', 22, { w: 500, anchor: 'end' });
  } else s += T(W - PAD - 26, y + 46, '마감', 22, { w: 800, fill: C.cara, anchor: 'end' });
  const bw = IN - 52, pct = m.dom / m.dim;
  s += rect(PAD + 26, y + 70, bw, 16, 8, C.track);
  s += rect(PAD + 26, y + 70, Math.max(16, bw * pct), 16, 8, 'url(#prog)');
  s += T(PAD + 26, y + 124, `${m.dom}일째 / ${m.dim}일`, 20, { w: 500, fill: C.mute });
  if (m.mileage != null) s += T(W - PAD - 26, y + 124, `포인트 ${fmt(m.mileage)}P`, 20, { w: 500, fill: C.mute, anchor: 'end' });
  return { svg: s, y: y + h };
}

function sectionTitle(y, icon, text) {
  return ICON[icon](PAD, y - 21) + T(PAD + 34, y, text, 24, { w: 800 });
}

function barsSvg(y, recent, hi, h = 190) {
  const n = recent.length, gap = 8, bw = (IN - gap * (n - 1)) / n;
  const max = Math.max(...recent.map((r) => r.money), 1);
  let s = '';
  recent.forEach((r, i) => {
    const x = PAD + i * (bw + gap);
    const bh = Math.max(8, Math.round(r.money / max * h));
    const we = ['토', '일'].includes(R.dow(r.date));
    const isHi = r.date === hi;
    if (isHi) s += rect(x - 4, y + h - bh - 4, bw + 8, bh + 8, 12, 'rgba(255,179,92,0.18)');
    s += rect(x, y + h - bh, bw, bh, 9, isHi ? 'url(#hi)' : we ? '#5d4027' : '#4a3423');
    s += T(x + bw / 2, y + h + 30, String(Number(r.date.slice(8))), 17, { w: 500, fill: C.dim, anchor: 'middle' });
  });
  return { svg: s, y: y + h + 34 };
}

function splitSvg(y, st) {
  if (!st.total) return { svg: '', y };
  let s = '', x = PAD;
  const parts = [[st.cold, C.cold], [st.hot, C.hot], [st.other, C.other]];
  s += `<clipPath id="sp"><rect x="${PAD}" y="${y}" width="${IN}" height="18" rx="9"/></clipPath><g clip-path="url(#sp)">${rect(PAD, y, IN, 18, 0, C.track)}`;
  for (const [n, c] of parts) { const w = IN * n / st.total; s += rect(x, y, w, 18, 0, c); x += w; }
  s += '</g>';
  let lx = PAD;
  for (const [label, n, c] of [['차가운', st.cold, C.cold], ['따뜻한', st.hot, C.hot], ['기타', st.other, C.other]]) {
    s += rect(lx, y + 40, 16, 16, 4, c) + T(lx + 24, y + 55, `${label} ${fmt(n)}`, 20, { w: 500, fill: C.mute });
    lx += 24 + textW(`${label} ${fmt(n)}`, 20, 500) + 28;
  }
  return { svg: s, y: y + 66 };
}

function topSvg(y, st) {
  if (!st.top5.length) return { svg: T(PAD, y + 30, '판매 내역 없음', 20, { w: 500, fill: C.mute }), y: y + 50 };
  const max = st.top5[0].money || 1;
  let s = '';
  st.top5.forEach((t, i) => {
    const ry = y + i * 74;
    s += rect(PAD, ry + 4, 36, 36, 10, i === 0 ? 'url(#hi)' : C.track) + T(PAD + 18, ry + 30, String(i + 1), 19, { w: 900, fill: i === 0 ? '#2a1205' : C.cream, anchor: 'middle' });
    const right = `${fmt(t.count)}${R.unit(t.name)} · ${fmt(t.money)}원`;
    s += T(PAD + 52, ry + 28, cut(t.name, Math.max(6, Math.floor((IN - 52 - textW(right, 20, 500) - 20) / 21))), 22, { w: 700 });
    s += T(W - PAD, ry + 28, right, 20, { w: 500, fill: C.mute, anchor: 'end' });
    s += rect(PAD + 52, ry + 44, IN - 52, 9, 4.5, C.track) + rect(PAD + 52, ry + 44, Math.max(9, (IN - 52) * t.money / max), 9, 4.5, 'url(#bar)');
  });
  return { svg: s, y: y + st.top5.length * 74 };
}

function adeSvg(y, ade, user) {
  const gap = 12, bw = (IN - gap * 2) / 3, h = 128;
  let s = '';
  ade.forEach((a, i) => {
    const x = PAD + i * (bw + gap);
    const zero = !a.cups;
    s += rect(x, y, bw, h, 18, zero ? 'rgba(255,127,127,0.07)' : C.box, `stroke="${zero ? 'rgba(255,127,127,0.5)' : C.line}" stroke-width="1.5"`);
    const nm = R.adeName(user, i);
    s += T(x + 20, y + 36, `${i + 1}번${nm ? ' ' + nm : ''}`, 19, { w: 500, fill: C.mute });
    s += T(x + 20, y + 78, zero ? '0잔' : `${fmt(a.cups)}잔`, 32, { w: 900, fill: zero ? C.down : C.text });
    if (zero) s += `<g transform="translate(${x + 20 + textW('0잔', 32, 900) + 10},${y + 52})"><path d="M14 2 L27 26 H1 Z" fill="#ffcc4d"/><rect x="12.5" y="10" width="3" height="9" rx="1.5" fill="#3a2a00"/><circle cx="14" cy="22" r="1.8" fill="#3a2a00"/></g>`;
    s += T(x + 20, y + 110, zero ? '시럽·연결 확인' : `펌프 ${fmt(a.secs)}초`, 18, { w: 500, fill: C.dim });
  });
  return { svg: s, y: y + h };
}

function kvSvg(y, items) {
  const gap = 12, n = items.length, bw = (IN - gap * (n - 1)) / n, h = 100;
  let s = '';
  items.forEach(([k, v], i) => {
    const x = PAD + i * (bw + gap);
    s += rect(x, y, bw, h, 18, C.box, `stroke="${C.line}" stroke-width="1.5"`);
    s += T(x + 18, y + 38, k, 18, { w: 500, fill: C.mute });
    s += T(x + 18, y + 76, cut(v, 14), n > 2 ? 21 : 24, { w: 800 });
  });
  return { svg: s, y: y + h };
}

// ── 조립 ──
function build(d, user = {}, variant = 'full') {
  const parts = [];
  let y = PAD + 36;
  const add = (r, gapAfter = 0) => { parts.push(r.svg); y = r.y + gapAfter; };
  if (d.kind === 'monthly') {
    const m = Number(d.ym.slice(5));
    parts.push(header(y, `${d.ym.slice(0, 4)}년 ${m}월 결산`, d.store, 'cal'));
    add(bigNumber(y + 44, '월 매출', d.money, d.prevMoney), 22);
    const kv = [];
    if (d.prevMoney) kv.push(['지난달', `${fmt(d.prevMoney)}원`]);
    kv.push(['하루 평균', `${fmt(d.avg)}원`]);
    if (d.best) kv.push([`최고의 날 ${R.dayLabel(d.best.date)}`, `${fmt(d.best.money)}원`]);
    add(kvSvg(y + 8, kv.slice(0, 3)), 44);
    if (variant === 'full') {
      parts.push(sectionTitle(y + 10, 'cup', `${fmt(d.stats.total)}잔 팔렸어요`));
      add(splitSvg(y + 34, d.stats), 34);
      parts.push(sectionTitle(y + 10, 'trophy', `${m}월 Top 5`));
      add(topSvg(y + 30, d.stats), 4);
    } else {
      parts.push(sectionTitle(y + 10, 'trophy', `${m}월 Top 3`));
      add(topSvg(y + 30, { ...d.stats, top5: d.stats.top5.slice(0, 3) }), 4);
    }
  } else {
    parts.push(header(y, `어제 매출 · ${R.dayLabel(d.date)}`, d.store, 'cup'));
    add(bigNumber(y + 44, '어제 매출', d.day.money, d.lastWeek && d.lastWeek.money), 0);
    const sub = d.lastWeek ? `지난주 ${R.dow(d.lastWeek.date)}요일(${R.dayLabel(d.lastWeek.date)}) ${fmt(d.lastWeek.money)}원 대비${d.day.mileage != null ? ` · 포인트 ${fmt(d.day.mileage)}P` : ''}` : d.day.mileage != null ? `포인트 ${fmt(d.day.mileage)}P` : '';
    if (sub) { parts.push(T(PAD, y + 42, sub, 20, { w: 500, fill: C.mute })); y += 42; }
    add(monthBox(y + 28, d.month), 44);
    if (d.recent && d.recent.length > 1) {
      parts.push(sectionTitle(y + 10, 'chart', `최근 ${d.recent.length}일`));
      add(barsSvg(y + 34, d.recent, d.date, variant === 'full' ? 190 : 170), 30);
    }
    if (variant === 'full') {
      parts.push(sectionTitle(y + 14, 'cup', `${fmt(d.stats.total)}잔 팔렸어요`));
      add(splitSvg(y + 38, d.stats), 40);
      parts.push(sectionTitle(y + 10, 'trophy', '어제 Top 5'));
      add(topSvg(y + 30, d.stats), 10);
      if (d.ade) { parts.push(sectionTitle(y + 20, 'drop', '에이드 펌프')); add(adeSvg(y + 42, d.ade, user), 0); }
    }
  }
  y += 34;
  parts.push(`<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="${C.line}" stroke-width="1.5"/>`);
  parts.push(T(PAD, y + 38, '유로머신 매출 알리미', 18, { w: 800, fill: C.cara }) + T(W - PAD, y + 38, new URL(require('./env').PUBLIC_BASE).host, 18, { w: 500, fill: C.dim, anchor: 'end' }));
  const H = Math.round(y + 38 + PAD - 4);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<linearGradient id="bgc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.card1}"/><stop offset="1" stop-color="${C.card2}"/></linearGradient>
<linearGradient id="prog" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.cream}"/><stop offset=".55" stop-color="${C.cara}"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient>
<linearGradient id="hi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.cream}"/><stop offset="1" stop-color="${C.cara}"/></linearGradient>
<linearGradient id="bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a5a33"/><stop offset="1" stop-color="${C.cara}"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="${C.bg}"/>
<rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="30" fill="url(#bgc)" stroke="${C.line}" stroke-width="1.5"/>
${parts.join('\n')}
</svg>`;
}

// PNG 로 굽기 (2배 해상도). 같은 보고서는 메모리에 잠깐 둔다
const cache = new Map();
function png(d, user, variant = 'full') {
  const key = JSON.stringify([d.kind, d.date || d.ym, d.store, variant, user.ade_names || '', d.day && d.day.money, d.money]);
  if (cache.has(key)) return cache.get(key);
  const { Resvg } = require('@resvg/resvg-js');
  const r = new Resvg(build(d, user, variant), { fitTo: { mode: 'width', value: W * 2 }, font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Pretendard' } });
  const out = r.render().asPng();
  cache.set(key, out);
  if (cache.size > 60) cache.delete(cache.keys().next().value);
  return out;
}

// PNG 크기 (2배) — 카톡 카드에 가로·세로를 알려 줘야 비율대로 보인다
function size(d, user, variant = 'full') {
  const h = Number((build(d, user, variant).match(/height="(\d+)"/) || [])[1]) || W;
  return { width: W * 2, height: h * 2 };
}

module.exports = { build, png, size, W };
