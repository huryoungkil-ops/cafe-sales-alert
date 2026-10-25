// 보고서 만들기 — 유로에서 숫자를 모아 «어제 매출»(매일) · «지난달 결산»(매월 1일) 데이터와 알림 문구를 만든다.
const { run, all, one } = require('./db');
const { PUBLIC_BASE } = require('./env');

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('ko-KR');
const pad = (n) => String(n).padStart(2, '0');

// 한국 날짜 (offset 일 뒤). 서버 시간대와 상관없이 KST 로 계산한다
function kstDate(offset = 0, base = Date.now()) {
  return new Date(base + 9 * 3600e3 + offset * 86400e3).toISOString().slice(0, 10);
}
const addDays = (date, n) => new Date(Date.parse(date + 'T00:00:00Z') + n * 86400e3).toISOString().slice(0, 10);
const dow = (date) => DOW[new Date(date + 'T00:00:00Z').getUTCDay()];
const dayLabel = (date) => `${Number(date.slice(5, 7))}/${Number(date.slice(8))}(${dow(date)})`;
const daysIn = (ym) => new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate();
const prevMonth = (ym) => { const [y, m] = ym.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`; };
const unit = (name) => (/상품권/.test(name || '') ? '장' : '잔');

// «10/24(토)» → 2026-10-24 (오늘보다 뒤면 작년)
function parseMd(md, today) {
  const m = String(md).match(/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  let y = Number(today.slice(0, 4));
  const d = `${y}-${pad(m[1])}-${pad(m[2])}`;
  return d > today ? `${y - 1}-${pad(m[1])}-${pad(m[2])}` : d;
}

// 판매 잔수(차가운·따뜻한·기타) + 매출 금액순 Top 5 (마일리지 차감 행 product_idx 0 은 뺀다)
function buildStats(c = {}, p = {}) {
  const cold = (c.paid_cold_count || 0) + (c.free_cold_count || 0);
  const hot = (c.paid_hot_count || 0) + (c.free_hot_count || 0);
  const other = (c.paid_other_count || 0) + (c.free_other_count || 0);
  const menus = (p.product_list || [])
    .filter((x) => Number(x.product_idx) !== 0)
    .map((x) => ({ name: String(x.product_name).trim(), count: Number(x.product_count) || 0, money: Number(x.product_money) || 0 }))
    .sort((a, b) => b.money - a.money || b.count - a.count);
  return { total: cold + hot + other, cold, hot, other, top5: menus.slice(0, 5), menuCount: menus.length };
}

// 에이드 1·2·3번 사용량 — 메뉴 레시피(펌프 초) × 판매 잔수. 두 에이드를 섞는 메뉴는 양쪽에 센다
function buildAde(p = {}, recipes) {
  const slots = [0, 1, 2].map(() => ({ cups: 0, secs: 0, menus: {} }));
  for (const x of p.product_list || []) {
    const pump = recipes.get(Number(x.product_idx));
    const n = Number(x.product_count) || 0;
    if (!pump || !n) continue;
    pump.forEach((sec, i) => {
      if (!sec) return;
      const s = slots[i], name = String(x.product_name).trim();
      s.cups += n; s.secs += sec * n; s.menus[name] = (s.menus[name] || 0) + n;
    });
  }
  return slots;
}

// 유로 «최근 10일» 을 쌓아 둔다
function saveDays(userId, list, today) {
  for (const x of list) {
    const date = parseMd(x.day, today);
    if (!date) continue;
    run('INSERT INTO days(user_id,date,money,mileage) VALUES(?,?,?,?) ON CONFLICT(user_id,date) DO UPDATE SET money=excluded.money, mileage=excluded.mileage',
      userId, date, Number(x.money) || 0, Number(x.mileage) || 0);
  }
}
const storedDay = (userId, date) => one('SELECT * FROM days WHERE user_id=? AND date=?', userId, date);
function storedMonth(userId, ym) {
  const rows = all("SELECT * FROM days WHERE user_id=? AND substr(date,1,7)=? AND date<? ORDER BY date", userId, ym, kstDate(0));
  return rows;
}

const storeName = (devices) => [...new Set(devices.map((d) => String(d.target_name || d.name || '').trim()).filter(Boolean))].join(' · ') || '내 매장';

// ── 매일: date(보통 어제) 하루 ──
async function buildDaily(euro, user, date, { today = kstDate(0) } = {}) {
  const ym = date.slice(0, 7);
  const devices = await euro.devices();
  saveDays(user.id, await euro.recentDays(), today);
  const [drinks, prods, monthMoney] = await Promise.all([
    euro.drinks(date, date), euro.products(date, date), euro.money(ym + '-01', date),
  ]);
  let day = storedDay(user.id, date);
  if (!day) day = { money: await euro.money(date, date), mileage: null };
  // 이번 달 포인트: 같은 달이면 «이번 달 − 오늘», 아니면(1일 아침) 쌓아 둔 날짜들이 다 있을 때만
  let monthMileage = null;
  if (ym === today.slice(0, 7)) {
    const all2 = await euro.salesAll();
    const t = storedDay(user.id, today);
    monthMileage = (Number(all2.month_mileage) || 0) - (t ? t.mileage : 0);
  } else {
    const rows = storedMonth(user.id, ym).filter((r) => r.date <= date);
    if (rows.length === Number(date.slice(8))) monthMileage = rows.reduce((a, r) => a + (r.mileage || 0), 0);
  }
  const lw = storedDay(user.id, addDays(date, -7));
  const dom = Number(date.slice(8)), dim = daysIn(ym);
  let ade = null;
  if (user.ade_on) {
    try {
      // 에이드 펌프를 쓰는 메뉴가 아예 없는 매장은 줄을 안 보인다. 레시피는 매번 새로 읽어 메뉴 교체를 따라간다
      const rec = await euro.recipes(devices);
      if (rec.size) ade = buildAde(prods, rec);
    } catch { ade = null; }
  }
  const recent = all('SELECT date, money FROM days WHERE user_id=? AND date<=? ORDER BY date DESC LIMIT 14', user.id, date).reverse();
  return {
    kind: 'daily', date, store: storeName(devices),
    day: { money: day.money, mileage: day.mileage },
    lastWeek: lw ? { date: lw.date, money: lw.money } : null,
    month: { ym, money: monthMoney, mileage: monthMileage, dom, dim, projected: dom < dim ? Math.round(monthMoney / dom * dim) : null },
    stats: buildStats(drinks, prods), ade, recent,
  };
}

// ── 매월 1일: 지난달 ──
async function buildMonthly(euro, user, ym, { today = kstDate(0) } = {}) {
  const start = ym + '-01', end = `${ym}-${pad(daysIn(ym))}`;
  const pm = prevMonth(ym);
  const devices = await euro.devices();
  saveDays(user.id, await euro.recentDays(), today);
  const [money, prevMoney, drinks, prods] = await Promise.all([
    euro.money(start, end), euro.money(pm + '-01', `${pm}-${pad(daysIn(pm))}`), euro.drinks(start, end), euro.products(start, end),
  ]);
  const rows = all("SELECT * FROM days WHERE user_id=? AND substr(date,1,7)=? ORDER BY date", user.id, ym);
  const complete = rows.length === daysIn(ym);
  const best = rows.length ? rows.reduce((a, r) => (r.money > a.money ? r : a)) : null;
  return {
    kind: 'monthly', ym, store: storeName(devices),
    money, prevMoney, mileage: complete ? rows.reduce((a, r) => a + (r.mileage || 0), 0) : null,
    avg: Math.round(money / daysIn(ym)), best: best ? { date: best.date, money: best.money } : null,
    stats: buildStats(drinks, prods),
  };
}

// ── 문구 ──
function change(now, before) {
  if (!before) return '';
  const p = (now - before) / before * 100;
  return `${p >= 0 ? '▲' : '▼'}${Math.abs(p).toFixed(0)}%`;
}
const reportUrl = (token) => `${PUBLIC_BASE}/r/${token}`;
const adeName = (user, i) => (String(user.ade_names || '').split(',')[i] || '').trim();

function adeLines(d, user) {
  if (!d.ade) return [];
  const out = ['', '🍹 **에이드 사용량**'];
  d.ade.forEach((s, i) => {
    const label = `${i + 1}번${adeName(user, i) ? ' ' + adeName(user, i) : ''}`;
    if (!s.cups) return out.push(`${label} — 0잔 ⚠️`);
    const menus = Object.entries(s.menus).sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n} ${c}`).join(' · ');
    out.push(`${label} — ${fmt(s.cups)}잔 · 펌프 ${fmt(s.secs)}초  (${menus})`);
  });
  return out;
}

