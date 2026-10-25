// 웹 서버 (node:http, 외부 패키지 없음). 127.0.0.1:5740 — 바깥 HTTPS 는 Caddy 가 받아 넘긴다.
const http = require('node:http');
const { PORT, HOST, MAX_USERS, KAKAO_REST_KEY, PUBLIC_BASE } = require('./env');
const { one, all, run, now, log } = require('./db');
const { hashPw, checkPw, encrypt, token } = require('./secure');
const pages = require('./pages');
const notify = require('./notify');
const { Euro } = require('./euro');
const { makeReport } = require('./job');
const R = require('./report');

const COOKIE = 'csa';
const SESSION_DAYS = 90;

// ── 도우미 ──
function parseCookies(req) {
  const out = {};
  for (const p of String(req.headers.cookie || '').split(';')) {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  }
  return out;
}
async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) { size += c.length; if (size > 32 * 1024) throw new Error('too big'); chunks.push(c); }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}
function send(res, status, html, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(html);
}
const redirect = (res, to, headers = {}) => { res.writeHead(303, { Location: to, 'Cache-Control': 'no-store', ...headers }); res.end(); };
const back = (res, msg, err = false, hash = '') => redirect(res, `/app?${err ? 'e' : 'm'}=${encodeURIComponent(msg)}${hash}`);
const secure = PUBLIC_BASE.startsWith('https');
const setSession = (tok) => `${COOKIE}=${tok}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}`;

function currentUser(req) {
  const tok = parseCookies(req)[COOKIE];
  if (!tok) return null;
  const s = one('SELECT * FROM sessions WHERE token=?', tok);
  if (!s) return null;
  const u = one('SELECT * FROM users WHERE id=?', s.user_id);
  return u ? { ...u, _session: s } : null;
}
const isLocked = (u) => u && u.locked_until && u.locked_until > now();

// 유로 로그인 시도는 한 사람당 1시간에 6번까지 (유로 계정이 잠기지 않게)
const euroTries = new Map();
function euroTryOk(userId) {
  const t = Date.now();
  const list = (euroTries.get(userId) || []).filter((x) => t - x < 3600e3);
  if (list.length >= 6) return false;
  list.push(t); euroTries.set(userId, list);
  return true;
}


