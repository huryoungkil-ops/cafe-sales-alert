// 화면 HTML. 외부 자원은 글꼴(Pretendard, jsdelivr) 하나뿐.
const R = require('./report');
const { REPO_URL } = require('./env');

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = R.fmt;
const NAME = '유로머신 매출 알리미';

const BASE_CSS = `
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
:root{--bg:#110b07;--bg2:#1a110b;--card:#1d140e;--card2:#24190f;--line:#33251a;--text:#fbf3ea;--mute:#c4ad98;--dim:#8d7563;
--cara:#ffb35c;--cream:#ffe2b8;--latte:#e8a76b;--up:#5fe3a1;--down:#ff7f7f;--kakao:#fee500;--discord:#5865f2}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--text);font-family:Pretendard,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-text-size-adjust:100%;word-break:keep-all}
a{color:var(--cara)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 22px;border-radius:14px;border:0;font:inherit;font-weight:800;font-size:16px;cursor:pointer;text-decoration:none;transition:transform .15s,box-shadow .15s,background .15s;white-space:nowrap}
.btn-main{background:linear-gradient(135deg,var(--cream),var(--cara) 55%,#ff8a3d);color:#2a1205;box-shadow:0 12px 34px -10px rgba(255,160,80,.7)}
.btn-main:hover{transform:translateY(-2px);box-shadow:0 18px 44px -10px rgba(255,160,80,.85)}
.btn-ghost{background:rgba(255,255,255,.06);color:var(--text);border:1px solid rgba(255,255,255,.14)}
.btn-ghost:hover{background:rgba(255,255,255,.12)}
.btn-kakao{background:var(--kakao);color:#191600}
.btn-discord{background:var(--discord);color:#fff}
.btn-sm{padding:9px 14px;font-size:14px;border-radius:10px}
.btn-red{background:rgba(255,127,127,.1);color:#ffb9b9;border:1px solid rgba(255,127,127,.35)}
input,select{font:inherit;font-size:16px;color:var(--text);background:#140d08;border:1px solid var(--line);border-radius:12px;padding:12px 14px;width:100%;outline:none}
input:focus,select:focus{border-color:var(--cara);box-shadow:0 0 0 3px rgba(255,179,92,.18)}
label{display:block;font-size:13px;color:var(--mute);margin:12px 0 6px}
.chk{display:flex;align-items:center;gap:10px;font-size:15px;color:var(--text);margin:10px 0}
.chk input{width:20px;height:20px;accent-color:var(--cara)}
.up{color:var(--up)}.down{color:var(--down)}
.star-btn{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(255,226,184,.08);border:1px solid rgba(255,226,184,.25);color:var(--cream);font-weight:700;font-size:14px;text-decoration:none}
.star-btn:hover{background:rgba(255,226,184,.16)}
.star-btn svg{width:16px;height:16px;fill:currentColor}
`;

const GH_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
const starBtn = (text = 'GitHub 에서 별 주기') => `<a class="star-btn" href="${esc(REPO_URL)}" target="_blank" rel="noopener">${GH_SVG}⭐ ${text}</a>`;

// 탭 아이콘: 김이 나는 커피잔 + 위로 오르는 막대
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd59a"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient></defs>
<rect width="64" height="64" rx="15" fill="#1d120a"/>
<path d="M14 28h30v10a13 13 0 0 1-13 13h-4a13 13 0 0 1-13-13z" fill="url(#g)"/>
<path d="M44 31h3a6 6 0 0 1 0 12h-4" fill="none" stroke="#ffb35c" stroke-width="3.5"/>
<path d="M22 22c0-4 4-4 4-8M30 22c0-4 4-4 4-8" fill="none" stroke="#ffe2b8" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>
<rect x="21" y="36" width="4" height="8" rx="1" fill="#2a1205"/><rect x="27" y="33" width="4" height="11" rx="1" fill="#2a1205"/><rect x="33" y="30" width="4" height="14" rx="1" fill="#2a1205"/>
</svg>`;
const ICON_URI = 'data:image/svg+xml,' + encodeURIComponent(ICON_SVG.replace(/\n/g, ''));

function shell(title, body, { css = '', script = '', desc = '어제 매출을 매일 아침 카카오톡·디스코드로. 유로커피머신 사장님을 위한 무료 매출 알리미.', noindex = false } = {}) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><meta name="theme-color" content="#110b07">
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<link rel="icon" href="${ICON_URI}">
<style>${BASE_CSS}${css}</style></head><body>${body}${script ? `<script>${script}</script>` : ''}<script src="https://visits.180-70-116-114.sslip.io/v.js" data-site="eurocafe" defer></script></body></html>`;
}

// ── 예시 데이터 (랜딩 화면용 — 실제 매장 숫자가 아님) ──
const SAMPLE = {
  kind: 'daily', date: '2026-10-24', store: '○○점 (예시)',
  day: { money: 112400, mileage: 15200 }, lastWeek: { date: '2026-10-17', money: 100300 },
  month: { ym: '2026-10', money: 2238000, mileage: 351000, dom: 24, dim: 31, projected: 2890750 },
  stats: { total: 47, cold: 31, hot: 12, other: 4, menuCount: 18, top5: [
    { name: '아이스 아메리카노', count: 14, money: 39200 }, { name: '바닐라라떼', count: 6, money: 22800 },
    { name: '자몽에이드', count: 5, money: 17500 }, { name: '카페라떼', count: 5, money: 16000 }, { name: '아이스티', count: 4, money: 10000 }] },
  ade: [{ cups: 5, secs: 40, menus: { '자몽에이드': 5 } }, { cups: 3, secs: 24, menus: { '복숭아에이드': 3 } }, { cups: 0, secs: 0, menus: {} }],
  recent: [['10-11', 88], ['10-12', 104], ['10-13', 79], ['10-14', 83], ['10-15', 91], ['10-16', 98], ['10-17', 100], ['10-18', 96], ['10-19', 72], ['10-20', 81], ['10-21', 94], ['10-22', 86], ['10-23', 99], ['10-24', 112]]
    .map(([d, m]) => ({ date: '2026-' + d, money: m * 1000 + (m * 37) % 1000 })),
};
const SAMPLE_USER = { ade_names: '자몽,복숭아,유자' };

// ── 보고서 카드 (보고서 페이지 · 내 화면 · 랜딩 예시 공용) ──
function chip(now, before) {
  if (!before) return '';
  const c = R.change(now, before);
  return `<span class="chg ${c.startsWith('▲') ? 'up' : 'down'}">${c}</span>`;
}
function bars(recent, hi) {
  if (!recent || recent.length < 2) return '';
  const max = Math.max(...recent.map((r) => r.money), 1);
  return `<div class="bars">${recent.map((r) => `<div class="bar${r.date === hi ? ' hi' : ''}${['토', '일'].includes(R.dow(r.date)) ? ' we' : ''}" title="${R.dayLabel(r.date)} ${fmt(r.money)}원"><i style="height:${Math.max(4, Math.round(r.money / max * 100))}%"></i><span>${Number(r.date.slice(8))}</span></div>`).join('')}</div>`;
}
function topList(st) {
  if (!st.top5.length) return '<p class="mute">판매 내역 없음</p>';
  const max = st.top5[0].money || 1;
  return `<ol class="top">${st.top5.map((t) => `<li><div class="tn"><b>${esc(t.name)}</b><span>${fmt(t.count)}${R.unit(t.name)} · ${fmt(t.money)}원</span></div><div class="tb"><i style="width:${Math.round(t.money / max * 100)}%"></i></div></li>`).join('')}</ol>`;
}
function cupsSplit(st) {
  if (!st.total) return '';
  const w = (n) => (n / st.total * 100).toFixed(1);
  return `<div class="split"><i class="c" style="width:${w(st.cold)}%"></i><i class="h" style="width:${w(st.hot)}%"></i><i class="o" style="width:${w(st.other)}%"></i></div>
<div class="legend"><span><i class="c"></i>차가운 ${fmt(st.cold)}</span><span><i class="h"></i>따뜻한 ${fmt(st.hot)}</span><span><i class="o"></i>기타 ${fmt(st.other)}</span></div>`;
}

