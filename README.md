# 플랜두씨 · 인증을 붙인 나만의 다이어리

T06의 Plan → Do → See 앱에 가입·로그인·서버 세션·계정별 자료 보호를 붙인 프로젝트입니다. 로그인 후 자신의 계획·할 일·실행·돌아보기와 5일 공부 시간 예측 관찰을 사용합니다.

- 결과물: https://byungkwan-pds-diary-2.quannie70.chatgpt.site
- 소스 저장소: https://github.com/LimByungKwan/PDS-diary-2
- 최종 기준 원본 기준: https://github.com/LimByungKwan/PDS-diary-1/tree/bbb70bb7d07e5c0e548d4c2f4436a991429f98d3
- 기준 원본 결과물: https://byungkwan-pds-diary.quannie70.chatgpt.site

## 구현과 사용

Better Auth 1.7.7·Drizzle 어댑터 1.7.7의 scrypt와 24시간 서버 DB 세션을 사용합니다. 첫 화면은 로그인 화면이며, 비로그인 자료 API는 401·타인 자료는 404입니다. 서버는 주인을 세션에서만 얻습니다. 자기 자료는 전체 JSON 한 개로 내보낼 수 있으며, 빈 계정에서 ‘자료 가져오기’로 기준 원본 자료의 값·시각·관계와 ID 대응표를 보존해 이전합니다.

계정 삭제는 현재 비밀번호와 확인 문구를 요구하고 계정의 모든 연결 자료와 세션을 원자적으로 삭제합니다. 삭제 범위·복구 불가·이미 내보낸 파일과 기준 원본 공개본은 별도라는 안내를 표시합니다.

실제 5일 관찰은 2026-10-18~22 완료했습니다. 질문·지표·분 단위·계산법을 고정하고 2일차 뒤·3일차 전에 계획 규칙 한 가지만 바꿨습니다. 전체 절대 오차 합계 40분·평균 8분, 변경 전 평균 15분·변경 후 3.3분입니다. 미완료한 10월 17일 시도는 보존하고 집계에서 제외했습니다.

## 제출 문서

- [SUBMISSION.md](SUBMISSION.md): 결과·소스 안내, 확인법 4줄, AI·내 판단 3줄입니다.
- [AUTH_IMPLEMENTATION.md](AUTH_IMPLEMENTATION.md): 인증 설명서 6항목입니다.
- [CARD1_REVIEW.md](CARD1_REVIEW.md), [CARD2_REVIEW.md](CARD2_REVIEW.md), [CARD3_REVIEW.md](CARD3_REVIEW.md), [CARD4_REVIEW.md](CARD4_REVIEW.md): 인증·암호·세션·소유권의 상세 증거입니다.
- [STUDY_REVIEW.md](STUDY_REVIEW.md): 실제 5일·규칙 변경·직접 계산·내보내기·계정 삭제 확인입니다.
- [VERIFICATION.md](VERIFICATION.md): 현재 검증 범위와 제출 전 남은 확인입니다.

사용자의 원본 전체 내보내기·실사용 비밀번호·세션 쿠키는 공개 소스에 포함하지 않습니다. 카드 2에 있는 옛 시험 계정 해시는 이미 비밀번호 변경 또는 계정 삭제로 무효화한 저장 형태의 증거입니다.

## 검사

```sh
node node_modules/typescript/bin/tsc --noEmit
node tests/auth-card1.mjs
node tests/auth-response.mjs
node tests/study.mjs
python3 tests/security-audit.py
```

인증·소유권·삭제 16개 묶음은 실제 라이브러리와 임시 SQLite에서 검증합니다. 실제 5일 사용을 합성하지 않으며 운영 데이터에 검사 자료를 쓰지 않습니다. 현재 앱 빌드도 통과했습니다. 패턴 검사만으로 모든 비밀값 부재를 보장하지 않으며 한계는 설명서 ⑥에 명시했습니다.

## 서버 설정과 이력

D1 바인딩은 DB입니다. BETTER_AUTH_URL·BETTER_AUTH_SECRET은 서버 런타임 환경 변수로 설정합니다. 비밀키를 브라우저 코드나 Git에 넣지 않습니다. GitHub Pages는 이 서버 앱의 실행 환경이 아닙니다. 현재 앱 이력은 기준 기준 원본 commit을 조상으로 보존합니다. 소스 업로드 때 Git 이력을 새로 초기화하지 않습니다.

기준 원본 문서는 ORIGINAL_README.md·ORIGINAL_SUBMISSION.md에 보존했습니다. T07에서 보호하는 자료와 별도 기준 원본 공개본은 구분합니다.
