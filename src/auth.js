// 소셜 로그인 (OAuth 2.0). 외부 패키지 없음. 순서: 카카오 → 네이버 → 구글 (그 아래 이메일)
// 콜백 주소: {PUBLIC_BASE}/auth/{provider}/callback ← 각 개발자 콘솔에 이 주소를 등록한다.
const E = require('./env');

const cb = (p) => `${E.PUBLIC_BASE}/auth/${p}/callback`;
const qs = (o) => new URLSearchParams(o).toString();

async function postForm(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8', Accept: 'application/json' }, body: qs(body), signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`토큰 교환 실패: ${j.error_description || j.error?.message || j.error || r.status}`);
  return j;
}
async function getJson(url, token) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`사용자 정보 실패: ${r.status}`);
  return j;
}

// 사람 정보 = { uid, email, emailVerified, name, avatar, kakaoRefresh? }
const PROVIDERS = {
  kakao: {
    label: '카카오로 계속하기',
    on: () => E.KAKAO_REST_KEY,
    // 카톡 «나에게 보내기» 동의도 같이 받는다 → 동의하면 카톡 알림이 바로 연결된다
    url: (state) => `https://kauth.kakao.com/oauth/authorize?${qs({ client_id: E.KAKAO_REST_KEY, redirect_uri: cb('kakao'), response_type: 'code', scope: 'talk_message', state })}`,
    async profile(code) {
      const t = await postForm('https://kauth.kakao.com/oauth/token', { grant_type: 'authorization_code', client_id: E.KAKAO_REST_KEY, redirect_uri: cb('kakao'), code, ...(E.KAKAO_CLIENT_SECRET ? { client_secret: E.KAKAO_CLIENT_SECRET } : {}) });
      const u = await getJson('https://kapi.kakao.com/v2/user/me', t.access_token);
      const a = u.kakao_account || {};
      const p = a.profile || u.properties || {};
      const talk = String(t.scope || '').split(/[ ,]/).includes('talk_message');
      return { uid: String(u.id), email: a.email, emailVerified: Boolean(a.is_email_valid && a.is_email_verified), name: p.nickname, avatar: p.thumbnail_image_url || p.profile_image, kakaoRefresh: talk ? t.refresh_token : null };
    },
  },
  naver: {
    label: '네이버로 계속하기',
    on: () => E.NAVER_CLIENT_ID && E.NAVER_CLIENT_SECRET,
    url: (state) => `https://nid.naver.com/oauth2.0/authorize?${qs({ response_type: 'code', client_id: E.NAVER_CLIENT_ID, redirect_uri: cb('naver'), state })}`,
    async profile(code, state) {
      const t = await postForm('https://nid.naver.com/oauth2.0/token', { grant_type: 'authorization_code', client_id: E.NAVER_CLIENT_ID, client_secret: E.NAVER_CLIENT_SECRET, code, state });
      const u = (await getJson('https://openapi.naver.com/v1/nid/me', t.access_token)).response || {};
      // 네이버가 주는 메일은 네이버 계정에 등록·확인된 주소다
      return { uid: u.id, email: u.email, emailVerified: Boolean(u.email), name: u.name || u.nickname, avatar: u.profile_image };
    },
  },
  google: {
    label: 'Google로 계속하기',
    on: () => E.GOOGLE_CLIENT_ID && E.GOOGLE_CLIENT_SECRET,
    url: (state) => `https://accounts.google.com/o/oauth2/v2/auth?${qs({ client_id: E.GOOGLE_CLIENT_ID, redirect_uri: cb('google'), response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' })}`,
    async profile(code) {
      const t = await postForm('https://oauth2.googleapis.com/token', { code, client_id: E.GOOGLE_CLIENT_ID, client_secret: E.GOOGLE_CLIENT_SECRET, redirect_uri: cb('google'), grant_type: 'authorization_code' });
      const u = await getJson('https://openidconnect.googleapis.com/v1/userinfo', t.access_token);
      return { uid: u.sub, email: u.email, emailVerified: u.email_verified === true, name: u.name, avatar: u.picture };
    },
  },
};

const ORDER = ['kakao', 'naver', 'google'];
const enabledProviders = () => ORDER.filter((p) => PROVIDERS[p].on());

module.exports = { PROVIDERS, ORDER, enabledProviders, callbackUrl: cb };