function reportCard(d, user = {}) {
  if (d.kind === 'monthly') {
    const m = Number(d.ym.slice(5));
    return `<div class="rep">
<div class="rh"><span class="rk">📅 ${esc(d.ym.slice(0, 4))}년 ${m}월 결산</span><b class="rs">${esc(d.store)}</b></div>
<div class="big"><small>월 매출</small><strong data-count="${d.money}">${fmt(d.money)}</strong><em>원</em>${chip(d.money, d.prevMoney)}</div>
<div class="kv">${d.prevMoney ? `<div><small>지난달</small><b>${fmt(d.prevMoney)}원</b></div>` : ''}<div><small>하루 평균</small><b>${fmt(d.avg)}원</b></div>${d.best ? `<div><small>최고의 날</small><b>${R.dayLabel(d.best.date)} ${fmt(d.best.money)}원</b></div>` : ''}${d.mileage != null ? `<div><small>포인트 사용</small><b>${fmt(d.mileage)}P</b></div>` : ''}</div>
<h4>☕ ${fmt(d.stats.total)}잔 팔렸어요</h4>${cupsSplit(d.stats)}
<h4>🏆 ${m}월 Top 5</h4>${topList(d.stats)}
</div>`;
  }
  const pct = Math.round(d.month.dom / d.month.dim * 100);
  const names = (i) => R.adeName(user, i);
  return `<div class="rep">
<div class="rh"><span class="rk">☕ 어제 매출 · ${R.dayLabel(d.date)}</span><b class="rs">${esc(d.store)}</b></div>
<div class="big"><small>어제 매출</small><strong data-count="${d.day.money}">${fmt(d.day.money)}</strong><em>원</em>${chip(d.day.money, d.lastWeek && d.lastWeek.money)}</div>
${d.lastWeek ? `<p class="mute sm">지난주 ${R.dow(d.lastWeek.date)}요일(${R.dayLabel(d.lastWeek.date)}) ${fmt(d.lastWeek.money)}원 대비${d.day.mileage != null ? ` · 포인트 ${fmt(d.day.mileage)}P` : ''}</p>` : d.day.mileage != null ? `<p class="mute sm">포인트 ${fmt(d.day.mileage)}P</p>` : ''}
<div class="month">
  <div class="mrow"><span>이번 달 누적 <b>${fmt(d.month.money)}원</b></span>${d.month.projected ? `<span>예상 <b class="cara">${fmt(d.month.projected)}원</b></span>` : '<span><b class="cara">마감</b></span>'}</div>
  <div class="prog"><i style="width:${pct}%"></i></div>
  <div class="mrow mute sm"><span>${d.month.dom}일째 / ${d.month.dim}일</span>${d.month.mileage != null ? `<span>포인트 ${fmt(d.month.mileage)}P</span>` : ''}</div>
</div>
${d.recent && d.recent.length > 1 ? `<h4>📈 최근 ${d.recent.length}일</h4>${bars(d.recent, d.date)}` : ''}
<h4>☕ ${fmt(d.stats.total)}잔 팔렸어요</h4>${cupsSplit(d.stats)}
<h4>🏆 어제 Top 5</h4>${topList(d.stats)}
${d.ade ? `<h4>🍹 에이드 펌프</h4><div class="ade">${d.ade.map((s, i) => `<div class="${s.cups ? '' : 'zero'}"><small>${i + 1}번${names(i) ? ' ' + esc(names(i)) : ''}</small><b>${s.cups ? fmt(s.cups) + '잔' : '0잔 ⚠️'}</b><span>${s.cups ? `펌프 ${fmt(s.secs)}초` : '시럽·연결 확인'}</span></div>`).join('')}</div>` : ''}
</div>`;
}

const REPORT_CSS = `
.rep{background:linear-gradient(180deg,#22170f,#1a120c);border:1px solid var(--line);border-radius:24px;padding:22px;box-shadow:0 30px 60px -30px rgba(0,0,0,.8)}
.rh{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.rk{font-size:13px;font-weight:800;color:var(--cara);letter-spacing:.02em}
.rs{font-size:14px;color:var(--mute);font-weight:600}
.big{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin:14px 0 4px}
.big small{width:100%;color:var(--mute);font-size:13px}
.big strong{font-size:clamp(38px,9vw,52px);font-weight:900;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.big em{font-style:normal;font-size:20px;color:var(--mute);font-weight:700}
.chg{margin-left:6px;font-weight:900;font-size:16px;padding:4px 10px;border-radius:999px;background:rgba(95,227,161,.1)}
.chg.down{background:rgba(255,127,127,.1)}
.mute{color:var(--mute)}.sm{font-size:13px;margin:0}.cara{color:var(--cara)}
.month{margin:18px 0 6px;padding:14px 16px;border-radius:16px;background:rgba(255,179,92,.06);border:1px solid rgba(255,179,92,.18)}
.mrow{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:14px}
.prog{height:10px;border-radius:99px;background:#2b1e14;margin:10px 0 8px;overflow:hidden}
.prog i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--cream),var(--cara),#ff8a3d)}
.rep h4{margin:22px 0 10px;font-size:15px}
.bars{display:flex;align-items:flex-end;gap:4px;height:110px;padding-top:6px}
.bar{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px}
.bar i{display:block;width:100%;border-radius:6px 6px 2px 2px;background:#4a3423;transition:height .8s}
.bar.we i{background:#5d4027}
.bar.hi i{background:linear-gradient(180deg,var(--cream),var(--cara));box-shadow:0 0 18px rgba(255,179,92,.5)}
.bar span{font-size:10px;color:var(--dim)}
.split{display:flex;height:12px;border-radius:99px;overflow:hidden;background:#2b1e14}
.split i{display:block;height:100%}
.split .c,.legend .c{background:#7cc7ff}.split .h,.legend .h{background:#ff9d6c}.split .o,.legend .o{background:#c9b29c}
.legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:13px;color:var(--mute)}
.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.top{list-style:none;margin:0;padding:0;counter-reset:t}
.top li{counter-increment:t;position:relative;padding:8px 0 8px 34px}
.top li:before{content:counter(t);position:absolute;left:0;top:9px;width:24px;height:24px;border-radius:8px;display:grid;place-items:center;font-size:13px;font-weight:900;background:#2b1e14;color:var(--cream)}
.top li:first-child:before{background:linear-gradient(135deg,var(--cream),var(--cara));color:#2a1205}
.tn{display:flex;justify-content:space-between;gap:10px;font-size:14px}
.tn span{color:var(--mute);white-space:nowrap}
.tb{height:6px;border-radius:99px;background:#2b1e14;margin-top:6px;overflow:hidden}
.tb i{display:block;height:100%;background:linear-gradient(90deg,#8a5a33,var(--cara));border-radius:99px}
.ade{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.ade div{padding:12px;border-radius:14px;background:#24190f;border:1px solid var(--line);display:flex;flex-direction:column;gap:3px}
.ade small{color:var(--mute);font-size:12px}.ade b{font-size:18px}.ade span{font-size:12px;color:var(--dim)}
.ade .zero{border-color:rgba(255,127,127,.45);background:rgba(255,127,127,.06)}.ade .zero b{color:var(--down)}
.kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:14px}
.kv div{padding:12px;border-radius:14px;background:#24190f;border:1px solid var(--line)}
.kv small{display:block;color:var(--mute);font-size:12px}.kv b{font-size:15px}
`;

// ── 랜딩 ──────────────────────────────────────────────────────────