function topLines(st, title) {
  const out = ['', `총 판매 ${fmt(st.total)}잔  (차가운 ${fmt(st.cold)} · 따뜻한 ${fmt(st.hot)} · 기타 ${fmt(st.other)})`, '', `🏆 **${title}**`];
  if (!st.top5.length) out.push('판매 내역 없음');
  st.top5.forEach((t, i) => out.push(`${i + 1}. ${t.name} — ${fmt(t.count)}${unit(t.name)} · ${fmt(t.money)}원`));
  return out;
}

function discordText(d, user, token) {
  if (d.kind === 'monthly') {
    const [y, m] = d.ym.split('-');
    return [
      `📅 **${d.store} ${y}년 ${Number(m)}월 결산**`, '',
      `월 매출: **${fmt(d.money)}원**${d.prevMoney ? `  (지난달 ${fmt(d.prevMoney)}원 대비 ${change(d.money, d.prevMoney)})` : ''}`,
      d.mileage != null ? `포인트 사용: ${fmt(d.mileage)}P` : null,
      `하루 평균: ${fmt(d.avg)}원${d.best ? `  · 최고 ${dayLabel(d.best.date)} ${fmt(d.best.money)}원` : ''}`,
      ...topLines(d.stats, `${Number(m)}월 Top 5`),
      '', `📊 자세히 보기: ${reportUrl(token)}`,
    ].filter((x) => x !== null).join('\n');
  }
  const lw = d.lastWeek ? `  · 지난주 ${dow(d.lastWeek.date)}요일보다 ${change(d.day.money, d.lastWeek.money)}` : '';
  return [
    `☕ **${d.store} 매출** — ${dayLabel(d.date)}`, '',
    `어제 매출: **${fmt(d.day.money)}원**${d.day.mileage != null ? `  (포인트 ${fmt(d.day.mileage)}P)` : ''}${lw}`,
    `이번 달 누적: ${fmt(d.month.money)}원${d.month.mileage != null ? `  (포인트 ${fmt(d.month.mileage)}P)` : ''}`,
    d.month.projected ? `이번 달 예상: ${fmt(d.month.projected)}원` : `이번 달 마감: ${fmt(d.month.money)}원`,
    ...topLines(d.stats, '어제 Top 5'),
    ...adeLines(d, user),
    '', `📊 자세히 보기: ${reportUrl(token)}`,
  ].join('\n');
}

