---
title: 외부 어댑터
summary: Paperclip 소스를 수정하지 않고 어댑터를 플러그인으로 빌드, 패키징, 배포합니다.
---

Paperclip은 npm 패키지나 로컬 디렉터리에서 설치할 수 있는 외부 어댑터 플러그인을 지원합니다. 외부 어댑터는 내장 어댑터와 동일하게 작동합니다 — 에이전트를 실행하고, 출력을 파싱하며, 트랜스크립트를 렌더링합니다 — 하지만 자체 패키지에 존재하며 Paperclip의 소스 코드 변경이 필요 없습니다.

## 내장 vs 외부

| | 내장 | 외부 |
|---|---|---|
| 소스 위치 | `paperclip-fork/packages/adapters/` 내부 | 별도의 npm 패키지 또는 로컬 디렉터리 |
| 등록 | 세 개의 레지스트리에 하드코딩 | 플러그인 시스템을 통해 시작 시 로드 |
| UI 파서 | 빌드 타임에 정적 임포트 | API에서 동적 로드([UI 파서](/adapters/adapter-ui-parser) 참조) |
| 배포 | Paperclip과 함께 제공 | npm에 배포하거나 `file:`로 링크 |
| 업데이트 | Paperclip 릴리스 필요 | 독립적인 버전 관리 |

## 빠른 시작

### 최소 패키지 구조

```
my-adapter/
  package.json
  tsconfig.json
  src/
    index.ts            # 공유 메타데이터 (type, label, models)
    server/
      index.ts          # createServerAdapter() 팩토리
      execute.ts        # 핵심 실행 로직
      parse.ts          # 출력 파싱
      test.ts           # 환경 진단
    ui-parser.ts        # 독립형 UI 트랜스크립트 파서
```

### package.json

```json
{
  "name": "my-paperclip-adapter",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "paperclip": {
    "adapterUiParser": "1.0.0"
  },
  "exports": {
    ".": "./dist/index.js",
    "./server": "./dist/server/index.js",
    "./ui-parser": "./dist/ui-parser.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@paperclipai/adapter-utils": "^2026.325.0",
    "picocolors": "^1.1.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0"
  }
}
```

주요 필드:

| 필드 | 목적 |
|-------|---------|
| `exports["."]` | 진입점 — `createServerAdapter`를 익스포트해야 합니다. |
| `exports["./ui-parser"]` | 독립형 UI 파서 모듈(선택 사항이나 권장됨) |
| `paperclip.adapterUiParser` | UI 파서의 계약 버전(`"1.0.0"`) |
| `files` | 배포 대상 제한 — `dist/`만 해당 |

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

## 서버 모듈

플러그인 로더는 패키지 루트에서 `createServerAdapter()`를 호출합니다. 이 함수는 `ServerAdapterModule`을 반환해야 합니다.

### src/index.ts

```ts
export const type = "my_adapter";     // snake_case, 전역적으로 고유
export const label = "My Agent (local)";

export const models = [
  { id: "model-a", label: "Model A" },
];

export const agentConfigurationDoc = `# my_adapter configuration
Use when: ...
Don't use when: ...
`;

// 플러그인 로더 규약에 필수
export { createServerAdapter } from "./server/index.js";
```

### src/server/index.ts

```ts
import type { ServerAdapterModule } from "@paperclipai/adapter-utils";
import { type, models, agentConfigurationDoc } from "../index.js";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";

export function createServerAdapter(): ServerAdapterModule {
  return {
    type,
    execute,
    testEnvironment,
    models,
    agentConfigurationDoc,
  };
}
```

### src/server/execute.ts

핵심 실행 함수입니다. `AdapterExecutionContext`를 받아 `AdapterExecutionResult`를 반환합니다.

```ts
import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
} from "@paperclipai/adapter-utils";

import {
  runChildProcess,
  buildPaperclipEnv,
  renderTemplate,
} from "@paperclipai/adapter-utils/server-utils";

export async function execute(
  ctx: AdapterExecutionContext,
): Promise<AdapterExecutionResult> {
  const { config, agent, runtime, context, onLog, onMeta } = ctx;

  // 1. 안전한 헬퍼로 설정 읽기
  const cwd = String(config.cwd ?? "/tmp");
  const command = String(config.command ?? "my-agent");
  const timeoutSec = Number(config.timeoutSec ?? 300);

  // 2. Paperclip 변수를 주입하여 환경 구성
  const env = buildPaperclipEnv(agent);

  // 3. 프롬프트 템플릿 렌더링
  const prompt = config.promptTemplate
    ? renderTemplate(String(config.promptTemplate), {
        agentId: agent.id,
        agentName: agent.name,
        companyId: agent.companyId,
        runId: ctx.runId,
        taskId: context.taskId ?? "",
        taskTitle: context.taskTitle ?? "",
      })
    : "Continue your work.";

  // 4. 프로세스 생성
  const result = await runChildProcess(command, {
    args: [prompt],
    cwd,
    env,
    timeout: timeoutSec * 1000,
    graceMs: 10_000,
    onStdout: (chunk) => onLog("stdout", chunk),
    onStderr: (chunk) => onLog("stderr", chunk),
  });

  // 5. 구조화된 결과 반환
  return {
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    // 지속성을 위한 세션 상태 포함
    sessionParams: { /* ... */ },
  };
}
```

#### `@paperclipai/adapter-utils`의 사용 가능한 헬퍼

| 헬퍼 | 목적 |
|--------|---------|
| `runChildProcess(command, opts)` | 타임아웃, 유예 기간, 스트리밍 콜백과 함께 자식 프로세스 생성 |
| `buildPaperclipEnv(agent)` | `PAPERCLIP_*` 환경 변수 주입 |
| `renderTemplate(template, data)` | 프롬프트 템플릿의 `{{variable}}` 치환 |
| `asString(v)`, `asNumber(v)`, `asBoolean(v)` | 안전한 설정 값 추출 |

