// 운영자용: 비밀번호 초기화 · 회원 목록
//   node scripts/admin.js list
//   node scripts/admin.js reset <아이디>     → 임시 비밀번호를 만들어 출력
const { one, all, run } = require('../src/db');
const { hashPw, token } = require('../src/secure');

const [cmd, who] = process.argv.slice(2);
if (cmd === 'list') {
  for (const u of all('SELECT id, login, created_at, euro_pw_enc IS NOT NULL euro, kakao_refresh IS NOT NULL kakao, discord_url IS NOT NULL discord, send_time, last_daily, euro_err FROM users ORDER BY id')) {
    console.log([u.id, u.login, u.created_at, u.euro ? '유로O' : '유로X', u.kakao ? '카톡' : '', u.discord ? '디코' : '', u.send_time, u.last_daily || '', u.euro_err || ''].join('\t'));
  }
} else if (cmd === 'reset' && who) {
  const u = one('SELECT * FROM users WHERE login=?', who);
  if (!u) { console.error('그런 아이디 없음'); process.exit(1); }
  const pw = token(6);
  run('UPDATE users SET pw_hash=?, fail_count=0, locked_until=NULL WHERE id=?', hashPw(pw), u.id);
  run('DELETE FROM sessions WHERE user_id=?', u.id);
  console.log(`${who} 임시 비밀번호: ${pw}`);
} else {
  console.log('사용: node scripts/admin.js list | reset <아이디>');
}
