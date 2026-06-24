---
title: Tailscale 비공개 접근
summary: Tailscale 친화적 바인드 프리셋으로 Paperclip을 실행하고 다른 기기에서 접속합니다
---

`localhost`에서만이 아니라 Tailscale(또는 비공개 LAN/VPN)을 통해 Paperclip에 접근하고 싶을 때 사용합니다.

## 1. 비공개 인증 모드로 Paperclip 시작

```sh
pnpm dev --bind tailnet
```

권장 동작:

- `PAPERCLIP_DEPLOYMENT_MODE=authenticated`
- `PAPERCLIP_DEPLOYMENT_EXPOSURE=private`
- `PAPERCLIP_BIND=tailnet`

이전의 광범위한 비공개 네트워크 동작을 원한다면 다음을 사용하십시오.

```sh
pnpm dev --bind lan
```

레거시 별칭은 여전히 `authenticated/private + bind=lan`에 매핑됩니다.

pnpm dev --authenticated-private
pnpm dev --tailscale-auth
```

## 2. 접근 가능한 Tailscale 주소 확인

Paperclip을 실행하는 머신에서:

```sh
tailscale ip -4
```

Tailscale MagicDNS 호스트명(예: `my-macbook.tailnet.ts.net`)을 사용할 수도 있습니다.

## 3. 다른 기기에서 Paperclip 열기

Tailscale IP 또는 MagicDNS 호스트와 Paperclip 포트를 사용합니다.

```txt
http://<tailscale-host-or-ip>:3100
```

예시:

```txt
http://my-macbook.tailnet.ts.net:3100
```

## 4. 필요할 때 사용자 지정 비공개 호스트명 허용

사용자 지정 비공개 호스트명으로 Paperclip에 접근하는 경우, 허용 목록에 추가하십시오.

```sh
pnpm paperclipai allowed-hostname my-macbook.tailnet.ts.net
```

## 5. 서버 접근 가능성 확인

원격 Tailscale 연결 기기에서:

```sh
curl http://<tailscale-host-or-ip>:3100/api/health
```

예상 결과:

```json
{"status":"ok"}
```

## 문제 해결

- 비공개 호스트명에서 로그인 또는 리디렉션 오류: `paperclipai allowed-hostname`으로 추가하십시오.
- 앱이 `localhost`에서만 작동함: 일반 `pnpm dev` 대신 `--bind lan` 또는 `--bind tailnet`으로 시작했는지 확인하십시오.
- 로컬에서는 연결되지만 원격에서는 안 됨: 두 기기가 동일한 Tailscale 네트워크에 있고 포트 `3100`에 접근 가능한지 확인하십시오.
