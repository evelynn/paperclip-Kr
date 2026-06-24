---
title: 배포 개요
summary: 한눈에 보는 배포 모드
---

Paperclip은 마찰 없는 로컬 환경부터 인터넷 공개 프로덕션까지 세 가지 배포 구성을 지원합니다.

## 배포 모드

| 모드 | 인증 | 최적 사용 사례 |
|------|------|----------|
| `local_trusted` | 로그인 불필요 | 단일 운영자 로컬 머신 |
| `authenticated` + `private` | 로그인 필요 | 비공개 네트워크(Tailscale, VPN, LAN) |
| `authenticated` + `public` | 로그인 필요 | 인터넷 공개 클라우드 배포 |

## 빠른 비교

### Local Trusted(기본값)

- 루프백 전용 호스트 바인딩(localhost)
- 사용자 로그인 흐름 없음
- 가장 빠른 로컬 시작
- 최적 사용 사례: 개인 개발 및 실험

### Authenticated + Private

- Better Auth를 통한 로그인 필요
- 네트워크 액세스를 위해 모든 인터페이스에 바인딩
- 자동 기본 URL 모드(낮은 마찰)
- 최적 사용 사례: Tailscale 또는 로컬 네트워크를 통한 팀 액세스

### Authenticated + Public

- 로그인 필요
- 명시적 공개 URL 필요
- 더 엄격한 보안 검사
- 최적 사용 사례: 클라우드 호스팅, 인터넷 공개 배포

## 모드 선택

- **Paperclip을 처음 사용해보시나요?** `local_trusted`(기본값)를 사용하십시오.
- **비공개 네트워크에서 팀과 공유하시나요?** `authenticated` + `private`를 사용하십시오.
- **클라우드에 배포하시나요?** `authenticated` + `public`을 사용하십시오. [AWS ECS Fargate 가이드](aws-ecs.md)를 참조하십시오.

온보딩 중 모드를 설정합니다.

```sh
pnpm paperclipai onboard
```

또는 나중에 업데이트합니다.

```sh
pnpm paperclipai configure --section server
```
