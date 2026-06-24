# 에이전트 회사 명세

Agent Skills 명세의 확장

버전: `agentcompanies/v1-draft`

## 1. 목적

에이전트 회사 패키지는 YAML 프론트매터를 포함한 마크다운 파일을 사용하여 회사, 팀, 에이전트, 프로젝트, 작업, 관련 스킬을 기술하는 파일시스템 및 GitHub 네이티브 형식입니다.

이 명세는 Agent Skills 명세의 대체가 아닌 확장입니다.

기존 `SKILL.md` 모델 주변에서 회사, 팀, 에이전트 수준의 패키지 구조가 어떻게 구성되는지 정의합니다.

이 명세는 벤더 중립적입니다. Paperclip에만 국한되지 않고 모든 에이전트 회사 런타임에서 사용할 수 있도록 설계되었습니다.

형식의 설계 목표:

- 사람이 읽고 쓸 수 있을 것
- 로컬 폴더 또는 GitHub 저장소에서 직접 동작할 것
- 중앙 레지스트리 불필요
- 업스트림 파일에 대한 귀속 표시 및 고정된 참조 지원
- 기존 Agent Skills 에코시스템을 재정의하지 않고 확장할 것
- Paperclip 외부에서도 유용할 것

## 2. 핵심 원칙

1. 마크다운이 정식 형식입니다.
2. Git 저장소는 유효한 패키지 컨테이너입니다.
3. 레지스트리는 선택적 발견 레이어이며, 권위 기관이 아닙니다.
4. `SKILL.md`는 Agent Skills 명세가 소유합니다.
5. 외부 참조는 불변 Git 커밋에 고정될 수 있어야 합니다.
6. 귀속 및 라이선스 메타데이터는 가져오기/내보내기 시 유지되어야 합니다.
7. 슬러그와 상대 경로가 이식 가능한 ID 레이어입니다 (데이터베이스 ID가 아님).
8. 관례적인 폴더 구조는 상세한 설정 없이도 동작해야 합니다.
9. 벤더별 충실도는 기본 패키지가 아닌 선택적 확장에 속합니다.

## 3. 패키지 종류

패키지 루트는 하나의 기본 마크다운 파일로 식별됩니다.

- 회사 패키지용 `COMPANY.md`
- 팀 패키지용 `TEAM.md`
- 에이전트 패키지용 `AGENTS.md`
- 프로젝트 패키지용 `PROJECT.md`
- 작업 패키지용 `TASK.md`
- Agent Skills 명세에서 정의된 스킬 패키지용 `SKILL.md`

GitHub 저장소에는 루트에 하나의 패키지가 있거나 하위 디렉터리에 여러 패키지가 있을 수 있습니다.

## 4. 예약된 파일 및 디렉터리

공통 관례:

```text
COMPANY.md
TEAM.md
AGENTS.md
PROJECT.md
TASK.md
SKILL.md

agents/<slug>/AGENTS.md
teams/<slug>/TEAM.md
projects/<slug>/PROJECT.md
projects/<slug>/tasks/<slug>/TASK.md
tasks/<slug>/TASK.md
skills/<slug>/SKILL.md
.paperclip.yaml

HEARTBEAT.md
SOUL.md
TOOLS.md
README.md
assets/
scripts/
references/
```

규칙:

- 마크다운 파일만이 정식 콘텐츠 문서입니다.
- `assets/`, `scripts/`, `references/`와 같은 비마크다운 디렉터리는 허용됩니다.
- 패키지 도구는 선택적 잠금 파일을 생성할 수 있지만, 잠금 파일은 작성에 필수가 아닙니다.

## 5. 공통 프론트매터

패키지 문서는 다음 필드를 지원할 수 있습니다.

```yaml
schema: agentcompanies/v1
kind: company | team | agent | project | task
slug: my-slug
name: Human Readable Name
description: Short description
version: 0.1.0
license: MIT
authors:
  - name: Jane Doe
homepage: https://example.com
tags:
  - startup
  - engineering
metadata: {}
sources: []
```

