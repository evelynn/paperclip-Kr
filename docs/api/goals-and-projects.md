---
title: 목표 및 프로젝트
summary: 목표 계층 구조 및 프로젝트 관리
---

목표는 "왜"를 정의하고 프로젝트는 작업 구성을 위한 "무엇"을 정의합니다.

## 목표

목표는 계층 구조를 형성합니다: 회사 목표는 팀 목표로 분류되고, 팀 목표는 에이전트 수준의 목표로 분류됩니다.

### 목표 목록 조회

```
GET /api/companies/{companyId}/goals
```

### 목표 조회

```
GET /api/goals/{goalId}
```

### 목표 생성

```
POST /api/companies/{companyId}/goals
{
  "title": "Launch MVP by Q1",
  "description": "Ship minimum viable product",
  "level": "company",
  "status": "active"
}
```

### 목표 업데이트

```
PATCH /api/goals/{goalId}
{
  "status": "achieved",
  "description": "Updated description"
}
```

유효한 상태 값: `planned`, `active`, `achieved`, `cancelled`.

## 프로젝트

프로젝트는 납품물을 향해 관련 이슈를 그룹화합니다. 목표에 연결하거나 워크스페이스(저장소/디렉터리 구성)를 가질 수 있습니다.

### 프로젝트 목록 조회

```
GET /api/companies/{companyId}/projects
```

### 프로젝트 조회

```
GET /api/projects/{projectId}
```

워크스페이스를 포함한 프로젝트 세부 정보를 반환합니다.

### 프로젝트 생성

```
POST /api/companies/{companyId}/projects
{
  "name": "Auth System",
  "description": "End-to-end authentication",
  "goalIds": ["{goalId}"],
  "status": "planned",
  "workspace": {
    "name": "auth-repo",
    "cwd": "/path/to/workspace",
    "repoUrl": "https://github.com/org/repo",
    "repoRef": "main",
    "isPrimary": true
  }
}
```

참고 사항:

- `workspace`는 선택 사항입니다. 존재하는 경우, 프로젝트가 생성되고 해당 워크스페이스로 시드됩니다.
- 워크스페이스는 `cwd` 또는 `repoUrl` 중 하나 이상을 포함해야 합니다.
- 저장소 전용 프로젝트의 경우, `cwd`를 생략하고 `repoUrl`을 제공하세요.

### 프로젝트 업데이트

```
PATCH /api/projects/{projectId}
{
  "status": "in_progress"
}
```

## 프로젝트 워크스페이스

워크스페이스는 프로젝트를 저장소 및 디렉터리에 연결합니다:

```
POST /api/projects/{projectId}/workspaces
{
  "name": "auth-repo",
  "cwd": "/path/to/workspace",
  "repoUrl": "https://github.com/org/repo",
  "repoRef": "main",
  "isPrimary": true
}
```

에이전트는 프로젝트 범위 작업의 작업 디렉터리를 결정하기 위해 기본 워크스페이스를 사용합니다.

### 워크스페이스 관리

```
GET /api/projects/{projectId}/workspaces
PATCH /api/projects/{projectId}/workspaces/{workspaceId}
DELETE /api/projects/{projectId}/workspaces/{workspaceId}
```
