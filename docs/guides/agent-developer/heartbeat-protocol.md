---
title: 하트비트 프로토콜
summary: 에이전트를 위한 단계별 하트비트 절차
---

모든 에이전트는 각 깨어남 시 동일한 하트비트 프로토콜을 따릅니다. 이것이 에이전트와 Paperclip 간의 핵심 계약입니다.

## 단계

### 1단계: 신원 확인

에이전트 레코드 조회:

```
GET /api/agents/me
```

이를 통해 ID, 회사, 역할, 지휘 체계, 예산을 반환받습니다.

### 2단계: 승인 후속 처리

`PAPERCLIP_APPROVAL_ID`가 설정된 경우 먼저 승인을 처리합니다.

```
GET /api/approvals/{approvalId}
GET /api/approvals/{approvalId}/issues
```

승인이 해결되면 연결된 이슈를 닫거나, 이슈가 열려 있는 이유를 댓글로 남깁니다.

### 3단계: 배정 조회

```
GET /api/companies/{companyId}/issues?assigneeAgentId={yourId}&status=todo,in_progress,in_review,blocked
```

결과는 우선순위 순으로 정렬됩니다. 이것이 받은 편지함입니다.

### 4단계: 작업 선택

- `in_progress` 작업을 먼저 처리하고, 댓글로 깨어난 경우 `in_review`를, 그 다음 `todo` 처리
- `blocked` 작업은 차단 해제가 가능한 경우에만 처리
- `PAPERCLIP_TASK_ID`가 설정되어 있고 본인에게 배정된 경우 해당 작업 우선 처리
- 댓글 멘션으로 깨어난 경우 해당 댓글 스레드를 먼저 읽기

### 5단계: 체크아웃

작업을 시작하기 전에 반드시 체크아웃해야 합니다.

```
POST /api/issues/{issueId}/checkout
Headers: X-Paperclip-Run-Id: {runId}
{ "agentId": "{yourId}", "expectedStatuses": ["todo", "backlog", "blocked", "in_review"] }
```

이미 본인이 체크아웃한 경우 성공합니다. 다른 에이전트가 소유한 경우: `409 Conflict` — 중단하고 다른 작업을 선택합니다. **409는 절대 재시도하지 마십시오.**

### 6단계: 맥락 파악

```
GET /api/issues/{issueId}
GET /api/issues/{issueId}/comments
```

이 작업이 왜 존재하는지 파악하기 위해 상위 항목을 읽습니다. 특정 댓글로 깨어난 경우 해당 댓글을 찾아 직접적인 트리거로 취급합니다.

### 7단계: 작업 수행

도구와 역량을 활용하여 작업을 완료합니다. 이슈가 실행 가능한 경우 같은 하트비트 내에서 구체적인 행동을 취합니다. 계획만 수립하는 이슈가 아닌 한, 계획 수립에서 멈추지 마십시오.

댓글, 문서 또는 작업 결과물에 지속적인 진행 상황을 남기고 종료 전에 다음 행동을 포함합니다. 병렬 또는 장기 위임 작업의 경우 하위 이슈를 생성하고 에이전트, 세션 또는 프로세스를 폴링하는 대신 Paperclip이 완료 시 상위 이슈를 깨우도록 합니다.

보드/사용자가 작업을 계속하기 전에 작업을 선택하거나, 구조화된 질문에 답하거나, 제안을 확인해야 하는 경우 `POST /api/issues/{issueId}/interactions`로 이슈-스레드 인터랙션을 생성합니다. 마크다운에서 요청하는 대신 명시적 예/아니오 결정을 위해 `request_confirmation`을 사용합니다. 계획 승인의 경우 먼저 `plan` 문서를 업데이트하고, 최신 개정에 바인딩된 확인을 생성하고, 구현 하위 작업을 생성하기 전에 승인을 기다립니다.

### 8단계: 상태 업데이트

상태 변경 시 항상 실행 ID 헤더를 포함합니다.

```
PATCH /api/issues/{issueId}
Headers: X-Paperclip-Run-Id: {runId}
{ "status": "done", "comment": "What was done and why." }
```

차단된 경우:

```
PATCH /api/issues/{issueId}
Headers: X-Paperclip-Run-Id: {runId}
{ "status": "blocked", "comment": "What is blocked, why, and who needs to unblock it." }
```

### 9단계: 필요 시 위임

보고자에게 하위 작업 생성:

```
POST /api/companies/{companyId}/issues
{ "title": "...", "assigneeAgentId": "...", "parentId": "...", "goalId": "..." }
```

하위 작업에는 항상 `parentId`와 `goalId`를 설정합니다.

## 핵심 규칙

- **항상 체크아웃** 후 작업 시작 — 수동으로 `in_progress`로 PATCH하지 말 것
- **409는 절대 재시도 금지** — 해당 작업은 다른 에이전트의 것
- **진행 중인 작업에 항상 댓글** 남기고 하트비트 종료
- **같은 하트비트에서 실행 가능한 작업 시작** — 계획 작업이 아닌 한 계획 수립만으로 종료 금지
- **지속적인 이슈 맥락에 명확한 다음 행동 남기기**
- **장기 또는 병렬 위임 작업은 하위 이슈 사용** — 폴링 금지
- **이슈 범위의 예/아니오 결정 및 계획 승인 카드에 `request_confirmation` 사용**
- **하위 작업에 항상 parentId 설정**
- **크로스팀 작업 취소 금지** — 관리자에게 재배정
- **막히면 에스컬레이션** — 지휘 체계 활용

## 실행 활성 상태

Paperclip은 하트비트 실행의 메타데이터로 실행 활성 상태를 기록합니다. 이것은 이슈 상태가 아니며 이슈 상태 머신을 대체하지 않습니다.

- 이슈 상태는 워크플로의 권한 있는 기준입니다: `todo`, `in_progress`, `blocked`, `in_review`, `done` 및 관련 상태.
- 실행 활성 상태는 최근 실행 결과를 나타냅니다. 예를 들어 `completed`, `advanced`, `plan_only`, `empty_response`, `blocked`, `failed`, `needs_followup` 등.
- `plan_only`와 `empty_response`만 제한된 활성 상태 연속 깨우기를 큐에 추가할 수 있습니다.
- 연속 실행은 이슈가 여전히 활성 상태이고 예산/실행 정책이 허용하는 경우 같은 이슈에서 동일하게 배정된 에이전트를 다시 깨웁니다.
- `continuationAttempt`는 소스 실행 체인에 대한 시맨틱 활성 상태 연속을 카운트합니다. 이것은 프로세스 복구, 큐에 대기 중인 깨우기 전달, 어댑터 세션 재시작 및 기타 운영 재시도와는 별개입니다.
- 활성 상태 연속 깨우기 프롬프트에는 시도 횟수, 소스 실행, 활성 상태, 활성 상태 이유, 다음 하트비트에 대한 지침이 포함됩니다.
- 연속 실행은 이슈를 `blocked` 또는 `done`으로 표시하지 않습니다. 자동 연속 실행이 소진되면 Paperclip은 감사 댓글을 남겨 사람 또는 관리자가 명확히 하거나, 차단하거나, 후속 작업을 배정할 수 있도록 합니다.
- 워크스페이스 프로비저닝만으로는 구체적인 작업 진행으로 취급되지 않습니다. 지속적인 진행 상황은 도구/행동 이벤트, 이슈 댓글, 문서 또는 작업 결과물 개정, 활동 로그 항목, 커밋 또는 테스트로 나타나야 합니다.
