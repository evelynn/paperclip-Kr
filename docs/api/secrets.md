---
title: 시크릿
summary: 시크릿 CRUD
---

에이전트가 환경 구성에서 참조하는 암호화된 시크릿을 관리합니다.

## 시크릿 목록 조회

```
GET /api/companies/{companyId}/secrets
```

시크릿 메타데이터(복호화된 값 아님)를 반환합니다.

## 시크릿 생성

```
POST /api/companies/{companyId}/secrets
{
  "name": "anthropic-api-key",
  "value": "sk-ant-..."
}
```

값은 저장 시 암호화됩니다. 시크릿 ID와 메타데이터만 반환됩니다.

값을 Paperclip에 복사하지 않고 프로바이더 소유 시크릿을 연결하려면, 외부 참조 시크릿을 생성하세요:

```json
{
  "name": "prod-stripe-key",
  "provider": "aws_secrets_manager",
  "managedMode": "external_reference",
  "externalRef": "arn:aws:secretsmanager:us-east-1:123456789012:secret:paperclip/prod/stripe",
  "providerVersionRef": "version-id-or-label"
}
```

Paperclip은 프로바이더 참조와 비민감 지문만 저장합니다. 프로바이더가 구성된 경우, 값은 바인딩 컨텍스트를 강제하고 접근 이벤트를 기록하는 서버 런타임 경로를 통해 해결됩니다.

## 프로바이더 상태

```
GET /api/companies/{companyId}/secret-providers/health
```

프로바이더 설정 진단, 경고, 및 로컬 백업 안내를 반환합니다. 상태 응답에는 시크릿 값이나 프로바이더 자격 증명이 포함되지 않아야 합니다.

`aws_secrets_manager`의 경우, 준비되지 않은 상태 응답은 누락된 비시크릿 프로바이더 환경 변수, 서버 런타임에서 예상하는 AWS SDK 기본 자격 증명 소스, 및 AWS 부트스트랩 자격 증명은 Paperclip `company_secrets`에 저장해서는 안 된다는 보관 규칙을 명시합니다.

동등한 CLI 확인 명령:

```sh
pnpm paperclipai secrets doctor --company-id {companyId}
```

## 프로바이더 볼트