const LANDING_CSS = `
body{overflow-x:hidden}
.bgfx{position:fixed;inset:0;z-index:-2;background:
 radial-gradient(1000px 560px at 85% -10%,rgba(255,150,70,.22),transparent 60%),
 radial-gradient(800px 500px at -10% 25%,rgba(255,226,184,.07),transparent 60%),
 linear-gradient(180deg,#0d0805 0%,#110b07 45%,#160e09 100%)}
.beans{position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.5;background-image:
 radial-gradient(2px 2px at 14% 20%,#ffcf9955,transparent),radial-gradient(1.5px 1.5px at 33% 9%,#ffcf9944,transparent),
 radial-gradient(2px 2px at 71% 14%,#ffcf9944,transparent),radial-gradient(1.5px 1.5px at 88% 31%,#ffcf9955,transparent),
 radial-gradient(1.5px 1.5px at 6% 52%,#ffcf9933,transparent),radial-gradient(2px 2px at 52% 41%,#ffcf9933,transparent)}
.wrap{max-width:1140px;margin:0 auto;padding:0 20px}
nav{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:18px 0}
.logo{display:flex;align-items:center;gap:10px;font-weight:900;font-size:18px;letter-spacing:-.02em;color:var(--text);text-decoration:none}
.logo img{width:32px;height:32px}
.navr{display:flex;gap:8px;align-items:center}
.hero{display:grid;grid-template-columns:1.12fr .88fr;gap:44px;align-items:center;padding:50px 0 70px}
.pill{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;background:rgba(255,179,92,.1);border:1px solid rgba(255,179,92,.35);color:var(--cara);font-size:13px;font-weight:800}
.pill .dot{width:8px;height:8px;border-radius:50%;background:var(--cara);animation:pulse 1.8s infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(255,179,92,.7)}70%{box-shadow:0 0 0 10px rgba(255,179,92,0)}100%{box-shadow:0 0 0 0 rgba(255,179,92,0)}}
h1{font-size:clamp(38px,6.4vw,70px);line-height:1.08;letter-spacing:-.045em;margin:22px 0 18px;font-weight:900}
h1 .hl{background:linear-gradient(90deg,var(--cream),var(--cara) 55%,#ff7a3d);-webkit-background-clip:text;background-clip:text;color:transparent}
.lead{font-size:clamp(16px,2vw,19px);line-height:1.75;color:var(--mute);max-width:560px}
.lead b{color:var(--text)}
.cta{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px}
.trust{display:flex;gap:16px;flex-wrap:wrap;margin-top:22px;color:var(--mute);font-size:14px}
.trust span{display:inline-flex;align-items:center;gap:6px}
.count{margin-top:26px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;color:var(--mute);font-size:14px}
.digits{display:flex;gap:6px;font-variant-numeric:tabular-nums}
.digits b{display:inline-block;min-width:52px;text-align:center;padding:9px 8px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);font-size:24px;color:var(--text);font-weight:800}
.digits i{font-style:normal;font-size:22px;color:var(--mute);align-self:center}
/* 휴대폰 — 카카오톡 «나와의 채팅» */
.phone-wrap{position:relative;display:flex;justify-content:center}
.glow{position:absolute;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(255,150,70,.35),transparent 65%);filter:blur(24px);top:30px}
.phone{position:relative;width:310px;height:630px;border-radius:48px;padding:13px;background:linear-gradient(160deg,#3a2a1f,#140d08);box-shadow:0 50px 90px -24px rgba(0,0,0,.85),inset 0 0 0 1.5px rgba(255,255,255,.09);animation:float 6s ease-in-out infinite}
@keyframes float{50%{transform:translateY(-12px) rotate(-.8deg)}}
.screen{position:relative;height:100%;border-radius:36px;overflow:hidden;background:#b2c7da;display:flex;flex-direction:column}
.notch{position:absolute;top:9px;left:50%;transform:translateX(-50%);width:92px;height:25px;border-radius:20px;background:#000;z-index:3}
.kbar{padding:44px 16px 10px;background:#b2c7da;display:flex;align-items:center;gap:10px;color:#1b1b1b;font-weight:800;font-size:15px}
.kbar .me{width:30px;height:30px;border-radius:11px;background:#fff;display:grid;place-items:center;font-size:16px}
.kbar small{display:block;font-size:11px;color:#4b5b6b;font-weight:600}
.chat{flex:1;padding:6px 12px 14px;display:flex;flex-direction:column;gap:12px;overflow:hidden}
.kday{align-self:center;font-size:11px;color:#fff;background:rgba(0,0,0,.18);padding:3px 10px;border-radius:99px}
.kmsg{align-self:flex-end;max-width:92%;display:flex;align-items:flex-end;gap:5px;opacity:0;transform:translateY(14px);animation:pop .7s cubic-bezier(.2,.9,.3,1.2) forwards}
.kmsg time{font-size:10px;color:#4b5b6b;white-space:nowrap}
.kcard{background:#fff;border-radius:14px;overflow:hidden;color:#1b1b1b;font-size:12.5px;line-height:1.55;box-shadow:0 2px 0 rgba(0,0,0,.05)}
.kcard .kt{padding:11px 13px 10px;white-space:pre-line}
.kcard .kt b{font-size:13px}
.kcard .kb{border-top:1px solid #eee;text-align:center;padding:9px;font-weight:700;color:#333}
.kmsg.m1{animation-delay:.5s}.kmsg.m2{animation-delay:2.1s}
@keyframes pop{to{opacity:1;transform:none}}
.sample-tag{position:absolute;top:58px;right:16px;z-index:2;background:rgba(0,0,0,.55);color:#fff;font-size:10px;font-weight:800;padding:3px 8px;border-radius:99px;letter-spacing:.05em}
.up2{color:#0a9a56;font-weight:900}
/* 섹션 */
section{padding:80px 0}
.eyebrow{color:var(--cara);font-weight:900;font-size:13px;letter-spacing:.14em}
h2{font-size:clamp(28px,4.2vw,44px);letter-spacing:-.035em;line-height:1.2;margin:10px 0 14px}
.sub{color:var(--mute);font-size:17px;line-height:1.75;max-width:660px}
.pain{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:36px}
.pain div{padding:24px;border-radius:20px;background:rgba(255,127,127,.05);border:1px solid rgba(255,127,127,.18);color:#ffd9d2;font-size:15px;line-height:1.65}
.pain div b{display:block;font-size:30px;margin-bottom:8px}
.math{margin-top:40px;display:grid;grid-template-columns:repeat(3,auto);justify-content:center;align-items:center;gap:18px;text-align:center}
.math .n{font-size:clamp(40px,8vw,84px);font-weight:900;letter-spacing:-.05em;background:linear-gradient(180deg,var(--cream),var(--cara));-webkit-background-clip:text;background-clip:text;color:transparent;font-variant-numeric:tabular-nums}
.math .op{font-size:34px;color:var(--dim);font-weight:300}
.math small{display:block;color:var(--mute);font-size:14px;margin-top:4px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:40px}
.feat{padding:26px;border-radius:22px;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.012));border:1px solid rgba(255,255,255,.08);transition:transform .2s,border-color .2s}
.feat:hover{transform:translateY(-4px);border-color:rgba(255,179,92,.5)}
.feat .ic{width:50px;height:50px;border-radius:15px;display:grid;place-items:center;font-size:25px;background:rgba(255,179,92,.12);border:1px solid rgba(255,179,92,.3);margin-bottom:16px}
.feat h3{margin:0 0 8px;font-size:19px;letter-spacing:-.02em}
.feat p{margin:0;color:var(--mute);line-height:1.65;font-size:15px}
.demo{display:grid;grid-template-columns:.95fr 1.05fr;gap:40px;align-items:center;margin-top:30px}
.demo .rep{max-width:480px}
.ex{display:inline-block;font-size:12px;font-weight:800;color:var(--cream);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);padding:4px 10px;border-radius:99px;margin-bottom:10px}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:44px;counter-reset:s}
.step{padding:30px 24px 26px;border-radius:22px;background:var(--card);border:1px solid var(--line);position:relative}
.step:before{counter-increment:s;content:counter(s);position:absolute;top:-18px;left:24px;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-weight:900;background:linear-gradient(135deg,var(--cream),var(--cara));color:#2a1205}
.step h3{margin:10px 0 8px;font-size:18px}
.step p{margin:0;color:var(--mute);line-height:1.65;font-size:15px}
.step .t{display:inline-block;margin-top:12px;font-size:12px;font-weight:800;color:var(--cara)}
.safe{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:36px}
.safe>div{display:flex;gap:14px;padding:20px;border-radius:18px;background:rgba(95,227,161,.04);border:1px solid rgba(95,227,161,.2)}
.safe .i{font-size:26px;line-height:1}
.safe b{display:block;margin-bottom:4px;font-size:16px}
.safe p{margin:0;color:var(--mute);font-size:14.5px;line-height:1.6}
.code{margin-top:22px;padding:18px 20px;border-radius:16px;background:#0b0705;border:1px solid var(--line);font-family:ui-monospace,Consolas,monospace;font-size:13px;color:#e9cfae;overflow-x:auto;white-space:pre}
.code .c{color:#7d6a5a}
.faq{margin-top:30px;display:flex;flex-direction:column;gap:10px;max-width:820px}
.faq details{border-radius:16px;background:var(--card);border:1px solid var(--line);padding:16px 20px}
.faq summary{cursor:pointer;font-weight:800;font-size:16px;list-style:none}
.faq summary::-webkit-details-marker{display:none}
.faq summary:before{content:'Q ';color:var(--cara)}
.faq p{color:var(--mute);line-height:1.7;margin:10px 0 0;font-size:15px}
.final{text-align:center;padding:70px 24px;border-radius:32px;margin:40px 0 70px;background:
 radial-gradient(620px 260px at 50% 0%,rgba(255,179,92,.22),transparent 70%),linear-gradient(180deg,#25170d,#160e09);border:1px solid rgba(255,179,92,.3)}
.final h2{margin-top:0}
.final .cta{justify-content:center}
.stat{display:flex;justify-content:center;gap:30px;flex-wrap:wrap;margin-top:26px;color:var(--mute);font-size:14px}
.stat b{display:block;font-size:28px;color:var(--text);font-weight:900}
footer{color:var(--dim);font-size:13px;line-height:1.75;padding:30px 0 50px;border-top:1px solid #241911}
.reveal{opacity:0;transform:translateY(26px);transition:opacity .8s,transform .8s}
.reveal.on{opacity:1;transform:none}
.bye{margin:14px 0 0;padding:12px 16px;border-radius:12px;background:rgba(95,227,161,.08);border:1px solid rgba(95,227,161,.3);color:#bff5d8;font-size:14px}
@media (max-width:920px){.hero,.demo{grid-template-columns:1fr}.hero{padding-top:24px}.grid,.steps,.pain,.safe{grid-template-columns:1fr}.math{grid-template-columns:1fr;gap:4px}.math .op{font-size:26px}}
@media (max-width:420px){.digits b{min-width:44px;font-size:20px}.phone{width:282px;height:580px}.navr .star-btn span{display:none}}
`;

