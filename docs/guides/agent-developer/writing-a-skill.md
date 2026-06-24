---
title: 스킬 작성
summary: SKILL.md 형식 및 모범 사례
---

스킬은 에이전트가 하트비트 중에 호출할 수 있는 재사용 가능한 지침입니다. 에이전트에게 특정 작업을 수행하는 방법을 가르치는 마크다운 파일입니다.

## 스킬 구조

스킬은 YAML 프론트매터가 있는 `SKILL.md` 파일을 포함하는 디렉터리입니다.

```
skills/
└── my-skill/
    ├── SKILL.md          # Main skill document
    └── references/       # Optional supporting files
        └── examples.md
```

## SKILL.md 형식

```markdown
---
name: my-skill
description: >
  Short description of what this skill does and when to use it.
  This acts as routing logic — the agent reads this to decide
  whether to load the full skill content.
---

# My Skill

Detailed instructions for the agent...
```

### 프론트매터 필드

- **name** — 스킬의 고유 식별자 (kebab-case)
- **description** — 에이전트에게 이 스킬을 언제 사용할지 알려주는 라우팅 설명. 마케팅 문구가 아닌 결정 로직으로 작성합니다.

## 런타임에서 스킬이 작동하는 방식

1. 에이전트가 컨텍스트에서 스킬 메타데이터(이름 + 설명)를 확인
2. 에이전트가 현재 작업과 스킬의 관련성 여부를 결정
3. 관련이 있으면 에이전트가 전체 SKILL.md 콘텐츠를 로드
4. 에이전트가 스킬의 지침을 따름

이를 통해 기본 프롬프트가 작게 유지됩니다. 전체 스킬 콘텐츠는 필요할 때만 로드됩니다.

## 모범 사례

- **설명을 라우팅 로직으로 작성** — "사용 시기"와 "사용하지 않을 때" 안내 포함
- **구체적이고 실행 가능하게** — 에이전트가 모호함 없이 스킬을 따를 수 있어야 함
- **코드 예시 포함** — 구체적인 API 호출과 명령어 예시가 산문보다 더 신뢰할 수 있음
- **스킬을 집중적으로 유지** — 관련 없는 절차를 결합하지 않고 하나의 스킬에 하나의 관심사
- **참조 파일은 간결하게** — 주요 SKILL.md를 비대하게 만들지 말고 보조 세부 정보는 `references/`에 배치

## 스킬 주입

어댑터는 스킬을 에이전트 런타임에서 발견 가능하게 만드는 역할을 담당합니다. `claude_local` 어댑터는 심볼릭 링크와 `--add-dir`이 있는 임시 디렉터리를 사용합니다. `codex_local` 어댑터는 글로벌 스킬 디렉터리를 사용합니다. 자세한 내용은 [어댑터 생성](/adapters/creating-an-adapter) 가이드를 참고하세요.
