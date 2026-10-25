<div align="center">

# ☕ 유로머신 매출 알리미

**어제 매출, 눈 뜨면 카톡에 와 있어요.**

유로커피머신 관리자 계정만 한 번 연결하면, 매일 아침 정한 시각에
**어제 매출 · 지난주 같은 요일 대비 · 이번 달 예상 · 메뉴 Top 5 · 에이드 펌프 사용량**을
카카오톡(나에게 보내기)과 디스코드로 보내 주는 무료 사이트입니다.

👉 **바로 쓰기: https://eurocafe.mooo.com**

![Node.js](https://img.shields.io/badge/Node.js-22.13%2B-339933?logo=node.js&logoColor=white)
![의존성 1개](https://img.shields.io/badge/npm%20dependencies-1-brightgreen)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

도움이 됐다면 오른쪽 위 ⭐ **Star** 한 번 눌러 주세요. 다음 기능을 만드는 힘이 됩니다.

</div>

---

## 왜 만들었나

무인 카페 매출은 매일 관리자 페이지에 로그인해서 날짜를 고르고 숫자를 확인해야 보입니다.
하루 3분이면 1년에 약 18시간. 그래서 원래 혼자 쓰던 매출 알림 봇을 누구나 쓸 수 있는 사이트로 열었습니다.

## 받는 내용

| 매일 (기본 아침 7시, 직접 정할 수 있음) | 매월 1일 |
|---|---|
| 어제 매출 + 포인트 사용 | 지난달 매출 + 지난달 대비 ▲▼ |
| 지난주 같은 요일 대비 ▲▼ | 하루 평균 · 최고의 날 |
| 이번 달 누적 · 예상 매출 | 차가운/따뜻한 잔 수 |
| 차가운/따뜻한/기타 잔 수 | 월간 메뉴 Top 5 |
| 어제 메뉴 Top 5 (잔 수·금액) | |
| 에이드 1·2·3번 펌프 사용량 (0잔이면 ⚠️) | |

- **카카오톡**: «나와의 채팅»으로 **매출 카드 이미지** + «자세히 보기» 버튼
- **디스코드**: 웹훅으로 **전체 보고서 이미지**(최근 14일 그래프 · Top 5 · 에이드) 첨부
- 이미지는 서버에서 SVG 로 그려 [resvg](https://github.com/yisibl/resvg-js) + [Pretendard](https://github.com/orioncactus/pretendard) 글꼴로 PNG 로 굽습니다 ([`src/card.js`](src/card.js))

## 비밀번호를 어떻게 지키나

남의 관리자 비밀번호를 맡는 서비스라서, 코드 전체를 공개하고 아래를 지킵니다.

- 🔐 유로 비밀번호는 **AES-256-GCM 으로 암호화**해 저장 ([`src/secure.js`](src/secure.js)). 키는 DB 와 분리된 서버 `.env` 에만 있음
- 👀 매출 화면 API 를 **읽기만** 함 ([`src/euro.js`](src/euro.js)) — 메뉴·가격·기계 설정을 바꾸는 코드가 없음
- ✅ 저장 전에 실제로 로그인해 보고, 맞을 때만 저장
- 🛑 비밀번호가 바뀌어 로그인이 안 되면 **즉시 조회를 멈추고** 알림 (계속 시도해서 계정이 잠기지 않게)
- ⏱ 유로 로그인 시도는 한 사람당 1시간에 6번까지
- 🗑️ 탈퇴하면 계정·암호화된 비밀번호·매출 기록·보고서를 **즉시 전부 삭제**
- 📵 이 사이트 가입에 이메일·전화번호·실명을 받지 않음

## 구조

npm 패키지는 이미지를 굽는 `@resvg/resvg-js` 하나뿐이고, 나머지는 Node.js 기본 모듈입니다 (`node:http`, `node:sqlite`, `node:crypto`).

```
src/
  web.js     웹 서버 — 소셜(카카오·네이버·구글)·이메일 로그인, 유로 계정 연결, 알림 연결, 설정
  auth.js    소셜 로그인 OAuth (카카오 로그인 때 «나에게 보내기» 동의도 같이)
  card.js    보고서 이미지 (SVG → PNG)
  job.js     1분마다 — 보고 시각이 지난 매장에 «어제 매출», 매월 1일 «지난달 결산»
  euro.js    유로 관리자 사이트(euro.order-app.us) 읽기 전용 클라이언트
  report.js  숫자 모으기 + 디스코드/카카오 문구
  pages.js   랜딩 · 내 화면 · 보고서 화면 (HTML/CSS 한 파일)
  notify.js  카카오톡 나에게 보내기 · 디스코드
  secure.js  scrypt 비밀번호 해시 · AES-256-GCM 암호화
  db.js      SQLite
deploy/      systemd(web + 1분 타이머) · Caddy · 설치 스크립트
test/        가짜 유로 응답으로 보고서·일정·암호화 시험
```

## 직접 띄우기

```bash
git clone https://github.com/huryoungkil-ops/cafe-sales-alert.git
cd cafe-sales-alert
npm install && npm test       # 네트워크 없이 시험
echo "SECRET_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")" > .env
npm run web                   # http://localhost:5740
npm run job                   # 보낼 사람에게 보내기 (서버에선 systemd 타이머가 1분마다)
```

Ubuntu 서버(Caddy 사용)에는 `DOMAINS="cafe.example.com" bash deploy/setup.sh` 한 번이면 설치됩니다.
카카오톡으로 보내려면 [Kakao Developers](https://developers.kakao.com) 앱을 만들고 `.env` 에 `KAKAO_REST_KEY`·`KAKAO_CLIENT_SECRET` 를 넣은 뒤,
Redirect URI 에 `https://<도메인>/kakao/callback` 을 등록하고 «카카오톡 메시지 전송» 동의항목을 켜세요.

## 알아 둘 점

- 유로커피머신·euro.order-app.us 와 제휴 관계가 없는 개인 프로젝트입니다. 관리자 화면이 쓰는 API 가 바뀌면 고쳐야 할 수 있습니다.
- 사이트와 README 의 숫자 중 «예시» 표시가 있는 것은 설명용 예시입니다.

## 라이선스

MIT