const LANDING_JS = `
function pad(n){return String(n).padStart(2,'0')}
function tick(){
  var n=new Date(Date.now()+9*3600e3);var cur=n.getUTCHours()*3600+n.getUTCMinutes()*60+n.getUTCSeconds();
  var left=(7*3600-cur+86400)%86400||86400;
  var h=Math.floor(left/3600),m=Math.floor(left%3600/60),s=left%60;
  var el=document.getElementById('cd');if(el)el.innerHTML='<b>'+pad(h)+'</b><i>:</i><b>'+pad(m)+'</b><i>:</i><b>'+pad(s)+'</b>';
}
tick();setInterval(tick,1000);
function countUp(el){var to=+el.dataset.count,t0=null;function f(t){if(!t0)t0=t;var p=Math.min(1,(t-t0)/1100);el.textContent=Math.round(to*(1-Math.pow(1-p,3))).toLocaleString('ko-KR');if(p<1)requestAnimationFrame(f)}requestAnimationFrame(f)}
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('on');e.target.querySelectorAll('[data-count]').forEach(countUp);io.unobserve(e.target)}})},{threshold:.15});
document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});
`;

function landing({ loggedIn, stores = 0, reports = 0, bye = false } = {}) {
  const go = loggedIn ? '/app' : '/login';
  const goText = loggedIn ? '내 매출 화면으로' : '무료로 시작하기';
  const kmsg1 = `<b>☕ ○○점 10/24(토)</b>\n어제 112,400원 <span class="up2">▲12%</span>\n이번달 2,238,000원\n예상 2,890,750원\n1위 아이스 아메리카노 14잔`;
  const kmsg2 = `<b>📅 ○○점 10월 결산</b>\n월 매출 2,904,300원 <span class="up2">▲9%</span>\n하루 평균 93,687원\n1위 아이스 아메리카노 402잔`;
  const body = `<div class="bgfx"></div><div class="beans"></div>
<div class="wrap">
<nav><a class="logo" href="/"><img src="${ICON_URI}" alt="">${NAME}</a><div class="navr">${starBtn('<span>GitHub</span> 별')}<a class="btn btn-ghost btn-sm" href="${go}">${loggedIn ? '내 화면' : '로그인'}</a></div></nav>
${bye ? '<div class="bye">탈퇴가 끝났습니다. 계정·유로 비밀번호·매출 기록을 모두 지웠어요. 그동안 고마웠습니다 ☕</div>' : ''}
<section class="hero" style="padding-top:40px">
  <div>
    <span class="pill"><span class="dot"></span>유로커피머신 사장님 전용 · 무료</span>
    <h1>어제 매출,<br><span class="hl">눈 뜨면 카톡에</span><br>와 있어요</h1>
    <p class="lead">관리자 페이지 로그인 → 날짜 고르기 → 숫자 받아 적기… 이제 그만하세요. <b>유로 관리자 계정만 한 번 연결</b>하면 매일 아침 <b>어제 매출 · 지난주 대비 · 이번 달 예상 · 잘 팔린 메뉴 Top 5</b>를 카카오톡과 디스코드로 보내 드려요.</p>
    <div class="cta"><a class="btn btn-main btn-lg" href="${go}">☕ ${goText}</a><a class="btn btn-ghost" href="#sample">👀 보고서 예시 보기</a></div>
    <div class="trust"><span>🔒 비밀번호 AES-256 암호화</span><span>📖 소스 코드 전부 공개</span><span>🗑️ 탈퇴하면 즉시 삭제</span></div>
    <div class="count"><span>다음 아침 7시 보고까지</span><span class="digits" id="cd"><b>--</b><i>:</i><b>--</b><i>:</i><b>--</b></span></div>
  </div>
  <div class="phone-wrap"><div class="glow"></div>
    <div class="phone"><div class="screen"><div class="notch"></div><span class="sample-tag">예시 화면</span>
      <div class="kbar"><span class="me">☕</span><div>나와의 채팅<small>카카오톡</small></div></div>
      <div class="chat"><span class="kday">10월 25일 일요일</span>
        <div class="kmsg m1"><time>오전 7:00</time><div class="kcard"><div class="kt">${kmsg1}</div><div class="kb">자세히 보기</div></div></div>
        <span class="kday" style="animation:pop .5s 1.6s forwards;opacity:0">11월 1일 일요일</span>
        <div class="kmsg m2"><time>오전 7:00</time><div class="kcard"><div class="kt">${kmsg2}</div><div class="kb">자세히 보기</div></div></div>
      </div>
    </div></div>
  </div>
</section>

<section class="reveal">
  <div class="eyebrow">SOUND FAMILIAR?</div>
  <h2>사장님, 혹시 아직도 이러고 계세요?</h2>
  <div class="pain">
    <div><b>😮‍💨</b>밤마다 관리자 페이지에 로그인해서 날짜 고르고, 매출 확인하고, 메모장에 옮겨 적기</div>
    <div><b>🧮</b>«이번 달 이대로면 얼마지?» 계산기 두드리다가 결국 감으로 넘기기</div>
    <div><b>🍹</b>에이드 시럽이 떨어진 줄도 모르고 며칠째 <b style="display:inline;font-size:inherit">0잔</b>… 손님은 말없이 돌아가고</div>
  </div>
  <div class="math">
    <div><span class="n">3분</span><small>매일 매출 확인</small></div><span class="op">×</span>
    <div><span class="n">365일</span><small>1년 내내</small></div>
  </div>
  <p class="sub" style="text-align:center;margin:18px auto 0">= 1년에 <b style="color:var(--cream)">약 18시간</b>. 그 시간, 이제 알리미가 대신 씁니다.</p>
</section>

<section class="reveal">
  <div class="eyebrow">WHAT YOU GET</div>
  <h2>숫자만 던지지 않아요.<br>읽히게 정리해서 보내요</h2>
  <div class="grid">
    <div class="feat"><div class="ic">💰</div><h3>어제 매출 + 포인트</h3><p>아침에 눈 뜨면 어제 하루 매출과 포인트 사용액이 도착해 있어요.</p></div>
    <div class="feat"><div class="ic">📈</div><h3>지난주 같은 요일 대비</h3><p>토요일은 토요일끼리. ▲12% · ▼8%처럼 늘었는지 줄었는지 한눈에.</p></div>
    <div class="feat"><div class="ic">🎯</div><h3>이번 달 예상 매출</h3><p>지금 속도라면 이번 달 얼마로 마감할지 매일 다시 계산해 드려요.</p></div>
    <div class="feat"><div class="ic">🏆</div><h3>메뉴 Top 5</h3><p>어제 가장 많이 번 메뉴 다섯 개. 잔 수와 금액까지.</p></div>
    <div class="feat"><div class="ic">🍹</div><h3>에이드 펌프 사용량</h3><p>에이드 1·2·3번이 몇 잔, 펌프 몇 초 나갔는지. 0잔이면 ⚠️로 먼저 알려요.</p></div>
    <div class="feat"><div class="ic">📅</div><h3>매월 1일 결산</h3><p>지난달 매출, 지난달 대비 증감, 하루 평균, 최고의 날, 월간 Top 5.</p></div>
  </div>
</section>

<section id="sample" class="reveal">
  <div class="demo">
    <div>
      <div class="eyebrow">THE REPORT</div>
      <h2>카톡 버튼 한 번이면<br>이 화면이 열려요</h2>
      <p class="sub">카톡에는 핵심만 짧게, «자세히 보기»를 누르면 최근 2주 그래프 · 이번 달 진행률 · 차가운/따뜻한 비율 · Top 5 · 에이드까지 한 화면에. 디스코드로는 전체 보고서가 글로 바로 와요.</p>
      <div class="cta"><a class="btn btn-main" href="${go}">☕ 우리 매장도 받아보기</a></div>
    </div>
    <div><span class="ex">예시 데이터 · 실제 매장 숫자가 아닙니다</span>${reportCard(SAMPLE, SAMPLE_USER)}</div>
  </div>
</section>

<section class="reveal">
  <div class="eyebrow">3 STEPS · 2 MINUTES</div>
  <h2>2분이면 내일 아침부터 받아요</h2>
  <div class="steps">
    <div class="step"><h3>3초 가입</h3><p>카카오 · 네이버 · 구글 계정으로 버튼 한 번. 이메일로도 가입할 수 있어요. 카카오로 가입하면 카톡 알림까지 한 번에 연결돼요.</p><span class="t">⏱ 3초</span></div>
    <div class="step"><h3>유로 관리자 계정 연결</h3><p>평소 매출 보던 유로 관리자 아이디·비밀번호를 넣으면 바로 로그인해 보고, 맞을 때만 <b>암호화해서</b> 저장해요. 어제 매출이 곧바로 화면에 떠요.</p><span class="t">⏱ 30초</span></div>
    <div class="step"><h3>카톡 · 디스코드 연결</h3><p>카톡 «나와의 채팅»으로 매출 카드 이미지가 와요. 디스코드는 웹훅 주소만 붙여 넣기. 받을 시각도 직접 정해요 (입력하지 않으면 아침 7시).</p><span class="t">⏱ 1분</span></div>
  </div>
</section>

<section class="reveal">
  <div class="eyebrow">YOUR PASSWORD IS SAFE</div>
  <h2>관리자 비밀번호,<br>이렇게 지켜요</h2>
  <p class="sub">남의 비밀번호를 맡는다는 건 무거운 일이라, 할 수 있는 건 다 했어요. 그리고 말로만 하지 않으려고 <b style="color:var(--cream)">서버 코드 전체를 GitHub에 공개</b>했어요.</p>
  <div class="safe">
    <div><span class="i">🔐</span><div><b>AES-256-GCM 암호화 저장</b><p>유로 비밀번호는 암호화된 상태로만 저장돼요. 암호화 키는 데이터베이스와 따로 서버에만 있어요.</p></div></div>
    <div><span class="i">👀</span><div><b>«읽기»만 해요</b><p>매출 화면이 보여 주는 숫자만 읽어 와요. 메뉴·가격·기계 설정은 건드리는 기능 자체가 없어요.</p></div></div>
    <div><span class="i">🛑</span><div><b>틀리면 바로 멈춰요</b><p>비밀번호가 바뀌어 로그인이 안 되면 즉시 조회를 멈추고 알려 드려요. 계속 두드려서 계정이 잠기는 일이 없게.</p></div></div>
    <div><span class="i">🗑️</span><div><b>탈퇴 = 즉시 완전 삭제</b><p>탈퇴 버튼 한 번이면 계정, 암호화된 비밀번호, 매출 기록, 보고서가 모두 지워져요.</p></div></div>
  </div>
  <div class="code"><span class="c">// src/secure.js — 실제 코드 그대로</span>
const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
const enc = Buffer.concat([c.update(String(text), 'utf8'), c.final()]);</div>
  <div class="cta">${starBtn('코드 확인하고 별 주기')}</div>
</section>

<section class="reveal">
  <div class="eyebrow">FAQ</div>
  <h2>자주 묻는 질문</h2>
  <div class="faq">
    <details><summary>정말 무료인가요?</summary><p>네. 가입비도 이용료도 없어요. 개인이 운영하는 작은 서버라 가입 인원에 한도가 있을 수 있어요.</p></details>
    <details><summary>어떤 매장이 쓸 수 있나요?</summary><p>유로커피머신 관리자 사이트(euro.order-app.us)에서 매출을 보는 매장이면 돼요. 그 아이디·비밀번호로 연결합니다.</p></details>
    <details><summary>기계가 여러 대예요.</summary><p>관리자 계정 하나에 묶인 기계들의 매출을 합쳐서 보내 드려요. 매장 이름도 모두 표시돼요.</p></details>
    <details><summary>카카오톡 «나에게 보내기»가 뭔가요?</summary><p>내 카카오톡의 «나와의 채팅»방으로 메시지가 오는 방식이에요. 친구 추가나 채널 가입이 필요 없고, 연결은 카카오 로그인 한 번이면 끝나요. 언제든 끊을 수 있어요.</p></details>
    <details><summary>유로 비밀번호를 바꾸면요?</summary><p>다음 보고 때 로그인이 안 되는 걸 알아채고 조회를 멈춘 뒤 알려 드려요. 사이트에서 새 비밀번호를 다시 저장하면 이어서 받아요.</p></details>
    <details><summary>유로커피머신 공식 서비스인가요?</summary><p>아니요. 사장님이 관리자 화면에서 직접 보던 숫자를 대신 읽어 정리해 주는 개인 프로젝트예요. 코드는 GitHub에 모두 공개되어 있어요.</p></details>
  </div>
</section>

<div class="final reveal">
  <h2>내일 아침 7시,<br>어제 매출이 먼저 인사할게요 ☕</h2>
  <p class="sub" style="margin:0 auto">가입 3초 · 연결 1분 · 이용료 0원</p>
  <div class="cta" style="margin-top:26px"><a class="btn btn-main btn-lg" href="${go}">☕ ${goText}</a>${starBtn()}</div>
  ${stores >= 3 ? `<div class="stat"><div><b>${fmt(stores)}</b>매장 연결</div><div><b>${fmt(reports)}</b>번 보고 배달</div></div>` : ''}
</div>

<footer>${NAME} · 유로커피머신 관리자 계정으로 매출을 읽어 카카오톡·디스코드로 보내 주는 개인 프로젝트입니다. 유로커피머신·euro.order-app.us 와 제휴 관계가 없습니다.<br>
화면의 숫자 중 «예시» 표시가 있는 것은 설명용 예시입니다. · <a href="${esc(REPO_URL)}" target="_blank" rel="noopener">소스 코드 (GitHub)</a></footer>
</div>`;
  return shell(`${NAME} — 어제 매출을 아침마다 카톡으로`, body, { css: REPORT_CSS + LANDING_CSS, script: LANDING_JS });
}

