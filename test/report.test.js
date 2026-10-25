// 가짜 유로 응답으로 보고서·문구·일정을 확인한다 (네트워크 없음)
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csa-'));
process.env.DATA_DIR = tmp;
process.env.SECRET_KEY = Buffer.alloc(32, 7).toString('base64');

const test = require('node:test');
const assert = require('node:assert');
const { run, one } = require('../src/db');
const R = require('../src/report');
const { dueFor, resting } = require('../src/job');
const pages = require('../src/pages');
const { encrypt, decrypt } = require('../src/secure');

// 2026-10-25(일) 아침 기준 가짜 유로
class FakeEuro {
  devices() { return Promise.resolve([{ idx: 1, target_name: '테스트점' }]); }
  recentDays() {
    const out = [];
    for (let i = 0; i < 10; i++) {
      const d = R.addDays('2026-10-25', -i);
      out.push({ money: 100000 + i * 1000, mileage: 1000 + i, day: `${Number(d.slice(5, 7))}/${Number(d.slice(8))}(${R.dow(d)})` });
    }
    return Promise.resolve(out);
  }
  salesAll() { return Promise.resolve({ month_mileage: 50000 }); }
  money(s, e) { return Promise.resolve(s === e ? 101000 : 2400000); }
  drinks() { return Promise.resolve({ paid_cold_count: 30, free_cold_count: 1, paid_hot_count: 10, paid_other_count: 2 }); }
  products() {
    return Promise.resolve({ product_list: [
      { product_idx: 11, product_name: '아이스 아메리카노 ', product_money: '30000', product_count: '12' },
      { product_idx: 12, product_name: '자몽에이드', product_money: '14000', product_count: '4' },
      { product_idx: 0, product_name: '마일리지', product_money: '-1000', product_count: '1' },
    ] });
  }
  recipes() { return Promise.resolve(new Map([[12, [0, 8, 0]]])); }
}

test('날짜 도우미', () => {
  assert.strictEqual(R.parseMd('10/24(토)', '2026-10-25'), '2026-10-24');
  assert.strictEqual(R.parseMd('12/31(목)', '2027-01-02'), '2026-12-31');
  assert.strictEqual(R.dayLabel('2026-10-24'), '10/24(토)');
  assert.strictEqual(R.daysIn('2026-02'), 28);
  assert.strictEqual(R.prevMonth('2026-01'), '2025-12');
  assert.strictEqual(R.change(110, 100), '▲10%');
  assert.strictEqual(R.change(90, 100), '▼10%');
});

test('어제 보고서 — 지난주 대비·이번 달 예상·Top5·에이드', async () => {
  run("INSERT INTO users(id,name,created_at,ade_on,ade_names) VALUES(1,'a','2026-10-25',1,'복숭아,자몽,유자')");
  const user = one('SELECT * FROM users WHERE id=1');
  const d = await R.buildDaily(new FakeEuro(), user, '2026-10-24', { today: '2026-10-25' });
  assert.strictEqual(d.store, '테스트점');
  assert.strictEqual(d.day.money, 101000);              // 최근 10일 목록의 어제 값
  assert.strictEqual(d.lastWeek.date, '2026-10-17');
  assert.strictEqual(d.lastWeek.money, 108000);
  assert.strictEqual(d.month.projected, Math.round(2400000 / 24 * 31));
  assert.strictEqual(d.month.mileage, 50000 - 1000);     // 이번 달 − 오늘
  assert.strictEqual(d.stats.total, 43);
  assert.deepStrictEqual(d.stats.top5.map((t) => t.name), ['아이스 아메리카노', '자몽에이드']);
  assert.deepStrictEqual(d.ade.map((s) => s.cups), [0, 4, 0]);
  const dc = R.discordText(d, user, 'tok');
  assert.match(dc, /어제 매출: \*\*101,000원\*\*/);
  assert.match(dc, /지난주 토요일보다 ▼6%/);
  assert.match(dc, /2번 자몽 — 4잔 · 펌프 32초/);
  assert.match(dc, /1번 복숭아 — 0잔 ⚠️/);
  const kk = R.kakaoText(d);
  assert.ok(kk.length < 200, kk.length);
  assert.match(kk, /0잔인 에이드/);
});