프로바이더 볼트는 지원되는 프로바이더 백엔드 중 하나로 시크릿 재료를 라우팅하는 명명된 회사 범위 구성입니다. 운영자 모델 및 보관 규칙은 [시크릿 배포 가이드](/deploy/secrets#provider-vaults)를 참조하세요.

아래의 모든 라우트는 보드 인증 및 회사 접근이 필요합니다. 변경 라우트는 `secret_provider_config.*` 활동 로그 항목을 생성합니다. 이 서피스의 어떤 라우트도 프로바이더 자격 증명 값을 반환하지 않습니다; `config`에 자격 증명 형태의 필드를 제출하면 유효성 검사 시 거부됩니다.

### 볼트 목록 조회

```
GET /api/companies/{companyId}/secret-provider-configs
```

회사의 모든 볼트(감사를 위해 비활성화된 행 포함)를 반환하며, 각각에는 id, provider, displayName, status, isDefault, 비민감 `config`, 최신 상태 스냅샷(`healthStatus`, `healthCheckedAt`, `healthMessage`, `healthDetails`), `disabledAt`, 및 감사 열이 포함됩니다.

### 볼트 생성

```
POST /api/companies/{companyId}/secret-provider-configs
{
  "provider": "aws_secrets_manager",
  "displayName": "Prod US-East",
  "isDefault": true,
  "config": {
    "region": "us-east-1",
    "namespace": "paperclip",
    "secretNamePrefix": "paperclip",
    "kmsKeyId": "arn:aws:kms:us-east-1:123456789012:key/abcd-...",
    "environmentTag": "production"
  }
}
```

프로바이더별 `config` 형태:

- `local_encrypted`: 선택적 `backupReminderAcknowledged: boolean`.
- `aws_secrets_manager`: 필수 `region`; 선택적 `namespace`, `secretNamePrefix`, `kmsKeyId`, `ownerTag`, `environmentTag`.
- `gcp_secret_manager` (출시 예정): 선택적 `projectId`, `location`, `namespace`, `secretNamePrefix`.
- `vault` (출시 예정): 선택적 origin-only HTTPS `address`, `namespace`, `mountPath`, `secretPathPrefix`. 자격 증명, 경로, 쿼리 문자열, 또는 프래그먼트가 포함된 `address` 값은 거부됩니다.

`status`는 `local_encrypted` 및 `aws_secrets_manager`의 경우 기본값이 `ready`이고, `gcp_secret_manager` 및 `vault`의 경우 `coming_soon`입니다. Coming-soon 및 비활성화된 볼트는 `isDefault`로 표시할 수 없습니다. `isDefault: true`를 설정하면 동일한 트랜잭션에서 동일한 프로바이더의 이전 기본값이 지워집니다.

### 볼트 조회

```
GET /api/secret-provider-configs/{id}
```

### 볼트 업데이트

```
PATCH /api/secret-provider-configs/{id}
{
  "displayName": "Prod US-East-2",
  "config": {
    "region": "us-east-2",
    "kmsKeyId": "arn:aws:kms:us-east-2:123456789012:key/abcd-..."
  }
}
```

`config`는 업데이트 시 전체가 교체됩니다 — 부분 diff가 아닌 전체 프로바이더 구성 페이로드를 전달하세요. `gcp_secret_manager` 및 `vault`의 상태 전환은 런타임 모듈이 출시될 때까지 `coming_soon`과 `disabled`로 제한됩니다.

### 볼트 비활성화

```
DELETE /api/secret-provider-configs/{id}
```

볼트를 소프트 삭제합니다: status가 `disabled`로 전환되고, `isDefault`가 지워지며, `disabledAt`이 기록됩니다. 비활성화된 볼트는 감사 목적으로 `GET` 결과에 남아 있지만 시크릿 생성/교체 흐름에서는 더 이상 제공되지 않습니다.

### 기본값 설정

```
POST /api/secret-provider-configs/{id}/default
```

대상 볼트를 해당 프로바이더 계열의 기본값으로 표시하고 이전 기본값을 지웁니다. 대상이 `coming_soon` 또는 `disabled`인 경우 422를 반환합니다.

### 상태 확인 실행

```
POST /api/secret-provider-configs/{id}/health
```

프로바이더별 상태 프로브를 실행하고 볼트에 결과를 저장합니다. 응답 형태:

```json
{
  "configId": "<uuid>",
  "provider": "aws_secrets_manager",
  "status": "ready" | "warning" | "error" | "coming_soon" | "disabled",
  "message": "Provider vault is ready to handle managed writes",
  "details": {
    "code": "provider_ready",
    "message": "...",
    "guidance": ["..."]
  },
  "checkedAt": "2026-05-06T14:00:00.000Z"
}
```

상태 응답에는 프로바이더 자격 증명이나 시크릿 값이 포함되지 않습니다. AWS 볼트의 경우, `details.guidance`에 누락된 비시크릿 환경 이름 및 예상되는 AWS SDK 자격 증명 소스가 포함될 수 있습니다; coming-soon 볼트는 항상 `code: "runtime_locked"`와 함께 `status: "coming_soon"`을 반환하며 프로바이더 모듈을 호출하지 않습니다.

### 시크릿 생성 또는 교체 시 볼트 선택

`POST /api/companies/{companyId}/secrets` 및 `POST /api/secrets/{secretId}/rotate`는 모두 시크릿을 특정 볼트에 고정하는 선택적 `providerConfigId` 필드를 허용합니다. 생략하거나 null인 경우, 작업은 배포 수준 프로바이더 구성을 통해 실행됩니다 — 기존 설치가 이미 사용하는 동일한 경로입니다. 보드 UI는 제출하기 전에 선택한 프로바이더에 대해 회사의 기본 볼트를 미리 선택하므로, 호출자는 일반적으로 명시적인 `providerConfigId`를 보내야 합니다. Coming-soon 및 비활성화된 볼트는 422로 거부됩니다; 시크릿의 프로바이더와 일치하지 않는 볼트도 동일하게 거부됩니다.

```json
POST /api/companies/{companyId}/secrets
{
  "name": "prod-stripe-key",
  "provider": "aws_secrets_manager",
  "providerConfigId": "<vault-uuid>",
  "managedMode": "external_reference",
  "externalRef": "arn:aws:secretsmanager:us-east-1:123456789012:secret:paperclip/prod/stripe"
}
```

### 응답 편집 규칙

이 서피스의 모든 라우트는 동일한 편집 계약을 적용합니다:

- 시크릿 값은 반환되지 않습니다. 보드 UI에는 "값 공개" 기능이 없습니다; 해결은 바인딩 하에서 런타임에 서버 측에서 발생합니다.
- 프로바이더 자격 증명 값은 허용되거나, 저장되거나, 반환되거나, 로깅되거나, 오류 메시지에 표시되지 않습니다. 자격 증명 형태의 필드를 제출하면 유출 없는 오류로 유효성 검사에 실패합니다.
- 활동 로그 항목은 볼트 id, provider, displayName, status, 및 isDefault 전환을 기록합니다 — `config` 페이로드나 상태 세부 정보 본문은 기록하지 않습니다.

## AWS Secrets Manager에서 원격 가져오기

원격 가져오기는 기존 AWS Secrets Manager 항목을 Paperclip에 `external_reference` 시크릿으로 연결합니다. 가져오기는 프로바이더 참조 메타데이터만 저장합니다; 원격 시크릿 평문을 Paperclip에 복사하지 않습니다.

라우트는 보드 전용이며 회사 범위가 지정됩니다. `providerConfigId`는 상태가 `ready` 또는 `warning`인 동일 회사 AWS 프로바이더 볼트를 가리켜야 합니다. 비활성화됨, coming-soon, 비AWS, 및 회사 간 볼트는 거부됩니다. 가져온 시크릿은 선택된 볼트를 통해 나중에 해결되므로, 런타임 읽기에는 선택된 외부 시크릿에 대한 `secretsmanager:GetSecretValue` 및 필요한 KMS 복호화 권한이 여전히 필요합니다.

### 원격 가져오기 후보 미리 보기

```
POST /api/companies/{companyId}/secrets/remote-import/preview
{
  "providerConfigId": "<aws-vault-uuid>",
  "query": "stripe",
  "nextToken": "opaque-provider-token",
  "pageSize": 50
}
```

`query`는 선택 사항이며 AWS Secrets Manager 인벤토리 필터링에 전달됩니다. AWS는 CloudTrail에 목록 요청 파라미터를 기록할 수 있으므로 비민감 메타데이터로 처리하세요. `nextToken`은 불투명한 AWS 커서이며, 호출자는 변경 없이 그대로 전달해야 하며 오프셋을 합성해서는 안 됩니다. `pageSize`는 선택 사항이며, UI에서 기본값은 50이고 최대 100까지입니다.

미리 보기는 AWS `ListSecrets`만 사용합니다. `GetSecretValue` 또는 `BatchGetSecretValue`를 호출해서는 안 되고, `SecretString`을 요청해서는 안 되며, KMS 복호화를 필요로 해서는 안 됩니다. 응답에는 표시 및 충돌 결정을 위한 정제된 메타데이터가 포함됩니다:

```json
{
  "providerConfigId": "<aws-vault-uuid>",
  "provider": "aws_secrets_manager",
  "nextToken": null,
  "candidates": [
    {
      "externalRef": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/stripe",
      "remoteName": "prod/stripe",
      "name": "prod/stripe",
      "key": "prod-stripe",
      "providerVersionRef": null,
      "providerMetadata": {
        "createdDate": "2026-05-06T00:00:00.000Z",
        "lastChangedDate": "2026-05-06T00:00:00.000Z",
        "hasDescription": true,
        "hasKmsKey": true,
        "tagCount": 3
      },
      "status": "ready",
      "importable": true,
      "conflicts": []
    }
  ]
}
```

후보 상태:

- `ready`: 해당 행을 가져오기 위해 선택할 수 있습니다.
- `duplicate`: Paperclip 시크릿이 이미 동일한 프로바이더 볼트에 대해 동일한 정규 프로바이더 참조를 연결하고 있습니다.
- `conflict`: 해당 행에 이름/키 충돌 또는 프로바이더 가드레일 실패가 있습니다.

충돌 유형은 `exact_reference`, `name`, `key`, 및 `provider_guardrail`입니다. Paperclip 자체 관리 네임스페이스에 있는 AWS 참조는 외부 참조로 차단됩니다; 해당 리소스에는 Paperclip 관리 시크릿 흐름을 사용하세요.

### 선택된 원격 참조 가져오기

```
POST /api/companies/{companyId}/secrets/remote-import
{
  "providerConfigId": "<aws-vault-uuid>",
  "secrets": [
    {
      "externalRef": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/stripe",
      "name": "Stripe production key",
      "key": "stripe-production-key",
      "description": "Stripe key used by production checkout",
      "providerVersionRef": null,
      "providerMetadata": {
        "createdDate": "2026-05-06T00:00:00.000Z"
      }
    }
  ]
}
```

`secrets` 배열은 1-100개의 행을 허용합니다. 각 행은 제안된 Paperclip `name`, `key`, 선택적 Paperclip `description`, `providerVersionRef`, 및 정제된 `providerMetadata`를 재정의할 수 있습니다. 빈 설명은 `null`로 저장됩니다; AWS 프로바이더 설명은 Paperclip 설명에 복사되지 않습니다. 백엔드는 제출 시 중복 참조 및 이름/키 충돌을 재확인합니다; 오래된 미리 보기는 이러한 확인을 우회하지 않습니다.

가져오기 응답은 행 단위입니다:

```json
{
  "providerConfigId": "<aws-vault-uuid>",
  "provider": "aws_secrets_manager",
  "importedCount": 1,
  "skippedCount": 1,
  "errorCount": 0,
  "results": [
    {
      "externalRef": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/stripe",
      "name": "Stripe production key",
      "key": "stripe-production-key",
      "status": "imported",
      "reason": null,
      "secretId": "<paperclip-secret-id>",
      "conflicts": []
    }
  ]
}
```

행 상태:

- `imported`: Paperclip이 활성 `external_reference` 시크릿과 메타데이터 전용 버전 행을 생성했습니다.
- `skipped`: 해당 행에 정확한 참조 중복 또는 이름/키 충돌이 있었습니다.
- `error`: 프로바이더가 참조를 거부했거나 행이 유효성 검사에 실패했습니다.

미리 보기/가져오기에 대한 활동 로그는 집계 수치, 프로바이더 ID, 및 볼트 ID만 저장합니다. 원격 시크릿 이름, ARN, 설명, 태그, 평문 값, 프로바이더 자격 증명, 또는 원시 AWS 오류 블롭은 저장하지 않습니다.

## 시크릿 교체

```
POST /api/secrets/{secretId}/rotate
{
  "value": "sk-ant-new-value..."
}
```

시크릿의 새 버전을 생성합니다. `"version": "latest"`를 참조하는 에이전트는 다음 하트비트에서 자동으로 새 값을 받습니다. 잘못된 `latest` 롤아웃이 많은 에이전트에 동시에 영향을 미칠 수 있는 경우 특정 버전에 고정하세요.

## 에이전트 구성에서 시크릿 사용

인라인 값 대신 에이전트 어댑터 구성에서 시크릿을 참조하세요:

```json
{
  "env": {
    "ANTHROPIC_API_KEY": {
      "type": "secret_ref",
      "secretId": "{secretId}",
      "version": "latest"
    }
  }
}
```

서버는 런타임에 시크릿 참조를 해결하고 복호화하여 실제 값을 에이전트 프로세스 환경에 주입합니다. Paperclip의 보관 보장은 주입 시 종료됩니다: 에이전트 프로세스는 값을 읽거나, 로깅하거나, 전달할 수 있으므로, 에이전트에 바인딩된 시크릿은 해당 에이전트에 노출된 것으로 처리하세요. [시크릿 배포 가이드](/deploy/secrets#custody-boundaries)의 보관 경계 참고 사항을 참조하세요.

## 이식성

회사 내보내기/가져오기 API는 에이전트 및 프로젝트 환경 요구 사항을 패키지 매니페스트의 선언으로 표현합니다. 내보내기에서는 시크릿 값, 시크릿 ID, 프로바이더 참조, 및 암호화된 프로바이더 재료가 생략됩니다. 다음을 사용하세요:

```sh
pnpm paperclipai secrets declarations --company-id {companyId}
```

패키지를 이동하기 전에 내보내기가 생성할 선언을 검사합니다.
