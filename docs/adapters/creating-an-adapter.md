---
title: 어댑터 만들기
summary: 커스텀 어댑터 구축 가이드
---

Paperclip을 어떤 에이전트 런타임에도 연결하는 커스텀 어댑터를 만듭니다.

<Tip>
Claude Code를 사용 중이라면, `.agents/skills/create-agent-adapter` 스킬이 전체 어댑터 만들기 과정을 인터랙티브하게 안내합니다. Claude에게 새 어댑터를 만들어 달라고 요청하면 각 단계를 차례로 안내해 줍니다.
</Tip>

## 두 가지 방법

| | 내장 | 외부 플러그인 |
|---|---|---|
| 소스 | `paperclip-fork` 내부 | 별도의 npm 패키지 |
| 배포 | Paperclip과 함께 제공 | 독립적인 npm 배포 |
| UI 파서 | 정적 임포트 | API에서 동적 로드 |
| 등록 | 3개의 레지스트리 편집 | 시작 시 자동 로드 |
| 적합한 용도 | 핵심 어댑터, 기여자 | 서드파티 어댑터, 내부 도구 |

대부분의 경우 **외부 어댑터 플러그인을 빌드**하는 것이 좋습니다. 더 깔끔하고, 독립적으로 버전이 관리되며, Paperclip의 소스를 수정할 필요가 없습니다. 전체 가이드는 [외부 어댑터](/adapters/external-adapters)를 참조하십시오.

이 페이지의 나머지 부분은 두 방법 모두에서 사용하는 공유 내부 구조를 설명합니다.

## 패키지 구조

```
packages/adapters/<name>/    # 내장
  ── or ──
my-adapter/                   # 외부 플러그인
  package.json
  tsconfig.json
  src/
    index.ts            # 공유 메타데이터
    server/
      index.ts          # 서버 익스포트 (createServerAdapter)
      execute.ts        # 핵심 실행 로직
      parse.ts          # 출력 파싱
      test.ts           # 환경 진단
    ui/
      index.ts          # UI 익스포트 (내장 전용)
      parse-stdout.ts   # 트랜스크립트 파서 (내장 전용)
      build-config.ts   # 설정 빌더
    ui-parser.ts        # 독립형 UI 파서 (외부 — [UI 파서 계약](/adapters/adapter-ui-parser) 참조)
    cli/
      index.ts          # CLI 익스포트
      format-event.ts   # 터미널 포맷터
```

## 1단계: 루트 메타데이터

`src/index.ts`는 세 소비자 모두에서 임포트됩니다. 의존성이 없도록 유지하십시오.

```ts
export const type = "my_agent";        // snake_case, 전역적으로 고유
export const label = "My Agent (local)";
export const models = [
  { id: "model-a", label: "Model A" },
];
export const agentConfigurationDoc = `# my_agent configuration
Use when: ...
Don't use when: ...
Core fields: ...
`;

// 외부 어댑터에 필수 (플러그인 로더 규약)
export { createServerAdapter } from "./server/index.js";
```

## 2단계: 서버 실행

`src/server/execute.ts`가 핵심입니다. `AdapterExecutionContext`를 받아 `AdapterExecutionResult`를 반환합니다.

주요 책임:

1. `@paperclipai/adapter-utils/server-utils`의 안전한 헬퍼(`asString`, `asNumber` 등)를 사용하여 설정을 읽습니다.
2. `buildPaperclipEnv(agent)`와 컨텍스트 변수로 환경을 구성합니다.
3. `runtime.sessionParams`에서 세션 상태를 해석합니다.
4. `renderTemplate(template, data)`로 프롬프트를 렌더링합니다.
5. `runChildProcess()`로 프로세스를 생성하거나 `fetch()`로 호출합니다.
6. 사용량, 비용, 세션 상태, 오류를 파싱합니다.
7. 알 수 없는 세션 오류를 처리합니다(새로 재시도, `clearSession: true` 설정).

### 사용 가능한 헬퍼

| 헬퍼 | 소스 | 목적 |
|--------|--------|---------|
| `runChildProcess(cmd, opts)` | `@paperclipai/adapter-utils/server-utils` | 타임아웃, 유예 기간, 스트리밍과 함께 생성 |
| `buildPaperclipEnv(agent)` | `@paperclipai/adapter-utils/server-utils` | `PAPERCLIP_*` 환경 변수 주입 |
| `renderTemplate(tpl, data)` | `@paperclipai/adapter-utils/server-utils` | `{{variable}}` 치환 |
| `asString(v)` | `@paperclipai/adapter-utils` | 안전한 설정 값 추출 |
| `asNumber(v)` | `@paperclipai/adapter-utils` | 안전한 숫자 추출 |

### AdapterExecutionContext

```ts
interface AdapterExecutionContext {
  runId: string;
  agent: { id: string; companyId: string; name: string; adapterConfig: unknown };
  runtime: { sessionId: string | null; sessionParams: Record<string, unknown> | null };
  config: Record<string, unknown>;      // 에이전트의 adapterConfig
  context: Record<string, unknown>;      // 작업, 기상 이유 등
  onLog: (stream: "stdout" | "stderr", chunk: string) => Promise<void>;
  onMeta?: (meta: AdapterInvocationMeta) => Promise<void>;
  onSpawn?: (meta: { pid: number; startedAt: string }) => Promise<void>;
}
```

