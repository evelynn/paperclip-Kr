# Docker에서 OpenClaw 실행 (로컬 개발)

로컬 개발 및 Paperclip OpenClaw 어댑터 통합 테스트를 위해 Docker 컨테이너에서 OpenClaw를 실행하는 방법입니다.

## 자동화된 조인 스모크 테스트 (먼저 권장)

Paperclip에는 엔드투엔드 조인 스모크 하네스가 포함되어 있습니다.

```bash
pnpm smoke:openclaw-join
```

하네스가 자동화하는 작업:

- 초대 생성 (`allowedJoinTypes=agent`)
- OpenClaw 에이전트 조인 요청 (`adapterType=openclaw`)
- 보드 승인
- 일회성 API 키 요청 (잘못된/재사용 요청 확인 포함)
- 도커화된 OpenClaw 방식 웹훅 수신기에 웨이크업 콜백 전달

기본적으로 사전 설정된 Docker 수신기 이미지(`docker/openclaw-smoke`)를 사용하므로 실행이 결정론적이며 수동 OpenClaw 설정 변경이 필요하지 않습니다.

권한 참고:

- 하네스는 보드 관리 작업을 수행합니다 (초대 생성, 조인 승인, 새 에이전트 웨이크업).
- 인증 모드에서는 보드/운영자 인증을 제공하거나 명시적인 권한 오류와 함께 조기 종료됩니다.

## 원클릭 OpenClaw 게이트웨이 UI (수동 Docker 흐름)

OpenClaw를 Docker에서 시작하고 호스트 브라우저 대시보드 URL을 한 번의 명령으로 출력합니다.

```bash
pnpm smoke:openclaw-docker-ui
```

기본 동작은 플래그 없이 실행 가능합니다: 페어링 관련 환경 변수 없이 명령어를 그대로 실행할 수 있습니다.

이 명령어가 하는 일:

- `/tmp/openclaw-docker`에 `openclaw/openclaw`를 클론/업데이트
- `openclaw:local` 빌드 (`OPENCLAW_BUILD=0`이 아닌 경우)
- `~/.openclaw-paperclip-smoke/openclaw.json` 및 Docker `.env` 아래 격리된 스모크 설정 작성
- 에이전트 모델 기본값을 OpenAI로 고정 (`openai/gpt-5.2` 및 OpenAI 폴백)
- Compose를 통해 `openclaw-gateway` 시작 (필수 `/tmp` tmpfs 재정의 포함)
- OpenClaw Docker 내부에서 접근 가능한 Paperclip 호스트 URL 조회 및 출력
- 헬스 확인 후 출력:
  - `http://127.0.0.1:18789/#token=...`
- 로컬 스모크 편의를 위해 기본적으로 Control UI 기기 페어링 비활성화

환경 변수:

- `OPENAI_API_KEY` (필수; 환경 또는 `~/.secrets`에서 로드)
- `OPENCLAW_DOCKER_DIR` (기본값 `/tmp/openclaw-docker`)
- `OPENCLAW_GATEWAY_PORT` (기본값 `18789`)
- `OPENCLAW_GATEWAY_TOKEN` (기본값 랜덤)
- `OPENCLAW_BUILD=0` 재빌드 건너뛰기
- `OPENCLAW_OPEN_BROWSER=1` macOS에서 URL 자동 열기
- `OPENCLAW_DISABLE_DEVICE_AUTH=1` (기본값) 로컬 스모크용 Control UI 기기 페어링 비활성화
- `OPENCLAW_DISABLE_DEVICE_AUTH=0` 페어링 활성화 유지 (브라우저를 `devices` CLI 명령으로 승인 필요)
- `OPENCLAW_MODEL_PRIMARY` (기본값 `openai/gpt-5.2`)
- `OPENCLAW_MODEL_FALLBACK` (기본값 `openai/gpt-5.2-chat-latest`)
- `OPENCLAW_CONFIG_DIR` (기본값 `~/.openclaw-paperclip-smoke`)
- `OPENCLAW_RESET_STATE=1` (기본값) 각 실행 시 스모크 에이전트 상태 초기화로 오래된 인증/세션 드리프트 방지
- `PAPERCLIP_HOST_PORT` (기본값 `3100`)
- `PAPERCLIP_HOST_FROM_CONTAINER` (기본값 `host.docker.internal`)

### 인증 모드

Paperclip 배포가 `authenticated` 모드인 경우 인증 컨텍스트를 제공하세요.

```bash
PAPERCLIP_AUTH_HEADER="Bearer <token>" pnpm smoke:openclaw-join
# 또는
PAPERCLIP_COOKIE="your_session_cookie=..." pnpm smoke:openclaw-join
```

### 네트워크 토폴로지 팁

- 로컬 동일 호스트 스모크: 기본 콜백은 `http://127.0.0.1:<port>/webhook`을 사용합니다.
- OpenClaw Docker 내부에서 `127.0.0.1`은 호스트 Paperclip 서버가 아닌 컨테이너 자체를 가리킵니다.
- Docker의 OpenClaw가 사용하는 초대/온보딩 URL은 스크립트가 출력하는 Paperclip URL을 사용하세요 (일반적으로 `http://host.docker.internal:3100`).
- Paperclip이 컨테이너에서 보이는 호스트를 호스트명 오류로 거부하면, 호스트에서 다음을 허용하세요.

