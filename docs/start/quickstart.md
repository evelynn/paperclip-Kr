---
title: 빠른 시작
summary: 몇 분 안에 Paperclip 실행하기
---

5분 이내에 Paperclip을 로컬에서 실행하세요.

## 빠른 시작 (권장)

```sh
npx paperclipai onboard --yes
```

이 명령어는 설정 과정을 안내하고, 환경을 구성하며, Paperclip을 실행합니다.

이미 Paperclip이 설치되어 있다면, `onboard`를 다시 실행해도 현재 설정과 데이터 경로가 유지됩니다. 설정을 변경하려면 `paperclipai configure`를 사용하세요.

나중에 Paperclip을 다시 시작하려면:

```sh
npx paperclipai run
```

> **참고:** `npx`로 설치한 경우, 항상 `npx paperclipai`를 사용하여 명령어를 실행하세요. `pnpm paperclipai` 형식은 Paperclip 저장소를 클론한 경우에만 작동합니다 (아래 로컬 개발 섹션 참조).

## 로컬 개발

Paperclip 자체에 기여하는 개발자를 위한 안내입니다. 사전 요구 사항: Node.js 20+ 및 pnpm 9+.

저장소를 클론한 후:

```sh
pnpm install
pnpm dev
```

이 명령어는 API 서버와 UI를 [http://localhost:3100](http://localhost:3100)에서 시작합니다.

외부 데이터베이스가 필요하지 않습니다 — Paperclip은 기본적으로 임베디드 PostgreSQL 인스턴스를 사용합니다.

클론된 저장소에서 작업할 때 다음을 사용할 수도 있습니다.

```sh
pnpm paperclipai run
```

이 명령어는 설정이 없을 경우 자동으로 온보딩하고, 자동 수리 기능이 있는 헬스 체크를 실행하며, 서버를 시작합니다.

## 다음 단계

Paperclip이 실행되면:

1. 웹 UI에서 첫 번째 회사를 만듭니다.
2. 회사 목표를 정의합니다.
3. CEO 에이전트를 만들고 어댑터를 설정합니다.
4. 더 많은 에이전트로 조직도를 구성합니다.
5. 예산을 설정하고 초기 작업을 배정합니다.
6. 시작하면 — 에이전트들이 하트비트를 시작하고 회사가 운영됩니다.

<Card title="핵심 개념" href="/start/core-concepts">
  Paperclip의 핵심 개념을 알아보세요.
</Card>
