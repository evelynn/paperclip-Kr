---
title: 어댑터 개요
summary: 어댑터란 무엇이며 에이전트를 Paperclip에 연결하는 방법
---

어댑터는 Paperclip의 오케스트레이션 레이어와 에이전트 런타임 사이의 다리 역할을 합니다. 각 어댑터는 특정 유형의 AI 에이전트를 어떻게 호출하고 결과를 캡처하는지 알고 있습니다.

## 어댑터 동작 방식

하트비트가 발생하면 Paperclip은 다음을 수행합니다.

1. 에이전트의 `adapterType`과 `adapterConfig`를 조회합니다.
2. 실행 컨텍스트와 함께 어댑터의 `execute()` 함수를 호출합니다.
3. 어댑터가 에이전트 런타임을 생성하거나 호출합니다.
4. 어댑터가 stdout를 캡처하고, 사용량/비용 데이터를 파싱하여 구조화된 결과를 반환합니다.

## 내장 어댑터

| 어댑터 | 타입 키 | 설명 |
|---------|----------|-------------|
| [Claude Local](/adapters/claude-local) | `claude_local` | Claude Code CLI를 로컬에서 실행합니다. |
| [Codex Local](/adapters/codex-local) | `codex_local` | OpenAI Codex CLI를 로컬에서 실행합니다. |
| [Gemini Local](/adapters/gemini-local) | `gemini_local` | Gemini CLI를 로컬에서 실행합니다(실험적 — 어댑터 패키지는 존재하지만 아직 안정적인 타입 열거형에 포함되지 않음). |
| OpenCode Local | `opencode_local` | OpenCode CLI를 로컬에서 실행합니다(다중 프로바이더 `provider/model`). |
| Cursor | `cursor` | 백그라운드 모드에서 Cursor를 실행합니다. |
| Pi Local | `pi_local` | Pi 에이전트를 로컬에서 내장 실행합니다. |
| Hermes Local | `hermes_local` | Hermes CLI를 로컬에서 실행합니다(`hermes-paperclip-adapter`). |
| OpenClaw Gateway | `openclaw_gateway` | OpenClaw 게이트웨이 엔드포인트에 연결합니다. |
| [Process](/adapters/process) | `process` | 임의의 셸 명령을 실행합니다. |
| [HTTP](/adapters/http) | `http` | 외부 에이전트에 웹훅을 전송합니다. |

### 외부(플러그인) 어댑터

이 어댑터들은 독립형 npm 패키지로 제공되며 플러그인 시스템을 통해 설치됩니다.

| 어댑터 | 패키지 | 타입 키 | 설명 |
|---------|---------|----------|-------------|
| Droid Local | `@henkey/droid-paperclip-adapter` | `droid_local` | Factory Droid를 로컬에서 실행합니다. |

## 외부 어댑터

Paperclip의 소스 코드를 수정하지 않고도 독립형 패키지로 어댑터를 만들고 배포할 수 있습니다. 외부 어댑터는 플러그인 시스템을 통해 시작 시 로드됩니다.

```sh
# API를 통해 npm에서 설치
curl -X POST http://localhost:3102/api/adapters \
  -d '{"packageName": "my-paperclip-adapter"}'

# 또는 로컬 디렉터리에서 링크
curl -X POST http://localhost:3102/api/adapters \
  -d '{"localPath": "/home/user/my-adapter"}'
```

전체 가이드는 [외부 어댑터](/adapters/external-adapters)를 참조하십시오.

## 어댑터 아키텍처

각 어댑터는 세 개의 레지스트리에서 사용하는 모듈을 가진 패키지입니다.

```
my-adapter/
  src/
    index.ts            # 공유 메타데이터 (type, label, models)
    server/
      execute.ts        # 핵심 실행 로직
      parse.ts          # 출력 파싱
      test.ts           # 환경 진단
    ui-parser.ts        # 독립형 UI 트랜스크립트 파서 (외부 어댑터용)
    cli/
      format-event.ts   # `paperclipai run --watch`용 터미널 출력
```

| 레지스트리 | 역할 | 소스 |
|----------|-------------|--------|
| **서버** | 에이전트 실행 및 결과 캡처 | 패키지 루트의 `createServerAdapter()` |
| **UI** | 실행 트랜스크립트 렌더링, 설정 양식 제공 | `ui-parser.js`(동적) 또는 정적 임포트(내장) |
| **CLI** | 라이브 감시용 터미널 출력 포맷 | 정적 임포트 |

## 어댑터 선택 기준

- **코딩 에이전트가 필요한 경우:** `claude_local`, `codex_local`, `opencode_local`, `hermes_local`을 사용하거나 `droid_local`을 외부 플러그인으로 설치하십시오.
- **스크립트나 명령을 실행해야 하는 경우:** `process`를 사용하십시오.
- **외부 서비스를 호출해야 하는 경우:** `http`를 사용하십시오.
- **커스텀이 필요한 경우:** [직접 어댑터를 만들거나](/adapters/creating-an-adapter) [외부 어댑터 플러그인을 빌드](/adapters/external-adapters)하십시오.

## UI 파서 계약

외부 어댑터는 Paperclip 웹 UI가 stdout를 렌더링하는 방법을 알려주는 독립형 UI 파서를 제공할 수 있습니다. 이것이 없으면 UI는 일반 셸 파서를 사용합니다. 자세한 내용은 [UI 파서 계약](/adapters/adapter-ui-parser)을 참조하십시오.
