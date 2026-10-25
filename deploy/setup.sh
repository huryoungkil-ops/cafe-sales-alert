#!/usr/bin/env bash
# Ubuntu 서버에 카페 매출 알리미를 설치한다. root 로 실행. 다시 돌려도 된다.
#   DOMAINS="cafe.example.com" bash deploy/setup.sh
# 전제: Node.js 22.13 이상, Caddy(/etc/caddy/Caddyfile 에 «import sites/*» 가 있을 것), sqlite3
set -euo pipefail
APP=/opt/cafe-sales-alert
REPO_URL=${REPO_URL:-https://github.com/huryoungkil-ops/cafe-sales-alert.git}
DOMAINS=${DOMAINS:?DOMAINS 에 도메인을 적어 주세요 (쉼표로 여러 개)}
FIRST=$(echo "$DOMAINS" | cut -d, -f1 | tr -d ' ')

id cafesales >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin cafesales
[ -d "$APP/.git" ] || git clone "$REPO_URL" "$APP"
mkdir -p "$APP/data" /var/backups/cafe-sales-alert
chmod 700 "$APP/data" /var/backups/cafe-sales-alert
if [ ! -f "$APP/.env" ]; then
  cat > "$APP/.env" <<ENV
PUBLIC_BASE=https://$FIRST
# 유로 비밀번호 암호화 키 — 바꾸거나 잃어버리면 저장된 비밀번호를 못 푼다 (따로 백업할 것)
SECRET_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
# 운영자 디스코드 (새 가입·이상 알림)
OWNER_WEBHOOK=
# 카카오 로그인 + «나에게 보내기» — developers.kakao.com 앱의 REST API 키, 클라이언트 시크릿
# Redirect URI 에 https://$FIRST/auth/kakao/callback · /kakao/callback 등록, 동의항목 «카카오톡 메시지 전송(talk_message)» 사용
KAKAO_REST_KEY=
KAKAO_CLIENT_SECRET=
# 네이버·구글 로그인 — 콜백 https://$FIRST/auth/naver/callback · /auth/google/callback
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# 이메일 가입 확인 메일 (Gmail 앱 비밀번호 등). 비워 두면 data/outbox/ 에 파일로만 남김
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
MAX_USERS=200
ENV
  echo ".env 를 만들었다 — OWNER_WEBHOOK·카카오 키를 채울 것"
fi
chmod 600 "$APP/.env"
chown -R cafesales:cafesales "$APP" /var/backups/cafe-sales-alert

sudo -u cafesales bash -c "cd $APP && npm ci --omit=dev --no-audit --no-fund >/dev/null && node --disable-warning=ExperimentalWarning --test test/*.test.js" | grep -E '^ℹ (pass|fail)'

cp "$APP"/deploy/cafe-web.service "$APP"/deploy/cafe-job.service "$APP"/deploy/cafe-job.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable cafe-web.service
systemctl restart cafe-web.service
systemctl enable --now cafe-job.timer

mkdir -p /etc/caddy/sites
cat > /etc/caddy/sites/cafe.caddy <<CADDY
# 카페 매출 알리미 → cafe-web(127.0.0.1:5740). deploy/setup.sh 가 만든다.
$DOMAINS {
	encode gzip
	reverse_proxy 127.0.0.1:5740
}
CADDY
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
systemctl reload caddy

cat > /etc/cron.d/cafe-sales-alert-backup <<CRON
40 3 * * * cafesales sqlite3 $APP/data/cafe.db ".backup /var/backups/cafe-sales-alert/cafe-\$(date +\%F).db" && gzip -f /var/backups/cafe-sales-alert/cafe-\$(date +\%F).db && find /var/backups/cafe-sales-alert -name '*.db.gz' -mtime +30 -delete
CRON
echo "설치 끝 — curl -s https://$FIRST/healthz ; systemctl list-timers cafe-job.timer"