### AdapterExecutionResult

```ts
interface AdapterExecutionResult {
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  errorMessage?: string | null;
  usage?: { inputTokens: number; outputTokens: number };
  sessionParams?: Record<string, unknown> | null;  // 하트비트 간에 유지
  sessionDisplayId?: string | null;
  provider?: string | null;
  model?: string | null;
  costUsd?: number | null;
  clearSession?: boolean;  // 다음 기상 시 새 세션을 강제하려면 true로 설정
}
```

## 3단계: 환경 테스트

`src/server/test.ts`는 실행 전에 어댑터 설정을 검증합니다.

구조화된 진단을 반환합니다.

| 레벨 | 의미 | 효과 |
|-------|---------|--------|
| `error` | 유효하지 않거나 사용 불가한 설정 | 실행을 차단합니다. |
| `warn` | 비차단 이슈 | 노란색 표시기와 함께 표시됩니다. |
| `info` | 성공적인 확인 | 테스트 결과에 표시됩니다. |

```ts
export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  return {
    adapterType: ctx.adapterType,
    status: "pass",  // "pass" | "warn" | "fail"
    checks: [
      { level: "info", message: "CLI v1.2.0 detected", code: "cli_detected" },
      { level: "warn", message: "No API key found", hint: "Set ANTHROPIC_API_KEY", code: "no_key" },
    ],
    testedAt: new Date().toISOString(),
  };
}
```

## 4단계: UI 모듈 (내장 전용)

Paperclip의 소스에 등록된 내장 어댑터의 경우:

- `parse-stdout.ts` — stdout 줄을 실행 뷰어용 `TranscriptEntry[]`로 변환합니다.
- `build-config.ts` — 양식 값을 `adapterConfig` JSON으로 변환합니다.
- `ui/src/adapters/<name>/config-fields.tsx`의 설정 필드 React 컴포넌트

외부 어댑터의 경우, 대신 독립형 `ui-parser.ts`를 사용합니다. [UI 파서 계약](/adapters/adapter-ui-parser)을 참조하십시오.

## 5단계: CLI 모듈

`format-event.ts` — `picocolors`를 사용하여 `paperclipai run --watch`용 stdout를 보기 좋게 출력합니다.

```ts
export function formatStdoutEvent(line: string, debug: boolean): void {
  if (line.startsWith("[tool-done]")) {
    console.log(chalk.green(`  ✓ ${line}`));
  } else {
    console.log(`  ${line}`);
  }
}
```

## 6단계: 등록 (내장 전용)

어댑터를 세 개의 레지스트리 모두에 추가합니다.

1. `server/src/adapters/registry.ts`
2. `ui/src/adapters/registry.ts`
3. `cli/src/adapters/registry.ts`

외부 어댑터의 경우, 플러그인 로더가 자동으로 등록을 처리합니다.

## 세션 지속성

에이전트 런타임이 하트비트 간 대화 연속성을 지원하는 경우:

1. `execute()`에서 `sessionParams`를 반환합니다(예: `{ sessionId: "abc123" }`).
2. 다음 기상 시 `runtime.sessionParams`를 읽어 재개합니다.
3. 선택적으로 검증 및 표시를 위해 `sessionCodec`을 구현합니다.

```ts
export const sessionCodec: AdapterSessionCodec = {
  deserialize(raw) { /* 원시 세션 데이터 검증 */ },
  serialize(params) { /* 저장용 직렬화 */ },
  getDisplayId(params) { /* 사람이 읽을 수 있는 세션 레이블 */ },
};
```

## 기능 플래그

어댑터는 `ServerAdapterModule`의 선택적 필드를 설정하여 지원하는 "로컬" 기능을 선언할 수 있습니다. 서버와 UI는 이 플래그를 사용하여 어댑터를 사용하는 에이전트에 어떤 기능을 활성화할지 결정합니다(지침 번들 편집기, 스킬 동기화, JWT 인증 등).

| 플래그 | 타입 | 기본값 | 제어 대상 |
|------|------|---------|------------------|
| `supportsLocalAgentJwt` | `boolean` | `false` | 하트비트가 에이전트용 로컬 JWT를 생성하는지 여부 |
| `supportsInstructionsBundle` | `boolean` | `false` | 관리형 지침 번들(AGENTS.md) — 서버 측 해석 + UI 편집기 |
| `instructionsPathKey` | `string` | `"instructionsFilePath"` | 지침 파일 경로를 보유하는 `adapterConfig` 키 |
| `requiresMaterializedRuntimeSkills` | `boolean` | `false` | 실행 전에 런타임 스킬 항목을 디스크에 기록해야 하는지 여부 |

이 플래그들은 `GET /api/adapters`를 통해 `capabilities` 객체 내에 노출되며, `listSkills` 또는 `syncSkills`가 정의된 경우 참이 되는 파생된 `supportsSkills` 플래그도 함께 제공됩니다.

