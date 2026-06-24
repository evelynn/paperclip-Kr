---
title: 시크릿 원격 가져오기
summary: AWS Secrets Manager 메타데이터 전용 원격 가져오기 API
---

원격 가져오기를 통해 보드는 기존 AWS Secrets Manager 항목을 Paperclip `external_reference` 시크릿으로 연결할 수 있으며, 평문을 Paperclip에 복사하지 않습니다.

두 라우트 모두 보드 전용이며 회사 범위가 지정됩니다. 선택된 프로바이더 볼트는 회사에 속해야 하고, `aws_secrets_manager`를 사용해야 하며, 선택 가능한 상태(`ready` 또는 `warning`)여야 합니다. 비활성화됨, coming-soon, 또는 회사 간 볼트는 거부됩니다.

원격 가져오기는 인벤토리 및 메타데이터 워크플로우입니다. 미리 보기는 AWS `ListSecrets`만 호출하며, 가져오기는 Paperclip 외부 참조와 지문/버전 메타데이터를 저장합니다. 어느 라우트도 `GetSecretValue` 또는 `BatchGetSecretValue`를 호출하거나, `SecretString`을 요청하거나, KMS 복호화를 필요로 하거나, 원시 원격 메타데이터를 로깅하거나, 시크릿 평문을 Paperclip에 복사하지 않습니다.

## AWS 시크릿 원격 미리 보기

```
POST /api/companies/{companyId}/secrets/remote-import/preview
{
  "providerConfigId": "<aws-vault-uuid>",
  "query": "stripe",
  "nextToken": "optional-provider-page-token",
  "pageSize": 50
}
```

`query`는 선택 사항이며 AWS에 인벤토리 필터로 전송됩니다. AWS는 CloudTrail에 목록 요청 파라미터를 기록할 수 있으므로 비민감 메타데이터로 처리하세요. `nextToken`은 불투명한 AWS 커서이며 변경 없이 그대로 전달하세요. `pageSize`는 최대 100까지입니다.

응답:

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
        "lastChangedDate": "2026-05-06T00:00:00.000Z",
        "hasDescription": true
      },
      "status": "ready",
      "importable": true,
      "conflicts": []
    }
  ]
}
```

후보 `status` 값:

- `ready`: 기존의 정확한 외부 참조가 없고 이름/키 충돌이 없습니다.
- `duplicate`: 기존 시크릿이 이미 정확한 프로바이더 `externalRef`를 가지고 있습니다.
- `conflict`: 제안된 Paperclip `name` 또는 `key`가 이미 사용 중입니다.

충돌 `type` 값은 `exact_reference`, `name`, `key`, 및 `provider_guardrail`입니다. Paperclip 자체 관리 네임스페이스에 있는 AWS 참조는 외부 참조로 차단되어 하나의 회사가 광범위한 런타임 역할을 통해 다른 회사의 Paperclip 관리 AWS 시크릿을 가져올 수 없습니다.

## AWS 시크릿 원격 참조 가져오기

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
        "lastChangedDate": "2026-05-06T00:00:00.000Z",
        "hasDescription": true
      }
    }
  ]
}
```

가져오기 응답은 행 단위입니다. 준비된 행은 버전 메타데이터만 포함하는 활성 `external_reference` 시크릿이 됩니다. 정확한 참조 중복 및 이름/키 충돌은 전체 요청을 실패시키지 않고 건너뜁니다. `secrets` 배열은 1-100개의 행을 허용하며, 백엔드는 제출 시 중복 및 충돌을 재확인합니다.
각 행에는 검토 중에 입력된 선택적 Paperclip `description`이 포함될 수 있습니다; 빈 설명은 `null`로 저장됩니다. AWS 프로바이더 설명은 이 필드에 복사되지 않습니다.

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

활동 로그는 집계 수치와 프로바이더/볼트 ID만 기록하며, 원격 시크릿 이름, ARN, 태그, 또는 값은 기록하지 않습니다.

가져온 참조는 Paperclip 런타임 역할이 AWS 시크릿을 목록에 나열할 수는 있지만 해당 특정 시크릿에 대한 `secretsmanager:GetSecretValue` 또는 필요한 KMS 복호화 권한이 없는 경우 향후 바인딩된 런타임 해결 중에 실패할 수 있습니다.
