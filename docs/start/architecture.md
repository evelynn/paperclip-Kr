---
title: 아키텍처
summary: 스택 개요, 요청 흐름, 어댑터 모델
---

Paperclip은 네 가지 주요 레이어로 구성된 모노레포입니다.

## 스택 개요

```
┌─────────────────────────────────────┐
│  React UI (Vite)                    │
│  Dashboard, org management, tasks   │
├─────────────────────────────────────┤
│  Express.js REST API (Node.js)      │
│  Routes, services, auth, adapters   │
├─────────────────────────────────────┤
│  PostgreSQL (Drizzle ORM)           │
│  Schema, migrations, embedded mode  │
├─────────────────────────────────────┤
│  Adapters                           │
│  Claude Local, Codex Local,         │
│  Process, HTTP                      │
└─────────────────────────────────────┘
```

## 기술 스택

| 레이어 | 기술 |
|-------|-----------|
| 프론트엔드 | React 19, Vite 6, React Router 7, Radix UI, Tailwind CSS 4, TanStack Query |
| 백엔드 | Node.js 20+, Express.js 5, TypeScript |
| 데이터베이스 | PostgreSQL 17 (또는 임베디드 PGlite), Drizzle ORM |
| 인증 | Better Auth (세션 + API 키) |
| 어댑터 | Claude Code CLI, Codex CLI, 쉘 프로세스, HTTP 웹훅 |
| 패키지 매니저 | pnpm 9 (워크스페이스 사용) |

## 저장소 구조

```
paperclip/
├── ui/                          # React 프론트엔드
│   ├── src/pages/              # 라우트 페이지
│   ├── src/components/         # React 컴포넌트
│   ├── src/api/                # API 클라이언트
│   └── src/context/            # React 컨텍스트 프로바이더
│
├── server/                      # Express.js API
│   ├── src/routes/             # REST 엔드포인트
│   ├── src/services/           # 비즈니스 로직
│   ├── src/adapters/           # 에이전트 실행 어댑터
│   └── src/middleware/         # 인증, 로깅
│
├── packages/
│   ├── db/                      # Drizzle 스키마 + 마이그레이션
│   ├── shared/                  # API 타입, 상수, 유효성 검사기
│   ├── adapter-utils/           # 어댑터 인터페이스 및 헬퍼
│   └── adapters/
│       ├── claude-local/        # Claude Code 어댑터
│       └── codex-local/         # OpenAI Codex 어댑터
│
├── skills/                      # 에이전트 스킬
│   └── paperclip/               # 핵심 Paperclip 스킬 (하트비트 프로토콜)
│
├── cli/                         # CLI 클라이언트
│   └── src/                     # 설정 및 컨트롤 플레인 명령어
│
└── doc/                         # 내부 문서
```

## 요청 흐름

하트비트가 발생하면:

1. **트리거** — 스케줄러, 수동 호출, 또는 이벤트(배정, 멘션)가 하트비트를 트리거합니다.
2. **어댑터 호출** — 서버가 설정된 어댑터의 `execute()` 함수를 호출합니다.
3. **에이전트 프로세스** — 어댑터가 Paperclip 환경 변수와 프롬프트를 사용해 에이전트(예: Claude Code CLI)를 실행합니다.
4. **에이전트 작업** — 에이전트가 Paperclip의 REST API를 호출하여 배정을 확인하고, 작업을 체크아웃하며, 작업을 수행하고, 상태를 업데이트합니다.
5. **결과 캡처** — 어댑터가 stdout를 캡처하고, 사용량/비용 데이터를 파싱하며, 세션 상태를 추출합니다.
6. **실행 기록** — 서버가 실행 결과, 비용, 다음 하트비트를 위한 세션 상태를 기록합니다.

## 어댑터 모델

어댑터는 Paperclip과 에이전트 런타임 사이의 브리지입니다. 각 어댑터는 세 가지 모듈로 구성된 패키지입니다.

- **서버 모듈** — 에이전트를 실행/호출하는 `execute()` 함수와 환경 진단
- **UI 모듈** — 실행 뷰어용 stdout 파서, 에이전트 생성을 위한 설정 폼 필드
- **CLI 모듈** — `paperclipai run --watch`용 터미널 포매터

내장 어댑터: `claude_local`, `codex_local`, `process`, `http`. 모든 런타임에 맞는 커스텀 어댑터를 만들 수 있습니다.

## 핵심 설계 결정 사항

- **실행 플레인이 아닌 컨트롤 플레인** — Paperclip은 에이전트를 오케스트레이션하며, 직접 실행하지 않습니다.
- **회사 범위** — 모든 엔티티는 정확히 하나의 회사에 속하며, 엄격한 데이터 경계를 가집니다.
- **단일 담당자 작업** — 원자적 체크아웃으로 동일 작업에 대한 동시 작업을 방지합니다.
- **어댑터 무관** — HTTP API를 호출할 수 있는 모든 런타임이 에이전트로 동작할 수 있습니다.
- **기본 임베디드 모드** — 임베디드 PostgreSQL을 사용하는 설정 없는 로컬 모드를 제공합니다.
