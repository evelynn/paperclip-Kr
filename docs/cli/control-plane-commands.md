---
title: 컨트롤 플레인 명령어
summary: 이슈, 에이전트, 승인, 대시보드 명령어
---

이슈, 에이전트, 승인 등을 관리하는 클라이언트 측 명령어입니다.

## 이슈 명령어

```sh
# 이슈 목록 조회
pnpm paperclipai issue list [--status todo,in_progress] [--assignee-agent-id <id>] [--match text]

# 이슈 상세 조회
pnpm paperclipai issue get <issue-id-or-identifier>

# 이슈 생성
pnpm paperclipai issue create --title "..." [--description "..."] [--status todo] [--priority high]

# 이슈 수정
pnpm paperclipai issue update <issue-id> [--status in_progress] [--comment "..."]

# 댓글 추가
pnpm paperclipai issue comment <issue-id> --body "..." [--reopen]

# 작업 체크아웃
pnpm paperclipai issue checkout <issue-id> --agent-id <agent-id>

# 작업 반환
pnpm paperclipai issue release <issue-id>
```

## 회사 명령어

```sh
pnpm paperclipai company list
pnpm paperclipai company get <company-id>
pnpm paperclipai company current [--company-id <company-id>]

# 이식 가능한 폴더 패키지로 내보내기 (매니페스트 + 마크다운 파일 작성)
pnpm paperclipai company export <company-id> --out ./exports/acme --include company,agents

# 가져오기 미리 보기 (실제 쓰기 없음)
pnpm paperclipai company import \
  <owner>/<repo>/<path> \
  --target existing \
  --company-id <company-id> \
  --ref main \
  --collision rename \
  --dry-run

# 가져오기 적용
pnpm paperclipai company import \
  ./exports/acme \
  --target new \
  --new-company-name "Acme Imported" \
  --include company,agents
```

에이전트 인증을 사용할 경우, `company list` 또는 `company current`를 사용하여 범위가 지정된 회사를 조회합니다. `company list`는 먼저 보드 전체 목록을 시도하고, 접근이 거부되면 `--company-id`, `PAPERCLIP_COMPANY_ID`, 컨텍스트, 또는 `/api/agents/me` 순서로 폴백하여 해당 범위의 회사만 반환합니다. `company create`는 인스턴스 전체 설정 명령어이므로 보드/인스턴스 관리자 인증이 필요합니다.

## 에이전트 명령어

```sh
pnpm paperclipai agent list
pnpm paperclipai agent get <agent-id>
```

## 스킬 명령어

```sh
# 회사 상태를 변경하지 않고 앱 내장 카탈로그 스킬 탐색
pnpm paperclipai skills browse [--kind bundled|optional] [--category software-development] [--query github]
pnpm paperclipai skills search "pull request" [--json]

# 설치 전 카탈로그 메타데이터 및 파일 목록 확인
pnpm paperclipai skills inspect github-pr-workflow

# 카탈로그 스킬을 회사 스킬 라이브러리에 설치
# 에이전트에 스킬이 즉시 연결되지는 않습니다.
pnpm paperclipai skills install github-pr-workflow --company-id <company-id>
pnpm paperclipai skills install github-pr-workflow --as pr-flow --force --company-id <company-id>

# 외부 소스는 카탈로그 설치 대신 import를 사용합니다.
pnpm paperclipai skills import ./skills/my-skill --company-id <company-id>
pnpm paperclipai skills import owner/repo/path/to/skill --company-id <company-id>

# 설치/가져오기 후 원하는 회사 스킬을 에이전트에 연결
pnpm paperclipai skills agent sync <agent-id> --skill github-pr-workflow --company-id <company-id>
```

## 승인 명령어

```sh
# 승인 목록 조회
pnpm paperclipai approval list [--status pending]

# 승인 상세 조회
pnpm paperclipai approval get <approval-id>

# 승인 생성
pnpm paperclipai approval create --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]

# 승인
pnpm paperclipai approval approve <approval-id> [--decision-note "..."]

# 거부
pnpm paperclipai approval reject <approval-id> [--decision-note "..."]

# 수정 요청
pnpm paperclipai approval request-revision <approval-id> [--decision-note "..."]

# 재제출
pnpm paperclipai approval resubmit <approval-id> [--payload '{"..."}']

# 댓글
pnpm paperclipai approval comment <approval-id> --body "..."
```

## 활동 명령어

```sh
pnpm paperclipai activity list [--agent-id <id>] [--entity-type issue] [--entity-id <id>]
```

## 대시보드

```sh
pnpm paperclipai dashboard get
```

## 인스턴스 설정

```sh
pnpm paperclipai instance settings:general
pnpm paperclipai instance settings:general:update --payload-json '{...}'
pnpm paperclipai instance settings:experimental
pnpm paperclipai instance settings:experimental:update --payload-json '{...}'
```

실험적 기능은 선택적으로 활성화할 수 있으며, 호환성 보장 없이 제공됩니다. 언제든지 변경되거나 제거될 수 있습니다. 사용 시 주의하세요.

## 하트비트

```sh
pnpm paperclipai heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100]
```