참고 사항:

- `schema`는 선택 사항이며 일반적으로 패키지 루트에만 표시됩니다.
- `kind`는 파일 경로와 파일 이름으로 종류를 알 수 있을 때 선택 사항입니다.
- `slug`는 URL 안전하고 안정적이어야 합니다.
- `sources`는 출처 및 외부 참조를 위한 필드입니다.
- `metadata`는 도구별 확장을 위한 필드입니다.
- 내보내기 시 비어 있거나 기본값 필드는 생략해야 합니다.

## 6. COMPANY.md

`COMPANY.md`는 전체 회사 패키지의 루트 진입점입니다.

### 필수 필드

```yaml
name: Lean Dev Shop
description: Small engineering-focused AI company
slug: lean-dev-shop
schema: agentcompanies/v1
```

### 권장 필드

```yaml
version: 1.0.0
license: MIT
authors:
  - name: Example Org
goals:
  - Build and ship software products
includes:
  - https://github.com/example/shared-company-parts/blob/0123456789abcdef0123456789abcdef01234567/teams/engineering/TEAM.md
requirements:
  secrets:
    - OPENAI_API_KEY
```

### 의미론

- `includes`는 패키지 그래프를 정의합니다.
- 로컬 패키지 콘텐츠는 폴더 관례에 따라 암시적으로 발견되어야 합니다.
- `includes`는 선택 사항이며 주로 외부 참조나 비표준 위치에 사용해야 합니다.
- 포함 항목은 로컬 또는 외부 참조가 될 수 있습니다.
- `COMPANY.md`는 에이전트, 팀, 프로젝트, 작업, 스킬을 직접 포함할 수 있습니다.
- 회사 가져오기 도구는 `includes`를 트리/체크박스 가져오기 UI로 렌더링할 수 있습니다.

## 7. TEAM.md

`TEAM.md`는 조직 하위 트리를 정의합니다.

### 예시

```yaml
name: Engineering
description: Product and platform engineering team
schema: agentcompanies/v1
slug: engineering
manager: ../cto/AGENTS.md
includes:
  - ../platform-lead/AGENTS.md
  - ../frontend-lead/AGENTS.md
  - ../../skills/review/SKILL.md
tags:
  - team
  - engineering
```

### 의미론

- 팀 패키지는 재사용 가능한 하위 트리이며, 반드시 런타임 데이터베이스 테이블이 아닙니다.
- `manager`는 하위 트리의 루트 에이전트를 식별합니다.
- `includes`는 자식 에이전트, 자식 팀, 또는 공유 스킬을 포함할 수 있습니다.
- 팀 패키지는 기존 회사로 가져와 대상 관리자 하위에 연결할 수 있습니다.

## 8. AGENTS.md

`AGENTS.md`는 에이전트를 정의합니다.

### 예시

```yaml
name: CEO
title: Chief Executive Officer
reportsTo: null
skills:
  - plan-ceo-review
  - review
```

### 의미론

- 본문 콘텐츠는 에이전트의 정식 기본 지시 내용입니다.
- `docs`는 존재할 때 형제 마크다운 문서를 가리킵니다.
- `skills`는 스킬 단축명 또는 슬러그로 재사용 가능한 `SKILL.md` 패키지를 참조합니다.
- `review`와 같은 단순 스킬 항목은 관례적으로 `skills/review/SKILL.md`로 해석되어야 합니다.
- 패키지가 외부 스킬을 참조하는 경우, 에이전트는 여전히 단축명으로 스킬을 참조해야 합니다. 스킬 패키지 자체가 소스 참조, 고정, 귀속 세부 사항을 소유합니다.
- 도구는 경로 또는 URL 항목을 탈출구로 허용할 수 있지만, 내보내기 시 `AGENTS.md`에서는 단축명 기반 스킬 참조를 선호해야 합니다.
- 벤더별 어댑터/런타임 설정은 기본 패키지에 없어야 합니다.
- 로컬 절대 경로, 머신별 cwd 값, 시크릿 값은 정식 패키지 데이터로 내보내면 안 됩니다.

