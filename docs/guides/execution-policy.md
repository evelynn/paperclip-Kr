# 실행 정책: 리뷰 및 승인 워크플로

Paperclip의 실행 정책 시스템은 적절한 수준의 감독 하에 작업이 완료되도록 보장합니다. 에이전트가 검토를 위한 작업 인계를 기억하는 것에 의존하는 대신, **런타임이** 리뷰 및 승인 단계를 자동으로 집행합니다.

## 개요

실행 정책은 이슈에 설정 가능한 선택적 구조화 객체로, 실행자가 작업을 완료한 후 무슨 일이 일어나야 하는지 정의합니다. 세 가지 집행 레이어를 지원합니다.

| 레이어 | 목적 | 범위 |
|---|---|---|
| **댓글 필수** | 모든 에이전트 실행은 이슈에 댓글을 남겨야 합니다 | 런타임 불변 (항상 활성) |
| **리뷰 단계** | 리뷰어가 품질/정확성을 확인하고 변경을 요청할 수 있습니다 | 이슈별, 선택 사항 |
| **승인 단계** | 관리자/이해관계자가 최종 승인을 제공합니다 | 이슈별, 선택 사항 |

이 레이어들은 조합 가능합니다. 이슈는 리뷰만, 승인만, 순서대로 둘 다, 또는 어느 것도 없이 (댓글 필수 안전망만) 설정할 수 있습니다.

## 데이터 모델

### 실행 정책 (이슈 필드: `executionPolicy`)

```ts
interface IssueExecutionPolicy {
  mode: "normal" | "auto";
  commentRequired: boolean;       // 항상 true, 런타임에서 집행
  stages: IssueExecutionStage[];  // 리뷰/승인 단계의 순서 목록
}

interface IssueExecutionStage {
  id: string;                                 // 자동 생성 UUID
  type: "review" | "approval";                // 단계 종류
  approvalsNeeded: 1;                         // 다중 승인은 아직 미지원
  participants: IssueExecutionStageParticipant[];
}

interface IssueExecutionStageParticipant {
  id: string;
  type: "agent" | "user";
  agentId?: string | null;    // type이 "agent"일 때 설정
  userId?: string | null;     // type이 "user"일 때 설정
}
```

참여자는 에이전트 또는 보드 사용자가 될 수 있습니다. 각 단계는 여러 참여자를 가질 수 있으며, 런타임은 명시적으로 요청된 담당자를 선호하면서 원래 실행자를 제외하고 첫 번째 적격 참여자를 선택합니다.

### 실행 상태 (이슈 필드: `executionState`)

이슈가 정책 워크플로에서 현재 어디에 있는지 추적합니다.

```ts
interface IssueExecutionState {
  status: "idle" | "pending" | "changes_requested" | "completed";
  currentStageId: string | null;
  currentStageIndex: number | null;
  currentStageType: "review" | "approval" | null;
  currentParticipant: IssueExecutionStagePrincipal | null;
  returnAssignee: IssueExecutionStagePrincipal | null;
  completedStageIds: string[];
  lastDecisionId: string | null;
  lastDecisionOutcome: "approved" | "changes_requested" | null;
}
```

### 실행 결정 (테이블: `issue_execution_decisions`)

모든 리뷰/승인 작업의 감사 추적입니다.

```ts
interface IssueExecutionDecision {
  id: string;
  companyId: string;
  issueId: string;
  stageId: string;
  stageType: "review" | "approval";
  actorAgentId: string | null;
  actorUserId: string | null;
  outcome: "approved" | "changes_requested";
  body: string;              // 결정을 설명하는 필수 댓글
  createdByRunId: string | null;
  createdAt: Date;
}
```

## 워크플로

### 정상 경로: 리뷰 + 승인

```
┌──────────┐    executor     ┌───────────┐   reviewer    ┌───────────┐   approver    ┌──────┐
│  todo     │───completes───▶│ in_review  │───approves───▶│ in_review │───approves───▶│ done │
│ (Coder)  │    work         │ (QA)      │               │ (CTO)     │               │      │
└──────────┘                 └───────────┘               └───────────┘               └──────┘
```

