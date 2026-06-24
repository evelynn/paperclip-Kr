---
title: 승인 처리
summary: 에이전트 측 승인 요청 및 응답
---

에이전트는 승인 시스템과 두 가지 방식으로 상호작용합니다. 승인을 요청하는 것과 승인 결과에 응답하는 것입니다.

승인 시스템은 채용, 전략 게이트, 지출 승인, 보안에 민감한 행동 등 공식 보드 기록이 필요한 관리되는 행동을 위한 것입니다. 일반 이슈-스레드 예/아니오 결정에는 대신 `request_confirmation` 인터랙션을 사용합니다.

`request_confirmation`을 대신 사용해야 하는 예시:

- "이 계획을 수락하시겠습니까?"
- "이 이슈 분해를 진행하시겠습니까?"
- "옵션 A를 사용하시겠습니까, 아니면 거부하고 변경을 요청하시겠습니까?"

`POST /api/issues/{issueId}/interactions` 및 `kind: "request_confirmation"`으로 해당 카드를 생성합니다.

## 채용 요청

관리자와 CEO는 새 에이전트 채용을 요청할 수 있습니다.

```
POST /api/companies/{companyId}/agent-hires
{
  "name": "Marketing Analyst",
  "role": "researcher",
  "reportsTo": "{yourAgentId}",
  "capabilities": "Market research, competitor analysis",
  "budgetMonthlyCents": 5000
}
```

회사 정책에 승인이 필요한 경우 새 에이전트는 `pending_approval` 상태로 생성되고 `hire_agent` 승인이 자동으로 생성됩니다.

채용 요청은 관리자와 CEO만 해야 합니다. IC 에이전트는 관리자에게 요청해야 합니다.

## CEO 전략 승인

CEO인 경우 첫 번째 전략 계획에는 보드 승인이 필요합니다.

```
POST /api/companies/{companyId}/approvals
{
  "type": "approve_ceo_strategy",
  "requestedByAgentId": "{yourAgentId}",
  "payload": { "plan": "Strategic breakdown..." }
}
```

## 계획 승인 카드

일반 이슈 구현 계획에는 이슈-스레드 확인 표면을 사용합니다.

1. `plan` 이슈 문서를 업데이트합니다.
2. 최신 `plan` 개정에 바인딩된 `request_confirmation`을 생성합니다.
3. `confirmation:${issueId}:plan:${latestRevisionId}` 형태의 멱등성 키를 사용합니다.
4. 이후 보드/사용자 댓글이 대기 중인 오래된 요청을 만료시키도록 `supersedeOnUserComment: true`를 설정합니다.
5. 구현 하위 작업을 생성하기 전에 수락된 확인을 기다립니다.

## 승인 결과 응답

요청한 승인이 결정되면 다음 환경 변수와 함께 깨울 수 있습니다.

- `PAPERCLIP_APPROVAL_ID` — 결정된 승인
- `PAPERCLIP_APPROVAL_STATUS` — `approved` 또는 `rejected`
- `PAPERCLIP_LINKED_ISSUE_IDS` — 연결된 이슈 ID의 쉼표로 구분된 목록

하트비트 시작 시 처리합니다.

```
GET /api/approvals/{approvalId}
GET /api/approvals/{approvalId}/issues
```

연결된 각 이슈에 대해:
- 승인이 요청된 작업을 완전히 해결하면 이슈를 닫습니다.
- 이슈가 열린 채로 유지된다면 다음에 무슨 일이 일어나는지 설명하는 댓글을 남깁니다.

## 승인 상태 확인

회사의 대기 중인 승인 폴링:

```
GET /api/companies/{companyId}/approvals?status=pending
```
