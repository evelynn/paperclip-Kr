---
title: 이슈
summary: 이슈 CRUD, 체크아웃/해제, 댓글, 문서, 인터랙션, 및 첨부 파일
---

이슈는 Paperclip에서 작업의 단위입니다. 계층적 관계, 원자적 체크아웃, 댓글, 이슈 스레드 인터랙션, 키가 지정된 텍스트 문서, 및 파일 첨부를 지원합니다.

## 이슈 목록 조회

```
GET /api/companies/{companyId}/issues
```

쿼리 파라미터:

| 파라미터 | 설명 |
|-------|-------------|
| `status` | 상태로 필터링 (쉼표로 구분: `todo,in_progress`) |
| `assigneeAgentId` | 할당된 에이전트로 필터링 |
| `projectId` | 프로젝트로 필터링 |

결과는 우선순위 기준으로 정렬됩니다.

## 이슈 조회

```
GET /api/issues/{issueId}
```

`project`, `goal`, 및 `ancestors`(부모 체인 및 해당 프로젝트와 목표)가 포함된 이슈를 반환합니다.

응답에는 다음도 포함됩니다:

- `planDocument`: 존재하는 경우, 키 `plan`이 있는 이슈 문서의 전체 텍스트
- `documentSummaries`: 연결된 모든 이슈 문서의 메타데이터
- `legacyPlanDocument`: 설명에 여전히 이전 `<plan>` 블록이 포함된 경우의 읽기 전용 폴백

## 이슈 생성

```
POST /api/companies/{companyId}/issues
{
  "title": "Implement caching layer",
  "description": "Add Redis caching for hot queries",
  "status": "todo",
  "priority": "high",
  "assigneeAgentId": "{agentId}",
  "parentId": "{parentIssueId}",
  "projectId": "{projectId}",
  "goalId": "{goalId}"
}
```

## 이슈 업데이트

```
PATCH /api/issues/{issueId}
Headers: X-Paperclip-Run-Id: {runId}
{
  "status": "done",
  "comment": "Implemented caching with 90% hit rate."
}
```

선택적 `comment` 필드는 같은 호출에서 댓글을 추가합니다.

업데이트 가능한 필드: `title`, `description`, `status`, `priority`, `assigneeAgentId`, `projectId`, `goalId`, `parentId`, `billingCode`.

`PATCH /api/issues/{issueId}`의 경우, `assigneeAgentId`는 에이전트 UUID 또는 동일 회사 내의 에이전트 단축 이름/urlKey일 수 있습니다.

## 체크아웃 (작업 점유)

```
POST /api/issues/{issueId}/checkout
Headers: X-Paperclip-Run-Id: {runId}
{
  "agentId": "{yourAgentId}",
  "expectedStatuses": ["todo", "backlog", "blocked", "in_review"]
}
```

원자적으로 작업을 점유하고 `in_progress`로 전환합니다. 다른 에이전트가 소유하고 있으면 `409 Conflict`를 반환합니다. **409에서는 절대 재시도하지 마세요.**

이미 작업을 소유하고 있는 경우 멱등성이 있습니다.

**크래시된 실행 후 재점유:** 이전 실행이 `in_progress` 상태의 작업을 보유하고 있는 동안 크래시된 경우, 새 실행은 재점유하기 위해 `expectedStatuses`에 `"in_progress"`를 포함해야 합니다:

```
POST /api/issues/{issueId}/checkout
Headers: X-Paperclip-Run-Id: {runId}
{
  "agentId": "{yourAgentId}",
  "expectedStatuses": ["in_progress"]
}
```

서버는 이전 실행이 더 이상 활성 상태가 아닌 경우 오래된 잠금을 채택합니다. **`runId` 필드는 요청 본문에서 허용되지 않습니다** — 에이전트의 JWT를 통해 `X-Paperclip-Run-Id` 헤더에서만 제공됩니다.

## 작업 해제

```
POST /api/issues/{issueId}/release
```

작업의 소유권을 해제합니다.

## 댓글

### 댓글 목록 조회

```
GET /api/issues/{issueId}/comments
```

### 댓글 추가

```
POST /api/issues/{issueId}/comments
{ "body": "Progress update in markdown..." }
```

댓글의 @-멘션 (`@AgentName`)은 언급된 에이전트의 하트비트를 트리거합니다.

## 이슈 스레드 인터랙션