1. **이슈 생성** 시 리뷰 단계(예: QA)와 승인 단계(예: CTO)를 지정하는 `executionPolicy` 설정.
2. **실행자가 작업** 진행 (`in_progress` 상태).
3. **실행자가 `done`으로 전환** — 런타임이 이를 가로챕니다:
   - 상태가 `in_review`로 변경됩니다 (`done` 아님)
   - 이슈가 첫 번째 리뷰어에게 재배정됩니다.
   - `executionState`가 리뷰 단계의 `pending`으로 진입합니다.
4. **리뷰어가 검토** 후 댓글과 함께 `done`으로 전환:
   - 결정 레코드가 생성됩니다: `{ outcome: "approved" }`
   - 이슈는 `in_review` 유지, 승인자에게 재배정됩니다.
   - `executionState`가 승인 단계로 진행됩니다.
5. **승인자가 승인** 후 댓글과 함께 `done`으로 전환:
   - 결정 레코드가 생성됩니다: `{ outcome: "approved" }`
   - `executionState.status`가 `completed`가 됩니다.
   - 이슈가 실제 `done` 상태에 도달합니다.

### 변경 요청 흐름

```
┌───────────┐   reviewer requests   ┌─────────────┐   executor    ┌───────────┐
│ in_review  │───changes────────────▶│ in_progress  │───resubmits──▶│ in_review │
│ (QA)      │                       │ (Coder)      │               │ (QA)      │
└───────────┘                       └──────────────┘               └───────────┘
```

1. **리뷰어가 변경을 요청**하면 `done` 이외의 상태(일반적으로 `in_progress`)로 전환하고, 변경이 필요한 이유를 설명하는 댓글을 남깁니다.
2. 런타임이 자동으로:
   - 상태를 `in_progress`로 설정
   - 원래 실행자(`returnAssignee`에 저장)에게 재배정
   - `executionState.status`를 `changes_requested`로 설정
3. **실행자가 변경** 후 다시 `done`으로 전환합니다.
4. 런타임이 **동일한 리뷰 단계**(처음부터가 아님)로 동일한 리뷰어에게 라우팅합니다.
5. 리뷰어가 승인할 때까지 이 루프가 계속됩니다.

### 정책 변형

**리뷰만** (승인 단계 없음):
```json
{
  "stages": [
    { "type": "review", "participants": [{ "type": "agent", "agentId": "qa-agent-id" }] }
  ]
}
```
실행자 완료 → 리뷰어 승인 → 완료.

**승인만** (리뷰 단계 없음):
```json
{
  "stages": [
    { "type": "approval", "participants": [{ "type": "user", "userId": "manager-user-id" }] }
  ]
}
```
실행자 완료 → 승인자 서명 → 완료.

**여러 리뷰어/승인자:**
각 단계는 여러 참여자를 지원합니다. 런타임은 원래 실행자를 제외하고 한 명을 선택하여 자기 검토를 방지합니다.

## 댓글 필수 안전망

리뷰 단계와 무관하게, 이슈에 연결된 모든 에이전트 실행은 댓글을 남겨야 합니다. 이는 런타임 수준에서 집행됩니다.

1. **실행 완료** — 런타임이 에이전트가 이 실행에 대한 댓글을 게시했는지 확인합니다.
2. **댓글이 없으면**: `issueCommentStatus`가 `retry_queued`로 설정되고, 에이전트가 `missing_issue_comment` 이유로 한 번 더 깨어납니다.
3. **재시도 후에도 댓글 없으면**: `issueCommentStatus`가 `retry_exhausted`로 설정됩니다. 더 이상 재시도하지 않습니다. 실패가 기록됩니다.
4. **댓글이 게시되면**: `issueCommentStatus`가 `satisfied`로 설정되고 댓글 ID와 연결됩니다.

이는 에이전트가 작업을 완료했지만 무슨 일이 있었는지 아무런 흔적을 남기지 않는 조용한 완료를 방지합니다.

### 실행 수준 추적 필드

| 필드 | 설명 |
|---|---|
| `issueCommentStatus` | `satisfied`, `retry_queued`, 또는 `retry_exhausted` |
| `issueCommentSatisfiedByCommentId` | 요건을 충족한 댓글로 연결 |
| `issueCommentRetryQueuedAt` | 재시도 웨이크업이 예약된 타임스탬프 |

## 접근 제어

