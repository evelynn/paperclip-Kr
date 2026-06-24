---
title: AWS ECS Fargate
summary: ECS Fargate, RDS Postgres, EFS를 사용하여 Paperclip을 AWS에 배포합니다
---

ECS Fargate(컴퓨팅), RDS Postgres 17(데이터베이스), EFS(영구 스토리지)를 사용하여 Paperclip을 AWS에 배포합니다. 이 가이드는 AWS CLI를 사용하며 HTTPS가 적용된 ALB 뒤에 단일 태스크 ECS 서비스를 구성합니다.

## 사전 요구 사항

- 관리자 수준 권한이 있는 프로파일로 구성된 AWS CLI v2
- 로컬에 Docker 설치(이미지 빌드 및 푸시용)
- DNS를 직접 제어할 수 있는 등록된 도메인(TLS 인증서용)
- 로컬에 클론된 Paperclip 저장소

이 가이드 전체에서 사용할 셸 변수를 설정합니다.

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export PAPERCLIP_DOMAIN=paperclip.example.com   # 사용자의 도메인
export DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
export AUTH_SECRET=$(openssl rand -base64 32)
```

## 1. ECR 저장소 생성

```bash
aws ecr create-repository \
  --repository-name paperclip-server \
  --image-scanning-configuration scanOnPush=true \
  --region $AWS_REGION
```

## 2. Docker 이미지 빌드 및 푸시

```bash
cd /path/to/paperclip

# Docker를 ECR에 인증
aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin \
    $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# 빌드
docker build -t paperclip-server .

# 태그 지정 및 푸시
docker tag paperclip-server:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/paperclip-server:latest

docker push \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/paperclip-server:latest
```

## 3. 네트워킹(VPC, 서브넷, 보안 그룹)

기본 VPC를 사용하거나 전용 VPC를 생성합니다. 이 가이드에서는 두 개의 가용 영역에 퍼블릭 및 프라이빗 서브넷이 있는 기본 VPC를 사용합니다.

```bash
# 기본 VPC 가져오기
VPC_ID=$(aws ec2 describe-vpcs \
  --filters Name=isDefault,Values=true \
  --query 'Vpcs[0].VpcId' --output text)

# 두 개의 퍼블릭 서브넷 가져오기(ALB용)
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters Name=vpc-id,Values=$VPC_ID \
  --query 'Subnets[?MapPublicIpOnLaunch==`true`] | [0:2].SubnetId' \
  --output text)