```bash
pnpm paperclipai allowed-hostname host.docker.internal
```

그런 다음 Paperclip을 재시작하고 스모크 스크립트를 다시 실행하세요.
- Docker/원격 OpenClaw: 접근 가능한 호스트명(Docker 호스트 별칭, Tailscale 호스트명, 또는 공개 도메인)을 선호합니다.
- 인증/프라이빗 모드: 필요한 경우 허용 목록에 호스트명이 있는지 확인하세요.

```bash
pnpm paperclipai allowed-hostname <host>
```

## 사전 요구 사항

- **Docker Desktop v29+** (Docker 샌드박스 지원 포함)
- **2 GB+ RAM** Docker 이미지 빌드에 사용 가능
- **API 키** `~/.secrets`에 저장 (최소 `OPENAI_API_KEY`)

## 옵션 A: Docker 샌드박스 (권장)

Docker 샌드박스는 Docker Compose보다 더 나은 격리(마이크로VM 기반)와 간단한 설정을 제공합니다. Docker Desktop v29+ / Docker Sandbox v0.12+ 필요.

```bash
# 1. OpenClaw 저장소 클론 및 이미지 빌드
git clone https://github.com/openclaw/openclaw.git /tmp/openclaw-docker
cd /tmp/openclaw-docker
docker build -t openclaw:local -f Dockerfile .

# 2. 빌드된 이미지로 샌드박스 생성
docker sandbox create --name openclaw -t openclaw:local shell ~/.openclaw/workspace

# 3. OpenAI API 네트워크 접근 허용
docker sandbox network proxy openclaw \
  --allow-host api.openai.com \
  --allow-host localhost

# 4. 샌드박스 내에 설정 작성
docker sandbox exec openclaw sh -c '
mkdir -p /home/node/.openclaw/workspace /home/node/.openclaw/identity /home/node/.openclaw/credentials
cat > /home/node/.openclaw/openclaw.json << INNEREOF
{
  "gateway": {
    "mode": "local",
    "port": 18789,
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "sandbox-dev-token-12345"
    },
    "controlUi": { "enabled": true }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "openai/gpt-5.2",
        "fallbacks": ["openai/gpt-5.2-chat-latest"]
      },
      "workspace": "/home/node/.openclaw/workspace"
    }
  }
}
INNEREOF
chmod 600 /home/node/.openclaw/openclaw.json
'

# 5. 게이트웨이 시작 (~/.secrets에서 API 키 전달)
source ~/.secrets
docker sandbox exec -d \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  -w /app openclaw \
  node dist/index.js gateway --bind loopback --port 18789

# 6. ~15초 대기 후 확인
sleep 15
docker sandbox exec openclaw curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18789/
# 200이 출력되어야 합니다.

# 7. 상태 확인
docker sandbox exec -e OPENAI_API_KEY="$OPENAI_API_KEY" -w /app openclaw \
  node dist/index.js status
```

### 샌드박스 관리

```bash
# 샌드박스 목록
docker sandbox ls

# 샌드박스에 쉘 접속
docker sandbox exec -it openclaw bash

# 샌드박스 중지 (상태 보존)
docker sandbox stop openclaw

# 샌드박스 제거
docker sandbox rm openclaw

# 샌드박스 버전 확인
docker sandbox version
```

## 옵션 B: Docker Compose (폴백)

Docker 샌드박스를 사용할 수 없는 경우 사용하세요 (Docker Desktop < v29).

