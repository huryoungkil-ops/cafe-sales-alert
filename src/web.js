// 웹 서버 (node:http, 외부 패키지 없음). 127.0.0.1:5740 — 바깥 HTTPS 는 Caddy 가 받아 넘긴다.
const http = require('node:http');
const { PORT, HOST, MAX_USERS, KAKAO_REST_KEY, PUBLIC_BASE } = require('./env');
const { one, all, run, now, log } = require('./db');
const { hashPw, checkPw, encrypt, token } = require('./secure');
const { PROVIDERS, enabledProviders } = require('./auth');
const A = require('./accounts');
const mailer = require('./mailer');
const emails = require('./emails');
const card = require('./card');
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
const kstAgo = (ms) => new Date(Date.now() + 9 * 3600e3 - ms).toISOString().replace('T', ' ').slice(0, 19);
const loginMsg = (res, msg) => redirect(res, `/login?e=${encodeURIComponent(msg)}`);
// 화면에 부를 이름
const who = (u) => u.name || (u.email ? u.email.split('@')[0] : '') || `회원 ${u.id}`;

function loginUser(res, userId, next) {
  const tok = token();
  run('INSERT INTO sessions(token,user_id,created_at) VALUES(?,?,?)', tok, userId, now());
  run('UPDATE users SET last_login=? WHERE id=?', now(), userId);
  return redirect(res, next, { 'Set-Cookie': setSession(tok) });
}