test('지난달 결산', async () => {
  const user = one('SELECT * FROM users WHERE id=1');
  const d = await R.buildMonthly(new FakeEuro(), user, '2026-09', { today: '2026-10-01' });
  assert.strictEqual(d.money, 2400000);
  assert.strictEqual(d.avg, 80000);
  assert.strictEqual(d.mileage, null); // 9월 날짜가 다 쌓이지 않았다
  assert.match(R.discordText(d, user, 't'), /2026년 9월 결산/);
  assert.ok(R.kakaoText(d).length < 200);
});

test('보낼 때 — 시각·하루 한 번·1일 결산', () => {
  const u = { daily_on: 1, monthly_on: 1, send_time: '07:00', last_daily: '2026-10-23' };
  assert.deepStrictEqual(dueFor(u, '2026-10-25 06:50:00'), []);
  assert.deepStrictEqual(dueFor(u, '2026-10-25 07:00:00'), [['daily', '2026-10-24']]);
  assert.deepStrictEqual(dueFor({ ...u, last_daily: '2026-10-24' }, '2026-10-25 09:00:00'), []);
  assert.deepStrictEqual(dueFor({ ...u, last_daily: '2026-10-31' }, '2026-11-01 08:00:00'), [['monthly', '2026-10']]);
  assert.deepStrictEqual(dueFor({ ...u, last_daily: null, last_monthly: '2026-10' }, '2026-11-01 08:00:00'), [['daily', '2026-10-31']]);
  assert.deepStrictEqual(dueFor({ ...u, daily_on: 0 }, '2026-10-25 08:00:00'), []);
});

test('실패 뒤 쉬기 — 비밀번호 오류는 다시 저장할 때까지', () => {
  assert.strictEqual(resting({ euro_err: 'AUTH:틀림', euro_err_at: '2026-10-20 07:30:00' }, '2026-10-25 07:30:00'), true);
  assert.strictEqual(resting({ euro_err: '연결 실패', euro_err_at: '2026-10-25 07:30:00' }, '2026-10-25 07:45:00'), true);
  assert.strictEqual(resting({ euro_err: '연결 실패', euro_err_at: '2026-10-25 07:30:00' }, '2026-10-25 08:05:00'), false);
  assert.strictEqual(resting({}, '2026-10-25 08:05:00'), false);
});

test('암호화 — 저장값은 평문이 아니고 되돌릴 수 있다', () => {
  const e = encrypt('my-secret-pw');
  assert.ok(!e.includes('my-secret-pw'));
  assert.notStrictEqual(encrypt('my-secret-pw'), e); // IV 가 매번 다르다
  assert.strictEqual(decrypt(e), 'my-secret-pw');
});

test('화면이 그려진다 (예시 표시 포함)', () => {
  const html = pages.landing({ loggedIn: false });
  assert.match(html, /예시 데이터/);
  assert.match(html, /AES-256/);
  const app = pages.appPage({ user: { name: 'a', daily_on: 1, monthly_on: 1, ade_on: 1, send_time: '07:00' }, last: null, recent: [], times: ['07:00'], flash: '', kakaoReady: true });
  assert.match(app, /암호화되어 저장됩니다/);
  assert.match(pages.reportPage(pages.SAMPLE, {}), /어제 Top 5/);
});

test('로그인 화면 — 카카오 → 네이버 → 구글 → 이메일 순서', () => {
  const html = pages.loginPage({ providers: ['kakao', 'naver', 'google'] });
  const i = ['s-kakao', 's-naver', 's-google', 'action="/login/email"'].map((k) => html.indexOf(k));
  assert.ok(i.every((x) => x > 0), i.join(','));
  assert.deepStrictEqual([...i].sort((a, b) => a - b), i);
});

test('보고서 이미지 — PNG 로 구워지고 카톡 카드 크기를 안다', () => {
  const card = require('../src/card');
  const png = card.png(pages.SAMPLE, { ade_names: '자몽,복숭아,유자' }, 'full');
  assert.strictEqual(png.subarray(1, 4).toString(), 'PNG');
  const sz = card.size(pages.SAMPLE, {}, 'square');
  assert.strictEqual(sz.width, 1440);
  assert.ok(sz.height > 1000 && sz.height < 2000, sz.height);
  const kc = R.kakaoCard(pages.SAMPLE, 'tok', sz);
  assert.match(kc.image_url, /\/img\/tok-s\.png$/);
  assert.match(kc.title, /112,400원 ▲12%/);
});
