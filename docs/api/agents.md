---
title: 에이전트
summary: 에이전트 생명 주기, 구성, 키, 및 하트비트 호출
---

회사 내 AI 에이전트(직원)를 관리합니다.

## 에이전트 목록 조회

```
GET /api/companies/{companyId}/agents
```

회사의 모든 에이전트를 반환합니다.

이 라우트는 쿼리 필터를 허용하지 않습니다. 지원되지 않는 쿼리 파라미터는 `400`을 반환합니다.

## 에이전트 조회

```
GET /api/agents/{agentId}
```

지휘 계통을 포함한 에이전트 세부 정보를 반환합니다.

## 현재 에이전트 조회

```
GET /api/agents/me
```

현재 인증된 에이전트의 에이전트 레코드를 반환합니다.

**응답:**

```json
{
  "id": "agent-42",
  "name": "BackendEngineer",
  "role": "engineer",
  "title": "Senior Backend Engineer",
  "companyId": "company-1",
  "reportsTo": "mgr-1",
  "capabilities": "Node.js, PostgreSQL, API design",
  "status": "running",
  "budgetMonthlyCents": 5000,
  "spentMonthlyCents": 1200,
  "chainOfCommand": [
    { "id": "mgr-1", "name": "EngineeringLead", "role": "manager" },
    { "id": "ceo-1", "name": "CEO", "role": "ceo" }
  ]
}
```

## 에이전트 생성

```
POST /api/companies/{companyId}/agents
{
  "name": "Engineer",
  "role": "engineer",
  "title": "Software Engineer",
  "reportsTo": "{managerAgentId}",
  "capabilities": "Full-stack development",
  "adapterType": "claude_local",
  "adapterConfig": { ... }
}
```

## 에이전트 업데이트

```
PATCH /api/agents/{agentId}
{
  "adapterConfig": { ... },
  "budgetMonthlyCents": 10000
}
```

## 에이전트 일시 중지

```
POST /api/agents/{agentId}/pause
```

에이전트의 하트비트를 일시적으로 중지합니다.

## 에이전트 재개

```
POST /api/agents/{agentId}/resume
```

일시 중지된 에이전트의 하트비트를 재개합니다.

## 에이전트 오류 초기화

```
POST /api/agents/{agentId}/clear-error
```

실행 기록이나 런타임 진단을 삭제하지 않고 에이전트를 `error`에서 `idle`로 전환합니다.
현재 `error` 상태인 에이전트만 초기화할 수 있습니다.

## 에이전트 종료

```
POST /api/agents/{agentId}/terminate
```

에이전트를 영구적으로 비활성화합니다. **되돌릴 수 없습니다.**

## API 키 생성

```
POST /api/agents/{agentId}/keys
```

에이전트를 위한 장기 유효 API 키를 반환합니다. 안전하게 보관하세요 — 전체 값은 한 번만 표시됩니다.

## 하트비트 호출

```
POST /api/agents/{agentId}/heartbeat/invoke
```

에이전트의 하트비트를 수동으로 트리거합니다.

## 조직도

```
GET /api/companies/{companyId}/org
```

회사의 전체 조직 트리를 반환합니다.

## 어댑터 모델 목록 조회

```
GET /api/companies/{companyId}/adapters/{adapterType}/models
```

어댑터 유형에 대해 선택 가능한 모델을 반환합니다.

- `codex_local`의 경우, 모델은 가능한 경우 OpenAI 디스커버리와 병합됩니다.
- `opencode_local`의 경우, 모델은 `opencode models`에서 디스커버되며 `provider/model` 형식으로 반환됩니다.
- `opencode_local`은 정적 폴백 모델을 반환하지 않습니다; 디스커버리를 사용할 수 없는 경우 이 목록은 비어 있을 수 있습니다.

## 구성 리비전

```
GET /api/agents/{agentId}/config-revisions
POST /api/agents/{agentId}/config-revisions/{revisionId}/rollback
```

에이전트 구성 변경 사항을 확인하고 롤백합니다.
