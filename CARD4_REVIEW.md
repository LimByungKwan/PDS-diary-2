# 카드 4 — 남의 자료 접근 거절 기록

확인일은 2026-10-17(Asia/Seoul)입니다. 아래 HTTP 표기는 사용자가 수행한 캡처를 읽어 정리한 것입니다. Cookie·비밀번호·인프라 인증 헤더 원문은 옮기지 않았습니다. 운영에서 관찰한 특정 자료와 격리 DB의 전체 불변 검사를 구분합니다.

## 계정과 자료 · C116

검증 A와 B 계정에 각각 계획 1개·할 일 2개를 만들었습니다. 이 자료는 접근통제 검증용이며 실제 5일 공부 기록으로 세지 않습니다.

| 구분 | 검증 A | 검증 B |
|---|---|---|
| 이메일 | t07-test-a@example.test | t07-test-b@example.test |
| 계획 | 카드4 검증 A 전용 계획 | 카드4 검증 B 전용 계획 |
| 할 일 | A 전용 할 일 1·2 | B 전용 할 일 1·2 |
| 할 일 1 ID | 5f2f0a6b-c777-4d4d-bd90-bd9bccf21157 | 28d6d722-706d-4459-96c1-a4371339d56d |

검증 B는 10월 23일 계정 삭제 검증 후 삭제했습니다. 이 문서는 10월 17일 거절 시험 당시의 기록을 보존합니다.

## 양방향 읽기·수정·삭제 · C117~C121

요청의 기준 주소는 운영 사이트입니다. 모든 변경 요청은 `Content-Type: application/json`, 자신의 로그인 쿠키 `[가림]`을 사용했습니다.

| 로그인 계정 → 대상 | 요청 | 상태·본문 | 캡처 시각 |
|---|---|---|---|
| B → A 읽기 | GET /api/diary?type=tasks&id=5f2f0a6b-c777-4d4d-bd90-bd9bccf21157 | 404 / {"error":"자료를 찾을 수 없습니다."} | 16:31:31, 16:30:09 본문 |
| B → A 수정 | POST /api/diary / {"action":"updateTask","id":"5f2f0a6b-c777-4d4d-bd90-bd9bccf21157","title":"B가 수정 시도"} | 404 / 같은 오류 | 16:35:15 |
| B → A 삭제 | POST /api/diary / {"action":"deleteTask","id":"5f2f0a6b-c777-4d4d-bd90-bd9bccf21157"} | 404 / 같은 오류 | 16:36:34 |
| A → B 읽기 | GET /api/diary?type=tasks&id=28d6d722-706d-4459-96c1-a4371339d56d | 404 / 같은 오류 | 16:41:01 |
| A → B 수정 | POST /api/diary / {"action":"updateTask","id":"28d6d722-706d-4459-96c1-a4371339d56d","title":"A가 수정 시도"} | 404 / 같은 오류 | 16:41:51 |
| A → B 삭제 | POST /api/diary / {"action":"deleteTask","id":"28d6d722-706d-4459-96c1-a4371339d56d"} | 404 / 같은 오류 | 16:42:43 |

## 성공한 목록과 거절 후 자료 · C122·C125

운영에서 자신의 목록 `GET /api/diary`는 200입니다. A와 B 각각 계획 1개·할 일 2개의 ID·제목을 화면과 목록 응답으로 확인했습니다. 거절 후에도 같은 자료가 남았고, 조회한 목록에 상대의 자료나 새로 생성된 자료가 없었습니다. B 목록은 16:44:57, A 목록은 16:53:12 캡처에 있습니다. B의 거절 후 화면은 16:43:40/16:43:50입니다. 운영 전체 DB의 모든 열을 비교했다는 뜻은 아닙니다.

응답에서 확인한 필드만 줄여 적으면 다음과 같습니다.

```text
A의 GET /api/diary → 200
계획: [카드4 검증 A 전용 계획]
할 일: [A 전용 할 일 1, A 전용 할 일 2]
B의 GET /api/diary → 200
계획: [카드4 검증 B 전용 계획]
할 일: [B 전용 할 일 1, B 전용 할 일 2]
```

`tests/auth-card1.mjs`의 격리 DB 검사에서는 양방향 거절 전후 계획·할 일·실행 기록·세부항목 응답을 비교하고 변경되지 않음을 별도로 검사합니다.

## 주소·헤더·본문의 계정 위조 · C123

B로 로그인한 상태에서 A의 사용자 ID `q3fM1SreTKORnnFxa0lSoZXw603Trn5O`를 다음 위치에 넣었습니다. 사용자 ID는 인증 비밀값이 아니며, 그 값만 보내도 권한을 얻을 수 없어야 합니다.

| 위치 | 요청 | 결과 | 캡처 |
|---|---|---|---|
| 주소 | GET /api/diary?user_id=q3fM1SreTKORnnFxa0lSoZXw603Trn5O | 200, B의 계획 1개·할 일 2개만 | 16:46:54 |
| 헤더 | GET /api/diary, X-User-Id: q3fM1SreTKORnnFxa0lSoZXw603Trn5O | 200, B 자료만 | 16:49:09 |
| 본문 | POST /api/diary, 아래 본문 | 404, 변경 거절. 직후 GET은 200, B 자료만 | 16:50:00, 16:56:35 |

```json
{"action":"updateTask","id":"5f2f0a6b-c777-4d4d-bd90-bd9bccf21157","user_id":"q3fM1SreTKORnnFxa0lSoZXw603Trn5O","owner_user_id":"q3fM1SreTKORnnFxa0lSoZXw603Trn5O","title":"본문 계정 조작으로 수정 시도"}
```

## 비로그인 직접 요청 · C124

16:45:54 캡처: `GET /api/diary`, `credentials:'omit'` → 401 / `{"error":"로그인이 필요합니다."}`. 로그인한 자신의 목록 200과 비교합니다.

## 거절을 만드는 소스 · C126

- `lib/auth.ts`의 `accountSession`: 쿠키를 받아 DB 세션 유효성을 확인합니다.
- `app/api/diary/route.ts`의 `GET`: 비로그인 401 → `ownedDiary`로 자기 자료만 조회 → 그 범위 안에서 ID를 찾고 없으면 404입니다.
- `lib/ownership.ts`의 `ownedDiary`: 모든 목록을 `plans.owner_user_id` 조건 또는 해당 계획으로의 JOIN으로 제한합니다.
- 같은 파일의 `mutationOwner`: 요청 action과 자료 ID의 주인을 조회합니다. 할 일 생성도 부모 계획 소유권을 확인합니다.
- `app/api/diary/route.ts`의 `POST`: 실제 INSERT·UPDATE·DELETE 전에 `mutationOwner`가 실패하면 404로 반환합니다. 주인은 요청의 user_id가 아니라 세션 사용자 ID입니다.
