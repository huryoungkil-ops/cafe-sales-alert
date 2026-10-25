// .env 를 읽어 process.env 에 채운다 (이미 있는 값은 덮지 않는다).
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch { /* .env 없으면 기본값 */ }

const E = process.env;
module.exports = {
  ROOT,
  DATA_DIR: E.DATA_DIR || path.join(ROOT, 'data'),
  PORT: Number(E.PORT || 5740),
  HOST: E.HOST || '127.0.0.1',
  PUBLIC_BASE: (E.PUBLIC_BASE || 'http://localhost:5740').replace(/\/$/, ''),
  // 유로 관리자 비밀번호 암호화 키 (base64 32바이트). 바꾸거나 잃어버리면 저장된 비밀번호를 못 푼다.
  SECRET_KEY: E.SECRET_KEY || '',
  // 운영자 디스코드 — 새 가입·이상 알림 (비어 있으면 안 보냄)
  OWNER_WEBHOOK: E.OWNER_WEBHOOK || '',
  // 카카오: 로그인 + «나에게 보내기» 를 같은 앱으로
  KAKAO_REST_KEY: E.KAKAO_REST_KEY || '',
  KAKAO_CLIENT_SECRET: E.KAKAO_CLIENT_SECRET || '',
  NAVER_CLIENT_ID: E.NAVER_CLIENT_ID || '',
  NAVER_CLIENT_SECRET: E.NAVER_CLIENT_SECRET || '',
  GOOGLE_CLIENT_ID: E.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: E.GOOGLE_CLIENT_SECRET || '',
  // 이메일 가입 확인·비밀번호 찾기 메일 (SMTP 가 없으면 data/outbox/ 에 파일로 남김)
  SMTP_HOST: E.SMTP_HOST || '',
  SMTP_PORT: Number(E.SMTP_PORT || 465),
  SMTP_USER: E.SMTP_USER || '',
  SMTP_PASS: E.SMTP_PASS || '',
  MAIL_FROM: E.MAIL_FROM || '',
  MAIL_REPLY_TO: E.MAIL_REPLY_TO || '',
  MAIL_DRY_RUN: E.MAIL_DRY_RUN === '1',
  MAX_USERS: Number(E.MAX_USERS || 200),
  // 저장소 주소 (화면의 «GitHub 별» 버튼)
  REPO_URL: E.REPO_URL || 'https://github.com/huryoungkil-ops/cafe-sales-alert',
  // 1 이면 알림을 보내지 않고 로그에만 남긴다 (시험용)
  DRY_RUN: E.DRY_RUN === '1',
};
