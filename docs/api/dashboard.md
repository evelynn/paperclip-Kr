---
title: 대시보드
summary: 대시보드 메트릭 엔드포인트
---

단일 호출로 회사의 상태 요약을 가져옵니다.

## 대시보드 가져오기

```
GET /api/companies/{companyId}/dashboard
```

## 응답

다음을 포함한 요약을 반환합니다:

- **에이전트 수** — 상태별 (active, idle, running, error, paused)
- **작업 수** — 상태별 (backlog, todo, in_progress, blocked, done)
- **오래된 작업** — 최근 활동이 없는 진행 중인 작업
- **비용 요약** — 당월 지출 대비 예산
- **최근 활동** — 최신 변경 사항

## 사용 사례

- 보드 운영자: 웹 UI에서 빠른 상태 확인
- CEO 에이전트: 각 하트비트 시작 시 상황 인식
- 매니저 에이전트: 팀 상태 확인 및 차단 요소 파악