// ── 로그인 ──
const FORM_CSS = `
.center{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(800px 400px at 50% -10%,rgba(255,150,70,.2),transparent 60%)}
.box{width:100%;max-width:420px;background:var(--card);border:1px solid var(--line);border-radius:24px;padding:30px 26px}
.box h1{font-size:26px;margin:14px 0 6px;letter-spacing:-.03em}
.box p{color:var(--mute);line-height:1.6;font-size:14.5px;margin:0 0 6px}
.box .btn{width:100%;margin-top:18px}
.err{margin-top:14px;padding:12px 14px;border-radius:12px;background:rgba(255,127,127,.08);border:1px solid rgba(255,127,127,.35);color:#ffc9c9;font-size:14px;line-height:1.5}
.small{font-size:13px;color:var(--dim);margin-top:16px;line-height:1.6}
`;

// 소셜 로그인 버튼 (카카오 → 네이버 → 구글), 뉴스모아와 같은 모양
const SOCIAL_ICON = {
  kakao: '<svg viewBox="0 0 24 24"><path fill="#000" d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.5.1 1 .1 1.5.1 5.5 0 10-3.6 10-8S17.5 3 12 3z"/></svg>',
  naver: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M16.3 12.8 7.4 0H0v24h7.7V11.2L16.6 24H24V0h-7.7z" transform="scale(.75) translate(4 4)"/></svg>',
  google: '<svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>',
};
const SOCIAL_LABEL = { kakao: '카카오로 계속하기', naver: '네이버로 계속하기', google: 'Google로 계속하기' };
const socialButtons = (providers) => providers.map((p) => `<a class="s-${p}" href="/auth/${p}">${SOCIAL_ICON[p]}${SOCIAL_LABEL[p]}</a>`).join('');
const AUTH_CSS = `
.social{display:flex;flex-direction:column;gap:10px;margin:20px 0 8px}
.social a{display:flex;align-items:center;justify-content:center;gap:10px;height:50px;border-radius:14px;font-weight:800;text-decoration:none;border:1px solid transparent;font-size:15px}
.social svg{width:20px;height:20px}
.s-kakao{background:#FEE500;color:rgba(0,0,0,.85)}
.s-naver{background:#03C75A;color:#fff}
.s-google{background:#fff;color:#1f1f1f;border-color:#dadce0!important}
.or{display:flex;align-items:center;gap:10px;color:var(--dim);font-size:13px;margin:18px 0 6px}
.or:before,.or:after{content:'';flex:1;height:1px;background:var(--line)}
.box form input{margin-top:8px}
.ok-msg{margin-top:14px;padding:12px 14px;border-radius:12px;background:rgba(95,227,161,.08);border:1px solid rgba(95,227,161,.3);color:#c8f7dd;font-size:14px;line-height:1.5}
.links{font-size:13.5px;color:var(--mute);margin-top:12px;text-align:center}
.links a{color:var(--cara);text-decoration:none;font-weight:700}
.pwrule{font-size:12.5px;color:var(--dim);margin:6px 0 0}
`;
const logoTop = `<a class="logo" href="/" style="display:flex;align-items:center;gap:10px;color:var(--text);text-decoration:none;font-weight:900"><img src="${ICON_URI}" width="30" height="30" alt="">${NAME}</a>`;
const note = (msg, err = true) => (msg ? `<div class="${err ? 'err' : 'ok-msg'}">${esc(msg)}</div>` : '');

