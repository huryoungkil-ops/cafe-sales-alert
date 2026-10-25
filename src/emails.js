// 가입 확인 · 비밀번호 재설정 메일
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function box(title, text, btn, url, note) {
  const html = `<!doctype html><html><body style="margin:0;background:#f6efe8;font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif">
<div style="max-width:480px;margin:0 auto;padding:30px 18px">
<div style="background:#fff;border-radius:18px;padding:28px 24px;border:1px solid #eadccd">
<div style="font-weight:900;font-size:18px;color:#2a1205">☕ 유로머신 매출 알리미</div>
<h1 style="font-size:20px;margin:18px 0 8px;color:#1b1009">${esc(title)}</h1>
<p style="color:#5b4637;line-height:1.7;font-size:15px;margin:0 0 20px">${text}</p>
<a href="${esc(url)}" style="display:inline-block;background:#ff9d4d;color:#2a1205;font-weight:800;text-decoration:none;padding:13px 22px;border-radius:12px">${esc(btn)}</a>
<p style="color:#9a8574;font-size:12px;line-height:1.6;margin:22px 0 0">${note}<br>버튼이 안 되면 이 주소를 붙여 넣으세요: ${esc(url)}</p>
</div></div></body></html>`;
  return { html, text: `${title}\n\n${text.replace(/<[^>]+>/g, '')}\n\n${btn}: ${url}\n\n${note}` };
}

const signupEmail = (email, url) => ({ subject: '[유로머신 매출 알리미] 가입을 마쳐 주세요', ...box('가입을 마쳐 주세요', `<b>${esc(email)}</b> 로 유로머신 매출 알리미 가입 신청이 들어왔어요. 아래 버튼을 누르면 가입이 끝나요.`, '가입 완료하기', url, '24시간 안에 눌러 주세요. 직접 신청하지 않았다면 이 메일은 무시하셔도 돼요.') });
const resetEmail = (email, url) => ({ subject: '[유로머신 매출 알리미] 비밀번호 새로 정하기', ...box('비밀번호를 새로 정하세요', `<b>${esc(email)}</b> 계정의 비밀번호를 새로 정하는 링크예요.`, '새 비밀번호 정하기', url, '1시간 안에 눌러 주세요. 요청하지 않았다면 무시하셔도 돼요 — 비밀번호는 그대로예요.') });

module.exports = { signupEmail, resetEmail };
