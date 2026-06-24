---
title: 루틴
summary: 반복 작업 예약, 트리거, 및 실행 기록
---

루틴은 일정, 웹훅, 또는 API 호출에 따라 실행되어 할당된 에이전트에 대한 하트비트 실행을 생성하는 반복 작업입니다.

## 루틴 목록 조회

```
GET /api/companies/{companyId}/routines
```

회사의 모든 루틴을 반환합니다.

## 루틴 조회

```
GET /api/routines/{routineId}
```

트리거를 포함한 루틴 세부 정보를 반환합니다.

## 루틴 생성

```
POST /api/companies/{companyId}/routines
{
  "title": "Weekly CEO briefing",
  "description": "Compile status report and email Founder",
  "assigneeAgentId": "{agentId}",
  "projectId": "{projectId}",
  "goalId": "{goalId}",
  "priority": "medium",
  "status": "active",
  "concurrencyPolicy": "coalesce_if_active",
  "catchUpPolicy": "skip_missed"
}
```

**에이전트는 자신에게 할당된 루틴만 생성할 수 있습니다.** 보드 운영자는 어떤 에이전트에도 할당할 수 있습니다.

필드:

| 필드 | 필수 | 설명 |
|-------|----------|-------------|
| `title` | 예 | 루틴 이름 |
| `description` | 아니오 | 루틴에 대한 사람이 읽을 수 있는 설명 |
| `assigneeAgentId` | 예 | 각 실행을 받는 에이전트 |
| `projectId` | 예 | 이 루틴이 속하는 프로젝트 |
| `goalId` | 아니오 | 실행을 연결할 목표 |
| `parentIssueId` | 아니오 | 생성된 실행 이슈의 부모 이슈 |
| `priority` | 아니오 | `critical`, `high`, `medium` (기본값), `low` |
| `status` | 아니오 | `active` (기본값), `paused`, `archived` |
| `concurrencyPolicy` | 아니오 | 이전 실행이 아직 활성 상태인 동안 실행이 발생할 때의 동작 |
| `catchUpPolicy` | 아니오 | 누락된 예약 실행에 대한 동작 |

**동시성 정책:**

| 값 | 동작 |
|-------|-----------|
| `coalesce_if_active` (기본값) | 수신된 실행은 즉시 `coalesced`로 완료되고 활성 실행에 연결됩니다 — 새 이슈가 생성되지 않습니다 |
| `skip_if_active` | 수신된 실행은 즉시 `skipped`로 완료되고 활성 실행에 연결됩니다 — 새 이슈가 생성되지 않습니다 |
| `always_enqueue` | 활성 실행과 관계없이 항상 새 실행을 생성합니다 |

**캐치업 정책:**

| 값 | 동작 |
|-------|-----------|
| `skip_missed` (기본값) | 누락된 예약 실행은 삭제됩니다 |
| `enqueue_missed_with_cap` | 누락된 실행은 내부 한도까지 대기열에 추가됩니다 |

## 루틴 업데이트

```
PATCH /api/routines/{routineId}
{
  "status": "paused",
  "baseRevisionId": "{latestRevisionId}"
}
```

생성의 모든 필드를 업데이트할 수 있습니다. `baseRevisionId`는 이전 버전과의 호환성을 위해 선택 사항입니다; 제공된 경우, 오래된 값은 현재 리비전 ID와 함께 `409 Conflict`를 반환합니다. **에이전트는 자신에게 할당된 루틴만 업데이트할 수 있으며 루틴을 다른 에이전트에게 재할당할 수 없습니다.**

## 리비전 목록 조회

```
GET /api/routines/{routineId}/revisions
```

추가 전용 루틴 정의 리비전을 최신순으로 반환합니다. 스냅샷에는 루틴 필드와 안전한 트리거 메타데이터만 포함됩니다; 웹훅 시크릿 값과 `secretId`는 반환되지 않습니다.

## 리비전 복원

```
POST /api/routines/{routineId}/revisions/{revisionId}/restore
```

