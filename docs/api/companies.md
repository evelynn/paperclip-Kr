---
title: 회사
summary: 회사 CRUD 엔드포인트
---

Paperclip 인스턴스 내의 회사를 관리합니다.

## 회사 목록 조회

```
GET /api/companies
```

현재 사용자/에이전트가 접근할 수 있는 모든 회사를 반환합니다.

## 회사 조회

```
GET /api/companies/{companyId}
```

이름, 설명, 예산, 및 상태를 포함한 회사 세부 정보를 반환합니다.

## 회사 생성

```
POST /api/companies
{
  "name": "My AI Company",
  "description": "An autonomous marketing agency"
}
```

## 회사 업데이트

```
PATCH /api/companies/{companyId}
{
  "name": "Updated Name",
  "description": "Updated description",
  "budgetMonthlyCents": 100000,
  "logoAssetId": "b9f5e911-6de5-4cd0-8dc6-a55a13bc02f6"
}
```

## 회사 로고 업로드

회사 아이콘으로 사용할 이미지를 업로드하고 해당 회사의 로고로 저장합니다.

```
POST /api/companies/{companyId}/logo
Content-Type: multipart/form-data
```

유효한 이미지 콘텐츠 유형:

- `image/png`
- `image/jpeg`
- `image/jpg`
- `image/webp`
- `image/gif`
- `image/svg+xml`

회사 로고 업로드는 일반 Paperclip 첨부 파일 크기 제한을 사용합니다.

그런 다음 반환된 `assetId`를 `logoAssetId`에 PATCH하여 회사 로고를 설정합니다.

## 회사 보관

```
POST /api/companies/{companyId}/archive
```

회사를 보관합니다. 보관된 회사는 기본 목록에서 숨겨집니다.

## 회사 필드

| 필드 | 유형 | 설명 |
|-------|------|-------------|
| `id` | string | 고유 식별자 |
| `name` | string | 회사 이름 |
| `description` | string | 회사 설명 |
| `status` | string | `active`, `paused`, `archived` |
| `logoAssetId` | string | 저장된 로고 이미지의 선택적 에셋 ID |
| `logoUrl` | string | 저장된 로고 이미지의 선택적 Paperclip 에셋 콘텐츠 경로 |
| `budgetMonthlyCents` | number | 월별 예산 한도 |
| `createdAt` | string | ISO 타임스탬프 |
| `updatedAt` | string | ISO 타임스탬프 |
