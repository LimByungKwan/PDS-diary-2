# 개발 시작과 완료 이력

2026-10-16의 선택·설계 기록을 현재 완료 결과와 구분해 정리했습니다. 과거 시점의 소스는 Git 이력에 보존돼 있습니다.

## 기준 원본

- 기준 소스: https://github.com/LimByungKwan/PDS-diary-1/tree/bbb70bb7d07e5c0e548d4c2f4436a991429f98d3
- 기준 결과물: https://byungkwan-pds-diary.quannie70.chatgpt.site
- 기준 원본에서 별도 브랜치와 저장소로 이어 개발했고 원본 Git 조상 관계를 보존했습니다.
- 현재 앱의 운영 DB는 기준 원본 공개본과 별개입니다.

## 시작 때 선택한 방식과 구현 결과

- 인증 라이브러리는 Better Auth 1.7.7과 Drizzle 어댑터 1.7.7입니다.
- 라이브러리 기본 scrypt와 계정별 salt를 사용했습니다.
- 24시간 서버 DB 세션, 로그아웃·비밀번호 변경 시 취소, 계정별 서버 소유권 검사를 구현했습니다.
- 직접 암호·세션 전체를 구현하는 방식은 검증 범위가 커 선택하지 않았습니다. Supabase Auth는 기존 D1 외 별도 인증 운영이 추가돼 선택하지 않았습니다.
- 기존 자료의 ID 대응과 관계를 보존해 본계정으로 이전했습니다.

## 완료 증거

가입·로그인·로그아웃과 자료 이전은 CARD1_REVIEW.md, 비밀번호 저장은 CARD2_REVIEW.md, 세션 취소는 CARD3_REVIEW.md, 양방향 자료 보호는 CARD4_REVIEW.md에 기록했습니다. 실제 2026-10-18~22의 5일과 규칙 변경은 STUDY_REVIEW.md에 기록했습니다. 최종 공개 접속·조상 관계·첨부 점검은 FINAL_REVIEW.md에 기록했습니다.

## 설명서

[AUTH_IMPLEMENTATION.md](AUTH_IMPLEMENTATION.md)에 선택·이유·수정 위치·요청과 응답·AI와 판단·남은 보안 한계의 여섯 항목을 정리했습니다. 한계는 실제 구현 범위를 설명하며 완료된 필수 기능의 증거와 구분합니다.