// ── 라우트 ──
async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const M = req.method;
  const user = currentUser(req);

  if (p === '/icon.svg' || p === '/favicon.ico') { res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' }); return res.end(pages.ICON_SVG); }
  if (p === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  if (p === '/robots.txt') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('User-agent: *\nDisallow: /r/\nDisallow: /app\n'); }
  if (M === 'GET' && p === '/') {
    const n = one('SELECT COUNT(*) n FROM users WHERE euro_pw_enc IS NOT NULL').n;
    const sent = one('SELECT COUNT(*) n FROM reports WHERE sent_json IS NOT NULL').n;
    return send(res, 200, pages.landing({ loggedIn: !!user, stores: n, reports: sent, bye: url.searchParams.has('bye') }));
  }
  if (M === 'GET' && p === '/login') return user ? redirect(res, '/app') : send(res, 200, pages.loginPage());

  // 보고서 (카톡·디스코드 버튼) — 토큰만 알면 로그인 없이 본다
  let rm = p.match(/^\/r\/([\w-]{20,40})$/);
  if (M === 'GET' && rm) {
    const r = one('SELECT * FROM reports WHERE token=?', rm[1]);
    if (!r) return send(res, 404, pages.messagePage('보고서가 없습니다', '오래되어 지워졌거나 주소가 틀렸습니다.', '/'));
    const u = one('SELECT * FROM users WHERE id=?', r.user_id);
    return send(res, 200, pages.reportPage(JSON.parse(r.data_json), u || {}, { mine: user && user.id === r.user_id }), { 'X-Robots-Tag': 'noindex' });
  }

  if (M === 'POST' && p === '/login') {
    const b = await readBody(req);
    const login = String(b.get('login') || '').trim();
    const pw = String(b.get('pw') || '');
    if (!/^[\w가-힣.-]{2,20}$/.test(login)) return send(res, 200, pages.loginPage({ error: '아이디는 2~20자 (한글·영문·숫자·_ . -) 로 해 주세요.', login }));
    if (pw.length < 4) return send(res, 200, pages.loginPage({ error: '비밀번호는 4자 이상이어야 합니다.', login }));
    let u = one('SELECT * FROM users WHERE login=?', login);
    if (isLocked(u)) return send(res, 200, pages.loginPage({ error: '비밀번호를 여러 번 틀려 15분 동안 잠겼습니다.', login }));
    let isNew = false;
    if (!u) {
      const n = one('SELECT COUNT(*) n FROM users').n;
      if (n >= MAX_USERS) return send(res, 200, pages.loginPage({ error: '가입 인원이 다 찼습니다. 잠시 뒤 다시 시도해 주세요.', login }));
      run('INSERT INTO users(login,pw_hash,created_at) VALUES(?,?,?)', login, hashPw(pw), now());
      u = one('SELECT * FROM users WHERE login=?', login);
      isNew = true;
      notify.owner(`🙋 카페 매출 알리미 새 가입 — ${login} (전체 ${n + 1}명, ${now()})`);
    } else if (!checkPw(pw, u.pw_hash)) {
      const fails = (u.fail_count || 0) + 1;
      const lock = fails >= 5 ? new Date(Date.now() + 9 * 3600e3 + 15 * 60e3).toISOString().replace('T', ' ').slice(0, 19) : null;
      run('UPDATE users SET fail_count=?, locked_until=? WHERE id=?', lock ? 0 : fails, lock, u.id);
      return send(res, 200, pages.loginPage({ error: `비밀번호가 틀렸습니다.${lock ? ' 15분 동안 잠깁니다.' : ` (${fails}/5)`} 잊으셨다면 <a href="/reset-request?who=${encodeURIComponent(login)}">운영자에게 초기화 요청</a>`, login }));
    }
    run('UPDATE users SET fail_count=0, locked_until=NULL WHERE id=?', u.id);
    const tok = token();
    run('INSERT INTO sessions(token,user_id,created_at) VALUES(?,?,?)', tok, u.id, now());
    return redirect(res, isNew ? '/app?m=' + encodeURIComponent('가입을 환영합니다! 유로 관리자 계정부터 연결해 주세요.') : '/app', { 'Set-Cookie': setSession(tok) });
  }

  if (M === 'GET' && p === '/reset-request') {
    const who = String(url.searchParams.get('who') || '').slice(0, 20);
    if (who && one('SELECT id FROM users WHERE login=?', who)) await notify.owner(`🔑 카페 매출 알리미 비밀번호 초기화 요청 — ${who}\n서버에서: node scripts/admin.js reset ${who}`);
    return send(res, 200, pages.messagePage('요청했습니다', '운영자에게 초기화 요청을 보냈습니다. 디스코드나 카톡이 연결돼 있으면 그쪽으로 알려 드려요.', '/login'));
  }

  if (M === 'POST' && p === '/logout') {
    if (user) run('DELETE FROM sessions WHERE token=?', user._session.token);
    return redirect(res, '/', { 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0` });
  }

  // 카카오 콜백은 state 로 세션을 찾는다
  if (M === 'GET' && p === '/kakao/callback') {
    const st = String(url.searchParams.get('state') || '');
    const s = st && one('SELECT * FROM sessions WHERE kakao_state=?', st);
    if (!s) return send(res, 400, pages.messagePage('연결 실패', '세션이 맞지 않습니다. 사이트에 다시 로그인한 뒤 연결해 주세요.', '/app'));
    run('UPDATE sessions SET kakao_state=NULL WHERE token=?', s.token);
    const code = url.searchParams.get('code');
    if (!code) return send(res, 400, pages.messagePage('연결 취소', `카카오 연결을 하지 않았습니다. ${pages.esc(url.searchParams.get('error_description') || '')}`, '/app'));
    const t = await notify.kakaoToken({ grant_type: 'authorization_code', redirect_uri: notify.kakaoRedirect(), code });
    if (!t.access_token) return send(res, 400, pages.messagePage('연결 실패', `카카오가 알려준 이유: ${pages.esc(JSON.stringify(t).slice(0, 300))}`, '/app'));
    run('UPDATE users SET kakao_refresh=?, kakao_at=? WHERE id=?', t.refresh_token, now(), s.user_id);
    const sent = await notify.kakaoSendWithAccess(t.access_token, '☕ 카페 매출 알리미 연결 완료\n매일 정한 시각에 어제 매출을 여기 «나와의 채팅»으로 보내 드려요.');
    return back(res, sent.ok ? '카카오톡 연결 완료 — «나와의 채팅»에 시험 메시지를 보냈습니다.' : `카카오톡은 연결됐지만 시험 메시지 실패: ${sent.why}`, !sent.ok, '#notify');
  }

  // ── 여기부터 로그인 필요 ──
  if (!user) return redirect(res, '/login');

  if (M === 'GET' && p === '/app') {
    const last = one('SELECT * FROM reports WHERE user_id=? ORDER BY id DESC LIMIT 1', user.id);
    const recent = all('SELECT date, money FROM days WHERE user_id=? ORDER BY date DESC LIMIT 30', user.id).reverse();
    return send(res, 200, pages.appPage({
      user, last: last ? { ...last, data: JSON.parse(last.data_json) } : null, recent,
      flash: url.searchParams.get('m') || url.searchParams.get('e') || '', flashErr: url.searchParams.has('e'), kakaoReady: !!KAKAO_REST_KEY,
    }));
  }

  if (M === 'GET' && p === '/kakao/start') {
    if (!KAKAO_REST_KEY) return back(res, '카카오 연결이 아직 준비되지 않았습니다.', true);
    const st = token(16);
    run('UPDATE sessions SET kakao_state=? WHERE token=?', st, user._session.token);
    return redirect(res, notify.kakaoAuthUrl(st));
  }

  if (M !== 'POST') return send(res, 404, pages.messagePage('없는 페이지', '주소를 확인해 주세요.', '/'));
  const b = await readBody(req);

  if (p === '/app/euro') {
    const id = String(b.get('euro_id') || '').trim();
    const pw = String(b.get('euro_pw') || '');
    if (!id || !pw) return back(res, '유로 관리자 아이디와 비밀번호를 모두 입력해 주세요.', true, '#euro');
    if (id.length > 60 || pw.length > 100) return back(res, '입력이 너무 깁니다.', true, '#euro');
    if (!euroTryOk(user.id)) return back(res, '유로 로그인 시도가 많습니다. 1시간 뒤 다시 해 주세요 (유로 계정 보호).', true, '#euro');
    const euro = new Euro();
    const r = await euro.login(id, pw);
    if (!r.ok) return back(res, `유로 로그인 실패 — ${r.msg} (저장하지 않았습니다)`, true, '#euro');
    run('UPDATE users SET euro_id=?, euro_pw_enc=?, euro_ok_at=?, euro_err=NULL, euro_err_at=NULL WHERE id=?', id, encrypt(pw), now(), user.id);
    log(user.id, '유로 계정 저장');
    // 바로 어제 보고서를 만들어 화면에 보여 준다 (알림은 안 보냄 — 오늘 정한 시각엔 다시 안 보냄)
    const y = R.addDays(now().slice(0, 10), -1);
    try {
      const fresh = one('SELECT * FROM users WHERE id=?', user.id);
      const rep = await makeReport(fresh, 'daily', y, { send: false, euro });
      run('UPDATE users SET last_daily=? WHERE id=? AND (last_daily IS NULL OR last_daily<?)', y, user.id, y);
      const first = !user.euro_pw_enc;
      if (first) notify.owner(`☕ 카페 매출 알리미 — ${user.login} 님이 매장을 연결했습니다`);
      return back(res, `연결 완료! «${rep.data.store}» 어제 매출 ${R.fmt(rep.data.day.money)}원을 불러왔어요. 이제 받을 곳(카톡·디스코드)을 연결해 주세요.`, false, '#notify');
    } catch (e) {
      return back(res, `계정은 암호화해 저장했지만 매출을 불러오지 못했습니다: ${e.message}`, true, '#euro');
    }
  }

  if (p === '/app/euro/delete') {
    run('UPDATE users SET euro_id=NULL, euro_pw_enc=NULL, euro_ok_at=NULL, euro_err=NULL, euro_err_at=NULL WHERE id=?', user.id);
    log(user.id, '유로 계정 삭제');
    return back(res, '저장된 유로 계정을 지웠습니다. 이제 매출을 조회하지 않습니다.', false, '#euro');
  }

  if (p === '/app/settings') {
    // 비우면 아침 7시. «HH:MM» (00:00~23:59)
    const t = String(b.get('send_time') || '').trim().slice(0, 5) || '07:00';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) return back(res, '시각은 07:00 처럼 입력해 주세요.', true, '#settings');
    const names = [1, 2, 3].map((i) => String(b.get('ade' + i) || '').replace(/[,<>]/g, '').trim().slice(0, 10));
    run('UPDATE users SET send_time=?, daily_on=?, monthly_on=?, ade_on=?, ade_names=? WHERE id=?',
      t, b.get('daily_on') ? 1 : 0, b.get('monthly_on') ? 1 : 0, b.get('ade_on') ? 1 : 0, names.some(Boolean) ? names.join(',') : null, user.id);
    return back(res, `저장했습니다 — 매일 ${t}${b.get('monthly_on') ? ' · 매월 1일 결산' : ''}`, false, '#settings');
  }

  if (p === '/app/discord') {
    const u = String(b.get('discord') || '').trim();
    if (!u) { run('UPDATE users SET discord_url=NULL WHERE id=?', user.id); return back(res, '디스코드 알림을 껐습니다.', false, '#notify'); }
    if (!notify.DISCORD_RE.test(u)) return back(res, '디스코드 웹훅 주소 형식이 아닙니다 (https://discord.com/api/webhooks/… ).', true, '#notify');
    const t = await notify.discord(u, `☕ 카페 매출 알리미 — ${user.login} 님 알림 연결 완료! 매일 정한 시각에 어제 매출을 여기로 보내 드려요.`);
    if (!t.ok) return back(res, `시험 알림 실패(저장 안 함): ${t.why}`, true, '#notify');
    run('UPDATE users SET discord_url=? WHERE id=?', u, user.id);
    return back(res, '디스코드 웹훅을 저장했고 시험 알림을 보냈습니다.', false, '#notify');
  }

  if (p === '/app/kakao/unlink') {
    run('UPDATE users SET kakao_refresh=NULL, kakao_at=NULL WHERE id=?', user.id);
    return back(res, '카카오톡 연결을 끊었습니다.', false, '#notify');
  }

  // 어제 보고서를 지금 만들어 연결된 곳으로 보내 본다
  if (p === '/app/send-now') {
    if (!user.euro_pw_enc) return back(res, '유로 관리자 계정을 먼저 연결해 주세요.', true, '#euro');
    if (!user.discord_url && !user.kakao_refresh) return back(res, '받을 곳(카카오톡이나 디스코드)을 먼저 연결해 주세요.', true, '#notify');
    const recentSend = one("SELECT COUNT(*) n FROM reports WHERE user_id=? AND sent_json IS NOT NULL AND created_at > ?", user.id, new Date(Date.now() + 9 * 3600e3 - 600e3).toISOString().replace('T', ' ').slice(0, 19)).n;
    if (recentSend >= 3) return back(res, '10분에 3번까지 보낼 수 있어요. 잠시 뒤 다시 눌러 주세요.', true);
    try {
      const r = await makeReport(user, 'daily', R.addDays(now().slice(0, 10), -1));
      return back(res, '보냈습니다 — ' + r.sent.map(([k, x]) => `${k} ${x.ok ? '✅' : '실패(' + x.why + ')'}`).join(' · '), r.sent.some(([, x]) => !x.ok));
    } catch (e) { return back(res, `보내지 못했습니다: ${e.message}`, true); }
  }

  if (p === '/app/password') {
    if (!checkPw(String(b.get('old') || ''), user.pw_hash)) return back(res, '지금 비밀번호가 틀렸습니다.', true, '#account');
    const nw = String(b.get('new') || '');
    if (nw.length < 4) return back(res, '새 비밀번호는 4자 이상이어야 합니다.', true, '#account');
    run('UPDATE users SET pw_hash=? WHERE id=?', hashPw(nw), user.id);
    run('DELETE FROM sessions WHERE user_id=? AND token<>?', user.id, user._session.token);
    return back(res, '비밀번호를 바꿨습니다.', false, '#account');
  }

  // 탈퇴 — 계정·유로 비밀번호·매출 기록·보고서를 모두 지운다
  if (p === '/app/leave') {
    if (!checkPw(String(b.get('pw') || ''), user.pw_hash)) return back(res, '비밀번호가 틀려 탈퇴하지 않았습니다.', true, '#account');
    for (const t of ['reports', 'days', 'sessions', 'logs']) run(`DELETE FROM ${t} WHERE user_id=?`, user.id);
    run('DELETE FROM users WHERE id=?', user.id);
    notify.owner(`👋 카페 매출 알리미 탈퇴 — ${user.login}`);
    return redirect(res, '/?bye=1', { 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0` });
  }

  return send(res, 404, pages.messagePage('없는 페이지', '주소를 확인해 주세요.', '/'));
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    console.error(e);
    if (!res.headersSent) send(res, 500, pages.messagePage('오류', `잠시 뒤 다시 시도해 주세요. (${pages.esc(e.message)})`));
  });
});
if (require.main === module) server.listen(PORT, HOST, () => console.log(`카페 매출 알리미 http://${HOST}:${PORT}`));
module.exports = { server };
