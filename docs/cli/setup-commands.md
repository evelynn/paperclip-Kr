---
title: 설정 명령어
summary: onboard, run, doctor, configure
---

인스턴스 설정 및 진단 명령어입니다.

## `paperclipai run`

한 번의 명령으로 부트스트랩 및 시작:

```sh
pnpm paperclipai run
```

수행 동작:

1. 설정이 없을 경우 자동 온보딩
2. 수리 기능이 활성화된 `paperclipai doctor` 실행
3. 검사 통과 시 서버 시작

특정 인스턴스 선택:

```sh
pnpm paperclipai run --instance dev
```

## `paperclipai onboard`

최초 설정 인터랙티브 마법사:

```sh
pnpm paperclipai onboard
```

Paperclip이 이미 설정된 경우, `onboard`를 다시 실행해도 기존 설정이 유지됩니다. 기존 설치의 설정을 변경하려면 `paperclipai configure`를 사용하세요.

첫 번째 선택지:

1. `빠른 시작` (권장): 로컬 기본값 (임베디드 데이터베이스, LLM 프로바이더 없음, 로컬 디스크 스토리지, 기본 시크릿)
2. `고급 설정`: 전체 인터랙티브 설정

온보딩 후 즉시 시작:

```sh
pnpm paperclipai onboard --run
```

비인터랙티브 기본값 + 즉시 시작 (서버 리슨 시 브라우저 열기):

```sh
pnpm paperclipai onboard --yes
```

기존 설치에서 `--yes`는 현재 설정을 보존하고 해당 설정으로 Paperclip을 시작합니다.

## `paperclipai doctor`

선택적 자동 수리 기능이 있는 헬스 체크:

```sh
pnpm paperclipai doctor
pnpm paperclipai doctor --repair
```

검증 항목:

- 서버 설정
- 데이터베이스 연결
- AWS Secrets Manager 선택 시 비시크릿 환경 설정을 포함한 시크릿 어댑터 설정
- 스토리지 설정
- 누락된 주요 파일

## `paperclipai configure`

설정 섹션 업데이트:

```sh
pnpm paperclipai configure --section server
pnpm paperclipai configure --section secrets
pnpm paperclipai configure --section storage
```

`--section secrets`는 특정 회사 볼트를 대상으로 하지 않는 시크릿의 폴백으로 사용되는 배포 수준 프로바이더를 업데이트합니다. 회사별 프로바이더 볼트(명명된 인스턴스, 기본 볼트 선택, 프로바이더당 여러 볼트, 출시 예정 GCP/Vault)는 보드 UI의 `Company Settings → Secrets → Provider vaults` 및 `/api/companies/{companyId}/secret-provider-configs` API에서 관리합니다.

## `paperclipai env`

해석된 환경 설정 표시:

```sh
pnpm paperclipai env
```

설정된 경우 `PAPERCLIP_BIND` 및 `PAPERCLIP_BIND_HOST`와 같은 바인드 지향 배포 설정도 포함됩니다.

## `paperclipai allowed-hostname`

인증/프라이빗 모드에서 사설 호스트명 허용:

```sh
pnpm paperclipai allowed-hostname my-tailscale-host
```

## 로컬 스토리지 경로

| 데이터 | 기본 경로 |
|------|-------------|
| 설정 | `~/.paperclip/instances/default/config.json` |
| 데이터베이스 | `~/.paperclip/instances/default/db` |
| 로그 | `~/.paperclip/instances/default/logs` |
| 스토리지 | `~/.paperclip/instances/default/data/storage` |
| 시크릿 키 | `~/.paperclip/instances/default/secrets/master.key` |

다음으로 재정의할 수 있습니다.

```sh
PAPERCLIP_HOME=/custom/home PAPERCLIP_INSTANCE_ID=dev pnpm paperclipai run
```

또는 모든 명령어에서 `--data-dir`을 직접 지정합니다.

```sh
pnpm paperclipai run --data-dir ./tmp/paperclip-dev
pnpm paperclipai doctor --data-dir ./tmp/paperclip-dev
```