function loginPage({ providers = [], msg = '', err = true } = {}) {
  const body = `<div class="center"><div class="box">${logoTop}
<h1>로그인 · 가입</h1>
<p>쓰던 계정으로 3초 만에 시작하세요. 처음이면 그대로 가입돼요.</p>
${note(msg, err)}
<div class="social">${socialButtons(providers)}</div>
<div class="or">또는 이메일로</div>
<form method="post" action="/login/email">
 <input type="email" name="email" required maxlength="120" autocomplete="email" placeholder="이메일">
 <input type="password" name="password" required maxlength="100" autocomplete="current-password" placeholder="비밀번호">
 <button class="btn btn-main">이메일로 로그인</button>
</form>
<p class="links"><a href="/signup">이메일로 회원가입</a> · <a href="/forgot">비밀번호를 잊었어요</a></p>
<p class="small">소셜 계정의 비밀번호는 받지 않아요. 유로 관리자 계정은 로그인 뒤에 따로 연결하고, 암호화해서 저장합니다.</p>
</div></div>`;
  return shell(`로그인 — ${NAME}`, body, { css: FORM_CSS + AUTH_CSS, noindex: true });
}

function signupPage({ providers = [], msg = '' } = {}) {
  const body = `<div class="center"><div class="box">${logoTop}
<h1>회원가입</h1>
<p>소셜 계정이 있다면 버튼 한 번이면 끝나요.</p>
${note(msg)}
<div class="social">${socialButtons(providers)}</div>
<div class="or">또는 이메일로 가입</div>
<form method="post" action="/signup">
 <input type="email" name="email" required maxlength="120" autocomplete="email" placeholder="이메일">
 <input type="password" name="password" required minlength="8" maxlength="100" autocomplete="new-password" placeholder="비밀번호">
 <p class="pwrule">8자 이상, 영문·숫자·기호 중 두 가지 이상</p>
 <button class="btn btn-main">확인 메일 받기</button>
</form>
<p class="small">확인 메일의 버튼을 눌러야 가입이 끝나요. 비밀번호는 되돌릴 수 없는 방식(scrypt)으로만 저장해요.</p>
<p class="links">이미 가입했나요? <a href="/login">로그인</a></p>
</div></div>`;
  return shell(`회원가입 — ${NAME}`, body, { css: FORM_CSS + AUTH_CSS, noindex: true });
}

function forgotPage({ msg = '' } = {}) {
  const body = `<div class="center"><div class="box">${logoTop}
<h1>비밀번호 찾기</h1>
<p>가입한 주소로 새 비밀번호를 정하는 링크를 보내 드려요. 소셜로 가입했어도 비밀번호를 정하면 이메일로 로그인할 수 있어요.</p>
${note(msg)}
<form method="post" action="/forgot">
 <input type="email" name="email" required maxlength="120" autocomplete="email" placeholder="가입한 이메일">
 <button class="btn btn-main">재설정 링크 받기</button>
</form>
<p class="links"><a href="/login">← 로그인으로</a></p>
</div></div>`;
  return shell(`비밀번호 찾기 — ${NAME}`, body, { css: FORM_CSS + AUTH_CSS, noindex: true });
}