- **활성 리뷰어/승인자**(실행 상태의 `currentParticipant`)만 현재 단계를 진행하거나 거부할 수 있습니다.
- 비참여자가 이슈를 전환하려고 하면 `422 Unprocessable Entity` 오류를 받습니다.
- 승인과 변경 요청 모두 **댓글이 필수**입니다 — 비어 있거나 공백만 있는 댓글은 거부됩니다.

## API 사용

### 이슈 생성 시 실행 정책 설정

```bash
POST /api/companies/{companyId}/issues
{
  "title": "Implement feature X",
  "assigneeAgentId": "coder-agent-id",
  "executionPolicy": {
    "mode": "normal",
    "commentRequired": true,
    "stages": [
      {
        "type": "review",
        "participants": [
          { "type": "agent", "agentId": "qa-agent-id" }
        ]
      },
      {
        "type": "approval",
        "participants": [
          { "type": "user", "userId": "cto-user-id" }
        ]
      }
    ]
  }
}
```

단계 ID와 참여자 ID가 생략되면 자동 생성됩니다. 단계 내 중복 참여자는 자동으로 중복 제거됩니다. 유효한 참여자가 없는 단계는 제거됩니다. 유효한 단계가 남지 않으면 정책은 `null`로 설정됩니다.

### 기존 이슈의 실행 정책 업데이트

```bash
PATCH /api/issues/{issueId}
{
  "executionPolicy": { ... }
}
```

리뷰가 진행 중인 동안 정책이 제거(`null`)되면, 실행 상태가 지워지고 이슈가 원래 실행자에게 반환됩니다.

### 단계 진행 (리뷰어/승인자 승인)

활성 리뷰어 또는 승인자가 댓글과 함께 이슈를 `done`으로 전환합니다.

```bash
PATCH /api/issues/{issueId}
{
  "status": "done",
  "comment": "Reviewed — implementation looks correct, tests pass."
}
```

런타임이 이것이 워크플로를 완료하는지 또는 다음 단계로 진행하는지 결정합니다.

### 변경 요청

활성 리뷰어가 댓글과 함께 `done` 이외의 상태로 전환합니다.

```bash
PATCH /api/issues/{issueId}
{
  "status": "in_progress",
  "comment": "Button alignment is off on mobile. Please fix the flex container."
}
```

런타임이 자동으로 원래 실행자에게 재배정합니다.

## UI

### 새 이슈 대화 상자

새 이슈를 생성할 때 담당자 선택기 옆에 **리뷰어** 및 **승인자** 버튼이 나타납니다. 클릭하면 참여자 선택기가 열립니다.
- "리뷰어 없음" / "승인자 없음" (지우기)
- "나" (현재 사용자)
- 에이전트 및 보드 사용자 전체 목록

선택 사항이 자동으로 `executionPolicy.stages` 배열을 구성합니다.

### 이슈 속성 패널

기존 이슈의 경우 속성 패널에 편집 가능한 **리뷰어** 및 **승인자** 필드가 표시됩니다. 단계별로 여러 참여자를 추가할 수 있습니다. 변경 사항은 API를 통해 이슈의 `executionPolicy`에 유지됩니다.

## 설계 원칙

1. **프롬프트 의존이 아닌 런타임 집행.** 에이전트가 작업을 인계하는 것을 기억할 필요가 없습니다. 런타임이 상태 전환을 가로채고 그에 따라 라우팅합니다.
2. **종료가 아닌 반복적 과정.** 리뷰는 루프입니다 (변경 요청 → 수정 → 재검토). 일회성 게이트가 아닙니다. 시스템은 재제출 시 동일한 단계로 돌아갑니다.
3. **유연한 역할.** 참여자는 에이전트 또는 사용자가 될 수 있습니다. 모든 조직에 "QA"가 있는 것은 아닙니다 — 리뷰어/승인자 패턴은 동료 리뷰, 관리자 승인, 준수 확인, 또는 다자 워크플로에 충분히 일반적입니다.
4. **감사 가능성.** 모든 결정은 행위자, 결과, 댓글, 실행 ID와 함께 기록됩니다. 전체 리뷰 이력은 이슈별로 조회 가능합니다.
5. **단일 실행 불변성 보존.** 리뷰 웨이크업 및 댓글 재시도는 이슈당 한 번에 하나의 에이전트 실행만 활성화될 수 있다는 기존 제약을 준수합니다.
