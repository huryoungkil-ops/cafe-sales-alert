// 이메일 가입·로그인 도우미 (뉴스모아와 같은 방식)
// - 가입: 이메일·비밀번호 → 확인 메일. 링크를 눌러야 계정이 생긴다 (남의 주소로 가입하지 못하게)
// - 비밀번호는 scrypt 한 방향 값만 저장한다 (secure.hashPw)
const { one } = require('./db');

const EMAIL_RE = /^[^\s@<>"']{1,64}@[^\s@<>"']+\.[a-z]{2,}$/i;
function pwProblem(pw) {
  const s = String(pw || '');
  if (s.length < 8) return '비밀번호는 8자 이상으로 정해 주세요.';
  if (s.length > 100) return '비밀번호가 너무 길어요.';
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(s)).length;
  if (kinds < 2) return '영문·숫자·기호 중 두 가지 이상을 섞어 주세요.';
  return null;
}

// 로그인 실패 막기 — 주소·IP 마다 15분에 8번까지 (웹 프로세스 메모리)
const fails = new Map();
const WINDOW = 15 * 60000;
function blocked(key) {
  const f = fails.get(key);
  if (!f) return false;
  if (Date.now() - f.at > WINDOW) { fails.delete(key); return false; }
  return f.n >= 8;
}
function fail(key) {
  const f = fails.get(key);
  if (!f || Date.now() - f.at > WINDOW) fails.set(key, { n: 1, at: Date.now() }); else f.n++;
  if (fails.size > 5000) fails.clear();
}
const clearFails = (key) => fails.delete(key);

// 주소 하나로 이미 쓰는 계정 — 이메일 로그인 또는 확인된 메일 주소
function existingFor(email) {
  const idn = one("SELECT user_id FROM identities WHERE provider='email' AND uid=?", email);
  if (idn) return { userId: idn.user_id, emailLogin: true };
  const u = one('SELECT id FROM users WHERE lower(email)=? AND email_ok=1', email);
  return u ? { userId: u.id, emailLogin: false } : null;
}
const fresh = (at, ms) => at && Date.now() - new Date(String(at).replace(' ', 'T') + '+09:00').getTime() < ms;

module.exports = { EMAIL_RE, pwProblem, blocked, fail, clearFails, existingFor, fresh };
