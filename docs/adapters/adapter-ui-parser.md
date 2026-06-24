---
title: 어댑터 UI 파서 계약
summary: Paperclip UI가 어댑터 출력을 올바르게 렌더링하도록 커스텀 실행 로그 파서를 제공합니다.
---

Paperclip이 에이전트를 실행할 때 stdout은 실시간으로 UI에 스트리밍됩니다. UI는 원시 stdout 줄을 구조화된 트랜스크립트 항목(도구 호출, 도구 결과, 어시스턴트 메시지, 시스템 이벤트)으로 변환하는 **파서**가 필요합니다. 커스텀 파서가 없으면 UI는 시스템 줄이 아닌 모든 줄을 `assistant` 출력으로 처리하는 일반 셸 파서로 폴백됩니다 — 도구 명령이 일반 텍스트로 누출되고, 지속 시간이 손실되며, 오류가 보이지 않게 됩니다.

## 문제

대부분의 에이전트 CLI는 도구 호출, 진행 표시기, 여러 줄 출력을 포함한 구조화된 stdout를 출력합니다. 예를 들어:

```
[hermes] Session resumed: abc123
┊ 💬 Thinking about how to approach this...
┊ $ ls /home/user/project
┊ [done] $ ls /home/user/project — /src /README.md  0.3s
┊ 💬 I see the project structure. Let me read the README.
┊ read /home/user/project/README.md
┊ [done] read — Project Overview: A CLI tool for...  1.2s
The project is a CLI tool. Here's what I found:
- It uses TypeScript
- Tests are in /tests
```

파서가 없으면 UI는 이 모든 것을 원시 `assistant` 텍스트로 표시합니다 — 도구 호출과 결과가 에이전트의 실제 응답과 구별되지 않습니다.

파서가 있으면 UI는 다음과 같이 렌더링합니다.

- `Thinking about how to approach this...`를 접을 수 있는 생각 블록으로
- `$ ls /home/user/project`를 도구 호출 카드로(접힌 상태)
- `0.3s` 지속 시간을 도구 결과 카드로
- `The project is a CLI tool...`을 어시스턴트의 응답으로

## 동작 방식

```
┌──────────────────┐     package.json        ┌──────────────────┐
│  Adapter Package  │─── exports["./ui-parser"] ──→│  dist/ui-parser.js │
│  (npm / local)    │                          │  (zero imports)  │
└──────────────────┘                          └────────┬─────────┘
                                                       │ plugin-loader reads at startup
                                                       ▼
┌──────────────────┐   GET /api/:type/ui-parser.js   ┌──────────────────┐
│  Paperclip Server  │◄────────────────────────────────│  uiParserCache    │
│  (in-memory)      │                                 └──────────────────┘
└────────┬─────────┘
         │ serves JS to browser
         ▼
┌──────────────────┐   fetch() + eval   ┌──────────────────┐
│  Paperclip UI     │─────────────────────→│  parseStdoutLine │
│  (dynamic loader) │   registers parser  │  (per-adapter)   │
└──────────────────┘                     └──────────────────┘
```

1. **빌드 타임** — `src/ui-parser.ts`를 `dist/ui-parser.js`로 컴파일합니다(런타임 임포트 없음).
2. **서버 시작** — 플러그인 로더가 파일을 읽고 메모리에 캐시합니다.
3. **UI 로드** — 사용자가 실행을 열면 UI가 `GET /api/:type/ui-parser.js`에서 파서를 가져옵니다.
4. **런타임** — 가져온 모듈이 eval되어 등록됩니다. 이후의 모든 줄은 실제 파서를 사용합니다.

## 계약: package.json

### 1. `paperclip.adapterUiParser` — 계약 버전

```json
{
  "paperclip": {
    "adapterUiParser": "1.0.0"
  }
}
```

Paperclip 호스트가 이 필드를 확인합니다. 메이저 버전이 지원되지 않으면 호스트는 경고를 기록하고 잠재적으로 호환되지 않는 코드를 실행하는 대신 일반 파서로 폴백합니다.

| 호스트 예상 | 어댑터 선언 | 결과 |
|---|---|---|
| `1.x` | `1.0.0` | 파서 로드됨 |
| `1.x` | `2.0.0` | 경고 기록됨, 일반 파서 사용 |
| `1.x` | (없음) | 파서 로드됨 (유예 기간 — 향후 버전에서 필수화될 수 있음) |