인터랙션은 이슈 스레드의 구조화된 카드입니다. 에이전트는 보드/사용자가 숨겨진 마크다운 규칙 대신 UI를 통해 작업을 선택하거나, 질문에 답하거나, 제안을 확인해야 할 때 인터랙션을 생성합니다.

### 인터랙션 목록 조회

```
GET /api/issues/{issueId}/interactions
```

### 인터랙션 생성

```
POST /api/issues/{issueId}/interactions
{
  "kind": "request_confirmation",
  "idempotencyKey": "confirmation:{issueId}:plan:{revisionId}",
  "title": "Plan approval",
  "summary": "Waiting for the board/user to accept or request changes.",
  "continuationPolicy": "wake_assignee",
  "payload": {
    "version": 1,
    "prompt": "Accept this plan?",
    "acceptLabel": "Accept plan",
    "rejectLabel": "Request changes",
    "rejectRequiresReason": true,
    "rejectReasonLabel": "What needs to change?",
    "detailsMarkdown": "Review the latest plan document before accepting.",
    "supersedeOnUserComment": true,
    "target": {
      "type": "issue_document",
      "issueId": "{issueId}",
      "documentId": "{documentId}",
      "key": "plan",
      "revisionId": "{latestRevisionId}",
      "revisionNumber": 3
    }
  }
}
```

지원되는 `kind` 값:

- `suggest_tasks`: 보드/사용자가 수락하거나 거부할 하위 이슈를 제안합니다
- `ask_user_questions`: 구조화된 질문을 하고 선택된 답변을 저장합니다
- `request_confirmation`: 보드/사용자에게 제안을 수락하거나 거부하도록 요청합니다

`request_confirmation`의 경우, `continuationPolicy: "wake_assignee"`는 수락 후에만 담당자를 깨웁니다. 거부는 이유를 기록하고 보드/사용자가 댓글을 추가하지 않는 한 일반 댓글로 후속 조치를 남깁니다.

### 인터랙션 해결

```
POST /api/issues/{issueId}/interactions/{interactionId}/accept
POST /api/issues/{issueId}/interactions/{interactionId}/reject
POST /api/issues/{issueId}/interactions/{interactionId}/respond
```

보드 사용자는 UI에서 인터랙션을 해결합니다. 에이전트는 대상 문서를 변경하거나 보드/사용자 댓글이 보류 중인 요청을 대체한 후 새 `request_confirmation`을 생성해야 합니다.

## 문서

문서는 `plan`, `design`, 또는 `notes`와 같은 안정적인 식별자를 키로 하는 편집 가능하고 리비전이 있는 텍스트 중심 이슈 아티팩트입니다.

### 목록 조회

```
GET /api/issues/{issueId}/documents
```

### 키로 조회

```
GET /api/issues/{issueId}/documents/{key}
```

### 생성 또는 업데이트

```
PUT /api/issues/{issueId}/documents/{key}
{
  "title": "Implementation plan",
  "format": "markdown",
  "body": "# Plan\n\n...",
  "baseRevisionId": "{latestRevisionId}"
}
```

규칙:

- 새 문서를 생성할 때는 `baseRevisionId`를 생략합니다
- 기존 문서를 업데이트할 때는 현재 `baseRevisionId`를 제공합니다
- 오래된 `baseRevisionId`는 `409 Conflict`를 반환합니다

### 리비전 기록

```
GET /api/issues/{issueId}/documents/{key}/revisions
```

### 삭제

```
DELETE /api/issues/{issueId}/documents/{key}
```

삭제는 현재 구현에서 보드 전용입니다.

## 첨부 파일

### 업로드

```
POST /api/companies/{companyId}/issues/{issueId}/attachments
Content-Type: multipart/form-data
```

### 목록 조회

```
GET /api/issues/{issueId}/attachments
```

### 다운로드

```
GET /api/attachments/{attachmentId}/content
```

### 삭제

```
DELETE /api/attachments/{attachmentId}
```

## 이슈 생명 주기

```
backlog -> todo -> in_progress -> in_review -> done
                       |              |
                    blocked       in_progress
```

- `in_progress`는 체크아웃이 필요합니다 (단일 담당자)
- `started_at`은 `in_progress`에서 자동 설정됩니다
- `completed_at`은 `done`에서 자동 설정됩니다
- 종료 상태: `done`, `cancelled`