### 예시

```ts
export function createServerAdapter(): ServerAdapterModule {
  return {
    type: "my_k8s_adapter",
    execute: myExecute,
    testEnvironment: myTestEnvironment,
    listSkills: myListSkills,
    syncSkills: mySyncSkills,

    // 기능 플래그
    supportsLocalAgentJwt: true,
    supportsInstructionsBundle: true,
    instructionsPathKey: "instructionsFilePath",
    requiresMaterializedRuntimeSkills: true,
  };
}
```

이 플래그들이 설정되면, Paperclip UI는 이 어댑터를 사용하는 에이전트에 대해 지침 번들 편집기, 스킬 관리 탭, 작업 디렉터리 필드를 자동으로 표시합니다 — Paperclip 소스 변경이 필요 없습니다.

기능 플래그가 설정되지 않으면, 서버는 내장 어댑터 타입에 대한 레거시 하드코딩 목록으로 폴백합니다. 플래그를 생략한 외부 어댑터는 모든 기능에 대해 `false`로 기본 설정됩니다.

## 스킬 주입

에이전트의 작업 디렉터리에 쓰지 않고 Paperclip 스킬을 에이전트 런타임에서 검색 가능하게 만듭니다.

1. **최선: tmpdir + 플래그** — tmpdir을 만들고, 스킬을 심볼릭 링크하고, CLI 플래그로 전달하며, 완료 후 정리합니다.
2. **수용 가능: 전역 설정 디렉터리** — 런타임의 글로벌 플러그인 디렉터리에 심볼릭 링크합니다.
3. **수용 가능: 환경 변수** — 스킬 경로 환경 변수가 저장소의 `skills/` 디렉터리를 가리키도록 합니다.
4. **최후 수단: 프롬프트 주입** — 프롬프트 템플릿에 스킬 내용을 포함합니다.

## 실행 간 워크스페이스 지속성 (원격 git 없는 계약)

로컬 실행 워크스페이스 cwd가 실행 간 **유일한** 지속성 경계입니다. 어떤 어댑터도 실행 간 상태를 위해 git 원격에 의존해서는 안 됩니다.

지원되는 왕복 과정:

- **실행별, 원격 측에서.** `prepareWorkspaceForSshExecution`(`packages/adapter-utils/src/ssh.ts`에 있음)이 로컬 워크트리를 git 번들로 패키징하여 실행의 원격 디렉터리로 전송합니다. `git remote`는 어디에도 설정되지 않습니다. 번들이 전송 수단입니다.
- **실행 종료 시, 어댑터의 `finally` 블록에서.** 어댑터가 `restoreRemoteWorkspace`를 호출합니다(예: claude-local의 `execute.ts`). 이는 `restoreWorkspaceFromSshExecution` → `exportGitWorkspaceFromSsh` → `integrateImportedGitHead`를 호출합니다. 실행 중 원격에서 만들어진 커밋들이 `git push` 없이, 원격이 설정되지 않은 상태에서 로컬 Mac 워크트리로 돌아옵니다.

어댑터가 준수해야 하는 불변 조건:

- **절대 `git push` 금지.** 어댑터나 런타임 코드에서. 운영자가 제공한 설정이 선택할 수 있지만, 기본 계약은 원격 작업 없음입니다.
- **원격이 존재한다고 가정하지 마십시오.** 로컬 cwd가 실행 간 진실의 원천입니다.
- **복원 실패를 표면화하십시오.** 동기화 실패는 자동 실행 오류가 아닌 실행 수준 오류로 전파되어야 합니다. 하트비트는 `adapter.execute` 주변에 `workspace_finalize` 행(`succeeded`/`failed`)을 기록하여 종속 이슈들이 오래된 워크트리에서 기상하지 않도록 합니다.

불변 조건은 `packages/adapter-utils/src/ssh-fixture.test.ts`의 "no-remote-git contract" 케이스에 의해 고정됩니다. 이는 왕복 전후에 `git remote`가 비어 있고, 원격 전용 커밋도 복원만으로 로컬에 도달한다고 단언합니다.

## 보안

- 에이전트 출력을 신뢰할 수 없는 것으로 취급하십시오(방어적으로 파싱하고, 절대 실행하지 마십시오).
- 시크릿을 환경 변수를 통해 주입하고, 프롬프트에 넣지 마십시오.
- 런타임이 지원하는 경우 네트워크 접근 제어를 설정하십시오.
- 항상 타임아웃과 유예 기간을 적용하십시오.
- UI 파서 모듈은 브라우저 샌드박스에서 실행됩니다 — 런타임 임포트 없음, 부작용 없음.

## 다음 단계

- [외부 어댑터](/adapters/external-adapters) — 독립형 어댑터 플러그인 빌드
- [UI 파서 계약](/adapters/adapter-ui-parser) — 커스텀 실행 로그 파서 제공
- [에이전트 동작 방식](/guides/agent-developer/how-agents-work) — 하트비트 생명주기
