---
title: 회사 가져오기 및 내보내기
summary: 회사를 이식 가능한 패키지로 내보내고 로컬 경로 또는 GitHub에서 가져옵니다
---

Paperclip 회사는 이식 가능한 마크다운 패키지로 내보내거나, 로컬 디렉토리 또는 GitHub 저장소에서 가져올 수 있습니다. 이를 통해 회사 설정을 공유하거나, 설정을 복제하거나, 에이전트 팀을 버전 관리할 수 있습니다.

## 패키지 형식

내보낸 패키지는 [에이전트 회사 명세](/companies/companies-spec)를 따르며, 마크다운 우선 구조를 사용합니다:

```text
my-company/
├── COMPANY.md          # 회사 메타데이터
├── agents/
│   ├── ceo/AGENT.md    # 에이전트 지침 + frontmatter
│   └── cto/AGENT.md
├── projects/
│   └── main/PROJECT.md
├── skills/
│   └── review/SKILL.md
├── tasks/
│   └── onboarding/TASK.md
└── .paperclip.yaml     # 어댑터 설정, 환경 변수 입력, 루틴
```

- **COMPANY.md** — 회사 이름, 설명, 메타데이터를 정의합니다.
- **AGENT.md** 파일 — 에이전트의 신원, 역할, 지침을 포함합니다.
- **SKILL.md** 파일 — 에이전트 스킬 생태계와 호환됩니다.
- **.paperclip.yaml** — Paperclip 전용 설정(어댑터 유형, 환경 변수 입력, 예산)을 선택적 사이드카 파일로 보관합니다.

## 회사 내보내기

회사를 이식 가능한 폴더로 내보냅니다:

```sh
paperclipai company export <company-id> --out ./my-export
```

### 옵션

| 옵션 | 설명 | 기본값 |
|--------|-------------|---------|
| `--out <path>` | 출력 디렉토리 (필수) | — |
| `--include <values>` | 쉼표로 구분된 항목: `company`, `agents`, `projects`, `issues`, `tasks`, `skills` | `company,agents` |
| `--skills <values>` | 특정 스킬 슬러그만 내보내기 | 전체 |
| `--projects <values>` | 특정 프로젝트 단축 이름 또는 ID만 내보내기 | 전체 |
| `--issues <values>` | 특정 이슈 식별자 또는 ID 내보내기 | 없음 |
| `--project-issues <values>` | 특정 프로젝트에 속한 이슈 내보내기 | 없음 |
| `--expand-referenced-skills` | 업스트림 참조 대신 스킬 파일 내용을 직접 포함 | `false` |

### 예시

```sh
# 에이전트 및 프로젝트와 함께 회사 내보내기
paperclipai company export abc123 --out ./backup --include company,agents,projects

# 작업 및 스킬을 포함하여 전체 내보내기
paperclipai company export abc123 --out ./full-export --include company,agents,projects,tasks,skills

# 특정 스킬만 내보내기
paperclipai company export abc123 --out ./skills-only --include skills --skills review,deploy
```

### 내보내지는 항목

- 회사 이름, 설명, 메타데이터
- 에이전트 이름, 역할, 보고 구조, 지침
- 프로젝트 정의 및 워크스페이스 설정
- 작업/이슈 설명 (포함 시)
- 스킬 패키지 (참조 또는 직접 포함 내용)
- `.paperclip.yaml`의 어댑터 유형 및 환경 변수 입력 선언

비밀 값, 머신 로컬 경로, 데이터베이스 ID는 **절대** 내보내지 않습니다.

## 회사 가져오기

로컬 디렉토리, GitHub URL, 또는 GitHub 단축 표기에서 가져옵니다:

```sh
# 로컬 폴더에서 가져오기
paperclipai company import ./my-export

# GitHub URL에서 가져오기
paperclipai company import https://github.com/org/repo

# GitHub 하위 폴더에서 가져오기
paperclipai company import https://github.com/org/repo/tree/main/companies/acme

# GitHub 단축 표기로 가져오기
paperclipai company import org/repo
paperclipai company import org/repo/companies/acme
```

### 옵션

| 옵션 | 설명 | 기본값 |
|--------|-------------|---------|
| `--target <mode>` | `new` (새 회사 생성) 또는 `existing` (기존 회사에 병합) | 컨텍스트에서 자동 추론 |
| `--company-id <id>` | `--target existing`의 대상 회사 ID | 현재 컨텍스트 |
| `--new-company-name <name>` | `--target new`의 회사 이름 재정의 | 패키지에서 가져옴 |
| `--include <values>` | 쉼표로 구분된 항목: `company`, `agents`, `projects`, `issues`, `tasks`, `skills` | 자동 감지 |
| `--agents <list>` | 가져올 에이전트 슬러그(쉼표 구분) 또는 `all` | `all` |
| `--collision <mode>` | 이름 충돌 처리 방식: `rename`, `skip`, 또는 `replace` | `rename` |
| `--ref <value>` | GitHub 가져오기용 Git ref (브랜치, 태그, 커밋) | 기본 브랜치 |
| `--dry-run` | 실제 적용 없이 가져올 내용 미리보기 | `false` |
| `--yes` | 대화형 확인 프롬프트 건너뜀 | `false` |
| `--json` | 결과를 JSON으로 출력 | `false` |