function resetPage({ token: tok, email, msg = '' } = {}) {
  const body = `<div class="center"><div class="box">${logoTop}
<h1>새 비밀번호</h1>
${note(msg)}
<form method="post" action="/reset">
 <input type="hidden" name="token" value="${esc(tok)}">
 <input type="email" value="${esc(email)}" disabled>
 <input type="password" name="password" required minlength="8" maxlength="100" autocomplete="new-password" placeholder="새 비밀번호">
 <p class="pwrule">8자 이상, 영문·숫자·기호 중 두 가지 이상</p>
 <button class="btn btn-main">저장하고 로그인</button>
</form>
</div></div>`;
  return shell(`새 비밀번호 — ${NAME}`, body, { css: FORM_CSS + AUTH_CSS, noindex: true });
}

function messagePage(title, msg, href = '/') {
  return shell(`${title} — ${NAME}`, `<div class="center"><div class="box"><h1>${esc(title)}</h1><p>${msg}</p><a class="btn btn-main" href="${esc(href)}">돌아가기</a></div></div>`, { css: FORM_CSS, noindex: true });
}

// ── 보고서 페이지 (/r/토큰) ──
function reportPage(d, user, { mine = false } = {}) {
  const title = d.kind === 'monthly' ? `${Number(d.ym.slice(5))}월 결산` : `${R.dayLabel(d.date)} 매출`;
  const body = `<div style="max-width:560px;margin:0 auto;padding:18px 16px 50px">
<nav style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><a href="/" style="display:flex;align-items:center;gap:8px;color:var(--text);text-decoration:none;font-weight:900"><img src="${ICON_URI}" width="26" height="26" alt="">${NAME}</a>${mine ? '<a class="btn btn-ghost btn-sm" href="/app">내 화면</a>' : ''}</nav>
${reportCard(d, user)}
<div style="margin-top:22px;padding:20px;border-radius:20px;background:rgba(255,179,92,.07);border:1px solid rgba(255,179,92,.25);text-align:center">
<b style="font-size:16px">유로커피머신 쓰는 사장님 아세요?</b><p class="mute" style="font-size:14px;margin:6px 0 14px">이 보고서, 무료로 매일 아침 받아볼 수 있어요.</p>
<a class="btn btn-main btn-sm" href="/">☕ 알리미 구경하기</a> ${starBtn('별 주기')}</div>
</div>`;
  return shell(`${title} — ${d.store}`, body, { css: REPORT_CSS, noindex: true });
}

// 알림 시각 드롭다운 — 30분 단위, 맨 위 «선택 안 함» 은 아침 7시
function timeLabel(t) { const h = Number(t.slice(0, 2)); return `${h < 12 ? '오전' : '오후'} ${(h % 12) || 12}:${t.slice(3)}`; }
function timeOptions(cur) {
  const sel = cur && cur !== '07:00' ? cur : '';
  const list = [];
  for (let h = 0; h < 24; h++) for (const m of ['00', '30']) list.push(`${String(h).padStart(2, '0')}:${m}`);
  if (sel && !list.includes(sel)) list.push(sel);
  return `<option value=""${sel ? '' : ' selected'}>선택 안 함 (오전 7:00 발송)</option>` +
    list.map((t) => `<option value="${t}"${t === sel ? ' selected' : ''}>${timeLabel(t)}</option>`).join('');
}

// ── 내 화면 (/app) ──
const APP_CSS = `
.app{max-width:760px;margin:0 auto;padding:16px 16px 60px}
.top-nav{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0 16px}
.top-nav .logo{display:flex;align-items:center;gap:8px;color:var(--text);text-decoration:none;font-weight:900}
.who{display:flex;align-items:center;gap:8px;color:var(--mute);font-size:14px}
.flash{padding:14px 16px;border-radius:14px;margin-bottom:16px;background:rgba(95,227,161,.08);border:1px solid rgba(95,227,161,.3);color:#c8f7dd;line-height:1.55;font-size:15px}
.flash.err{background:rgba(255,127,127,.08);border-color:rgba(255,127,127,.35);color:#ffd0d0}
.prog3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:18px}
.prog3 a{padding:12px;border-radius:14px;background:var(--card);border:1px solid var(--line);color:var(--mute);text-decoration:none;font-size:13px;line-height:1.4}
.prog3 a b{display:block;color:var(--text);font-size:14px}
.prog3 a.done{border-color:rgba(95,227,161,.45);background:rgba(95,227,161,.06)}
.prog3 a.now{border-color:var(--cara);box-shadow:0 0 0 3px rgba(255,179,92,.15)}
.card{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:22px;margin-bottom:16px}
.card h2{margin:0 0 6px;font-size:20px;letter-spacing:-.02em;display:flex;align-items:center;gap:8px}
.card .d{color:var(--mute);font-size:14.5px;line-height:1.6;margin:0 0 6px}
.lock{display:flex;gap:10px;align-items:flex-start;margin-top:14px;padding:12px 14px;border-radius:12px;background:rgba(95,227,161,.06);border:1px solid rgba(95,227,161,.28);color:#c8f7dd;font-size:13.5px;line-height:1.55}
.lock b{color:#e6fff1}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:14px}
.ok{color:var(--up);font-weight:800}.bad{color:var(--down);font-weight:800}
.state{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:14px;border-radius:14px;background:#24190f;border:1px solid var(--line);margin-top:12px;font-size:14.5px}
.help{margin-top:10px;font-size:13.5px;color:var(--mute)}
.help summary{cursor:pointer;color:var(--cara)}
.help ol{padding-left:20px;line-height:1.75}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.empty{text-align:center;padding:30px 10px;color:var(--mute)}
.empty b{display:block;font-size:40px;margin-bottom:8px}
footer{margin-top:26px;text-align:center;color:var(--dim);font-size:13px;line-height:1.8}
@media (max-width:520px){.prog3 a{font-size:12px;padding:10px}}
`;