### 2. `exports["./ui-parser"]` — 파일 경로

```json
{
  "exports": {
    ".": "./dist/server/index.js",
    "./ui-parser": "./dist/ui-parser.js"
  }
}
```

## 계약: 모듈 익스포트

`dist/ui-parser.js`는 다음 중 **하나 이상**을 익스포트해야 합니다.

### `parseStdoutLine(line: string, ts: string): TranscriptEntry[]`

정적 파서. 어댑터 stdout의 각 줄에 대해 호출됩니다.

```ts
export function parseStdoutLine(line: string, ts: string): TranscriptEntry[] {
  if (line.startsWith("[my-agent]")) {
    return [{ kind: "system", ts, text: line }];
  }
  return [{ kind: "assistant", ts, text: line }];
}
```

### `createStdoutParser(): { parseLine(line, ts): TranscriptEntry[]; reset(): void }`

상태 유지 파서 팩토리. 파서가 여러 줄 연속, 명령 중첩, 또는 기타 교차 호출 상태를 추적해야 하는 경우 선호됩니다.

```ts
let counter = 0;

export function createStdoutParser() {
  let suppressContinuation = false;

  function parseLine(line: string, ts: string): TranscriptEntry[] {
    const trimmed = line.trim();
    if (!trimmed) return [];

    if (suppressContinuation) {
      if (/^[\d.]+s$/.test(trimmed)) {
        suppressContinuation = false;
        return [];
      }
      return []; // 연속 줄 삼킴
    }

    if (trimmed.startsWith("[tool-done]")) {
      const id = `tool-${++counter}`;
      suppressContinuation = true;
      return [
        { kind: "tool_call", ts, name: "shell", input: {}, toolUseId: id },
        { kind: "tool_result", ts, toolUseId: id, content: trimmed, isError: false },
      ];
    }

    return [{ kind: "assistant", ts, text: trimmed }];
  }

  function reset() {
    suppressContinuation = false;
  }

  return { parseLine, reset };
}
```

두 가지 모두 익스포트된 경우, `createStdoutParser`가 우선합니다.

## 계약: TranscriptEntry

각 항목은 다음 차별화 유니온 형태 중 하나와 일치해야 합니다.

```ts
// 어시스턴트 메시지
{ kind: "assistant"; ts: string; text: string; delta?: boolean }

// 생각 / 추론
{ kind: "thinking"; ts: string; text: string; delta?: boolean }

// 사용자 메시지 (드묾 — 주로 에이전트가 시작한 프롬프트에서)
{ kind: "user"; ts: string; text: string }

// 도구 호출
{ kind: "tool_call"; ts: string; name: string; input: unknown; toolUseId?: string }

// 도구 결과
{ kind: "tool_result"; ts: string; toolUseId: string; content: string; isError: boolean }

// 시스템 / 어댑터 메시지
{ kind: "system"; ts: string; text: string }

// Stderr / 오류
{ kind: "stderr"; ts: string; text: string }

// 원시 stdout (폴백)
{ kind: "stdout"; ts: string; text: string }
```

### 도구 호출과 결과 연결

`toolUseId`를 사용하여 `tool_call`과 `tool_result` 항목을 연결합니다. UI는 이를 접을 수 있는 카드로 렌더링합니다.

```ts
const id = `my-tool-${++counter}`;
return [
  { kind: "tool_call", ts, name: "read", input: { path: "/src/main.ts" }, toolUseId: id },
  { kind: "tool_result", ts, toolUseId: id, content: "const main = () => {...}", isError: false },
];
```

### 오류 처리

도구 결과에 `isError: true`를 설정하여 빨간색 표시기를 표시합니다.

```ts
{ kind: "tool_result", ts, toolUseId: id, content: "ENOENT: no such file", isError: true }
```

## 제약 사항

1. **런타임 임포트 없음.** 파일은 브라우저에서 `URL.createObjectURL` + 동적 `import()`를 통해 로드됩니다. `import`, `require`, 최상위 `await` 없음.

2. **DOM / Node.js API 없음.** 브라우저 샌드박스에서 실행됩니다. 바닐라 JS(ES2020+)만 사용하십시오.

3. **부작용 없음.** 모듈 수준 코드는 전역 변수를 수정하거나, `window`에 접근하거나, I/O를 수행해서는 안 됩니다. 함수만 선언하고 익스포트하십시오.

4. **결정론적.** 동일한 `(line, ts)` 입력에 대해 동일한 출력이 생성되어야 합니다. 이는 로그 재생에 중요합니다.