SUBNET_1=$(echo $SUBNET_IDS | awk '{print $1}')
SUBNET_2=$(echo $SUBNET_IDS | awk '{print $2}')
```

보안 그룹 생성:

```bash
# ALB 보안 그룹 — 인바운드 HTTPS
ALB_SG=$(aws ec2 create-security-group \
  --group-name paperclip-alb \
  --description "Paperclip ALB" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

# ALB가 HTTP를 수신하여 HTTPS로 리디렉션할 수 있도록 포트 80도 열기
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

# ECS 태스크 보안 그룹 — ALB에서만 인바운드
ECS_SG=$(aws ec2 create-security-group \
  --group-name paperclip-ecs \
  --description "Paperclip ECS tasks" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG \
  --protocol tcp --port 3100 \
  --source-group $ALB_SG

# RDS 보안 그룹 — ECS에서만 인바운드
RDS_SG=$(aws ec2 create-security-group \
  --group-name paperclip-rds \
  --description "Paperclip RDS" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp --port 5432 \
  --source-group $ECS_SG

# EFS 보안 그룹 — ECS에서만 인바운드 NFS
EFS_SG=$(aws ec2 create-security-group \
  --group-name paperclip-efs \
  --description "Paperclip EFS" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $EFS_SG \
  --protocol tcp --port 2049 \
  --source-group $ECS_SG
```

## 4. RDS Postgres 인스턴스 생성

```bash
# 사용자 지정 VPC에는 기본 DB 서브넷 그룹이 없으므로
# RDS가 인스턴스를 배치할 수 있도록 두 서브넷에 걸친 그룹을 생성합니다.
aws rds create-db-subnet-group \
  --db-subnet-group-name paperclip-db-subnet \
  --db-subnet-group-description "Paperclip RDS subnets" \
  --subnet-ids $SUBNET_1 $SUBNET_2

aws rds create-db-instance \
  --db-instance-identifier paperclip-db \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 17 \
  --master-username paperclip \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids $RDS_SG \
  --db-subnet-group-name paperclip-db-subnet \
  --no-publicly-accessible \
  --backup-retention-period 7 \
  --no-multi-az \
  --db-name paperclip \
  --region $AWS_REGION

# 사용 가능한 상태가 될 때까지 대기(5-10분 소요)
aws rds wait db-instance-available \
  --db-instance-identifier paperclip-db

# 엔드포인트 가져오기
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier paperclip-db \
  --query 'DBInstances[0].Endpoint.Address' --output text)

DATABASE_URL="postgresql://paperclip:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/paperclip"
```

## 5. EFS 파일 시스템 생성

```bash
EFS_ID=$(aws efs create-file-system \
  --performance-mode generalPurpose \
  --throughput-mode bursting \
  --encrypted \
  --tags Key=Name,Value=paperclip-data \
  --query 'FileSystemId' --output text)

# 각 서브넷에 마운트 타겟 생성
for SUBNET in $SUBNET_1 $SUBNET_2; do
  aws efs create-mount-target \
    --file-system-id $EFS_ID \
    --subnet-id $SUBNET \
    --security-groups $EFS_SG
done

# 마운트 타겟 대기
aws efs describe-mount-targets --file-system-id $EFS_ID
```

## 6. 시크릿 저장

```bash
aws secretsmanager create-secret \
  --name paperclip/database-url \
  --secret-string "$DATABASE_URL"

aws secretsmanager create-secret \
  --name paperclip/anthropic-api-key \
  --secret-string "YOUR_ANTHROPIC_KEY"

aws secretsmanager create-secret \
  --name paperclip/better-auth-secret \
  --secret-string "$AUTH_SECRET"

aws secretsmanager create-secret \
  --name paperclip/openai-api-key \
  --secret-string "YOUR_OPENAI_KEY"

aws secretsmanager create-secret \
  --name paperclip/github-token \
  --secret-string "YOUR_GITHUB_PAT"
```

## 7. IAM 역할

ECS 태스크 실행 역할(이미지 풀, 시크릿 읽기)과 태스크 역할(애플리케이션 권한)을 생성합니다.

```bash
# 태스크 실행 역할
aws iam create-role \
  --role-name paperclip-ecs-execution \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name paperclip-ecs-execution \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# 시크릿 읽기 허용
aws iam put-role-policy \
  --role-name paperclip-ecs-execution \
  --policy-name SecretsAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:'$AWS_REGION':'$AWS_ACCOUNT_ID':secret:paperclip/*"
    }]
  }'

# 태스크 역할(애플리케이션 — 필요에 따라 권한 추가)
aws iam create-role \
  --role-name paperclip-ecs-task \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'
```

## 8. ECS 클러스터 및 태스크 정의

```bash
aws ecs create-cluster --cluster-name paperclip

aws logs create-log-group --log-group-name /ecs/paperclip
```

`docker/ecs-task-definition.json`의 템플릿을 사용하여 태스크 정의를 등록합니다. 등록 전에 플레이스홀더 값을 교체하십시오.

```bash
sed -e "s|<ACCOUNT_ID>|$AWS_ACCOUNT_ID|g" \
    -e "s|<REGION>|$AWS_REGION|g" \
    -e "s|<EFS_ID>|$EFS_ID|g" \
    -e "s|<DOMAIN>|$PAPERCLIP_DOMAIN|g" \
    docker/ecs-task-definition.json > /tmp/paperclip-task-def.json

aws ecs register-task-definition \
  --cli-input-json file:///tmp/paperclip-task-def.json
```

## 9. ALB 및 TLS 인증서

인증서를 요청합니다(DNS를 통해 검증해야 합니다).

```bash
CERT_ARN=$(aws acm request-certificate \
  --domain-name $PAPERCLIP_DOMAIN \
  --validation-method DNS \
  --query 'CertificateArn' --output text)

# DNS에 추가할 CNAME 레코드 가져오기
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

DNS 프로바이더에 CNAME을 추가한 후 검증을 기다립니다.

```bash
aws acm wait certificate-validated --certificate-arn $CERT_ARN
```

ALB를 생성합니다.

```bash
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name paperclip-alb \
  --subnets $SUBNET_1 $SUBNET_2 \
  --security-groups $ALB_SG \
  --scheme internet-facing \
  --type application \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text)

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' --output text)

# 타겟 그룹
TG_ARN=$(aws elbv2 create-target-group \
  --name paperclip-tg \
  --protocol HTTP \
  --port 3100 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /api/health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

# HTTPS 리스너
LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --query 'Listeners[0].ListenerArn' --output text)

# HTTP 리스너 — 모든 :80 트래픽을 :443으로 리디렉션
HTTP_LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
  --query 'Listeners[0].ListenerArn' --output text)
```

DNS를 ALB로 지정합니다.
- `$PAPERCLIP_DOMAIN` -> `$ALB_DNS`에 대한 CNAME 또는 ALIAS 레코드를 생성하십시오.

## 10. ECS 서비스 생성

```bash
aws ecs create-service \
  --cluster paperclip \
  --service-name paperclip-server \
  --task-definition paperclip-server \
  --desired-count 1 \
  --launch-type FARGATE \
  --deployment-configuration '{
    "deploymentCircuitBreaker": {"enable": true, "rollback": true},
    "maximumPercent": 200,
    "minimumHealthyPercent": 100
  }' \
  --network-configuration '{
    "awsvpcConfiguration": {
      "subnets": ["'$SUBNET_1'", "'$SUBNET_2'"],
      "securityGroups": ["'$ECS_SG'"],
      "assignPublicIp": "ENABLED"
    }
  }' \
  --load-balancers '[{
    "targetGroupArn": "'$TG_ARN'",
    "containerName": "paperclip-server",
    "containerPort": 3100
  }]'
```

> **참고:** NAT Gateway 없이 퍼블릭 서브넷을 사용하는 경우 `assignPublicIp: ENABLED`가 필요합니다. 프라이빗 서브넷의 경우 `DISABLED`로 설정하고 아웃바운드 인터넷 액세스를 위해 NAT Gateway가 구성되어 있는지 확인하십시오.

## 11. 배포 확인

```bash
# 태스크가 시작되는 것을 모니터링
aws ecs describe-services \
  --cluster paperclip \
  --services paperclip-server \
  --query 'services[0].{desired:desiredCount,running:runningCount,status:status}'

# 태스크 상태 확인
aws ecs list-tasks --cluster paperclip --service-name paperclip-server
TASK_ARN=$(aws ecs list-tasks --cluster paperclip --service-name paperclip-server --query 'taskArns[0]' --output text)
aws ecs describe-tasks --cluster paperclip --tasks $TASK_ARN \
  --query 'tasks[0].{status:lastStatus,health:healthStatus}'

# 로그 확인
aws logs tail /ecs/paperclip --since 10m --follow

# 상태 엔드포인트 호출
curl -sf https://$PAPERCLIP_DOMAIN/api/health
```

**정상 지표:**
- ECS 태스크 상태: `RUNNING`, 상태: `HEALTHY`
- 로그에 `plugin job coordinator started` 및 `plugin-loader: loadAll complete` 표시
- `/api/health`가 200 반환

## 배포 후 보안 강화

첫 번째 사용자가 가입(관리자 역할 부여)한 후 인스턴스를 잠급니다.

```bash
# 공개 가입 비활성화(권한 없는 사용자가 계정을 생성하는 것을 방지)
# 태스크 정의 환경 섹션에 다음을 추가한 후 재배포합니다:
#   { "name": "PAPERCLIP_AUTH_DISABLE_SIGN_UP", "value": "true" }

# 또는 Secrets Manager / 태스크 정의 재정의를 통해 업데이트한 후 새 배포를 강제합니다
aws ecs update-service \
  --cluster paperclip \
  --service paperclip-server \
  --force-new-deployment
```

가입이 비활성화된 후 추가 사용자에게 액세스 권한을 부여하려면 초대 흐름(v2026.416.0에 추가)을 사용하십시오.

## 업데이트 배포

빌드, 푸시 후 새 배포를 강제합니다.

```bash
# 새 이미지 빌드 및 푸시
docker build -t paperclip-server .
docker tag paperclip-server:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/paperclip-server:latest
docker push \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/paperclip-server:latest

# 롤아웃
aws ecs update-service \
  --cluster paperclip \
  --service paperclip-server \
  --force-new-deployment

# 배포 모니터링
aws ecs describe-services \
  --cluster paperclip \
  --services paperclip-server \
  --query 'services[0].deployments[*].{status:status,running:runningCount,desired:desiredCount,rollout:rolloutState}'
```

ECS는 롤링 업데이트를 수행합니다. 새 태스크를 시작하고, 상태 검사를 통과할 때까지 기다린 후 이전 태스크를 드레인합니다.

## 롤백

새 배포가 비정상인 경우:

```bash
# ECS는 새 태스크가 상태 검사에 실패하면 자동으로 롤백합니다
# (서킷 브레이커가 위의 서비스 구성에서 활성화됨).
# 수동으로 롤백을 강제하려면:

# 1. 이전 태스크 정의 리비전 찾기
aws ecs list-task-definitions \
  --family-prefix paperclip-server \
  --sort DESC \
  --query 'taskDefinitionArns[0:3]'

# 2. 이전 리비전으로 서비스 업데이트
aws ecs update-service \
  --cluster paperclip \
  --service paperclip-server \
  --task-definition paperclip-server:<PREVIOUS_REVISION>
```

## 제로로 스케일 다운(비용 절감)

사용하지 않을 때 스케일 다운합니다.

```bash
# 중지
aws ecs update-service \
  --cluster paperclip \
  --service paperclip-server \
  --desired-count 0

# 시작
aws ecs update-service \
  --cluster paperclip \
  --service paperclip-server \
  --desired-count 1
```

RDS도 중지할 수 있습니다(7일 후 자동 재시작).

```bash
aws rds stop-db-instance --db-instance-identifier paperclip-db
aws rds start-db-instance --db-instance-identifier paperclip-db
```

## 리소스 정리

역순으로 모든 리소스를 제거합니다.

```bash
# 1. ECS 서비스 및 클러스터
aws ecs update-service --cluster paperclip --service paperclip-server --desired-count 0
aws ecs delete-service --cluster paperclip --service paperclip-server --force
aws ecs delete-cluster --cluster paperclip

# 2. ALB 및 ACM 인증서
aws elbv2 delete-listener --listener-arn $HTTP_LISTENER_ARN
aws elbv2 delete-listener --listener-arn $LISTENER_ARN
aws elbv2 delete-target-group --target-group-arn $TG_ARN
aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN
aws acm delete-certificate --certificate-arn $CERT_ARN

# 3. RDS(최종 스냅샷 생성)
aws rds delete-db-instance \
  --db-instance-identifier paperclip-db \
  --final-db-snapshot-identifier paperclip-db-final
aws rds wait db-instance-deleted --db-instance-identifier paperclip-db
aws rds delete-db-subnet-group --db-subnet-group-name paperclip-db-subnet

# 4. EFS(마운트 타겟 먼저 삭제해야 함)
for MT in $(aws efs describe-mount-targets --file-system-id $EFS_ID --query 'MountTargets[*].MountTargetId' --output text); do
  aws efs delete-mount-target --mount-target-id $MT
done
# 마운트 타겟 삭제는 비동기적입니다. 파일 시스템을 삭제하기 전에
# 남은 마운트 타겟이 없을 때까지 폴링하십시오. 그렇지 않으면
# delete-file-system이 FileSystemInUse 오류와 함께 실패합니다.
echo "마운트 타겟 삭제 대기 중..."
while aws efs describe-mount-targets \
  --file-system-id $EFS_ID \
  --query 'MountTargets[0].MountTargetId' --output text 2>/dev/null | grep -q 'fsmt-'; do
  sleep 5
done
aws efs delete-file-system --file-system-id $EFS_ID

# 5. 시크릿
for s in database-url anthropic-api-key better-auth-secret openai-api-key github-token; do
  aws secretsmanager delete-secret --secret-id paperclip/$s --force-delete-without-recovery
done

# 6. 보안 그룹(모든 종속 리소스 삭제 후)
for sg in $EFS_SG $RDS_SG $ECS_SG $ALB_SG; do
  aws ec2 delete-security-group --group-id $sg
done

# 7. ECR
aws ecr delete-repository --repository-name paperclip-server --force

# 8. IAM 역할
aws iam delete-role-policy --role-name paperclip-ecs-execution --policy-name SecretsAccess
aws iam detach-role-policy --role-name paperclip-ecs-execution \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
aws iam delete-role --role-name paperclip-ecs-execution
aws iam delete-role --role-name paperclip-ecs-task

# 9. 로그 그룹
aws logs delete-log-group --log-group-name /ecs/paperclip
```

## 비용 참고

| 서비스 | 구성 | 월간 |
|---------|--------|---------|
| ECS Fargate | 2 vCPU, 4 GB, 24/7 | ~$70 |
| RDS Postgres | db.t4g.micro, 20 GB | ~$15 |
| ALB | 평균 1 LCU | ~$22 |
| NAT Gateway | 1 AZ(프라이빗 서브넷 사용 시) | ~$35 |
| EFS | 1 GB Standard | ~$0.30 |
| Secrets Manager | 시크릿 5개 | ~$2 |
| CloudWatch Logs | ~1 GB/월 | ~$0.50 |
| ECR | ~1 GB | ~$0.10 |
| **합계(퍼블릭 서브넷, NAT 없음)** | | **~$110/월** |
| **합계(프라이빗 서브넷 + NAT)** | | **~$145/월** |

Fargate Spot과 비사용 시간대에 0으로 예약 스케일링을 사용하면 월 ~$60-85로 절감할 수 있습니다.
