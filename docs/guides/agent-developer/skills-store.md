---
title: 스킬 스토어
summary: 에이전트가 사용하는 재사용 가능한 스킬 탐색, 설치, 가져오기, 포크, 공유
---

**스킬 스토어**는 Paperclip의 재사용 가능한 스킬 라이브러리입니다. 스킬은 에이전트에게 특정 유형의 작업 수행 방법을 가르치는 마크다운 플레이북입니다. 이슈 분류, 와이어프레임 작성, QA 승인 실행, 릴리스 발표 작성 등의 작업이 해당됩니다. 스토어는 사람(과 에이전트)이 이러한 스킬을 발견하고, 회사에 설치하고, 지속적으로 관리하는 곳입니다.

스킬을 *직접 작성*하려면 [스킬 작성](writing-a-skill) 문서를 참고하세요. 이 페이지는 스킬을 **둘러싼 스토어**에 관한 것입니다. 즉, 스킬의 출처, 회사에 반입하는 방법, 최신 상태를 유지하는 방법을 다룹니다.

## 두 개의 계층: 카탈로그와 회사 라이브러리

사람들이 막연히 "스킬 스토어"라고 부르는 것에는 두 가지 별개의 개념이 있습니다.

| 계층 | 설명 | 위치 |
|---|---|---|
| **카탈로그** | Paperclip에 포함된 큐레이션된 읽기 전용 스킬 세트 | `@paperclipai/skills-catalog` 패키지 |
| **회사 라이브러리** | 에이전트가 실행할 수 있도록 *귀사* 회사에 실제로 설치된 스킬 | `company_skills` 데이터베이스 테이블 |

카탈로그는 탐색하는 선반이고, 회사 라이브러리는 꺼낸 카트입니다. 카탈로그 스킬을 설치하면 회사 라이브러리에 복사되며, 원본과 독립적으로 편집, 버전 관리, 포크, 공유가 가능합니다.

### 번들 카탈로그

카탈로그는 `packages/skills-catalog/catalog/` 아래의 마크다운으로 구성되며, 빌드 시 매니페스트(`generated/catalog.json`)로 컴파일됩니다. 각 카탈로그 스킬은 `SKILL.md`와 선택적 `references/`, `scripts/`, `assets/` 파일을 포함하는 하나의 디렉터리입니다.

카탈로그는 스킬을 두 가지 **종류**로 구분합니다.

- **`bundled`** — 1차 Paperclip 스킬(예: `issue-triage`, `task-planning`, `qa-acceptance`, `wireframe`, `github-pr-workflow`, `doc-maintenance`). 예약된 `paperclipai/paperclip/...` 키 네임스페이스를 사용합니다.
- **`optional`** — 선택적으로 추가하는 추가 큐레이션 스킬(예: `agent-browser`, `design-critique`, `release-announcement`, `last30days`).

모든 카탈로그 스킬에는 발견 및 안전을 위한 메타데이터가 포함됩니다.

