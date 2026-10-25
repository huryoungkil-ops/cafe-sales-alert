// SMTP 발송 (외부 패키지 없음). 465 = 처음부터 암호화, 587 = STARTTLS.
// Brevo · Resend · Gmail(앱 비밀번호) 모두 이 방식으로 보낼 수 있다.
const net = require('node:net');
const tls = require('node:tls');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const E = require('./env');

const b64 = (s) => Buffer.from(String(s), 'utf8').toString('base64');
const encWord = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);
function encAddr(addr) {
  // "이름 <a@b.c>" → 이름만 인코딩
  const m = String(addr).match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? `${encWord(m[1].replace(/^"|"$/g, ''))} <${m[2]}>` : String(addr).trim();
}
const bareAddr = (addr) => (String(addr).match(/<([^>]+)>/) || [null, String(addr).trim()])[1];
const wrap76 = (s) => s.replace(/.{1,76}/g, '$&\r\n');

function buildMessage({ from, to, subject, html, text, replyTo, unsubscribeUrl }) {
  const boundary = `cs_${crypto.randomBytes(12).toString('hex')}`;
  const domain = (bareAddr(from).split('@')[1] || 'localhost');
  const headers = [
    `From: ${encAddr(from)}`,
    `To: ${encAddr(to)}`,
    `Subject: ${encWord(subject)}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${crypto.randomBytes(16).toString('hex')}@${domain}>`,
    'MIME-Version: 1.0',
    replyTo ? `Reply-To: ${encAddr(replyTo)}` : null,
    unsubscribeUrl ? `List-Unsubscribe: <${unsubscribeUrl}>` : null,
    unsubscribeUrl ? 'List-Unsubscribe-Post: List-Unsubscribe=One-Click' : null,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean);
  return [
    ...headers, '',
    `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrap76(b64(text || '')),
    `--${boundary}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrap76(b64(html || '')),
    `--${boundary}--`, '',
  ].join('\r\n');
}

// 한 줄씩 읽어 «3자리 숫자 + 공백» 줄이 오면 응답 완료
function smtpSession(socket) {
  let buf = '';
  let waiter = null;
  const onData = (d) => {
    buf += d.toString('utf8');
    const lines = buf.split('\r\n');
    for (let i = 0; i < lines.length - 1; i++) {
      if (/^\d{3} /.test(lines[i])) {
        const resp = lines.slice(0, i + 1).join('\n');
        buf = lines.slice(i + 1).join('\r\n');
        if (waiter) { const w = waiter; waiter = null; w(resp); }
        return;
      }
    }
  };
  socket.on('data', onData);
  // 오류 대기는 응답이 오면 바로 떼어 낸다 — 안 떼면 명령마다 쌓여 MaxListeners 경고가 난다
  const read = () => new Promise((resolve, reject) => {
    const onErr = (e) => { waiter = null; reject(e); };
    waiter = (resp) => { socket.off('error', onErr); resolve(resp); };
    socket.once('error', onErr);
  });
  async function cmd(line, expect) {
    if (line != null) socket.write(line + '\r\n');
    const resp = await read();
    const code = Number(resp.slice(0, 3));
    if (expect && !expect.includes(code)) throw new Error(`SMTP ${line ? line.split(' ')[0] : 'greeting'} → ${resp.slice(0, 200)}`);
    return resp;
  }
  return { cmd, detach: () => socket.off('data', onData) };
}

function connect(host, port, secure) {
  return new Promise((resolve, reject) => {
    const s = secure ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
    s.setTimeout(30000, () => s.destroy(new Error('SMTP 시간 초과')));
    s.once(secure ? 'secureConnect' : 'connect', () => resolve(s));
    s.once('error', reject);
  });
}

async function smtpSend(msg, from, to) {
  const secure = E.SMTP_PORT === 465;
  let sock = await connect(E.SMTP_HOST, E.SMTP_PORT, secure);
  let s = smtpSession(sock);
  try {
    await s.cmd(null, [220]);
    let ehlo = await s.cmd('EHLO cafesales', [250]);
    if (!secure && /STARTTLS/i.test(ehlo)) {
      await s.cmd('STARTTLS', [220]);
      s.detach();
      sock = await new Promise((resolve, reject) => {
        const t = tls.connect({ socket: sock, servername: E.SMTP_HOST }, () => resolve(t));
        t.once('error', reject);
      });
      s = smtpSession(sock);
      ehlo = await s.cmd('EHLO cafesales', [250]);
    }
    if (E.SMTP_USER) {
      await s.cmd('AUTH LOGIN', [334]);
      await s.cmd(b64(E.SMTP_USER), [334]);
      await s.cmd(b64(E.SMTP_PASS), [235]);
    }
    await s.cmd(`MAIL FROM:<${bareAddr(from)}>`, [250]);
    await s.cmd(`RCPT TO:<${bareAddr(to)}>`, [250, 251]);
    await s.cmd('DATA', [354]);
    const body = msg.replace(/\r\n\./g, '\r\n..');     // 점 하나로 시작하는 줄 보호
    await s.cmd(`${body}\r\n.`, [250]);
    await s.cmd('QUIT', [221]).catch(() => {});
  } finally { sock.end(); }
}

/** 메일 한 통. MAIL_DRY_RUN 이거나 SMTP 설정이 없으면 data/outbox/ 에 .eml·.html 로 남긴다 */
async function sendMail({ to, subject, html, text, unsubscribeUrl }) {
  const from = E.MAIL_FROM || '카페 매출 알리미 <no-reply@localhost>';
  const msg = buildMessage({ from, to, subject, html, text, replyTo: E.MAIL_REPLY_TO, unsubscribeUrl });
  if (E.MAIL_DRY_RUN || !E.SMTP_HOST) {
    const dir = path.join(E.DATA_DIR, 'outbox');
    fs.mkdirSync(dir, { recursive: true });
    const name = `${new Date().toISOString().replace(/[:.]/g, '-')}_${bareAddr(to).replace(/[^a-z0-9@._-]/gi, '_')}`;
    fs.writeFileSync(path.join(dir, `${name}.html`), html);
    fs.writeFileSync(path.join(dir, `${name}.eml`), msg);
    return { ok: true, dry: true, file: path.join(dir, `${name}.html`) };
  }
  await smtpSend(msg, from, to);
  return { ok: true };
}

module.exports = { sendMail, buildMessage };
