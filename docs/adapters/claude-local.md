---
title: Claude Local
summary: Claude Code 로컬 어댑터 설정 및 구성
---

`claude_local` 어댑터는 Anthropic의 Claude Code CLI를 로컬에서 실행합니다. 세션 지속성, 스킬 주입, 구조화된 출력 파싱을 지원합니다.

## 사전 요구 사항

- Claude Code CLI가 설치되어 있어야 합니다(`claude` 명령 사용 가능).
- `ANTHROPIC_API_KEY`가 환경 변수 또는 에이전트 설정에 설정되어 있어야 합니다.

## 설정 필드

| 필드 | 타입 | 필수 여부 | 설명 |
|-------|------|----------|-------------|
| `cwd` | string | Yes | 에이전트 프로세스의 작업 디렉터리(절대 경로; 권한이 허용될 경우 누락 시 자동 생성) |
| `model` | string | No | 사용할 Claude 모델(예: `claude-opus-4-6`) |
| `promptTemplate` | string | No | 모든 실행에 사용되는 프롬프트 |
| `env` | object | No | 환경 변수(시크릿 참조 지원) |
| `timeoutSec` | number | No | 프로세스 타임아웃(0 = 타임아웃 없음) |
| `graceSec` | number | No | 강제 종료 전 유예 기간 |
| `maxTurnsPerRun` | number | No | 하트비트당 최대 에이전트 턴 수(기본값: `300`) |
| `dangerouslySkipPermissions` | boolean | No | 권한 프롬프트 건너뜀(기본값: `true`); 인터랙티브 승인이 불가능한 헤드리스 실행 시 필수 |

## 프롬프트 템플릿

템플릿은 `{{variable}}` 치환을 지원합니다.

| 변수 | 값 |
|----------|-------|
| `{{agentId}}` | 에이전트 ID |
| `{{companyId}}` | 회사 ID |
| `{{runId}}` | 현재 실행 ID |
| `{{agent.name}}` | 에이전트 이름 |
| `{{company.name}}` | 회사 이름 |

## 세션 지속성

어댑터는 하트비트 사이에 Claude Code 세션 ID를 유지합니다. 다음 기상 시 기존 대화를 재개하여 에이전트가 전체 컨텍스트를 유지합니다.

세션 재개는 cwd를 인식합니다. 마지막 실행 이후 에이전트의 작업 디렉터리가 변경된 경우, 새 세션이 시작됩니다.

알 수 없는 세션 오류로 재개에 실패하면, 어댑터가 자동으로 새 세션으로 재시도합니다.

### 손상된 `previous_message_id` (복구)

로그/이슈 스레드에서 나타나는 증상:

```
API Error: 400 diagnostics.previous_message_id: must be the `id` from a prior /v1/messages response (starts with `msg_`)
```

의미: 해당 세션의 온디스크 Claude Code 트랜스크립트 JSONL에 잘못된 형식(비`msg_` 접두사)의 `previous_message_id`가 포함되어 있습니다. Anthropic의 `/v1/messages`는 해당 트랜스크립트에 대한 모든 재개 시도를 결정론적 400으로 거부합니다. 방어 장치 없이는 Paperclip이 동일한 손상된 세션 ID를 다시 유지하고 이슈가 영구적으로 방치됩니다 — [RED-976](../../../) / [RED-978](../../../) 참조.

어댑터가 자동으로 수행하는 작업:

1. **재개 시 자동 교체.** `--resume` 시도가 이 400을 반환하면, 어댑터가 새 세션으로 한 번 재시도하고, 로컬 Claude 설정 디렉터리에서 손상된 `<session>.jsonl`을 삭제하며(베스트 에포트), 이후부터 새 세션 ID를 사용합니다.
2. **영속화 전 검증.** 이 400을 포함하는 결과는 Claude Code가 결과 이벤트에서 세션 ID를 내보내더라도 해당 `session_id`가 작업 세션 스토어에 기록되지 않습니다. 어댑터는 `sessionId: null`, `sessionParams: null`, `errorCode: "claude_poisoned_previous_message_id"`를 반환합니다.
3. **오류 시 삭제.** 어댑터는 결과에 `clearSession: true`를 설정하여 하트비트 서비스가 해당 이슈의 유지된 세션 행을 삭제(`clearTaskSessions`)하도록 합니다. 다음 연속 실행은 깨끗한 상태에서 시작됩니다.

프로덕션에서 이를 발견했을 때 점검 목록:

- 실행 행에서 `errorCode`가 `claude_poisoned_previous_message_id`인지 확인하십시오 — 방어 장치가 정상적으로 작동했으며 이슈는 다음 하트비트에서 자동 복구됩니다.
- 한 번의 하트비트 이후에도 동일한 이슈가 반복된다면, 해당 `(agentId, taskKey)`의 `agentTaskSessions`이 삭제되었는지 확인하십시오. 그렇지 않다면, 어댑터 반환 값이 손실된 것입니다(예: 잘못된 실행 완료) — 에스컬레이션하십시오. 행을 수동으로 편집하지 말고, 실행 ID와 함께 하위 이슈를 제출하십시오.
- 원격 실행 대상(샌드박스/SSH)의 경우, 손상된 JSONL은 원격에 있으며 어댑터는 정리 의도만 로깅합니다. 새 세션 ID를 사용하기 때문에 새 세션 재시도는 여전히 성공하며, 서버 측의 `clearSession: true`는 원격 디스크 상태와 무관하게 권위 있는 값입니다.

## 스킬 주입

어댑터는 Paperclip 스킬에 대한 심볼릭 링크가 포함된 임시 디렉터리를 생성하고 `--add-dir`을 통해 전달합니다. 이를 통해 에이전트의 작업 디렉터리를 오염시키지 않고 스킬을 검색 가능하게 합니다.

하트비트 실행 외부에서 로컬 CLI를 수동으로 사용하는 경우(예: `claudecoder`로 직접 실행), 다음을 사용하십시오.

```sh
pnpm paperclipai agent local-cli claudecoder --company-id <company-id>
```

이 명령은 `~/.claude/skills`에 Paperclip 스킬을 설치하고, 에이전트 API 키를 생성하며, 해당 에이전트로 실행하기 위한 셸 익스포트를 출력합니다.

## 환경 테스트

UI의 "Test Environment" 버튼을 사용하여 어댑터 설정을 검증합니다. 다음 항목을 확인합니다.

- Claude CLI가 설치되어 있고 접근 가능한지
- 작업 디렉터리가 절대 경로이고 사용 가능한지(허가된 경우 누락 시 자동 생성)
- API 키/인증 모드 힌트(`ANTHROPIC_API_KEY` vs 구독 로그인)
- CLI 준비 상태를 검증하기 위한 라이브 헬로 프로브(`claude --print - --output-format stream-json --verbose` 명령, 프롬프트: `Respond with hello.`)