### 스킬 해석

에이전트와 스킬 간의 선호 연결 표준은 스킬 단축명입니다.

에이전트 스킬 항목에 대한 권장 해석 순서:

1. `skills/<단축명>/SKILL.md`의 로컬 패키지 스킬
2. 선언된 슬러그 또는 단축명이 일치하는 참조 또는 포함된 스킬 패키지
3. 동일한 단축명을 가진 도구 관리 회사 스킬 라이브러리 항목

규칙:

- 내보내기 시 가능하면 `AGENTS.md`에 단축명을 사용해야 합니다.
- 가져오기 시 일반 스킬 참조에 전체 파일 경로가 필요하지 않아야 합니다.
- 스킬 패키지 자체가 외부 참조, 벤더링, 미러, 고정된 업스트림 콘텐츠와 관련된 복잡성을 처리해야 합니다.
- 이를 통해 `AGENTS.md`가 읽기 쉽고 `skills.sh` 방식의 공유와 일관성을 유지합니다.

## 9. PROJECT.md

`PROJECT.md`는 경량 프로젝트 패키지를 정의합니다.

### 예시

```yaml
name: Q2 Launch
description: Ship the Q2 launch plan and supporting assets
owner: cto
```

### 의미론

- 프로젝트 패키지는 관련 시작 작업과 지원 마크다운을 그룹화합니다.
- `owner`는 명확한 프로젝트 소유자가 있을 때 에이전트 슬러그를 참조해야 합니다.
- 관례적인 `tasks/` 하위 폴더는 암시적으로 발견되어야 합니다.
- `includes`는 명시적 연결이 필요할 때 `TASK.md`, `SKILL.md`, 또는 지원 문서를 포함할 수 있습니다.
- 프로젝트 패키지는 계획된 작업을 시드하기 위한 것이며, 런타임 작업 상태를 나타내지 않습니다.

## 10. TASK.md

`TASK.md`는 경량 시작 작업을 정의합니다.

### 예시

```yaml
name: Monday Review
assignee: ceo
project: q2-launch
recurring: true
```

### 의미론

- 본문 콘텐츠는 정식 마크다운 작업 설명입니다.
- `assignee`는 패키지 내의 에이전트 슬러그를 참조해야 합니다.
- `project`는 작업이 `PROJECT.md`에 속할 때 프로젝트 슬러그를 참조해야 합니다.
- `recurring: true`는 작업을 일회성 시작 작업이 아닌 지속적인 반복 작업으로 표시합니다.
- 작업은 의도적으로 기본적인 시드 작업입니다: 제목, 마크다운 본문, 담당자, 프로젝트 연결, 선택적 `recurring: true`.
- 도구는 `priority`, `labels`, `metadata`와 같은 선택적 필드도 지원할 수 있지만, 기본 패키지에서는 필수로 요구하면 안 됩니다.

### 반복 작업

- 기본 패키지는 작업이 반복적인지만 표시하면 됩니다.
- 벤더는 `.paperclip.yaml`과 같은 벤더 확장에 실제 스케줄/트리거/런타임 충실도를 첨부할 수 있습니다.
- 이를 통해 `TASK.md`의 이식성을 유지하면서도 더 풍부한 런타임 시스템이 자체 자동화 세부 사항을 왕복할 수 있습니다.
- 레거시 패키지는 전환 기간 동안 여전히 `schedule.recurrence`를 사용할 수 있지만, 내보내기 시 `recurring: true`를 선호해야 합니다.

Paperclip 확장 예시:

```yaml
routines:
  monday-review:
    triggers:
      - kind: schedule
        cronExpression: "0 9 * * 1"
        timezone: America/Chicago
```

