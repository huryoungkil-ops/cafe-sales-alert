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
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  login TEXT UNIQUE NOT NULL,
  pw_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  fail_count INTEGER DEFAULT 0, locked_until TEXT,
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
