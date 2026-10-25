// 유로커피머신 관리자 사이트(euro.order-app.us) 조회 — 이 사이트가 쓰는 화면용 API 를 «읽기만» 한다.
// 실측(2026-10-25):
//   POST /api/login {user_id,user_pass,checkid:1} → 200 + Set-Cookie(cookie=…) / 틀리면 400 {"code":0}
//   GET  /api/sales/day                 → 최근 10일 [{money, mileage, day:"10/24(토)"}] (0번이 오늘)
//   GET  /api/sales/all                 → 오늘·이번 달·올해 매출과 포인트
//   GET  /api/product/sales/day?…기간     → all_product_money (기간 매출 합계 — 일·월 매출과 정확히 같다)
//   GET  /api/product/sales/sub/day?…기간 → 메뉴별 판매 product_list [{product_idx, product_name, product_money, product_count}]
//   GET  /api/drink/count?…기간           → 차가운·따뜻한·기타 잔수 (유료·무료)
//   GET  /api/device/list?idx=0         → 기기 목록 (매장 이름 target_name)
//   GET  /api/products?idx=<기기>        → 메뉴 레시피 (ade_N_pump_second: 에이드 펌프 초)
const BASE = 'https://euro.order-app.us';
const XHR = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json, text/javascript, */*; q=0.01' };
const UA = { 'User-Agent': 'Mozilla/5.0 (cafe-sales-alert; +https://github.com/huryoungkil-ops/cafe-sales-alert)' };

class Euro {
  constructor() { this.cookie = null; }

  async login(id, pw) {
    let r;
    try {
      r = await fetch(BASE + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8', ...XHR, ...UA },
        body: JSON.stringify({ user_id: String(id), user_pass: String(pw), checkid: 1 }),
        signal: AbortSignal.timeout(20000),
      });
    } catch (e) { return { ok: false, msg: `유로 사이트에 연결하지 못했습니다 (${e.message})`, retry: true }; }
    const raw = (r.headers.getSetCookie?.() || [])[0] || r.headers.get('set-cookie');
    if (r.status === 200 && raw) { this.cookie = raw.split(';')[0].trim(); return { ok: true }; }
    if (r.status === 400) return { ok: false, msg: '아이디 또는 비밀번호가 맞지 않습니다' };
    return { ok: false, msg: `유로 사이트 응답 ${r.status}`, retry: r.status >= 500 };
  }

  async get(url) {
    if (!this.cookie) throw new Error('유로 로그인이 먼저 필요합니다');
    const r = await fetch(BASE + url, { headers: { Cookie: this.cookie, ...XHR, ...UA }, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`유로 ${url.split('?')[0]}: HTTP ${r.status}`);
    return r.json();
  }

  range(s, e) { return `idx=0&start_date=${s}&end_date=${e}`; }
  recentDays() { return this.get('/api/sales/day').then((j) => j.day_sales_list || []); }
  salesAll() { return this.get('/api/sales/all'); }
  async money(s, e) { const j = await this.get(`/api/product/sales/day?${this.range(s, e)}&draw=1&start=0&length=1`); return Number(j.all_product_money) || 0; }
  products(s, e) { return this.get(`/api/product/sales/sub/day?${this.range(s, e)}&draw=1&start=0&length=1000`); }
  drinks(s, e) { return this.get(`/api/drink/count?${this.range(s, e)}`); }
  devices() { return this.get('/api/device/list?idx=0').then((j) => j.data || []); }

  // 에이드 1·2·3번 펌프 초 레시피 (기기가 여러 대면 합친다)
  async recipes(devices) {
    const map = new Map();
    for (const d of devices || await this.devices()) {
      const pr = await this.get('/api/products?idx=' + d.idx);
      for (const p of pr.product_list || []) {
        const pump = [p.ade_1_pump_second, p.ade_2_pump_second, p.ade_3_pump_second].map(Number);
        if (pump.some(Boolean)) map.set(Number(p.idx), pump);
      }
    }
    return map;
  }
}

module.exports = { Euro, BASE };
