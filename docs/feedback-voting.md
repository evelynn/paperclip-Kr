# 피드백 투표 — 로컬 데이터 가이드

에이전트 응답을 **유용함** (엄지 위) 또는 **개선 필요** (엄지 아래)로 평가하면, Paperclip이 실행 중인 인스턴스와 함께 로컬에 투표를 저장합니다. 이 가이드는 저장되는 내용, 접근 방법, 내보내기 방법을 설명합니다.

## 투표 작동 방식

1. 에이전트 댓글 또는 문서 수정에서 **유용함** 또는 **개선 필요**를 클릭합니다.
2. **개선 필요**를 클릭하면 선택적 텍스트 프롬프트가 나타납니다: _"무엇이 더 나았을까요?"_ 이유를 입력하거나 닫을 수 있습니다.
3. 동의 대화 상자가 나타나 투표를 로컬에 유지할지 공유할지 묻습니다. 선택 사항은 향후 투표를 위해 기억됩니다.

### 저장되는 내용

각 투표는 두 가지 로컬 레코드를 생성합니다.

| 레코드 | 내용 |
|--------|-----------------|
| **투표** | 투표 (위/아래), 선택적 이유 텍스트, 공유 선호도, 동의 버전, 타임스탬프 |
| **트레이스 번들** | 전체 컨텍스트 스냅샷: 투표된 댓글/수정 텍스트, 이슈 제목, 에이전트 정보, 투표, 이유 — 격리된 상태에서 피드백을 이해하는 데 필요한 모든 것 |

모든 데이터는 로컬 Paperclip 데이터베이스에 저장됩니다. 명시적으로 공유를 선택하지 않는 한 어떤 것도 외부로 전송되지 않습니다.

투표가 공유 표시된 경우, Paperclip은 텔레메트리 백엔드를 통해 트레이스 번들을 즉시 업로드하려고 합니다. 업로드는 전송 중에 압축되어 전체 트레이스 번들이 게이트웨이 크기 제한 내에 유지됩니다. 즉시 푸시가 실패하면, 트레이스는 나중에 다시 시도할 수 있는 실패 상태로 남습니다. 앱 서버는 원시 피드백 트레이스 번들을 객체 스토리지에 직접 업로드하지 않습니다.

## 투표 확인

### 빠른 보고서 (터미널)

```bash
pnpm paperclipai feedback report
```

투표 수, 이유가 있는 트레이스별 세부 정보, 내보내기 상태가 포함된 색상 코드 요약을 표시합니다.

```bash
# 설치된 CLI
paperclipai feedback report

# 다른 서버 또는 회사 지정
pnpm paperclipai feedback report --api-base http://127.0.0.1:3000 --company-id <company-id>

# 보고서에 원시 페이로드 덤프 포함
pnpm paperclipai feedback report --payloads
```

### API 엔드포인트

모든 엔드포인트는 보드 사용자 접근이 필요합니다 (로컬 개발에서는 자동).

**이슈에 대한 투표 목록:**
```bash
curl http://127.0.0.1:3102/api/issues/<issueId>/feedback-votes
```

**이슈에 대한 트레이스 번들 목록 (전체 페이로드 포함):**
```bash
curl 'http://127.0.0.1:3102/api/issues/<issueId>/feedback-traces?includePayload=true'
```

**회사 전체 모든 트레이스 목록:**
```bash
curl 'http://127.0.0.1:3102/api/companies/<companyId>/feedback-traces?includePayload=true'
```

**단일 트레이스 봉투 레코드 조회:**
```bash
curl http://127.0.0.1:3102/api/feedback-traces/<traceId>
```

**트레이스의 전체 내보내기 번들 조회:**
```bash
curl http://127.0.0.1:3102/api/feedback-traces/<traceId>/bundle
```

#### 필터링

트레이스 엔드포인트는 쿼리 파라미터를 허용합니다.

| 파라미터 | 값 | 설명 |
|-----------|--------|-------------|
| `vote` | `up`, `down` | 투표 방향으로 필터링 |
| `status` | `local_only`, `pending`, `sent`, `failed` | 내보내기 상태로 필터링 |
| `targetType` | `issue_comment`, `issue_document_revision` | 투표 대상으로 필터링 |
| `sharedOnly` | `true` | 사용자가 공유를 선택한 투표만 표시 |
| `includePayload` | `true` | 전체 컨텍스트 스냅샷 포함 |
| `from` / `to` | ISO 날짜 | 날짜 범위 필터 |

## 데이터 내보내기

### 파일 + zip으로 내보내기

```bash
pnpm paperclipai feedback export
```

타임스탬프가 포함된 디렉터리를 생성합니다.

```
feedback-export-20260331T120000Z/
  index.json                    # 요약 통계가 있는 매니페스트
  votes/
    PAP-123-a1b2c3d4.json      # 투표 메타데이터 (투표당 하나)
  traces/
    PAP-123-e5f6g7h8.json      # Paperclip 피드백 봉투 (트레이스당 하나)
  full-traces/
    PAP-123-e5f6g7h8/
      bundle.json              # 트레이스에 대한 전체 내보내기 매니페스트
      ...raw adapter files     # 사용 가능한 경우 codex / claude / opencode 세션 아티팩트
feedback-export-20260331T120000Z.zip
```

