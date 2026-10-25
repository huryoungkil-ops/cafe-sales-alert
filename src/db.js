// SQLite (node:sqlite, 외부 패키지 없음)
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { DATA_DIR } = require('./env');

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(process.env.DB_PATH || path.join(DATA_DIR, 'cafe.db'));
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
-- 로그인: 카카오·네이버·구글(identities) 또는 이메일(identities provider='email' + users.pw_hash)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT, email TEXT, email_ok INTEGER DEFAULT 0, avatar TEXT,
  pw_hash TEXT,                       -- 이메일 로그인 비밀번호 (scrypt 한 방향 값)
  created_at TEXT NOT NULL, last_login TEXT,
  euro_id TEXT, euro_pw_enc TEXT, euro_ok_at TEXT, euro_err TEXT, euro_err_at TEXT,
  store_name TEXT,
  discord_url TEXT,
  kakao_refresh TEXT, kakao_at TEXT,
  send_time TEXT DEFAULT '07:00',     -- 매일 보고 시각 (KST, 사용자가 입력, 비우면 07:00)
  daily_on INTEGER DEFAULT 1,         -- 매일 «어제 매출»
  monthly_on INTEGER DEFAULT 1,       -- 매월 1일 «지난달 결산»
  ade_on INTEGER DEFAULT 1,           -- 에이드 펌프 사용량 줄
  ade_names TEXT,                     -- "복숭아,자몽,유자" (비면 1번·2번·3번)
  last_daily TEXT,                    -- 마지막으로 보고한 날짜 (YYYY-MM-DD)
  last_monthly TEXT                   -- 마지막으로 결산한 달 (YYYY-MM)
);
CREATE TABLE IF NOT EXISTS identities (
  provider TEXT NOT NULL, uid TEXT NOT NULL, user_id INTEGER NOT NULL, email TEXT, created_at TEXT NOT NULL,
  PRIMARY KEY (provider, uid)
);
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY, provider TEXT NOT NULL, next TEXT, created_at TEXT NOT NULL
);
-- 이메일 가입: 확인 메일의 링크를 눌러야 계정이 생긴다
CREATE TABLE IF NOT EXISTS signups (
  token TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT, pw_hash TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pw_resets (
  token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, email TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL, kakao_state TEXT
);
-- 유로 «최근 10일 매출» 을 받을 때마다 쌓아 둔다 (지난주 같은 요일 비교 · 월 포인트 합계)
CREATE TABLE IF NOT EXISTS days (
  user_id INTEGER NOT NULL, date TEXT NOT NULL, money INTEGER, mileage INTEGER,
  PRIMARY KEY (user_id, date)
);
-- 만든 보고서 (사이트·카톡 버튼에서 연다). token 으로 로그인 없이 열람
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, kind TEXT NOT NULL, ref TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL, data_json TEXT NOT NULL, sent_json TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_reports_user ON reports (user_id, id);
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY, at TEXT NOT NULL, user_id INTEGER, msg TEXT
);
`);

const now = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 19);
const one = (sql, ...a) => db.prepare(sql).get(...a);
const all = (sql, ...a) => db.prepare(sql).all(...a);
const run = (sql, ...a) => db.prepare(sql).run(...a);

function log(userId, msg) {
  run('INSERT INTO logs(at,user_id,msg) VALUES(?,?,?)', now(), userId ?? null, String(msg).slice(0, 2000));
}

module.exports = { db, now, one, all, run, log };
