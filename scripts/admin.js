// 운영자용: 회원 목록 · 한 사람 지금 보내 보기는 node src/job.js --user <번호>
//   node scripts/admin.js list
const { all } = require('../src/db');

const [cmd] = process.argv.slice(2);
if (cmd === 'list') {
  for (const u of all(`SELECT u.id, u.name, u.created_at, u.euro_pw_enc IS NOT NULL euro, u.kakao_refresh IS NOT NULL kakao, u.discord_url IS NOT NULL discord, u.send_time, u.last_daily, u.euro_err,
      (SELECT group_concat(provider) FROM identities i WHERE i.user_id=u.id) logins FROM users u ORDER BY u.id`)) {
    console.log([u.id, u.name || '', u.logins || '', u.created_at, u.euro ? '유로O' : '유로X', u.kakao ? '카톡' : '', u.discord ? '디코' : '', u.send_time, u.last_daily || '', u.euro_err || ''].join('\t'));
  }
} else {
  console.log('사용: node scripts/admin.js list');
}