내보내기는 기본적으로 전체입니다. `traces/`는 Paperclip 봉투를 보관하고, `full-traces/`는 더 풍부한 트레이스별 번들과 복구 가능한 어댑터 네이티브 파일을 포함합니다.

```bash
# 커스텀 서버 및 출력 디렉터리
pnpm paperclipai feedback export --api-base http://127.0.0.1:3000 --company-id <company-id> --out ./my-export
```

### 내보낸 트레이스 읽기

`traces/`의 파일을 열어 확인:

```json
{
  "id": "trace-uuid",
  "vote": "down",
  "issueIdentifier": "PAP-123",
  "issueTitle": "Fix login timeout",
  "targetType": "issue_comment",
  "targetSummary": {
    "label": "Comment",
    "excerpt": "The first 80 chars of the comment that was voted on..."
  },
  "payloadSnapshot": {
    "vote": {
      "value": "down",
      "reason": "Did not address the root cause"
    },
    "target": {
      "body": "Full text of the agent comment..."
    },
    "issue": {
      "identifier": "PAP-123",
      "title": "Fix login timeout"
    }
  }
}
```

`full-traces/<issue>-<trace>/bundle.json`을 열어 확장된 내보내기 메타데이터를 확인합니다. 여기에는 캡처 메모, 어댑터 타입, 무결성 메타데이터, 함께 작성된 원시 파일 목록이 포함됩니다.

`bundle.json.files[]`의 각 항목에는 경로명만이 아닌 실제 캡처된 파일 페이로드가 `contents` 아래에 포함됩니다. 텍스트 아티팩트는 UTF-8 텍스트로, 바이너리 아티팩트는 base64와 `encoding` 마커로 저장됩니다.

내장 로컬 어댑터는 이제 네이티브 세션 아티팩트를 더 직접적으로 내보냅니다.

- `codex_local`: `adapter/codex/session.jsonl`
- `claude_local`: `adapter/claude/session.jsonl`, 존재할 경우 `adapter/claude/session/...` 사이드카 파일 및 `adapter/claude/debug.txt`
- `opencode_local`: `adapter/opencode/session.json`, `adapter/opencode/messages/*.json`, `adapter/opencode/parts/<messageId>/*.json`, 선택적 `project.json`, `todo.json`, `session-diff.json`

## 공유 설정

처음 투표할 때 동의 대화 상자가 나타납니다.

- **로컬 유지** — 투표가 로컬에만 저장됩니다 (`sharedWithLabs: false`)
- **이 투표 공유** — 투표가 공유 표시됩니다 (`sharedWithLabs: true`)

선호도는 회사별로 저장됩니다. 피드백 설정에서 언제든지 변경할 수 있습니다. "로컬 유지"로 표시된 투표는 내보내기 대기열에 추가되지 않습니다.

## 데이터 생명주기

| 상태 | 의미 |
|--------|---------|
| `local_only` | 투표가 로컬에 저장됨, 공유 표시 안 됨 |
| `pending` | 공유 표시됨, 로컬에 저장됨, 즉시 업로드 시도 대기 중 |
| `sent` | 성공적으로 전송됨 |
| `failed` | 전송 시도했지만 실패함 (예: 백엔드 접근 불가 또는 설정 안 됨); 나중에 백엔드가 사용 가능해지면 다시 시도 |

로컬 데이터베이스는 공유 상태와 관계없이 항상 전체 투표 및 트레이스 데이터를 보존합니다.

## 원격 동기화

공유를 선택한 투표는 투표 요청에서 즉시 텔레메트리 백엔드로 전송됩니다. 서버는 또한 백그라운드 플러시 워커를 유지하여 나중에 실패한 트레이스를 재시도합니다. 텔레메트리 백엔드는 요청을 검증한 후 번들을 설정된 객체 스토리지에 저장합니다.

- 앱 서버 역할: 번들을 구성하고, 텔레메트리 백엔드에 POST하며, 트레이스 상태 업데이트
- 텔레메트리 백엔드 역할: 요청 인증, 페이로드 형태 검증, 번들 압축/저장, 최종 객체 키 반환
- 재시도 동작: 실패한 업로드는 `failureReason`에 오류 메시지와 함께 `failed`로 이동하며, 워커가 나중에 다시 시도
- 기본 엔드포인트: 피드백 내보내기 백엔드 URL이 설정되지 않은 경우 Paperclip은 `https://telemetry.paperclip.ing`으로 폴백
- 중요한 참고 사항: 업로드된 객체는 투표 시점의 전체 번들 스냅샷입니다. 나중에 로컬 번들을 가져와 기반이 되는 어댑터 세션 파일이 계속 증가했다면, 로컬에서 재생성된 번들이 동일한 트레이스에 대해 이미 업로드된 스냅샷보다 클 수 있습니다.

내보낸 객체는 검사하기 쉬운 결정론적 키 패턴을 사용합니다.

```text
feedback-traces/<companyId>/YYYY/MM/DD/<exportId-or-traceId>.json
```
