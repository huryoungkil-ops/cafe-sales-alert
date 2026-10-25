// 5분마다 (systemd 타이머) — 보고 시각이 지난 사람에게 «어제 매출», 매월 1일엔 «지난달 결산» 을 보낸다.
//   node src/job.js            정해진 사람만
//   node src/job.js --user 3   한 사람만 지금 (시험)
const { one, all, run, now, log } = require('./db');
const { decrypt, token } = require('./secure');
const { Euro } = require('./euro');
const R = require('./report');
const notify = require('./notify');

const RETRY_MIN = 30;

async function loginUser(user) {
  if (!user.euro_pw_enc) return { ok: false, msg: '유로 계정이 저장되어 있지 않습니다' };
  const euro = new Euro();
  let r = await euro.login(user.euro_id, decrypt(user.euro_pw_enc));
  if (!r.ok && r.retry) { await new Promise((ok) => setTimeout(ok, 5000)); r = await euro.login(user.euro_id, decrypt(user.euro_pw_enc)); }
  return { ...r, euro };
}

// 보고서를 만들어 저장하고 (send 면) 알림을 보낸다
async function makeReport(user, kind, ref, { send = true, euro } = {}) {
  let e = euro;
  if (!e) {
    const lr = await loginUser(user);
    if (!lr.ok) { const err = new Error(lr.msg); err.auth = !lr.retry; throw err; }
    e = lr.euro;
  }
  const data = kind === 'monthly' ? await R.buildMonthly(e, user, ref) : await R.buildDaily(e, user, ref);
  const tok = token(18);
  const id = run('INSERT INTO reports(user_id,kind,ref,token,data_json,created_at) VALUES(?,?,?,?,?,?)', user.id, kind, ref, tok, JSON.stringify(data), now()).lastInsertRowid;
  if (data.store && data.store !== user.store_name) run('UPDATE users SET store_name=? WHERE id=?', data.store, user.id);
  let sent = [];
  if (send) {
    sent = await notify.toUser(user, { discord: R.discordText(data, user, tok), kakao: R.kakaoText(data), link: R.reportUrl(tok) });
    run('UPDATE reports SET sent_json=? WHERE id=?', JSON.stringify(sent), id);
    log(user.id, `${kind} ${ref} 보냄: ${sent.map(([k, r]) => `${k} ${r.ok ? 'OK' : r.why}`).join(' · ') || '연결된 알림 없음'}`);
  }
  return { data, token: tok, sent };
}

const hhmm = () => now().slice(11, 16);

// 지금 이 사람에게 보낼 것 [['daily','2026-10-24'], ['monthly','2026-09']]
function dueFor(user, at = now()) {
  const today = at.slice(0, 10), time = at.slice(11, 16);
  if (time < (user.send_time || '07:00')) return [];
  const out = [];
  const y = R.addDays(today, -1);
  if (user.daily_on && (!user.last_daily || user.last_daily < y)) out.push(['daily', y]);
  const pm = R.prevMonth(today.slice(0, 7));
  if (user.monthly_on && today.slice(8) === '01' && user.last_monthly !== pm) out.push(['monthly', pm]);
  return out;
}

// 실패 뒤 쉬는 중인가 (비밀번호 오류는 사용자가 다시 저장할 때까지 — 유로 계정이 잠기지 않게)
function resting(user, at = now()) {
  if (!user.euro_err) return false;
  if (user.euro_err.startsWith('AUTH:')) return true;
  const t = Date.parse(String(user.euro_err_at || '').replace(' ', 'T') + '+09:00');
  return Number.isFinite(t) && Date.parse(at.replace(' ', 'T') + '+09:00') - t < RETRY_MIN * 60e3;
}

async function runUser(user) {
  const jobs = dueFor(user);
  if (!jobs.length || resting(user)) return;
  let euro;
  try {
    const lr = await loginUser(user);
    if (!lr.ok) { const err = new Error(lr.msg); err.auth = !lr.retry; throw err; }
    euro = lr.euro;
    for (const [kind, ref] of jobs) {
      await makeReport(user, kind, ref, { euro });
      run(`UPDATE users SET ${kind === 'daily' ? 'last_daily' : 'last_monthly'}=?, euro_err=NULL, euro_err_at=NULL, euro_ok_at=? WHERE id=?`, ref, now(), user.id);
    }
  } catch (e) {
    const auth = !!e.auth;
    const first = !user.euro_err || (user.euro_err_at || '').slice(0, 10) !== now().slice(0, 10);
    run('UPDATE users SET euro_err=?, euro_err_at=? WHERE id=?', (auth ? 'AUTH:' : '') + e.message, now(), user.id);
    log(user.id, `실패: ${e.message}`);
    console.error(user.login, e.message);
    if (first) {
      const why = auth ? `유로 관리자 로그인이 안 됩니다 (${e.message}). 비밀번호를 바꾸셨다면 사이트에서 다시 저장해 주세요. 그때까지 조회를 멈춥니다.` : `오늘 매출을 가져오지 못했습니다 (${e.message}). ${RETRY_MIN}분 뒤 다시 시도합니다.`;
      await notify.toUser(user, { discord: `⚠️ 카페 매출 알리미 — ${why}`, kakao: `⚠️ 카페 매출 알리미\n${why}`.slice(0, 195), link: require('./env').PUBLIC_BASE + '/app' });
      if (!auth) await notify.owner(`⚠️ 카페 매출 알리미 조회 실패 — ${user.login}: ${e.message}`);
    }
  }
}

async function main() {
  const i = process.argv.indexOf('--user');
  if (i > 0) {
    const u = one('SELECT * FROM users WHERE id=?', Number(process.argv[i + 1]));
    if (!u) throw new Error('그런 사용자 없음');
    const r = await makeReport(u, 'daily', R.addDays(now().slice(0, 10), -1));
    console.log(R.discordText(r.data, u, r.token), '\n---\n', R.kakaoText(r.data), '\n', r.sent);
    return;
  }
  for (const u of all('SELECT * FROM users WHERE euro_pw_enc IS NOT NULL ORDER BY id')) await runUser(u);
  // 오래된 보고서 정리 (100일)
  run('DELETE FROM reports WHERE created_at < ?', R.addDays(now().slice(0, 10), -100));
}

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { makeReport, loginUser, dueFor, resting, hhmm };