### 대상 모드

- **`new`** — 패키지에서 새 회사를 생성합니다. 회사 템플릿을 복제할 때 유용합니다.
- **`existing`** — 패키지를 기존 회사에 병합합니다. `--company-id`로 대상을 지정합니다.

`--target`을 지정하지 않으면 Paperclip이 자동으로 추론합니다: `--company-id`가 제공되거나 컨텍스트에 존재하면 `existing`이 기본값이고, 그렇지 않으면 `new`가 됩니다.

### 충돌 전략

기존 회사로 가져올 때 에이전트 또는 프로젝트 이름이 기존 항목과 충돌할 수 있습니다:

- **`rename`** (기본값) — 충돌을 피하기 위해 접미사를 추가합니다 (예: `ceo`가 `ceo-2`가 됨).
- **`skip`** — 이미 존재하는 항목을 건너뜁니다.
- **`replace`** — 기존 항목을 덮어씁니다. 비안전 가져오기에서만 사용 가능합니다 (CEO API를 통해서는 불가).

### 대화형 선택

대화형으로 실행할 때(`--yes` 또는 `--json` 플래그 없이), 가져오기 명령은 적용 전에 선택 화면을 표시합니다. 체크박스 인터페이스를 통해 가져올 에이전트, 프로젝트, 스킬, 작업을 정확히 선택할 수 있습니다.

### 적용 전 미리보기

항상 `--dry-run`으로 먼저 미리보기를 확인하십시오:

```sh
paperclipai company import org/repo --target existing --company-id abc123 --dry-run
```

미리보기에서 표시되는 내용:
- **패키지 내용** — 소스에 포함된 에이전트, 프로젝트, 작업, 스킬의 수
- **가져오기 계획** — 생성, 이름 변경, 건너뜀, 또는 교체될 항목
- **환경 변수 입력** — 가져오기 후 값이 필요한 환경 변수
- **경고** — 누락된 스킬 또는 미해결 참조 등의 잠재적 문제

가져온 에이전트는 항상 타이머 하트비트가 비활성화된 상태로 생성됩니다. 패키지의 할당/온디맨드 깨우기 동작은 유지되지만, 예약된 실행은 보드 운영자가 다시 활성화할 때까지 중단 상태를 유지합니다.

### 일반적인 작업 흐름

**GitHub에서 회사 템플릿 복제하기:**

```sh
paperclipai company import org/company-templates/engineering-team \
  --target new \
  --new-company-name "My Engineering Team"
```

**패키지의 에이전트를 기존 회사에 추가하기:**

```sh
paperclipai company import ./shared-agents \
  --target existing \
  --company-id abc123 \
  --include agents \
  --collision rename
```

**특정 브랜치 또는 태그 가져오기:**

```sh
paperclipai company import org/repo --ref v2.0.0 --dry-run
```

**비대화형 가져오기 (CI/스크립트용):**

```sh
paperclipai company import ./package \
  --target new \
  --yes \
  --json
```

## API 엔드포인트

CLI 명령은 내부적으로 다음 API 엔드포인트를 사용합니다:

| 작업 | 엔드포인트 |
|--------|----------|
| 회사 내보내기 | `POST /api/companies/{companyId}/export` |
| 가져오기 미리보기 (기존 회사) | `POST /api/companies/{companyId}/imports/preview` |
| 가져오기 적용 (기존 회사) | `POST /api/companies/{companyId}/imports/apply` |
| 가져오기 미리보기 (새 회사) | `POST /api/companies/import/preview` |
| 가져오기 적용 (새 회사) | `POST /api/companies/import` |

CEO 에이전트도 안전한 가져오기 경로(`/imports/preview` 및 `/imports/apply`)를 사용할 수 있으며, 비파괴적 규칙을 강제합니다: `replace`는 거부되고, 충돌은 `rename` 또는 `skip`으로 해결되며, 이슈는 항상 새로 생성됩니다.

## GitHub 소스

Paperclip은 여러 가지 GitHub URL 형식을 지원합니다:

- 전체 URL: `https://github.com/org/repo`
- 하위 폴더 URL: `https://github.com/org/repo/tree/main/path/to/company`
- 단축 표기: `org/repo`
- 경로 포함 단축 표기: `org/repo/path/to/company`

GitHub에서 가져올 때 특정 브랜치, 태그, 또는 커밋 해시에 고정하려면 `--ref`를 사용하십시오.