// 카카오 «나에게 보내기» 텍스트는 200자까지 — 핵심만, 나머지는 버튼으로
function kakaoText(d) {
  if (d.kind === 'monthly') {
    const m = Number(d.ym.slice(5));
    const top = d.stats.top5[0];
    return [`📅 ${d.store} ${m}월 결산`, `월 매출 ${fmt(d.money)}원${d.prevMoney ? ' ' + change(d.money, d.prevMoney) : ''}`, `하루 평균 ${fmt(d.avg)}원`, top ? `1위 ${top.name} ${fmt(top.count)}${unit(top.name)}` : null].filter(Boolean).join('\n').slice(0, 195);
  }
  const top = d.stats.top5[0];
  return [
    `☕ ${d.store} ${dayLabel(d.date)}`,
    `어제 ${fmt(d.day.money)}원${d.lastWeek ? ' ' + change(d.day.money, d.lastWeek.money) : ''}`,
    `이번달 ${fmt(d.month.money)}원`,
    d.month.projected ? `예상 ${fmt(d.month.projected)}원` : null,
    top ? `1위 ${top.name} ${fmt(top.count)}${unit(top.name)}` : null,
    d.ade && d.ade.some((s) => !s.cups) ? '⚠️ 0잔인 에이드가 있어요' : null,
  ].filter(Boolean).join('\n').slice(0, 195);
}

// 이미지와 함께 보낼 짧은 글 (자세한 숫자는 그림 안에)
function shortText(d, token) {
  if (d.kind === 'monthly') {
    const [y, m] = d.ym.split('-');
    return `📅 **${d.store} ${y}년 ${Number(m)}월 결산** — 월 매출 **${fmt(d.money)}원**${d.prevMoney ? ` (지난달 대비 ${change(d.money, d.prevMoney)})` : ''}\n📊 자세히 보기: ${reportUrl(token)}`;
  }
  const lw = d.lastWeek ? ` (지난주 ${dow(d.lastWeek.date)}요일 대비 ${change(d.day.money, d.lastWeek.money)})` : '';
  return `☕ **${d.store} 매출** — ${dayLabel(d.date)} · 어제 **${fmt(d.day.money)}원**${lw}\n📊 자세히 보기: ${reportUrl(token)}`;
}

// 카톡 이미지 카드의 제목·설명 (제목 2줄 · 설명 몇 줄만 보인다)
function kakaoCard(d, token, sz) {
  const top = d.stats.top5[0];
  const image = { image_url: `${PUBLIC_BASE}/img/${token}-s.png`, image_width: sz.width, image_height: sz.height };
  if (d.kind === 'monthly') {
    return { title: `📅 ${d.store} ${Number(d.ym.slice(5))}월 결산 ${fmt(d.money)}원${d.prevMoney ? ' ' + change(d.money, d.prevMoney) : ''}`.slice(0, 80), description: [`하루 평균 ${fmt(d.avg)}원`, top ? `1위 ${top.name} ${fmt(top.count)}${unit(top.name)}` : ''].filter(Boolean).join(' · ').slice(0, 120), ...image };
  }
  return {
    title: `☕ ${d.store} ${dayLabel(d.date)} 어제 ${fmt(d.day.money)}원${d.lastWeek ? ' ' + change(d.day.money, d.lastWeek.money) : ''}`.slice(0, 80),
    description: [`이번달 ${fmt(d.month.money)}원${d.month.projected ? ` · 예상 ${fmt(d.month.projected)}원` : ''}`, top ? `1위 ${top.name} ${fmt(top.count)}${unit(top.name)}` : '', d.ade && d.ade.some((s) => !s.cups) ? '⚠️ 0잔 에이드 있음' : ''].filter(Boolean).join('\n').slice(0, 120),
    ...image,
  };
}

module.exports = { shortText, kakaoCard, buildDaily, buildMonthly, buildStats, buildAde, discordText, kakaoText, parseMd, kstDate, addDays, dayLabel, daysIn, prevMonth, change, fmt, dow, reportUrl, adeName, unit };