5. **오류 내성.** 절대 throw하지 마십시오. 파싱할 수 없는 줄에 대해서는 트랜스크립트를 충돌시키지 말고 `[{ kind: "stdout", ts, text: line }]`을 반환하십시오.

6. **파일 크기.** 50KB 미만으로 유지하십시오. 이는 요청마다 제공되고 브라우저에서 eval됩니다.

## 생명주기

| 이벤트 | 발생하는 일 |
|---|---|
| 서버 시작 | 플러그인 로더가 `exports["./ui-parser"]`를 읽고, 파일을 읽어 메모리에 캐시합니다. |
| UI가 실행을 엶 | `getUIAdapter(type)`가 호출됩니다. 내장 파서가 없으면 비동기 `fetch(/api/:type/ui-parser.js)`를 시작합니다. |
| 첫 번째 줄 도착 | 일반 프로세스 파서가 즉시 처리합니다(차단 없음). 동적 파서는 백그라운드에서 로드됩니다. |
| 파서 로드됨 | `registerUIAdapter()`가 호출됩니다. 이후의 모든 줄 파싱은 실제 파서를 사용합니다. |
| 파서 실패(404, eval 오류) | 경고가 콘솔에 기록됩니다. 일반 파서가 계속됩니다. 실패한 타입이 캐시됨 — 재시도 없음. |
| 서버 재시작 | 인메모리 캐시가 어댑터 패키지에서 다시 채워집니다. |

## 오류 동작

| 실패 | 발생하는 일 |
|---|---|
| 모듈 구문 오류(임포트 실패) | 캐치되어 기록됨, 일반 파서로 폴백. 재시도 없음. |
| 잘못된 형태 반환 | 필수 필드가 누락된 개별 항목은 트랜스크립트 빌더에 의해 자동으로 무시됩니다. |
| 런타임에서 throw | 줄별로 캐치됩니다. 해당 줄은 일반으로 폴백됩니다. 파서는 이후 줄을 위해 등록된 상태를 유지합니다. |
| 404(ui-parser 익스포트 없음) | 타입이 실패 로드 집합에 추가됩니다. 첫 호출 이후부터 일반 파서 사용. |
| 계약 버전 불일치 | 서버가 경고를 기록하고 로딩을 건너뜁니다. 일반 파서 사용. |

## 빌드

```sh
# TypeScript를 JavaScript로 컴파일
tsc src/ui-parser.ts --outDir dist --target ES2020 --module ES2020 --declaration false
```

`tsconfig.json`이 이를 자동으로 처리할 수 있습니다 — `ui-parser.ts`가 빌드에 포함되어 `dist/ui-parser.js`로 출력되는지 확인하십시오.

## 테스트

샘플 stdout에 대해 파서를 로컬에서 테스트합니다.

```ts
// test-parser.ts
import { createStdoutParser } from "./dist/ui-parser.js";

const parser = createStdoutParser();
const sampleLines = [
  "[my-agent] Starting session abc123",
  "Thinking about the task...",
  "$ ls /home/user/project",
  "[done] $ ls — /src /README.md  0.3s",
  "I'll read the README now.",
  "Error: file not found",
];

for (const line of sampleLines) {
  const entries = parser.parseLine(line, new Date().toISOString());
  for (const entry of entries) {
    console.log(`  ${entry.kind}:`, entry.text ?? entry.name ?? entry.content);
  }
}
```

실행 방법: `npx tsx test-parser.ts`

## UI 파서 건너뛰기

어댑터의 stdout이 단순한 경우(도구 마커 없음, 특수 포맷 없음), UI 파서를 완전히 건너뛸 수 있습니다. 일반 `process` 파서가 처리합니다 — 시스템 줄이 아닌 모든 줄이 `assistant` 출력이 됩니다. 다음의 경우에 적합합니다.

- 일반 텍스트 응답을 출력하는 에이전트
- 단순히 결과를 출력하는 커스텀 스크립트
- 구조화된 출력이 없는 단순한 CLI

건너뛰려면 `package.json`에 `exports["./ui-parser"]`를 포함하지 않으면 됩니다.

## 다음 단계

- [외부 어댑터](/adapters/external-adapters) — 어댑터 패키지 구축 전체 가이드
- [어댑터 만들기](/adapters/creating-an-adapter) — 어댑터 내부 구조 및 내장 통합
