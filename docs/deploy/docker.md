---
title: Docker
summary: Docker Compose 빠른 시작
---

Node나 pnpm을 로컬에 설치하지 않고 Docker에서 Paperclip을 실행합니다.

## Compose 빠른 시작(권장)

```sh
docker compose -f docker/docker-compose.quickstart.yml up --build
```

[http://localhost:3100](http://localhost:3100)을 엽니다.

기본값:

- 호스트 포트: `3100`
- 데이터 디렉터리: `./data/docker-paperclip`

환경 변수로 재정의합니다.

```sh
PAPERCLIP_PORT=3200 PAPERCLIP_DATA_DIR=../data/pc \
  docker compose -f docker/docker-compose.quickstart.yml up --build
```

**참고:** `PAPERCLIP_DATA_DIR`은 컴포즈 파일(`docker/`)을 기준으로 해석되므로, `../data/pc`는 프로젝트 루트의 `data/pc`에 매핑됩니다.

## 수동 Docker 빌드

```sh
docker build -t paperclip-local .
docker run --name paperclip \
  -p 3100:3100 \
  -e HOST=0.0.0.0 \
  -e PAPERCLIP_HOME=/paperclip \
  -v "$(pwd)/data/docker-paperclip:/paperclip" \
  paperclip-local
```

## 데이터 지속성

모든 데이터는 바인드 마운트(`./data/docker-paperclip`) 아래에 저장됩니다.

- 임베디드 PostgreSQL 데이터
- 업로드된 에셋
- 로컬 시크릿 키
- 에이전트 워크스페이스 데이터

## Docker의 로컬 어댑터 CLI

Docker 이미지에는 컨테이너 내부에서 `*_local` 어댑터가 실행될 수 있도록 다음 에이전트 CLI가 사전 설치되어 있습니다.

- `claude` (Anthropic Claude Code CLI) — `claude_local`
- `codex` (OpenAI Codex CLI) — `codex_local`
- `opencode` (OpenCode 멀티 프로바이더 CLI) — `opencode_local`
- `gemini` (Google Gemini CLI) — `gemini_local` (실험적)

컨테이너 내부에서 로컬 어댑터 실행을 활성화하려면 API 키를 전달합니다.

```sh
docker run --name paperclip \
  -p 3100:3100 \
  -e HOST=0.0.0.0 \
  -e PAPERCLIP_HOME=/paperclip \
  -e OPENAI_API_KEY=sk-... \
  -e ANTHROPIC_API_KEY=sk-... \
  -e GEMINI_API_KEY=... \
  -v "$(pwd)/data/docker-paperclip:/paperclip" \
  paperclip-local
```

각 어댑터는 프로바이더의 표준 자격 증명을 읽습니다. 예를 들어 `ANTHROPIC_API_KEY`(Claude), `OPENAI_API_KEY`(Codex), `GEMINI_API_KEY` 또는 `GOOGLE_API_KEY`(Gemini)입니다. OpenCode는 멀티 프로바이더이며 제공한 프로바이더 키를 사용합니다.

> **Gemini 키 제한 사항:** Google은 Gemini API 키가 Gemini API로 *제한*되도록 요구합니다(Google Cloud 콘솔에서 범위 지정). 제한되지 않은 키는 차단되며 `gemini_local` 실행은 인증 오류로 실패합니다. 제한된 키를 생성하거나, `gemini auth login`(OAuth)으로 인증하고 자격 증명이 컨테이너 재시작 후에도 유지되도록 데이터 볼륨을 통해 `~/.gemini`를 지속시키십시오.

이미지는 Gemini CLI가 컨테이너 내부에서 자체(Docker-in-Docker) 샌드박스를 시작하지 않도록 `GEMINI_SANDBOX=false`를 설정합니다. `gemini_local` 어댑터는 이미 실행마다 `--sandbox=none`을 전달하므로, 이 환경 변수는 컨테이너 내부에서 `gemini`를 수동으로 호출할 때만 영향을 미칩니다. 중첩 컨테이너 지원이 있고 CLI 수준 샌드박싱을 원한다면 이를 재정의하십시오.

API 키 없이도 앱은 정상적으로 실행됩니다. 어댑터 환경 검사는 누락된 사전 요구 사항을 표시합니다.