// 소셜 계정 → 사람. 같은 확인된 메일 주소로 이미 가입했다면 그 계정에 붙인다
function findOrCreate(provider, pf) {
  const idn = one('SELECT user_id FROM identities WHERE provider=? AND uid=?', provider, String(pf.uid));
  if (idn) return { userId: idn.user_id, isNew: false };
  let userId = null;
  if (pf.email && pf.emailVerified) {
    const u = one('SELECT id FROM users WHERE lower(email)=lower(?) AND email_ok=1', pf.email);
    if (u) userId = u.id;
  }
  let isNew = false;
  if (!userId) {
    const n = one('SELECT COUNT(*) n FROM users').n;
    if (n >= MAX_USERS) throw new Error('지금은 가입이 꽉 찼어요. 조금 뒤에 다시 와 주세요.');
    userId = Number(run('INSERT INTO users(name,email,email_ok,avatar,created_at,last_login) VALUES(?,?,?,?,?,?)',
      String(pf.name || '').slice(0, 40), pf.email || null, pf.email && pf.emailVerified ? 1 : 0, pf.avatar || '', now(), now()).lastInsertRowid);
    isNew = true;
    notify.owner(`🙋 카페 매출 알리미 새 가입 #${userId} — ${provider} (전체 ${n + 1}명)`);
  }
  run('INSERT INTO identities(provider,uid,user_id,email,created_at) VALUES(?,?,?,?,?)', provider, String(pf.uid), userId, pf.email || null, now());
  return { userId, isNew };
}

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
  if (M === 'GET' && p === '/login') return user ? redirect(res, '/app') : send(res, 200, pages.loginPage({ providers: enabledProviders(), msg: url.searchParams.get('m') || url.searchParams.get('e') || '', err: url.searchParams.has('e') }));
  if (M === 'GET' && p === '/signup') return user ? redirect(res, '/app') : send(res, 200, pages.signupPage({ providers: enabledProviders(), msg: url.searchParams.get('e') || '' }));
  if (M === 'GET' && p === '/forgot') return send(res, 200, pages.forgotPage({ msg: url.searchParams.get('e') || '' }));

  // 보고서 (카톡·디스코드 버튼) — 토큰만 알면 로그인 없이 본다
  let rm = p.match(/^\/r\/([\w-]{20,40})$/);
  if (M === 'GET' && rm) {
    const r = one('SELECT * FROM reports WHERE token=?', rm[1]);
    if (!r) return send(res, 404, pages.messagePage('보고서가 없습니다', '오래되어 지워졌거나 주소가 틀렸습니다.', '/'));
    const u = one('SELECT * FROM users WHERE id=?', r.user_id);
    return send(res, 200, pages.reportPage(JSON.parse(r.data_json), u || {}, { mine: user && user.id === r.user_id }), { 'X-Robots-Tag': 'noindex' });
  }
  // 보고서 이미지 (카톡 카드·디스코드 첨부) — /img/<토큰>.png (전체) · /img/<토큰>-s.png (카톡용 정사각)
  rm = p.match(/^\/img\/([\w-]{20,40})(-s)?\.png$/);
  if ((M === 'GET' || M === 'HEAD') && rm) {
    const r = one('SELECT * FROM reports WHERE token=?', rm[1]);
    if (!r) { res.writeHead(404); return res.end(); }
    const u = one('SELECT * FROM users WHERE id=?', r.user_id) || {};
    const png = card.png(JSON.parse(r.data_json), u, rm[2] ? 'square' : 'full');
    res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Robots-Tag': 'noindex' });
    return res.end(M === 'HEAD' ? undefined : png);
  }

  // ── 소셜 로그인 (카카오 · 네이버 · 구글) ──
  let am = p.match(/^\/auth\/(\w+)$/);
  if (M === 'GET' && am) {
    const prov = PROVIDERS[am[1]];
    if (!prov || !prov.on()) return loginMsg(res, '이 로그인은 아직 준비 중이에요.');
    const state = token(18);
    run('DELETE FROM oauth_states WHERE created_at < ?', kstAgo(3600e3));
    run('INSERT INTO oauth_states(state,provider,next,created_at) VALUES(?,?,?,?)', state, am[1], '/app', now());
    return redirect(res, prov.url(state));
  }
  am = p.match(/^\/auth\/(\w+)\/callback$/);
  if (M === 'GET' && am && PROVIDERS[am[1]]) {
    const provider = am[1];
    const q = Object.fromEntries(url.searchParams);
    const st = one('SELECT * FROM oauth_states WHERE state=? AND provider=?', String(q.state || ''), provider);
    if (!st) return loginMsg(res, '로그인 시간이 지났어요. 다시 눌러 주세요.');
    run('DELETE FROM oauth_states WHERE state=?', st.state);
    if (q.error || !q.code) return loginMsg(res, '로그인을 취소했어요.');
    try {
      const prof = await PROVIDERS[provider].profile(String(q.code), st.state);
      if (!prof.uid) throw new Error('계정 번호를 받지 못했어요');
      const { userId, isNew } = findOrCreate(provider, prof);
      // 카카오로 로그인하며 «카카오톡 메시지 전송» 에 동의했다면 카톡 알림도 바로 연결
      let talk = false;
      if (prof.kakaoRefresh) { run('UPDATE users SET kakao_refresh=?, kakao_at=? WHERE id=?', prof.kakaoRefresh, now(), userId); talk = true; }
      const msg = isNew ? `환영해요! 유로 관리자 계정부터 연결해 주세요.${talk ? ' (카카오톡 알림은 이미 연결됐어요)' : ''}` : '';
      return loginUser(res, userId, msg ? `/app?m=${encodeURIComponent(msg)}` : '/app');
    } catch (e) {
      console.error(`[로그인] ${provider}: ${e.message}`);
      return loginMsg(res, `로그인에 실패했어요: ${e.message}`);
    }
  }

  // ── 이메일 가입·로그인 (확인 메일을 눌러야 가입) ──
  if (M === 'POST' && ['/signup', '/login/email', '/forgot', '/reset'].includes(p)) {
    const b = await readBody(req);
    const email = String(b.get('email') || '').trim().toLowerCase().slice(0, 120);
    const pw = String(b.get('password') || '');
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (p === '/signup') {
      const bad = !A.EMAIL_RE.test(email) ? '이메일 주소를 확인해 주세요.' : A.pwProblem(pw);
      if (bad) return redirect(res, `/signup?e=${encodeURIComponent(bad)}`);
      if (A.existingFor(email)) return loginMsg(res, '이미 가입된 주소예요. 로그인하거나 «비밀번호를 잊었어요» 로 비밀번호를 정해 주세요.');
      if (one('SELECT COUNT(*) n FROM users').n >= MAX_USERS) return redirect(res, `/signup?e=${encodeURIComponent('지금은 가입이 꽉 찼어요. 조금 뒤에 다시 와 주세요.')}`);
      // 같은 주소로 한 시간에 세 번까지만 (남의 메일함을 괴롭히지 못하게)
      if (one('SELECT COUNT(*) n FROM signups WHERE email=? AND created_at > ?', email, kstAgo(3600e3)).n >= 3) return redirect(res, `/signup?e=${encodeURIComponent('확인 메일을 이미 여러 번 보냈어요. 메일함(스팸함 포함)을 확인해 주세요.')}`);
      const t = token();
      run('INSERT INTO signups(token,email,pw_hash,created_at) VALUES(?,?,?,?)', t, email, hashPw(pw), now());
      try { await mailer.sendMail({ to: email, ...emails.signupEmail(email, `${PUBLIC_BASE}/signup/confirm/${t}`) }); } catch (e) { console.error('[가입 메일]', e.message); return redirect(res, `/signup?e=${encodeURIComponent('확인 메일을 보내지 못했어요. 잠시 뒤 다시 해 주세요.')}`); }
      return send(res, 200, pages.messagePage('메일함을 확인해 주세요', `<b>${pages.esc(email)}</b> 로 확인 메일을 보냈어요. 메일의 «가입 완료하기» 버튼을 누르면 가입이 끝나요. 안 보이면 스팸함도 봐 주세요.`, '/login'));
    }
    if (p === '/login/email') {
      const keys = [`e:${email}`, `i:${ip}`];
      if (keys.some(A.blocked)) return loginMsg(res, '로그인 실패가 많아 15분 동안 막았어요. «비밀번호를 잊었어요» 로 새로 정할 수 있어요.');
      const idn = one("SELECT user_id FROM identities WHERE provider='email' AND uid=?", email);
      const u = idn && one('SELECT id, pw_hash FROM users WHERE id=?', idn.user_id);
      if (!u || !checkPw(pw, u.pw_hash)) {
        keys.forEach(A.fail);
        return loginMsg(res, !idn && A.existingFor(email) ? '이 주소는 소셜 로그인으로 가입돼 있어요. 위 버튼으로 로그인하거나 «비밀번호를 잊었어요» 로 비밀번호를 정해 주세요.' : '이메일 또는 비밀번호가 맞지 않아요.');
      }
      keys.forEach(A.clearFails);
      return loginUser(res, u.id, '/app');
    }
    if (p === '/forgot') {
      const done = () => send(res, 200, pages.messagePage('메일함을 확인해 주세요', '가입된 주소라면 비밀번호를 새로 정하는 링크를 보냈어요. 1시간 안에 눌러 주세요.', '/login'));
      const ex = A.EMAIL_RE.test(email) && A.existingFor(email);
      if (!ex) return done(); // 가입 여부를 알려 주지 않는다
      if (one('SELECT COUNT(*) n FROM pw_resets WHERE email=? AND created_at > ?', email, kstAgo(3600e3)).n >= 3) return done();
      const t = token();
      run('INSERT INTO pw_resets(token,user_id,email,created_at) VALUES(?,?,?,?)', t, ex.userId, email, now());
      mailer.sendMail({ to: email, ...emails.resetEmail(email, `${PUBLIC_BASE}/reset/${t}`) }).catch((e) => console.error('[재설정 메일]', e.message));
      return done();
    }
    if (p === '/reset') {
      const t = String(b.get('token') || '');
      const r = one('SELECT * FROM pw_resets WHERE token=?', t);
      if (!r || !A.fresh(r.created_at, 3600e3)) return redirect(res, `/forgot?e=${encodeURIComponent('링크가 만료됐어요. 다시 받아 주세요.')}`);
      const bad = A.pwProblem(pw);
      if (bad) return send(res, 200, pages.resetPage({ token: t, email: r.email, msg: bad }));
      run('UPDATE users SET pw_hash=? WHERE id=?', hashPw(pw), r.user_id);
      // 이메일 로그인을 붙인다 (소셜로 가입했어도 이제 이메일로 로그인 가능)
      if (!one("SELECT 1 FROM identities WHERE provider='email' AND uid=?", r.email)) run("INSERT INTO identities(provider,uid,user_id,email,created_at) VALUES('email',?,?,?,?)", r.email, r.user_id, r.email, now());
      run('DELETE FROM pw_resets WHERE user_id=?', r.user_id);
      run('DELETE FROM sessions WHERE user_id=?', r.user_id); // 다른 기기의 로그인은 끊는다
      A.clearFails(`e:${r.email}`);
      return loginUser(res, r.user_id, `/app?m=${encodeURIComponent('비밀번호를 정했어요. 이제 이메일로도 로그인할 수 있어요.')}`);
    }
  }
  let sm = p.match(/^\/signup\/confirm\/([\w-]+)$/);
  if (M === 'GET' && sm) {
    const s = one('SELECT * FROM signups WHERE token=?', sm[1]);
    if (!s || !A.fresh(s.created_at, 86400e3)) return send(res, 400, pages.messagePage('링크가 만료됐어요', '회원가입을 다시 해 주세요.', '/signup'));
    run('DELETE FROM signups WHERE email=?', s.email);
    if (A.existingFor(s.email)) return loginMsg(res, '이미 가입된 주소예요. 로그인해 주세요.');
    const userId = Number(run('INSERT INTO users(email,email_ok,name,pw_hash,created_at,last_login) VALUES(?,1,?,?,?,?)', s.email, s.email.split('@')[0], s.pw_hash, now(), now()).lastInsertRowid);
    run("INSERT INTO identities(provider,uid,user_id,email,created_at) VALUES('email',?,?,?,?)", s.email, userId, s.email, now());
    notify.owner(`🙋 카페 매출 알리미 새 가입 #${userId} — 이메일 (전체 ${one('SELECT COUNT(*) n FROM users').n}명)`);
    return loginUser(res, userId, `/app?m=${encodeURIComponent('가입을 마쳤어요! 유로 관리자 계정부터 연결해 주세요.')}`);
  }
  if (M === 'GET' && (sm = p.match(/^\/reset\/([\w-]+)$/))) {
    const r = one('SELECT * FROM pw_resets WHERE token=?', sm[1]);
    if (!r || !A.fresh(r.created_at, 3600e3)) return redirect(res, `/forgot?e=${encodeURIComponent('링크가 만료됐어요. 다시 받아 주세요.')}`);
    return send(res, 200, pages.resetPage({ token: sm[1], email: r.email }));
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
      logins: all('SELECT provider FROM identities WHERE user_id=?', user.id).map((x) => ({ kakao: '카카오', naver: '네이버', google: 'Google', email: '이메일' })[x.provider] || x.provider).join(' · '),
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
      if (first) notify.owner(`☕ 카페 매출 알리미 — ${who(user)} 님이 매장을 연결했습니다`);
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
    const t = await notify.discord(u, `☕ 카페 매출 알리미 — ${who(user)} 님 알림 연결 완료! 매일 정한 시각에 어제 매출을 여기로 보내 드려요.`);
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

  // 탈퇴 — 계정·로그인 연결·유로 비밀번호·매출 기록·보고서를 모두 지운다 («탈퇴» 라고 적어야 진행)
  if (p === '/app/leave') {
    if (String(b.get('confirm') || '').trim() !== '탈퇴') return back(res, '«탈퇴» 라고 적어야 탈퇴할 수 있어요.', true, '#account');
    for (const t of ['reports', 'days', 'sessions', 'logs', 'identities', 'pw_resets']) run(`DELETE FROM ${t} WHERE user_id=?`, user.id);
    run('DELETE FROM users WHERE id=?', user.id);
    notify.owner(`👋 카페 매출 알리미 탈퇴 — 회원 #${user.id}`);
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