- 벤더는 이해하지 못하는 반복 작업 확장을 무시해야 합니다.
- 레거시 `schedule.recurrence` 데이터를 가져오는 벤더는 자체 런타임 트리거 모델로 변환할 수 있지만, 새 내보내기에서는 더 단순한 `recurring: true` 기본 필드를 선호해야 합니다.

## 11. SKILL.md 호환성

스킬 패키지는 유효한 Agent Skills 패키지로 유지되어야 합니다.

규칙:

- `SKILL.md`는 Agent Skills 명세를 따라야 합니다.
- Paperclip은 스킬 유효성을 위해 추가 최상위 필드를 요구하면 안 됩니다.
- Paperclip별 확장은 `metadata.paperclip` 또는 `metadata.sources` 아래에 있어야 합니다.
- 스킬 디렉터리는 Agent Skills 에코시스템이 기대하는 대로 `scripts/`, `references/`, `assets/`를 포함할 수 있습니다.
- 이 명세를 구현하는 도구는 병렬 스킬 형식을 발명하는 대신 `skills.sh` 호환성을 최우선 목표로 삼아야 합니다.

즉, 이 명세는 Agent Skills를 회사/팀/에이전트 구성으로 위로 확장합니다. 스킬 패키지 의미론을 재정의하지 않습니다.

### 호환 확장 예시

```yaml
---
name: review
description: Paranoid code review skill
allowed-tools:
  - Read
  - Grep
metadata:
  paperclip:
    tags:
      - engineering
      - review
  sources:
    - kind: github-file
      repo: vercel-labs/skills
      path: review/SKILL.md
      commit: 0123456789abcdef0123456789abcdef01234567
      sha256: 3b7e...9a
      attribution: Vercel Labs
      usage: referenced
---
```

## 12. 소스 참조

패키지는 콘텐츠를 벤더링하는 대신 업스트림 콘텐츠를 가리킬 수 있습니다.

### 소스 객체

```yaml
sources:
  - kind: github-file
    repo: owner/repo
    path: path/to/file.md
    commit: 0123456789abcdef0123456789abcdef01234567
    blob: abcdef0123456789abcdef0123456789abcdef01
    sha256: 3b7e...9a
    url: https://github.com/owner/repo/blob/0123456789abcdef0123456789abcdef01234567/path/to/file.md
    rawUrl: https://raw.githubusercontent.com/owner/repo/0123456789abcdef0123456789abcdef01234567/path/to/file.md
    attribution: Owner Name
    license: MIT
    usage: referenced
```

### 지원되는 종류

- `local-file`
- `local-dir`
- `github-file`
- `github-dir`
- `url`

### 사용 모드

- `vendored`: 바이트가 패키지에 포함됨
- `referenced`: 패키지가 업스트림 불변 콘텐츠를 가리킴
- `mirrored`: 바이트가 로컬에 캐시되지만 업스트림 귀속이 정식으로 남음

### 규칙

- `commit`은 엄격 모드에서 `github-file` 및 `github-dir`에 필수입니다.
- `sha256`은 강력히 권장되며 가져올 때 검증해야 합니다.
- 브랜치만 있는 참조는 개발 모드에서 허용될 수 있지만 경고를 표시해야 합니다.
- 내보내기 시 재배포가 명확히 허용되지 않는 한 서드파티 콘텐츠에 대해 기본값으로 `referenced`를 사용해야 합니다.

## 13. 해석 규칙

패키지 루트가 주어지면, 가져오기 도구는 다음 순서로 해석합니다.

1. 로컬 상대 경로
2. 가져오기 도구에서 명시적으로 허용된 경우 로컬 절대 경로
3. 고정된 GitHub 참조
4. 일반 URL

고정된 GitHub 참조의 경우:

1. `repo + commit + path` 해석
2. 콘텐츠 가져오기
3. 존재하면 `sha256` 검증
4. 존재하면 `blob` 검증
5. 불일치 시 폐쇄 실패

가져오기 도구는 다음을 표시해야 합니다.

- 누락된 파일
- 해시 불일치
- 누락된 라이선스
- 네트워크 가져오기가 필요한 참조된 업스트림 콘텐츠
- 스킬 또는 스크립트의 실행 가능한 콘텐츠