### src/server/test.ts

실행 전에 어댑터 설정을 검증합니다. 구조화된 진단을 반환합니다.

```ts
import type {
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@paperclipai/adapter-utils";

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks = [];

  // 예시: CLI가 설치되어 있는지 확인
  checks.push({
    level: "info",
    message: "My Agent CLI v1.2.0 detected",
    code: "cli_detected",
  });

  // 예시: 작업 디렉터리 확인
  const cwd = String(ctx.config.cwd ?? "");
  if (!cwd.startsWith("/")) {
    checks.push({
      level: "error",
      message: `Working directory must be absolute: "${cwd}"`,
      hint: "Use /home/user/project or /workspace",
      code: "invalid_cwd",
    });
  }

  return {
    adapterType: ctx.adapterType,
    status: checks.some(c => c.level === "error") ? "fail" : "pass",
    checks,
    testedAt: new Date().toISOString(),
  };
}
```

확인 레벨:

| 레벨 | 의미 | 효과 |
|-------|---------|--------|
| `info` | 정보 제공 | 테스트 결과에 표시됩니다. |
| `warn` | 비차단 이슈 | 노란색 표시기와 함께 표시됩니다. |
| `error` | 실행 차단 | 에이전트 실행을 막습니다. |

## 설치

### npm에서

```sh
# Paperclip UI를 통해
# 설정 → 어댑터 → npm에서 설치 → "my-paperclip-adapter"

# 또는 API를 통해
curl -X POST http://localhost:3102/api/adapters \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"packageName": "my-paperclip-adapter"}'
```

### 로컬 디렉터리에서

```sh
curl -X POST http://localhost:3102/api/adapters \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"localPath": "/home/user/my-adapter"}'
```

로컬 어댑터는 Paperclip의 어댑터 디렉터리에 심볼릭 링크됩니다. 소스 변경은 서버 재시작 시 반영됩니다.

### adapter-plugins.json을 통해

개발 시에는 `~/.paperclip/adapter-plugins.json`을 직접 편집할 수도 있습니다.

```json
[
  {
    "packageName": "my-paperclip-adapter",
    "localPath": "/home/user/my-adapter",
    "type": "my_adapter",
    "installedAt": "2026-03-30T12:00:00.000Z"
  }
]
```

## 선택 사항: 세션 지속성

에이전트 런타임이 세션(하트비트 간 대화 연속성)을 지원하는 경우, 세션 코덱을 구현합니다.

```ts
import type { AdapterSessionCodec } from "@paperclipai/adapter-utils";

export const sessionCodec: AdapterSessionCodec = {
  deserialize(raw) {
    if (typeof raw !== "object" || raw === null) return null;
    const r = raw as Record<string, unknown>;
    return r.sessionId ? { sessionId: String(r.sessionId) } : null;
  },
  serialize(params) {
    return params?.sessionId ? { sessionId: String(params.sessionId) } : null;
  },
  getDisplayId(params) {
    return params?.sessionId ? String(params.sessionId) : null;
  },
};
```

`createServerAdapter()`에 포함합니다.

```ts
return { type, execute, testEnvironment, sessionCodec, /* ... */ };
```

## 선택 사항: 스킬 동기화

에이전트 런타임이 스킬/플러그인을 지원하는 경우, `listSkills`와 `syncSkills`를 구현합니다.

```ts
return {
  type,
  execute,
  testEnvironment,
  async listSkills(ctx) {
    return {
      adapterType: ctx.adapterType,
      supported: true,
      mode: "ephemeral",
      desiredSkills: [],
      entries: [],
      warnings: [],
    };
  },
  async syncSkills(ctx, desiredSkills) {
    // 원하는 스킬을 런타임에 설치
    return { /* listSkills와 동일한 형태 */ };
  },
};
```

## 선택 사항: 모델 감지

런타임에 기본 모델을 지정하는 로컬 설정 파일이 있는 경우:

```ts
async function detectModel() {
  // ~/.my-agent/config.yaml 또는 유사한 파일 읽기
  return {
    model: "anthropic/claude-sonnet-4",
    provider: "anthropic",
    source: "~/.my-agent/config.yaml",
    candidates: ["anthropic/claude-sonnet-4", "openai/gpt-4o"],
  };
}

return { type, execute, testEnvironment, detectModel: () => detectModel() };
```

## 배포

```sh
npm run build
npm publish
```

다른 Paperclip 사용자들이 UI나 API에서 패키지 이름으로 어댑터를 설치할 수 있습니다.

## 보안

- 에이전트 출력을 신뢰할 수 없는 것으로 취급하십시오 — 방어적으로 파싱하고, 절대 에이전트 출력을 `eval()`하지 마십시오.
- 시크릿을 환경 변수를 통해 주입하고, 프롬프트에 넣지 마십시오.
- 런타임이 지원하는 경우 네트워크 접근 제어를 설정하십시오.
- 항상 타임아웃과 유예 기간을 적용하십시오 — 에이전트가 무한히 실행되도록 두지 마십시오.
- UI 파서 모듈은 브라우저 샌드박스에서 실행됩니다 — 런타임 임포트 없음, 부작용 없음이어야 합니다.

## 다음 단계

- [UI 파서 계약](/adapters/adapter-ui-parser) — UI가 어댑터 출력을 올바르게 렌더링하도록 커스텀 실행 로그 파서 추가
- [어댑터 만들기](/adapters/creating-an-adapter) — 어댑터 내부 구조 전체 설명
- [에이전트 동작 방식](/guides/agent-developer/how-agents-work) — 어댑터가 서비스하는 하트비트 생명주기 이해
