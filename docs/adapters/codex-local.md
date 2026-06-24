---
title: Codex Local
summary: OpenAI Codex 로컬 어댑터 설정 및 구성
---

`codex_local` 어댑터는 OpenAI의 Codex CLI를 로컬에서 실행합니다. `previous_response_id` 체이닝을 통한 세션 지속성과 글로벌 Codex 스킬 디렉터리를 통한 스킬 주입을 지원합니다.

## 사전 요구 사항

- Codex CLI가 설치되어 있어야 합니다(`codex` 명령 사용 가능).
- `OPENAI_API_KEY`가 환경 변수 또는 에이전트 설정에 설정되어 있어야 합니다.

## 설정 필드

| 필드 | 타입 | 필수 여부 | 설명 |
|-------|------|----------|-------------|
| `cwd` | string | Yes | 에이전트 프로세스의 작업 디렉터리(절대 경로; 권한이 허용될 경우 누락 시 자동 생성) |
| `model` | string | No | 사용할 모델 |
| `promptTemplate` | string | No | 모든 실행에 사용되는 프롬프트 |
| `env` | object | No | 환경 변수(시크릿 참조 지원) |
| `timeoutSec` | number | No | 프로세스 타임아웃(0 = 타임아웃 없음) |
| `graceSec` | number | No | 강제 종료 전 유예 기간 |
| `fastMode` | boolean | No | Codex 빠른 모드를 활성화합니다. 현재 `gpt-5.4`에서만 지원되며 크레딧 소모가 빠릅니다. |
| `dangerouslyBypassApprovalsAndSandbox` | boolean | No | 안전 검사를 건너뜁니다(개발 전용). |

## 세션 지속성

Codex는 세션 연속성을 위해 `previous_response_id`를 사용합니다. 어댑터는 하트비트 간에 이를 직렬화하고 복원하여 에이전트가 대화 컨텍스트를 유지할 수 있게 합니다.

## 스킬 주입

어댑터는 Paperclip 스킬을 글로벌 Codex 스킬 디렉터리(`~/.codex/skills`)에 심볼릭 링크합니다. 기존 사용자 스킬은 덮어쓰지 않습니다.

## 빠른 모드

`fastMode`가 활성화되면 Paperclip은 다음과 동일한 Codex 설정 재정의를 추가합니다.

```sh
-c 'service_tier="fast"' -c 'features.fast_mode=true'
```

Paperclip은 현재 선택된 모델이 `gpt-5.4`일 때만 이를 적용합니다. 다른 모델에서는 토글이 설정에 유지되지만 지원되지 않는 실행을 방지하기 위해 실행 시 무시됩니다.

## 관리형 `CODEX_HOME`

Paperclip이 관리형 워크트리 인스턴스 내에서 실행 중인 경우(`PAPERCLIP_IN_WORKTREE=true`), 어댑터는 대신 Paperclip 인스턴스 아래에 워크트리 격리된 `CODEX_HOME`을 사용하여 Codex 스킬, 세션, 로그 및 기타 런타임 상태가 체크아웃 간에 누출되지 않도록 합니다. 공유 인증/설정 연속성을 위해 사용자의 메인 Codex 홈에서 해당 격리된 홈을 시드합니다.

### 에이전트별 격리 및 인증 시딩

`codex_local` 에이전트의 경우, 서버 격리 가드는 각 에이전트를 에이전트별 홈(`<instance>/companies/<companyId>/agents/<agentId>/codex-home`)에 고정하고 `OPENAI_API_KEY=""`를 설정하여 에이전트가 호스트 API 키에 대해 지출하거나 다른 에이전트의 Codex 상태를 공유할 수 없도록 합니다.

관리형 홈은 비어 있는 상태로 생성되므로, 어댑터는 Codex를 시작하기 전에 인증을 프로비저닝해야 합니다 — 그렇지 않으면 에이전트가 자격 증명 없이 실행되고 프로바이더가 `401 Missing bearer`를 반환합니다. 시딩 계약:

- **관리형 홈**(기본 홈 및 회사 트리 아래에 구성된 모든 `CODEX_HOME`)은 항상 시드됩니다. ChatGPT 구독 `auth.json`이 호스트 Codex 홈에서 심볼릭 링크되거나, 에이전트별 `OPENAI_API_KEY`가 구성된 경우 API 키 `auth.json`이 대신 작성됩니다.
- **진정한 외부 재정의**(Paperclip 관리 회사 트리 외부의 `CODEX_HOME`)는 자체 관리로 처리되며 시드하거나 덮어쓰지 않습니다.
- **빠른 실패 가드:** 관리형 홈에 사용 가능한 `auth.json`이 없고 API 키도 구성되지 않은 경우, 인증되지 않은 요청을 보내는 대신 명시적인 `adapter_failed`("관리형 홈에 Codex 자격 증명이 프로비저닝되지 않음 …")로 실행이 실패합니다.

## 수동 로컬 CLI

하트비트 실행 외부에서 로컬 CLI를 수동으로 사용하는 경우(예: `codexcoder`로 직접 실행), 다음을 사용하십시오.

```sh
pnpm paperclipai agent local-cli codexcoder --company-id <company-id>
```

이 명령은 누락된 스킬을 설치하고, 에이전트 API 키를 생성하며, 해당 에이전트로 실행하기 위한 셸 익스포트를 출력합니다.

## 지침 해석

`instructionsFilePath`가 구성된 경우, Paperclip은 해당 파일을 읽고 모든 실행에서 `codex exec`에 전송되는 stdin 프롬프트 앞에 추가합니다.

이는 Codex 자체가 실행 `cwd`에서 수행하는 워크스페이스 수준 지침 검색과는 별개입니다. Paperclip은 Codex 네이티브 저장소 지침 파일을 비활성화하지 않으므로, 저장소 로컬 `AGENTS.md`가 Paperclip 관리 에이전트 지침에 추가하여 Codex에 의해 로드될 수 있습니다.

## 환경 테스트

환경 테스트는 다음을 확인합니다.

- Codex CLI가 설치되어 있고 접근 가능한지
- 작업 디렉터리가 절대 경로이고 사용 가능한지(허가된 경우 누락 시 자동 생성)
- 인증 신호(`OPENAI_API_KEY` 존재 여부)
- CLI가 실제로 실행 가능한지 검증하기 위한 라이브 헬로 프로브(`codex exec --json -` 명령, 프롬프트: `Respond with hello.`)