- **`category`** — `software-development`, `quality`, `product`, `research`, `content`, `browser`, `paperclip-operations`, `docs` 등의 그룹화.
- **`recommendedForRoles`** — 해당 스킬에 적합한 에이전트 역할(`engineer`, `qa`, `designer`, `product`, `researcher` 등). 회사 인력 구성 시 스킬 추천에 사용됩니다.
- **`trustLevel`** — [신뢰 수준](#신뢰-수준-스킬이-포함할-수-있는-내용) 참조.
- **`compatibility`** — 빌드 유효성 검사 단계에서 도출된 `compatible`, `unknown`, `invalid` 중 하나.
- **`contentHash`** — 스킬 파일의 해시값. 이후 업데이트 및 드리프트 감지에 사용됩니다.

## 신뢰 수준: 스킬이 포함할 수 있는 내용

스킬은 단순한 텍스트 이상을 번들로 포함할 수 있으므로, 모든 스킬은 콘텐츠에 필요한 신뢰 수준에 따라 분류됩니다. 수준은 **자기 선언이 아닌 파일로부터** 도출됩니다.

| 신뢰 수준 | 포함 내용 | 비고 |
|---|---|---|
| `markdown_only` | `.md` 파일만 포함 | 가장 안전 — 순수 지침 |
| `assets` | 마크다운 및 이미지/PDF/기타 정적 파일 | 실행 코드 없음 |
| `scripts_executables` | 모든 스크립트(`.sh`, `.js`, `.py`, `.ts` 등) | 최고 수준의 검토 필요 |

신뢰 수준은 가져올 수 있는 내용을 제한합니다. 실행 스크립트가 포함된 스킬은 **외부 소스**(GitHub, `skills.sh`, 또는 원시 URL)에서 가져올 수 없습니다. 1차 번들 카탈로그 스킬만 스크립트를 포함할 수 있습니다. 이를 통해 신뢰할 수 없는 원격 코드가 에이전트에게 전달되는 것을 방지합니다.

## 스킬의 출처 (소스 유형)

회사 라이브러리의 스킬에는 원본 출처가 기록됩니다. 스토어는 이를 **소스 배지**로 표시합니다.

| 소스 유형 | 배지 | 의미 |
|---|---|---|
| `catalog` | Paperclip / 카탈로그 | 번들 카탈로그에서 설치됨 |
| `github` | GitHub | GitHub 저장소에서 가져옴 (커밋에 고정됨) |
| `skills_sh` | skills.sh | [skills.sh](https://skills.sh) 레지스트리를 통해 가져옴 (GitHub로 해석됨) |
| `url` | URL | 원시 마크다운 URL에서 가져옴 |
| `local_path` | 로컬 | 앱 내에서 생성되거나 디스크의 프로젝트 워크스페이스에서 스캔됨 |

외부 가져오기(`github`, `skills_sh`, `url`)에는 두 가지 규칙이 적용됩니다. `markdown_only` 또는 `assets`여야 하고(스크립트 불가), Git 기반 소스는 가져오기 전에 **40자 커밋 SHA로 고정 해석**되어야 합니다. 이를 통해 브랜치가 변경되더라도 에이전트가 실행하는 내용이 변경되지 않습니다.

## 회사에 스킬 추가하기

스토어는 여러 경로를 제공하며, 모두 스킬을 회사 라이브러리에 추가합니다.

### 카탈로그에서 설치

카탈로그의 발견 그리드에서 스킬을 탐색하고 설치합니다. 설치 시 카탈로그 스킬 파일이 회사 라이브러리에 복사되며, 출처 메타데이터(카탈로그 키, 콘텐츠 해시, 패키지 버전)가 기록되어 스토어가 나중에 업스트림 카탈로그 스킬 변경 여부를 알 수 있습니다.

- API: `POST /companies/:companyId/skills/install-catalog`
- 이미 설치된 카탈로그 스킬을 재설치하면 중복 생성 없이 기존 항목이 업데이트됩니다.

### 외부 소스에서 가져오기

소스를 붙여넣으면 Paperclip이 가져옵니다. 허용되는 형식은 다음과 같습니다.

- GitHub 저장소 또는 하위 폴더 URL(`https://github.com/owner/repo/tree/<ref>/skills/foo`)
- `owner/repo` 또는 `owner/repo/skill` 형식의 단축 참조
- `skills.sh` URL 또는 `npx skills add …` 명령어 (모두 GitHub 소스로 해석됨)
- `SKILL.md`를 직접 가리키는 원시 마크다운 URL

저장소에 여러 스킬이 포함될 수 있으며, 임포터는 해당 경로 아래의 모든 `SKILL.md`를 발견합니다(선택적으로 단일 `--skill` 슬러그로 필터링 가능).

- API: `POST /companies/:companyId/skills/import`

### 로컬 스킬 생성

외부 소스 없이 회사 라이브러리에서 직접 스킬을 작성합니다. 이것이 "새 스킬" 경로로, 이름, 설명, 마크다운 본문을 제공하면 `local_path` / 관리형 로컬 스킬로 저장됩니다.

- API: `POST /companies/:companyId/skills`

### 프로젝트 워크스페이스 스캔

에이전트와 프로젝트는 이미 관행적인 폴더(`skills/`, `.claude/skills/`, `.agents/skills/` 및 기타 여러 도구별 루트)에 스킬을 디스크에 보관하는 경우가 많습니다. 프로젝트 스캔은 워크스페이스를 탐색하여 해당 `SKILL.md` 디렉터리를 찾고, 충돌이나 건너뜀을 보고하면서 회사 라이브러리로 가져오도록 제안합니다.

- API: `POST /companies/:companyId/skills/scan-projects`

## 설치된 스킬 관리

스킬이 라이브러리에 추가되면 스토어는 이를 라이프사이클이 있는 소규모 제품처럼 취급합니다.

### 버전

각 스킬은 개정 이력을 유지합니다. 새 버전을 저장하면 전체 파일 목록(콘텐츠 포함)이 스냅샷으로 저장되고 개정 번호가 증가하여 이력 검토 및 롤백이 가능합니다.

- 목록 조회: `GET /companies/:companyId/skills/:skillId/versions`
- 생성: `POST /companies/:companyId/skills/:skillId/versions`

### 업데이트, 드리프트, 초기화

카탈로그 또는 외부 소스에서 설치된 스킬의 경우 스토어가 원본을 추적합니다. **업데이트 상태** 엔드포인트는 설치된 사본을 최신 업스트림과 비교하여 업데이트 가능 여부, 로컬에서 스킬을 수정했는지(드리프트), 자동 업데이트를 차단해야 하는 보류 이유를 보고합니다.

- 확인: `GET /companies/:companyId/skills/:skillId/update-status`
- 업스트림 업데이트 설치: `POST /companies/:companyId/skills/:skillId/install-update`
  (`force`로 로컬 드리프트 무시 가능)
- 로컬 변경 사항을 버리고 원본으로 복원:
  `POST /companies/:companyId/skills/:skillId/reset`

### 감사

스킬을 감사하여 설치된 콘텐츠 해시를 기록된 원본 해시와 비교하고, 변조 또는 예상치 못한 드리프트를 표시할 수 있습니다. 감사는 판정 및 스토어가 상태 신호로 표시하는 코드 세트를 반환합니다.

- API: `POST /companies/:companyId/skills/:skillId/audit`

### 포크

포크는 기존 스킬을 새로운 독립적인 라이브러리 항목으로 복사합니다(선택적으로 새 이름, 슬러그, 공유 범위 지정 가능). 포크는 원본 출처를 기록하며, 원본의 `forkCount`가 증가합니다. 업스트림을 확인할 수 있는 기능을 잃지 않고 카탈로그 또는 커뮤니티 스킬을 커스터마이즈할 때 사용합니다.

- API: `POST /companies/:companyId/skills/:skillId/fork`

### 별점 및 댓글

스킬은 스토어 내에서 소셜 객체입니다. 구성원은 스킬에 **별점**을 줄 수 있으며(행위자별 토글로 `starCount` 증가), 토론 및 리뷰를 위한 스레드형 **댓글**을 남길 수 있습니다.

- 별점 추가/제거: `POST` / `DELETE /companies/:companyId/skills/:skillId/star`
- 댓글: `GET` / `POST /companies/:companyId/skills/:skillId/comments`,
  편집 및 삭제를 위한 `PATCH` 및 `DELETE` 포함.

## 공유 범위

모든 회사 스킬에는 볼 수 있는 사람을 제어하는 **공유 범위**가 있습니다.

| 범위 | 가시성 |
|---|---|
| `private` | 작성자/소유자만 |
| `company` | 회사의 모든 구성원 |
| `public_link` | 생성된 공개 공유 토큰이 있는 누구나 |

범위는 스킬 생성, 업데이트 또는 포크 시 설정되며, 스토어의 발견 보기에서 필터링할 수 있습니다.

## 에이전트가 설치된 스킬을 실제로 사용하는 방법

스킬을 설치하는 것과 에이전트가 실행하는 것은 다릅니다. 런타임에 회사의 설치된 스킬은 에이전트의 워크스페이스에 `SKILL.md` 디렉터리로 구체화되며, 에이전트의 하네스는 각 스킬의 **프론트매터 `name` + `description`**을 라우팅 로직으로 로드합니다. 에이전트는 이 한 줄짜리 설명을 읽어 스킬이 현재 작업과 관련이 있는지 *여부*를 결정하고, 관련이 있을 때만 전체 본문을 로드합니다. (이것이 스킬의 `description`이 "무엇을 하고 언제 사용하는지"로 작성되어야 하는 이유입니다. 이것이 에이전트가 검색하는 인덱스입니다.)

에이전트 워크스페이스로의 스킬 동기화는 인스턴스별 기본 설정에 의해 제어되므로, 운영자는 회사 라이브러리를 실행 중인 에이전트에게 푸시할지 여부와 방법을 제어할 수 있습니다.

## 참조: API 표면

모든 엔드포인트는 회사 스킬 라우터 하위에 있습니다.

**카탈로그 (읽기 전용)**

- `GET /skills/catalog` — 번들 카탈로그 목록 조회
- `GET /skills/catalog/:catalogId` — 단일 카탈로그 스킬
- `GET /skills/catalog/:catalogId/files` — 파일 목록 + 콘텐츠

**회사 라이브러리**

- `GET /companies/:companyId/skills` — 목록 조회 (`q`, `sort`, `categories`, `scope` 지원)
- `GET /companies/:companyId/skills/categories` — 카테고리 수
- `GET /companies/:companyId/skills/:skillId` — 상세 정보
- `GET /companies/:companyId/skills/:skillId/files` — 파일 목록 + 콘텐츠
- `POST /companies/:companyId/skills` — 로컬 스킬 생성
- `PATCH /companies/:companyId/skills/:skillId` — 메타데이터 / 공유 범위 편집
- `DELETE /companies/:companyId/skills/:skillId` — 라이브러리에서 제거
- `POST /companies/:companyId/skills/install-catalog` — 카탈로그 스킬 설치
- `POST /companies/:companyId/skills/import` — GitHub / skills.sh / URL에서 가져오기
- `POST /companies/:companyId/skills/scan-projects` — 스킬 워크스페이스 스캔
- `POST /companies/:companyId/skills/:skillId/fork` — 스킬 포크
- `POST /companies/:companyId/skills/:skillId/versions` · `GET …/versions` · `GET …/versions/:versionId`
- `GET /companies/:companyId/skills/:skillId/update-status`
- `POST /companies/:companyId/skills/:skillId/install-update`
- `POST /companies/:companyId/skills/:skillId/reset`
- `POST /companies/:companyId/skills/:skillId/audit`
- `POST` / `DELETE /companies/:companyId/skills/:skillId/star`
- `GET` / `POST /companies/:companyId/skills/:skillId/comments` · `PATCH` / `DELETE …/comments/:commentId`

모든 변경 엔드포인트는 회사 스킬 관리 권한이 필요하며 회사 활동 로그에 기록됩니다.

## 참조: 카탈로그 패키지

카탈로그는 독자적인 게시 가능 패키지 `@paperclipai/skills-catalog`입니다.

- `catalog/bundled/**` 및 `catalog/optional/**` — 소스 스킬 디렉터리
- `scripts/build-catalog-manifest.ts` — 디렉터리를 `generated/catalog.json`으로 컴파일
- `scripts/validate-catalog.ts` — 프론트매터, 키, 신뢰 분류 유효성 검사
- `src/index.ts` — id, 키 또는 슬러그로 스킬을 해석하는 `catalogManifest`, `catalogSkills`, `getCatalogSkill(id)`, `resolveCatalogSkillRef(ref)` 내보내기

번들 카탈로그에 스킬을 추가하려면 `SKILL.md`로 디렉터리를 생성한 후 패키지의 `build:manifest`(및 `validate`) 스크립트를 실행하여 매니페스트를 재생성하고 검사합니다.

## 참고 항목

- [스킬 작성](writing-a-skill) — `SKILL.md` 형식 및 작성 모범 사례
- [에이전트 작동 방식](how-agents-work) — 스킬이 하트비트에 맞춰 작동하는 방식

```
         (o)___(o)
        /         \
       |  o     o  |
       |     <     |
        \  \___/  /
         \_______/
        /         \
   ~~~ ribbit ~~~  skills! ~~~
```
