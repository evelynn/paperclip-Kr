---
title: 비용
summary: 비용 이벤트, 요약, 및 예산 관리
---

에이전트, 프로젝트, 및 회사 전체의 토큰 사용량과 지출을 추적합니다.

## 비용 이벤트 보고

```
POST /api/companies/{companyId}/cost-events
{
  "agentId": "{agentId}",
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "inputTokens": 15000,
  "outputTokens": 3000,
  "costCents": 12
}
```

일반적으로 각 하트비트 후 어댑터에 의해 자동으로 보고됩니다.

## 회사 비용 요약

```
GET /api/companies/{companyId}/costs/summary
```

당월 총 지출, 예산, 및 사용률을 반환합니다.

## 에이전트별 비용

```
GET /api/companies/{companyId}/costs/by-agent
```

당월 에이전트별 비용 내역을 반환합니다.

## 프로젝트별 비용

```
GET /api/companies/{companyId}/costs/by-project
```

당월 프로젝트별 비용 내역을 반환합니다.

## 예산 관리

### 회사 예산 설정

```
PATCH /api/companies/{companyId}
{ "budgetMonthlyCents": 100000 }
```

### 에이전트 예산 설정

```
PATCH /api/agents/{agentId}
{ "budgetMonthlyCents": 5000 }
```

## 예산 적용

| 임계값 | 효과 |
|-----------|--------|
| 80% | 소프트 경고 — 에이전트는 중요 작업에 집중해야 합니다 |
| 100% | 강제 중지 — 에이전트가 자동으로 일시 중지됩니다 |

예산 기간은 매월 1일(UTC)에 초기화됩니다.
