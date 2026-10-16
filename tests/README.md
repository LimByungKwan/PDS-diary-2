# 검사 구분

- T07 현재 검사: `node tests/auth-card1.mjs`. 실제 Better Auth/Drizzle 어댑터와 독립 SQLite로 가입·로그인·중복 가입·익명 401·양방향 소유권 404·세션 취소·만료·가져오기를 검사한다.
- 보안 패턴 검사: `python3 tests/security-audit.py`. 실제 비밀값을 출력하지 않는다. 패턴 검사만으로 완전한 보안을 주장하지 않는다.
- `verify.mjs`, `results.json`, `contract-results.json`은 T06에서 이어받은 기준 기록이다. T07은 로그인 없는 초기화와 공용 데이터 접근을 제거했으므로 옛 T06 검사 파일을 그대로 T07 통과 검사로 사용하지 않는다.
- 모든 자동 검사 자료는 임시 DB에만 저장한다. 사용자의 실제 일기·실제 5일 기록을 생성하지 않는다.
