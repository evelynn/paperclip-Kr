---
title: 로컬 개발
summary: 로컬 개발을 위한 Paperclip 설정
---

외부 의존성 없이 Paperclip을 로컬에서 실행합니다.

## 사전 요구 사항

- Node.js 20+
- pnpm 9+

## 개발 서버 시작

```sh
pnpm install
pnpm dev
```

다음이 시작됩니다.

- **API 서버**: `http://localhost:3100`
- **UI**: 개발 미들웨어 모드에서 API 서버가 제공(동일 출처)

Docker 또는 외부 데이터베이스가 필요하지 않습니다. Paperclip은 자동으로 임베디드 PostgreSQL을 사용합니다.

## 원클릭 부트스트랩

처음 설치 시:

```sh
pnpm paperclipai run
```

다음을 수행합니다.

1. 구성이 없으면 자동 온보딩합니다.
2. 복구가 활성화된 `paperclipai doctor`를 실행합니다.
3. 검사를 통과하면 서버를 시작합니다.

## 개발 환경의 바인드 프리셋

기본 `pnpm dev`는 루프백 전용 바인딩으로 `local_trusted`를 유지합니다.

로그인 활성화와 함께 비공개 네트워크로 Paperclip을 열려면:

```sh
pnpm dev --bind lan
```

감지된 tailnet 주소에서 Tailscale 전용 바인딩을 위해:

```sh
pnpm dev --bind tailnet
```

레거시 별칭은 여전히 작동하며 이전의 광범위한 비공개 네트워크 동작에 매핑됩니다.

```sh
pnpm dev --tailscale-auth
pnpm dev --authenticated-private
```

추가 비공개 호스트명 허용:

```sh
pnpm paperclipai allowed-hostname dotta-macbook-pro
```

전체 설정 및 문제 해결은 [Tailscale 비공개 접근](/deploy/tailscale-private-access)을 참조하십시오.

## 상태 검사

```sh
curl http://localhost:3100/api/health
# -> {"status":"ok"}

curl http://localhost:3100/api/companies
# -> []
```

## 개발 데이터 초기화

로컬 데이터를 초기화하고 새로 시작하려면:

```sh
rm -rf ~/.paperclip/instances/default/db
pnpm dev
```

## 데이터 위치

| 데이터 | 경로 |
|------|------|
| 구성 | `~/.paperclip/instances/default/config.json` |
| 데이터베이스 | `~/.paperclip/instances/default/db` |
| 스토리지 | `~/.paperclip/instances/default/data/storage` |
| 시크릿 키 | `~/.paperclip/instances/default/secrets/master.key` |
| 로그 | `~/.paperclip/instances/default/logs` |

환경 변수로 재정의합니다.

```sh
PAPERCLIP_HOME=/custom/path PAPERCLIP_INSTANCE_ID=dev pnpm paperclipai run
```
