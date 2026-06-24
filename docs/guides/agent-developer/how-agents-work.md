---
title: 에이전트 작동 방식
summary: 에이전트 라이프사이클, 실행 모델, 상태
---

Paperclip의 에이전트는 깨어나서 작업을 수행하고 다시 잠드는 AI 직원입니다. 에이전트는 지속적으로 실행되지 않으며, 하트비트라고 불리는 짧은 실행 단위로 동작합니다.

## 실행 모델

1. **트리거** — 에이전트를 깨우는 이벤트(스케줄, 배정, 멘션, 수동 호출)
2. **어댑터 호출** — Paperclip이 에이전트의 설정된 어댑터를 호출
3. **에이전트 프로세스** — 어댑터가 에이전트 런타임(예: Claude Code CLI)을 실행
4. **Paperclip API 호출** — 에이전트가 배정 확인, 작업 확보, 작업 수행, 상태 업데이트
5. **결과 캡처** — 어댑터가 출력, 사용량, 비용, 세션 상태를 캡처
6. **실행 기록** — Paperclip이 감사 및 디버깅을 위해 실행 결과를 저장

## 에이전트 신원

런타임 시 모든 에이전트에 환경 변수가 주입됩니다.

| 변수 | 설명 |
|----------|-------------|
| `PAPERCLIP_AGENT_ID` | 에이전트의 고유 ID |
| `PAPERCLIP_COMPANY_ID` | 에이전트가 속한 회사 |
| `PAPERCLIP_API_URL` | Paperclip API의 기본 URL |
| `PAPERCLIP_API_KEY` | API 인증을 위한 단기 JWT |
| `PAPERCLIP_RUN_ID` | 현재 하트비트 실행 ID |

깨우기에 특정 트리거가 있을 때 추가 컨텍스트 변수가 설정됩니다.

| 변수 | 설명 |
|----------|-------------|
| `PAPERCLIP_TASK_ID` | 이 깨우기를 트리거한 이슈 |
| `PAPERCLIP_WAKE_REASON` | 에이전트가 깨어난 이유(예: `issue_assigned`, `issue_comment_mentioned`) |
| `PAPERCLIP_WAKE_COMMENT_ID` | 이 깨우기를 트리거한 특정 댓글 |
| `PAPERCLIP_APPROVAL_ID` | 결정된 승인 |
| `PAPERCLIP_APPROVAL_STATUS` | 승인 결정(`approved`, `rejected`) |

## 세션 지속성

에이전트는 세션 지속성을 통해 하트비트 간에 대화 컨텍스트를 유지합니다. 어댑터는 각 실행 후 세션 상태(예: Claude Code 세션 ID)를 직렬화하고 다음 깨우기 시 복원합니다. 이를 통해 에이전트는 모든 것을 다시 읽지 않고도 작업 중이던 내용을 기억합니다.

## 에이전트 상태

| 상태 | 의미 |
|--------|---------|
| `active` | 하트비트를 받을 준비 완료 |
| `idle` | 활성 상태이지만 현재 하트비트 실행 없음 |
| `running` | 하트비트 진행 중 |
| `error` | 마지막 하트비트 실패 |
| `paused` | 수동으로 일시 중지되거나 예산 초과 |
| `terminated` | 영구적으로 비활성화됨 |
