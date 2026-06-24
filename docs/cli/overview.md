---
title: CLI 개요
summary: CLI 설치 및 설정
---

Paperclip CLI는 인스턴스 설정, 진단, 컨트롤 플레인 작업을 처리합니다.

## 사용법

```sh
pnpm paperclipai --help
```

## 전역 옵션

모든 명령어에서 사용 가능합니다.

| 플래그 | 설명 |
|------|-------------|
| `--data-dir <path>` | 로컬 Paperclip 데이터 루트 (`~/.paperclip`과 분리) |
| `--api-base <url>` | API 베이스 URL |
| `--api-key <token>` | API 인증 토큰 |
| `--context <path>` | 컨텍스트 파일 경로 |
| `--profile <name>` | 컨텍스트 프로파일 이름 |
| `--json` | JSON 형식으로 출력 |

회사 범위 명령어는 `--company-id <id>`도 허용합니다.

로컬 격리 인스턴스를 위해 실행하는 명령어에 `--data-dir`을 지정하세요.

```sh
pnpm paperclipai run --data-dir ./tmp/paperclip-dev
```

## 컨텍스트 프로파일

플래그 반복을 피하기 위해 기본값을 저장합니다.

```sh
# 기본값 설정
pnpm paperclipai context set --api-base http://localhost:3100 --company-id <id>

# 현재 컨텍스트 확인
pnpm paperclipai context show

# 프로파일 목록 조회
pnpm paperclipai context list

# 프로파일 전환
pnpm paperclipai context use default
```

컨텍스트에 시크릿을 저장하지 않으려면 환경 변수를 사용하세요.

```sh
pnpm paperclipai context set --api-key-env-var-name PAPERCLIP_API_KEY
export PAPERCLIP_API_KEY=...
```

시크릿 작업은 `paperclipai secrets` 하위에서 사용 가능합니다.

```sh
pnpm paperclipai secrets declarations --company-id <company-id> --kind secret
pnpm paperclipai secrets create --company-id <company-id> --name anthropic-api-key --value-env ANTHROPIC_API_KEY
pnpm paperclipai secrets link --company-id <company-id> --name prod-stripe-key --provider aws_secrets_manager --external-ref <provider-ref>
pnpm paperclipai secrets doctor --company-id <company-id>
pnpm paperclipai secrets migrate-inline-env --company-id <company-id> --apply
```

컨텍스트는 `~/.paperclip/context.json`에 저장됩니다.

## 명령어 카테고리

CLI는 두 가지 카테고리를 가집니다.

1. **[설정 명령어](/cli/setup-commands)** — 인스턴스 부트스트랩, 진단, 설정
2. **[컨트롤 플레인 명령어](/cli/control-plane-commands)** — 이슈, 에이전트, 승인, 활동
