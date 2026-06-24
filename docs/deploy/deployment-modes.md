---
title: 배포 모드
summary: local_trusted vs authenticated (private/public)
---

Paperclip은 서로 다른 보안 프로파일을 가진 두 가지 런타임 모드를 지원합니다. 접근 가능성은 `bind`로 별도로 구성합니다.

## `local_trusted`

기본 모드입니다. 단일 운영자 로컬 사용에 최적화되어 있습니다.

- **호스트 바인딩**: 루프백 전용(localhost)
- **바인드**: `loopback`
- **인증**: 로그인 불필요
- **사용 사례**: 로컬 개발, 개인 실험
- **보드 ID**: 자동 생성된 로컬 보드 사용자

```sh
# 온보딩 중 설정
pnpm paperclipai onboard
# "local_trusted" 선택
```

## `authenticated`

로그인이 필요합니다. 두 가지 노출 정책을 지원합니다.

### `authenticated` + `private`

비공개 네트워크 접근용(Tailscale, VPN, LAN).

- **인증**: Better Auth를 통한 로그인 필요
- **URL 처리**: 자동 기본 URL 모드(낮은 마찰)
- **호스트 신뢰**: 비공개 호스트 신뢰 정책 필요
- **바인드**: `loopback`, `lan`, `tailnet`, 또는 `custom` 선택

```sh
pnpm paperclipai onboard
# "authenticated" -> "private" 선택
```

사용자 지정 Tailscale 호스트명 허용:

```sh
pnpm paperclipai allowed-hostname my-machine
```

### `authenticated` + `public`

인터넷 공개 배포용.

- **인증**: 로그인 필요
- **URL**: 명시적 공개 URL 필요
- **보안**: doctor에서 더 엄격한 배포 검사
- **바인드**: 일반적으로 리버스 프록시 뒤의 `loopback`. `lan/custom`은 고급 설정

```sh
pnpm paperclipai onboard
# "authenticated" -> "public" 선택
```

## 보드 클레임 흐름

`local_trusted`에서 `authenticated`로 마이그레이션할 때 Paperclip은 시작 시 일회성 클레임 URL을 출력합니다.

```
/board-claim/<token>?code=<code>
```

로그인된 사용자가 이 URL을 방문하여 보드 소유권을 클레임합니다. 이를 통해:

- 현재 사용자가 인스턴스 관리자로 승격됩니다.
- 자동 생성된 로컬 보드 관리자가 강등됩니다.
- 클레임하는 사용자의 활성 회사 멤버십이 보장됩니다.

## 모드 변경

배포 모드를 업데이트합니다.

```sh
pnpm paperclipai configure --section server
```

환경 변수를 통한 런타임 재정의:

```sh
PAPERCLIP_DEPLOYMENT_MODE=authenticated PAPERCLIP_BIND=lan pnpm paperclipai run
```