function appPage({ user, last, recent, flash, flashErr, kakaoReady, logins = '', linkable = [] }) {
  const hasEuro = !!user.euro_pw_enc;
  const hasNoti = !!(user.discord_url || user.kakao_refresh);
  const step = !hasEuro ? 1 : !hasNoti ? 2 : 3;
  const names = String(user.ade_names || '').split(',');
  const err = user.euro_err ? user.euro_err.replace(/^AUTH:/, '') : '';
  const lastData = last ? { ...last.data, recent: last.data.recent || recent } : null;
  const body = `<div class="app">
<div class="top-nav"><a class="logo" href="/"><img src="${ICON_URI}" width="28" height="28" alt="">${NAME}</a>
<div class="who">${user.name || user.email ? esc(user.name || user.email.split('@')[0]) + ' 님' : '사장님'} <form method="post" action="/logout" style="margin:0"><button class="btn btn-ghost btn-sm">로그아웃</button></form></div></div>
${flash ? `<div class="flash${flashErr ? ' err' : ''}">${esc(flash)}</div>` : ''}
<div class="prog3">
 <a href="#euro" class="${hasEuro ? 'done' : 'now'}"><b>${hasEuro ? '✅' : '①'} 유로 계정</b>${hasEuro ? '연결됨' : '연결하기'}</a>
 <a href="#notify" class="${hasNoti ? 'done' : step === 2 ? 'now' : ''}"><b>${hasNoti ? '✅' : '②'} 받을 곳</b>${hasNoti ? [user.kakao_refresh && '카톡', user.discord_url && '디스코드'].filter(Boolean).join('·') : '카톡·디스코드'}</a>
 <a href="#settings" class="${step === 3 ? 'done' : ''}"><b>${step === 3 ? '✅' : '③'} 매일 ${esc(user.send_time || '07:00')}</b>${step === 3 ? '받는 중' : '시각 고르기'}</a>
</div>

${lastData ? `<div style="margin-bottom:16px">${reportCard(lastData, user)}<div class="row" style="justify-content:space-between"><span class="mute" style="font-size:13px">${esc(last.created_at.slice(0, 16))} 에 불러옴</span>${hasEuro && hasNoti ? `<form method="post" action="/app/send-now" style="margin:0"><button class="btn btn-ghost btn-sm">📨 지금 한 번 보내 보기</button></form>` : ''}</div></div>`
    : `<div class="card empty"><b>☕</b>유로 관리자 계정을 연결하면 어제 매출이 바로 여기에 떠요.</div>`}

<div class="card" id="euro">
 <h2>① 유로 관리자 계정</h2>
 <p class="d">평소 매출을 보던 <b>euro.order-app.us</b> 관리자 아이디와 비밀번호예요. 저장하기 전에 실제로 로그인해 보고, 맞을 때만 저장합니다.</p>
 ${hasEuro ? `<div class="state"><span>연결됨 · <b>${esc(user.euro_id)}</b>${user.store_name ? ` · ${esc(user.store_name)}` : ''}</span>${err ? `<span class="bad">⚠️ ${esc(err)}</span>` : `<span class="ok">정상</span>`}</div>` : ''}
 <form method="post" action="/app/euro" autocomplete="off">
  <label>유로 관리자 아이디</label><input name="euro_id" value="${esc(user.euro_id || '')}" required maxlength="60" autocomplete="off">
  <label>유로 관리자 비밀번호</label><input name="euro_pw" type="password" required maxlength="100" autocomplete="new-password" placeholder="${hasEuro ? '바꿀 때만 다시 입력' : ''}">
  <div class="lock"><span>🔒</span><span><b>입력한 비밀번호는 AES-256-GCM으로 암호화되어 저장됩니다.</b> 화면에 다시 보이지 않고, 운영자도 데이터베이스에서 평문으로 볼 수 없어요. 매출을 «읽어 오는» 데만 쓰고, 탈퇴하거나 아래 «지우기»를 누르면 즉시 삭제됩니다.</span></div>
  <div class="row"><button class="btn btn-main">${hasEuro ? '다시 확인하고 저장' : '로그인 확인하고 암호화 저장'}</button></div>
 </form>
 ${hasEuro ? `<form method="post" action="/app/euro/delete" class="row" onsubmit="return confirm('저장된 유로 계정을 지울까요? 매출 보고도 멈춥니다.')"><button class="btn btn-red btn-sm">저장된 유로 계정 지우기</button></form>` : ''}
</div>

<div class="card" id="notify">
 <h2>② 받을 곳</h2>
 <p class="d">둘 다 연결하면 둘 다로 보내요. 카톡엔 매출 카드 이미지(버튼을 누르면 자세한 보고서), 디스코드엔 전체 보고서 이미지가 와요.</p>
 <div class="state"><span>💬 카카오톡 «나와의 채팅»</span>${user.kakao_refresh ? `<span class="ok">연결됨</span>` : ''}</div>
 <div class="row">${user.kakao_refresh
    ? `<form method="post" action="/app/kakao/unlink" style="margin:0"><button class="btn btn-ghost btn-sm">카카오톡 연결 끊기</button></form>`
    : kakaoReady ? `<a class="btn btn-kakao" href="/kakao/start">💬 카카오톡 연결하기</a>` : '<span class="mute">카카오 연결 준비 중</span>'}</div>
 <div class="state" style="margin-top:18px"><span>🎮 디스코드 웹훅</span>${user.discord_url ? '<span class="ok">연결됨</span>' : ''}</div>
 <form method="post" action="/app/discord">
  <input name="discord" value="${esc(user.discord_url || '')}" placeholder="https://discord.com/api/webhooks/…" style="margin-top:10px">
  <div class="row"><button class="btn btn-discord btn-sm">${user.discord_url ? '바꾸기 (비우면 끄기)' : '저장하고 시험 알림'}</button></div>
 </form>
 <details class="help"><summary>디스코드 웹훅 주소는 어디서 얻나요?</summary><ol><li>디스코드에서 알림 받을 채널의 ⚙️(채널 편집)</li><li>연동 → 웹후크 → 새 웹후크</li><li>«웹후크 URL 복사» → 위 칸에 붙여 넣기</li></ol></details>
</div>

<div class="card" id="settings">
 <h2>③ 받는 시각 · 내용</h2>
 <form method="post" action="/app/settings">
  <label>카카오톡 · 디스코드 알림 시각</label>
  <select name="send_time" style="max-width:260px">${timeOptions(user.send_time)}</select>
  <div class="lock" style="background:rgba(255,179,92,.07);border-color:rgba(255,179,92,.3);color:var(--cream)"><span>⏰</span><span>전날 매출을 받고 싶은 시간을 입력하세요. 입력하지 않으시면 7시에 발송됩니다.</span></div>
  <p class="help" style="margin-top:8px">지금 설정: 매일 <b>${esc(user.send_time || '07:00')}</b> · 카톡과 디스코드 모두 이 시각에 보내요.</p>
  <label class="chk"><input type="checkbox" name="daily_on" value="1"${user.daily_on ? ' checked' : ''}> 매일 «어제 매출» 받기</label>
  <label class="chk"><input type="checkbox" name="monthly_on" value="1"${user.monthly_on ? ' checked' : ''}> 매월 1일 «지난달 결산» 받기</label>
  <label class="chk"><input type="checkbox" name="ade_on" value="1"${user.ade_on ? ' checked' : ''}> 에이드 펌프 사용량 넣기 (에이드 메뉴가 있을 때만)</label>
  <label>에이드 1·2·3번 이름 (선택 — 예: 자몽, 복숭아, 유자)</label>
  <div class="g3">${[0, 1, 2].map((i) => `<input name="ade${i + 1}" value="${esc((names[i] || '').trim())}" maxlength="10" placeholder="${i + 1}번">`).join('')}</div>
  <div class="row"><button class="btn btn-main btn-sm">저장</button></div>
 </form>
</div>

<div class="card" id="account">
 <h2>계정</h2>
 <p class="d">로그인: <b>${esc(logins || '—')}</b>${user.email ? ` · ${esc(user.email)}` : ''}</p>
 ${linkable.length ? `<p class="help" style="margin-top:12px">다른 계정으로도 로그인하려면 연결해 두세요.</p><div class="row">${linkable.map((p) => `<a class="btn btn-ghost btn-sm" href="/auth/${p}?link=1">${({ kakao: '카카오', naver: '네이버', google: '구글' })[p]} 연결</a>`).join('')}</div>` : ''}
 <p class="help">이메일 로그인 비밀번호를 정하거나 바꾸려면 <a href="/forgot">비밀번호 찾기</a>로 링크를 받아 주세요.</p>
 <details class="help" style="margin-top:18px"><summary>탈퇴하기</summary>
  <form method="post" action="/app/leave" onsubmit="return confirm('정말 탈퇴할까요? 계정·유로 비밀번호·매출 기록이 모두 즉시 지워집니다.')">
   <p>계정, 로그인 연결, 암호화된 유로 비밀번호, 쌓인 매출 기록과 보고서를 모두 즉시 지웁니다.</p>
   <div class="row"><input name="confirm" placeholder="«탈퇴» 라고 적기" required style="max-width:240px"><button class="btn btn-red btn-sm">탈퇴</button></div>
  </form>
 </details>
</div>

<footer>도움이 됐다면 별 하나가 큰 힘이 됩니다<br><span style="display:inline-block;margin-top:8px">${starBtn()}</span></footer>
</div>`;
  return shell(`내 매출 — ${NAME}`, body, { css: REPORT_CSS + APP_CSS, noindex: true });
}

module.exports = { NAME, ICON_SVG, esc, landing, loginPage, signupPage, forgotPage, resetPage, messagePage, reportPage, appPage, reportCard, SAMPLE };