## 14. 가져오기 그래프

패키지 가져오기 도구는 다음으로부터 그래프를 구성해야 합니다.

- `COMPANY.md`
- `TEAM.md`
- `AGENTS.md`
- `PROJECT.md`
- `TASK.md`
- `SKILL.md`
- 로컬 및 외부 참조

권장 가져오기 UI 동작:

- 그래프를 트리로 렌더링
- 파일 수준이 아닌 엔티티 수준의 체크박스
- 에이전트 선택 시 필수 문서 및 참조된 스킬 자동 선택
- 팀 선택 시 해당 하위 트리 자동 선택
- 프로젝트 선택 시 포함된 작업 자동 선택
- 반복 작업 선택 시 가져오기 대상이 루틴/자동화임을 명확히 표시 (일회성 작업이 아님)
- 참조된 서드파티 콘텐츠 선택 시 귀속, 라이선스, 가져오기 정책 표시

## 15. 벤더 확장

벤더별 데이터는 기본 패키지 형태 외부에 있어야 합니다.

Paperclip의 경우 선호하는 충실도 확장은 다음과 같습니다.

```text
.paperclip.yaml
```

사용 예시:

- 어댑터 타입 및 어댑터 설정
- 어댑터 환경 입력 및 기본값
- 런타임 설정
- 권한
- 예산
- 승인 정책
- 프로젝트 실행 워크스페이스 정책
- 이슈/작업 Paperclip 전용 메타데이터

규칙:

- 기본 패키지는 확장 없이도 읽을 수 있어야 합니다.
- 벤더 확장을 이해하지 못하는 도구는 무시해야 합니다.
- Paperclip 도구는 기본 마크다운을 깔끔하게 유지하면서 벤더 확장을 사이드카로 기본 내보낼 수 있습니다.

권장 Paperclip 형태:

```yaml
schema: paperclip/v1
agents:
  claudecoder:
    adapter:
      type: claude_local
      config:
        model: claude-opus-4-6
    inputs:
      env:
        ANTHROPIC_API_KEY:
          kind: secret
          requirement: optional
          default: ""
        GH_TOKEN:
          kind: secret
          requirement: optional
        CLAUDE_BIN:
          kind: plain
          requirement: optional
          default: claude
routines:
  monday-review:
    triggers:
      - kind: schedule
        cronExpression: "0 9 * * 1"
        timezone: America/Chicago
```

Paperclip 내보내기 도구에 대한 추가 규칙:

- `AGENTS.md`에 이미 에이전트 지시사항이 포함되어 있을 때 `promptTemplate`을 중복 내보내지 마세요.
- `secretId`, `version`, `type: secret_ref`와 같은 프로바이더별 시크릿 바인딩을 내보내지 마세요.
- 환경 입력을 `required` 또는 `optional` 의미론 및 선택적 기본값이 있는 이식 가능한 선언으로 내보내세요.
- 절대 명령어 및 절대 `PATH` 재정의와 같은 시스템 의존 값에 대해 경고하세요.
- 가능하면 비어 있는 기본값 Paperclip 필드를 생략하세요.

## 16. 내보내기 규칙

준수하는 내보내기 도구는 다음을 수행해야 합니다.

- 마크다운 루트 및 상대 폴더 레이아웃 내보내기
- 머신 로컬 ID 및 타임스탬프 제외
- 시크릿 값 제외
- 머신별 경로 제외
- 작업 내보내기 시 작업 설명 및 반복 작업 선언 보존
- 비어 있는/기본값 필드 제외
- 벤더 중립 기본 패키지를 기본값으로 사용
- Paperclip 내보내기 도구는 기본적으로 `.paperclip.yaml`을 사이드카로 내보내야 합니다.
- 귀속 및 소스 참조 보존
- 서드파티 콘텐츠에 대해 자동 벤더링보다 `referenced`를 선호
- 호환 스킬 내보내기 시 `SKILL.md`를 그대로 보존