```bash
# 1. OpenClaw 저장소 클론
git clone https://github.com/openclaw/openclaw.git /tmp/openclaw-docker
cd /tmp/openclaw-docker

# 2. Docker 이미지 빌드 (첫 실행 시 ~5-10분)
docker build -t openclaw:local -f Dockerfile .

# 3. 설정 디렉터리 생성
mkdir -p ~/.openclaw/workspace ~/.openclaw/identity ~/.openclaw/credentials
chmod 700 ~/.openclaw ~/.openclaw/credentials

# 4. 게이트웨이 토큰 생성
export OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)
echo "Your gateway token: $OPENCLAW_GATEWAY_TOKEN"

# 5. 설정 파일 생성
cat > ~/.openclaw/openclaw.json << EOF
{
  "gateway": {
    "mode": "local",
    "port": 18789,
    "bind": "lan",
    "auth": {
      "mode": "token",
      "token": "$OPENCLAW_GATEWAY_TOKEN"
    },
    "controlUi": {
      "enabled": true,
      "allowedOrigins": ["http://127.0.0.1:18789"]
    }
  },
  "env": {
    "OPENAI_API_KEY": "\${OPENAI_API_KEY}"
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "openai/gpt-5.2",
        "fallbacks": ["openai/gpt-5.2-chat-latest"]
      },
      "workspace": "/home/node/.openclaw/workspace"
    }
  }
}
EOF
chmod 600 ~/.openclaw/openclaw.json

# 6. .env 파일 생성 (~/.secrets에서 API 키 로드)
source ~/.secrets
cat > .env << EOF
OPENCLAW_CONFIG_DIR=$HOME/.openclaw
OPENCLAW_WORKSPACE_DIR=$HOME/.openclaw/workspace
OPENCLAW_GATEWAY_PORT=18789
OPENCLAW_BRIDGE_PORT=18790
OPENCLAW_GATEWAY_BIND=lan
OPENCLAW_GATEWAY_TOKEN=$OPENCLAW_GATEWAY_TOKEN
OPENCLAW_IMAGE=openclaw:local
OPENAI_API_KEY=$OPENAI_API_KEY
OPENCLAW_EXTRA_MOUNTS=
OPENCLAW_HOME_VOLUME=
OPENCLAW_DOCKER_APT_PACKAGES=
EOF

# 7. docker-compose.yml에 tmpfs 추가 (필수 — 알려진 문제 참조)
# openclaw-gateway 및 openclaw-cli 서비스 모두에 추가:
#   tmpfs:
#     - /tmp:exec,size=512M

# 8. 게이트웨이 시작
docker compose up -d openclaw-gateway

# 9. 시작을 위해 ~15초 대기 후 대시보드 URL 조회
sleep 15
docker compose run --rm openclaw-cli dashboard --no-open
```

대시보드 URL 형식: `http://127.0.0.1:18789/#token=<your-token>`

### Docker Compose 관리

```bash
cd /tmp/openclaw-docker

# 중지
docker compose down

# 다시 시작 (재빌드 불필요)
docker compose up -d openclaw-gateway

# 로그 확인
docker compose logs -f openclaw-gateway

# 상태 확인
docker compose run --rm openclaw-cli status

# 대시보드 URL 조회
docker compose run --rm openclaw-cli dashboard --no-open
```

## 알려진 문제 및 해결 방법

### 컨테이너 시작 시 "no space left on device"

Docker Desktop 가상 디스크가 가득 찼을 수 있습니다.

```bash
docker system df                   # 사용량 확인
docker system prune -f             # 중지된 컨테이너, 사용하지 않는 네트워크 제거
docker image prune -f              # 댕글링 이미지 제거
```

### "Unable to create fallback OpenClaw temp dir: /tmp/openclaw-1000" (Compose만 해당)

컨테이너가 `/tmp`에 쓸 수 없습니다. `docker-compose.yml`의 **두 서비스 모두**에 `tmpfs` 마운트를 추가하세요.

```yaml
services:
  openclaw-gateway:
    tmpfs:
      - /tmp:exec,size=512M
  openclaw-cli:
    tmpfs:
      - /tmp:exec,size=512M
```

이 문제는 Docker 샌드박스 방식에는 영향을 미치지 않습니다.

### 커뮤니티 템플릿 이미지의 Node 버전 불일치

일부 커뮤니티 빌드 샌드박스 템플릿(예: `olegselajev241/openclaw-dmr:latest`)은 Node 20을 사용하지만, OpenClaw는 Node >=22.12.0이 필요합니다. Node 22가 포함된 로컬 빌드 이미지 `openclaw:local`을 샌드박스 템플릿으로 사용하세요.

### 시작 후 게이트웨이 응답에 ~15초 소요

Node.js 게이트웨이는 초기화 시간이 필요합니다. `http://127.0.0.1:18789/`에 접속하기 전에 15초 기다리세요.

### CLAUDE_AI_SESSION_KEY 경고 (Compose만 해당)

다음 Docker Compose 경고는 무해하며 무시할 수 있습니다.
```
level=warning msg="The \"CLAUDE_AI_SESSION_KEY\" variable is not set. Defaulting to a blank string."
```

## 설정

설정 파일: `~/.openclaw/openclaw.json` (JSON5 형식)

주요 설정:
- `gateway.auth.token` — 웹 UI 및 API 인증 토큰
- `agents.defaults.model.primary` — AI 모델 (`openai/gpt-5.2` 또는 최신 버전 사용)
- `env.OPENAI_API_KEY` — `OPENAI_API_KEY` 환경 변수 참조 (Compose 방식)

API 키는 `~/.secrets`에 저장되며 환경 변수를 통해 컨테이너에 전달됩니다.

## 참조

- [OpenClaw Docker 문서](https://docs.openclaw.ai/install/docker)
- [OpenClaw 설정 참조](https://docs.openclaw.ai/gateway/configuration-reference)
- [Docker 블로그: Docker 샌드박스에서 안전하게 OpenClaw 실행](https://www.docker.com/blog/run-openclaw-securely-in-docker-sandboxes/)
- [Docker 샌드박스 문서](https://docs.docker.com/ai/sandboxes)
- [OpenAI 모델](https://platform.openai.com/docs/models) — 현재 모델: gpt-5.2, gpt-5.2-chat-latest, gpt-5.2-pro
