---
title: 데이터베이스
summary: 임베디드 PGlite vs Docker Postgres vs 호스팅
---

Paperclip은 Drizzle ORM을 통해 PostgreSQL을 사용합니다. 데이터베이스를 실행하는 세 가지 방법이 있습니다.

## 1. 임베디드 PostgreSQL(기본값)

별도 구성이 필요하지 않습니다. `DATABASE_URL`을 설정하지 않으면 서버가 자동으로 임베디드 PostgreSQL 인스턴스를 시작합니다.

```sh
pnpm dev
```

첫 번째 시작 시 서버는:

1. 스토리지를 위해 `~/.paperclip/instances/default/db/`를 생성합니다.
2. `paperclip` 데이터베이스가 존재하는지 확인합니다.
3. 마이그레이션을 자동으로 실행합니다.
4. 요청 서비스를 시작합니다.

데이터는 재시작 후에도 유지됩니다. 초기화하려면: `rm -rf ~/.paperclip/instances/default/db`.

Docker 빠른 시작도 기본적으로 임베디드 PostgreSQL을 사용합니다.

## 2. 로컬 PostgreSQL(Docker)

로컬에서 완전한 PostgreSQL 서버를 사용하려면:

```sh
docker compose up -d
```

`localhost:5432`에서 PostgreSQL 17을 시작합니다. 연결 문자열을 설정합니다.

```sh
cp .env.example .env
# DATABASE_URL=postgres://paperclip:paperclip@localhost:5432/paperclip
```

스키마를 푸시합니다.

```sh
DATABASE_URL=postgres://paperclip:paperclip@localhost:5432/paperclip \
  npx drizzle-kit push
```

## 3. 호스팅 PostgreSQL(Supabase)

프로덕션 환경에서는 [Supabase](https://supabase.com/)와 같은 호스팅 프로바이더를 사용하십시오.

1. [database.new](https://database.new)에서 프로젝트를 생성합니다.
2. Project Settings > Database에서 연결 문자열을 복사합니다.
3. `.env`에 `DATABASE_URL`을 설정합니다.

마이그레이션에는 **직접 연결**(포트 5432)을, 애플리케이션에는 **풀링 연결**(포트 6543)을 사용하십시오.

연결 풀링을 사용하는 경우 prepared statement를 비활성화합니다.

```ts
// packages/db/src/client.ts
export function createDb(url: string) {
  const sql = postgres(url, { prepare: false });
  return drizzlePg(sql, { schema });
}
```

## 모드 간 전환

| `DATABASE_URL` | 모드 |
|----------------|------|
| 미설정 | 임베디드 PostgreSQL |
| `postgres://...localhost...` | 로컬 Docker PostgreSQL |
| `postgres://...supabase.com...` | 호스팅 Supabase |

Drizzle 스키마(`packages/db/src/schema/`)는 모드에 관계없이 동일합니다.
