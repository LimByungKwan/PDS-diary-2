# 플랜두씨 2 · 나만의 다이어리

T06의 Plan → Do → See 기능에 가입·로그인과 계정별 자료 보호를 붙이는 T07 프로젝트입니다. 현재 카드 1 구현 단계이며 5일 실사용은 아직 시작하지 않았습니다.

## 시작 기준

- 최종 T06 소스: https://github.com/LimByungKwan/PDS-diary-1/tree/bbb70bb7d07e5c0e548d4c2f4436a991429f98d3
- T06 결과: https://byungkwan-pds-diary.quannie70.chatgpt.site
- T07 소스 저장소: https://github.com/LimByungKwan/PDS-diary-2
- T07 배포 예정 주소: https://byungkwan-pds-diary-2.quannie70.chatgpt.site

T06 커밋을 조상으로 보존합니다. T06 사이트와 DB는 수정하지 않습니다.

## 카드 1 구현

Better Auth 1.7.7, Drizzle D1 어댑터 1.7.7, 기본 scrypt 및 24시간 DB 세션을 사용합니다. `/`는 `/login`으로, 미인증 `/diary`도 `/login`으로 이동합니다. 자료 API는 미인증 요청을 401, 타 계정 자료를 지정한 요청을 404로 거절합니다. 사용자 ID는 서버 세션에서 얻습니다. 새 계정에는 예시 실행 기록이나 기존 사용자 자료를 자동 배정하지 않습니다.

빈 계정에서 ‘6번 자료 가져오기’로 본인의 기존 내보내기 JSON을 가져올 수 있습니다. ID를 계정별로 변환하고 연결·원본 시각·분 단위를 유지합니다. 원본 ID 대응표는 전체 내보내기에 함께 남습니다. 모든 계정·세션·암호 표는 일기 내보내기에서 제외됩니다.

## 검증

```sh
node node_modules/typescript/bin/tsc --noEmit
node tests/auth-card1.mjs
python3 tests/security-audit.py
```

자동 검사는 임시 DB에서만 실행하며 사용자 기록을 만들어 넣지 않습니다. tests/auth-card1-results.json은 로컬 검사 결과입니다. 운영 화면의 직접 가입·로그인·로그아웃·자료 이전 확인은 별도입니다.

인증 방식·소스 위치·응답 근거·한계는 AUTH_IMPLEMENTATION.md에 있습니다. 카드 5의 계정 삭제와 실제 5일 기록은 남은 작업입니다. T06 설명과 과거 검사 문서는 T06_README.md 및 기존 검증 기록을 참고합니다.

## 서버 설정

D1 바인딩은 DB입니다. BETTER_AUTH_URL과 BETTER_AUTH_SECRET은 호스팅 런타임 환경 변수로 설정하며 비밀키는 소스·브라우저 코드·Git에 넣지 않습니다. GitHub Pages는 이 서버 앱의 배포 환경이 아닙니다. 비밀번호·세션 쿠키·비밀키 원문을 제출하지 않습니다.
