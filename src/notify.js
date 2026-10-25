// 알림: 사용자별 디스코드 웹훅 · 카카오톡 «나에게 보내기», 운영자 디스코드
const { run } = require('./db');
const { OWNER_WEBHOOK, KAKAO_REST_KEY, KAKAO_CLIENT_SECRET, PUBLIC_BASE, DRY_RUN } = require('./env');

const DISCORD_RE = /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;

async function discord(url, content) {
  if (!url) return { ok: false, why: '웹훅 없음' };
  if (DRY_RUN) { console.log('[DRY_RUN 디스코드]\n' + content); return { ok: true, why: '' }; }
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: String(content).slice(0, 1990) }), signal: AbortSignal.timeout(15000) });
    return { ok: r.status < 300, why: r.status < 300 ? '' : `디스코드 ${r.status}` };
  } catch (e) { return { ok: false, why: e.message }; }
}

const owner = (content) => (OWNER_WEBHOOK ? discord(OWNER_WEBHOOK, content) : Promise.resolve({ ok: false }));

async function kakaoToken(form) {
  const r = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams({ client_id: KAKAO_REST_KEY, ...(KAKAO_CLIENT_SECRET ? { client_secret: KAKAO_CLIENT_SECRET } : {}), ...form }),
    signal: AbortSignal.timeout(15000),
  });
  return r.json().catch(() => ({}));
}

const kakaoRedirect = () => `${PUBLIC_BASE}/kakao/callback`;
const kakaoAuthUrl = (state) => `https://kauth.kakao.com/oauth/authorize?${new URLSearchParams({ client_id: KAKAO_REST_KEY, redirect_uri: kakaoRedirect(), response_type: 'code', scope: 'talk_message', state })}`;

// link: 버튼을 누르면 열 주소 (보고서 페이지)
async function kakaoSendWithAccess(access, text, link = PUBLIC_BASE + '/app', button = '자세히 보기') {
  if (DRY_RUN) { console.log('[DRY_RUN 카카오]\n' + text); return { ok: true, why: '' }; }
  const tpl = { object_type: 'text', text: String(text).slice(0, 199), link: { web_url: link, mobile_web_url: link }, button_title: button };
  const r = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams({ template_object: JSON.stringify(tpl) }),
    signal: AbortSignal.timeout(15000),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: j.result_code === 0, why: j.result_code === 0 ? '' : JSON.stringify(j).slice(0, 200) };
}

async function kakao(user, text, link, button) {
  if (!user.kakao_refresh) return { ok: false, why: '카카오 미연결' };
  try {
    const t = await kakaoToken({ grant_type: 'refresh_token', refresh_token: user.kakao_refresh });
    if (!t.access_token) return { ok: false, why: `토큰 갱신 실패 ${t.error || ''} ${t.error_description || ''}`.trim() };
    // 만료가 가까우면 카카오가 새 refresh_token 을 같이 준다
    if (t.refresh_token) run('UPDATE users SET kakao_refresh=? WHERE id=?', t.refresh_token, user.id);
    return await kakaoSendWithAccess(t.access_token, text, link, button);
  } catch (e) { return { ok: false, why: e.message }; }
}

// 사용자에게 (연결된 곳 모두로). msg = { discord, kakao, link }
async function toUser(user, msg) {
  const out = [];
  if (user.discord_url) out.push(['디스코드', await discord(user.discord_url, msg.discord)]);
  if (user.kakao_refresh) out.push(['카카오톡', await kakao(user, msg.kakao, msg.link)]);
  return out;
}

module.exports = { DISCORD_RE, discord, owner, kakao, kakaoToken, kakaoAuthUrl, kakaoRedirect, kakaoSendWithAccess, toUser };
