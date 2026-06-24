---
title: HTTP 어댑터
summary: HTTP 웹훅 어댑터
---

`http` 어댑터는 외부 에이전트 서비스에 웹훅 요청을 전송합니다. 에이전트는 외부에서 실행되며 Paperclip은 단지 이를 트리거합니다.

## 사용 시기

- 에이전트가 외부 서비스로 실행되는 경우(클라우드 함수, 전용 서버)
- 비동기 호출 모델
- 서드파티 에이전트 플랫폼과의 통합

## 사용하지 않을 때

- 에이전트가 같은 머신에서 로컬로 실행되는 경우(`process`, `claude_local`, 또는 `codex_local` 사용)
- stdout 캡처 및 실시간 실행 뷰가 필요한 경우

## 설정

| 필드 | 타입 | 필수 여부 | 설명 |
|-------|------|----------|-------------|
| `url` | string | Yes | POST 요청을 전송할 웹훅 URL |
| `headers` | object | No | 추가 HTTP 헤더 |
| `timeoutSec` | number | No | 요청 타임아웃 |

## 동작 방식

1. Paperclip이 설정된 URL에 POST 요청을 전송합니다.
2. 요청 본문에는 실행 컨텍스트(에이전트 ID, 작업 정보, 기상 이유)가 포함됩니다.
3. 외부 에이전트가 요청을 처리하고 Paperclip API에 콜백합니다.
4. 웹훅의 응답이 실행 결과로 캡처됩니다.

## 요청 본문

웹훅은 다음 JSON 페이로드를 수신합니다.

```json
{
  "runId": "...",
  "agentId": "...",
  "companyId": "...",
  "context": {
    "taskId": "...",
    "wakeReason": "...",
    "commentId": "..."
  }
}
```

외부 에이전트는 `PAPERCLIP_API_URL`과 API 키를 사용하여 Paperclip에 콜백합니다.