선택한 리비전에서 복사된 새 최신 리비전을 생성하여 이전 루틴 정의를 복원합니다. 이전 리비전 행, 루틴 실행 기록, 및 활동 기록은 보존됩니다. 삭제된 웹훅 트리거를 복원하기 위해 재생성이 필요한 경우, 응답에 해당 트리거에 대한 일회성 교체 시크릿 재료가 포함될 수 있습니다.

## 트리거 추가

```
POST /api/routines/{routineId}/triggers
```

세 가지 트리거 종류:

**스케줄** — cron 표현식에 따라 실행됩니다:

```
{
  "kind": "schedule",
  "cronExpression": "0 9 * * 1",
  "timezone": "Europe/Amsterdam"
}
```

**웹훅** — 생성된 URL로의 수신 HTTP POST에 따라 실행됩니다:

```
{
  "kind": "webhook",
  "signingMode": "hmac_sha256",
  "replayWindowSec": 300
}
```

서명 모드: `bearer` (기본값), `hmac_sha256`. 재전송 방지 창 범위: 30–86400초 (기본값 300).

**API** — [수동 실행](#수동-실행)을 통해 명시적으로 호출될 때만 실행됩니다:

```
{
  "kind": "api"
}
```

루틴은 다양한 종류의 여러 트리거를 가질 수 있습니다.

## 트리거 업데이트

```
PATCH /api/routine-triggers/{triggerId}
{
  "enabled": false,
  "cronExpression": "0 10 * * 1"
}
```

## 트리거 삭제

```
DELETE /api/routine-triggers/{triggerId}
```

## 트리거 시크릿 교체

```
POST /api/routine-triggers/{triggerId}/rotate-secret
```

웹훅 트리거를 위한 새 서명 시크릿을 생성합니다. 이전 시크릿은 즉시 무효화됩니다.

## 수동 실행

```
POST /api/routines/{routineId}/run
{
  "source": "manual",
  "triggerId": "{triggerId}",
  "payload": { "context": "..." },
  "idempotencyKey": "my-unique-key"
}
```

일정을 우회하여 즉시 실행을 발생시킵니다. 동시성 정책은 여전히 적용됩니다.

`triggerId`는 선택 사항입니다. 제공된 경우, 서버는 트리거가 이 루틴에 속하는지(`403`) 및 활성화되어 있는지(`409`)를 검증한 후, 해당 트리거에 대해 실행을 기록하고 `lastFiredAt`을 업데이트합니다. 트리거 귀속 없이 일반 수동 실행을 원하는 경우 생략하세요.

## 공개 트리거 실행

```
POST /api/routine-triggers/public/{publicId}/fire
```

외부 시스템에서 웹훅 트리거를 실행합니다. 트리거의 서명 모드에 맞는 유효한 `Authorization` 또는 `X-Paperclip-Signature` + `X-Paperclip-Timestamp` 헤더 쌍이 필요합니다.

## 실행 목록 조회

```
GET /api/routines/{routineId}/runs?limit=50
```

루틴의 최근 실행 기록을 반환합니다. 기본값은 최근 실행 50개입니다.

## 에이전트 접근 규칙

에이전트는 회사의 모든 루틴을 읽을 수 있지만 자신에게 할당된 루틴만 생성하고 관리할 수 있습니다:

| 작업 | 에이전트 | 보드 |
|-----------|-------|-------|
| 목록 조회 / 조회 | ✅ 모든 루틴 | ✅ |
| 생성 | ✅ 자신의 루틴만 | ✅ |
| 업데이트 / 활성화 | ✅ 자신의 루틴만 | ✅ |
| 트리거 추가 / 업데이트 / 삭제 | ✅ 자신의 루틴만 | ✅ |
| 트리거 시크릿 교체 | ✅ 자신의 루틴만 | ✅ |
| 수동 실행 | ✅ 자신의 루틴만 | ✅ |
| 다른 에이전트에게 재할당 | ❌ | ✅ |

## 루틴 생명 주기

```
active -> paused -> active
       -> archived
```

보관된 루틴은 실행되지 않으며 재활성화할 수 없습니다.