## 17. 라이선스 및 귀속

준수하는 도구는 다음을 수행해야 합니다.

- 가져오기 및 내보내기 시 `license` 및 `attribution` 메타데이터 보존
- 벤더링된 콘텐츠와 참조된 콘텐츠 구분
- 내보내기 시 참조된 서드파티 콘텐츠를 자동으로 인라인하지 않을 것
- 누락된 라이선스 메타데이터를 경고로 표시
- 콘텐츠가 벤더링되거나 미러링된 경우 설치/가져오기 전에 제한적이거나 알 수 없는 라이선스 표시

## 18. 선택적 잠금 파일

작성에는 잠금 파일이 필요하지 않습니다.

도구는 다음과 같은 선택적 잠금 파일을 생성할 수 있습니다.

```text
company-package.lock.json
```

목적:

- 해석된 참조 캐시
- 최종 해시 기록
- 재현 가능한 설치 지원

규칙:

- 잠금 파일은 선택 사항입니다.
- 잠금 파일은 생성된 아티팩트이며, 정식 작성 입력이 아닙니다.
- 마크다운 패키지가 여전히 신뢰할 수 있는 유일한 소스입니다.

## 19. Paperclip 매핑

Paperclip은 이 명세를 런타임 모델에 다음과 같이 매핑할 수 있습니다.

- 기본 패키지:
  - `COMPANY.md` -> 회사 메타데이터
  - `TEAM.md` -> 가져올 수 있는 조직 하위 트리
  - `AGENTS.md` -> 에이전트 정체성 및 지시사항
  - `PROJECT.md` -> 시작 프로젝트 정의
  - `TASK.md` -> 시작 이슈/작업 정의, 또는 `recurring: true`일 때 반복 작업 템플릿
  - `SKILL.md` -> 가져온 스킬 패키지
  - `sources[]` -> 출처 및 고정된 업스트림 참조
- Paperclip 확장:
  - `.paperclip.yaml` -> 어댑터 설정, 런타임 설정, 환경 입력 선언, 권한, 예산, 루틴 트리거, 기타 Paperclip별 충실도

공유 마크다운 파일 내에 있어야 하는 Paperclip 전용 인라인 메타데이터는 다음을 사용해야 합니다.

- `metadata.paperclip`

이렇게 하면 기본 형식이 Paperclip보다 광범위하게 유지됩니다.

이 명세 자체는 벤더 중립적이며 Paperclip에만 국한되지 않고 모든 에이전트 회사 런타임을 위한 것입니다.

## 20. 전환

Paperclip은 이 마크다운 우선 패키지 모델을 기본 이식성 형식으로 채택해야 합니다.

`paperclip.manifest.json`은 향후 패키지 시스템의 호환성 요구 사항으로 보존할 필요가 없습니다.

Paperclip에 있어 이것은 장기적인 이중 형식 전략이 아닌 제품 방향의 단호한 전환으로 처리해야 합니다.

## 21. 최소 예시

```text
lean-dev-shop/
├── COMPANY.md
├── agents/
│   ├── ceo/AGENTS.md
│   └── cto/AGENTS.md
├── projects/
│   └── q2-launch/
│       ├── PROJECT.md
│       └── tasks/
│           └── monday-review/
│               └── TASK.md
├── teams/
│   └── engineering/TEAM.md
├── tasks/
│   └── weekly-review/TASK.md
└── skills/
    └── review/SKILL.md

선택 사항:

```text
.paperclip.yaml
```
```

**권장 사항**
다음 방향을 권장합니다.

- 이것을 사람 중심의 명세로 만들 것
- `SKILL.md` 호환성을 협상 불가로 정의할 것
- 이 명세를 병렬 형식이 아닌 Agent Skills의 확장으로 처리할 것
- `companies.sh`를 이 명세를 구현하는 저장소를 위한 발견 레이어로 만들 것 (게시 권위 기관이 아닌)
