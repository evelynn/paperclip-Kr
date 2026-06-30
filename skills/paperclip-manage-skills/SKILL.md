---
name: paperclip-manage-skills
description: >
  Discover, install, and assign Paperclip skills. Use when you (or an agent you
  manage) lack a capability and need to find a skill for it — browse role
  recommendations, search the catalog, import a new external skill, install it
  into the company library, and assign it to an agent. Covers the skill-approval
  governance path.
---

# Paperclip Manage Skills

Use this skill whenever an agent needs a capability it does not yet have, or when
you are hiring and want to give a new agent the right skills on day one. A
skill-less agent is an under-equipped agent — when a task needs a tool the agent
lacks, find or install the skill instead of working around it.

## Authentication

All calls go to `$PAPERCLIP_API_URL/api/...` with `Authorization: Bearer
$PAPERCLIP_API_KEY` (omit the header in `local_trusted` mode). Use
`$PAPERCLIP_COMPANY_ID` for company-scoped routes. Bodies are JSON.

## 1. Discover skills

**Role recommendations** — the fastest way to find what a role should have:
```sh
curl -sS "$PAPERCLIP_API_URL/api/skills/catalog/recommended?role=<role>" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```
`role` accepts ceo, cto, cmo, designer, engineer, qa, product, manager, … and
returns catalog skills tagged for that role.

**Browse / search the catalog:**
```sh
curl -sS "$PAPERCLIP_API_URL/api/skills/catalog" -H "Authorization: Bearer $PAPERCLIP_API_KEY"
# optional filter: ?category=<category>
```

**Inspect a skill before installing** (read its SKILL.md and file list):
```sh
curl -sS "$PAPERCLIP_API_URL/api/skills/catalog/<catalogId>"        -H "Authorization: Bearer $PAPERCLIP_API_KEY"
curl -sS "$PAPERCLIP_API_URL/api/skills/catalog/<catalogId>/files?path=SKILL.md" -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

`catalogId` is the colon form (e.g. `paperclipai:bundled:paperclip-operations:task-planning`);
its canonical `key` is the slash form (e.g. `paperclipai/bundled/paperclip-operations/task-planning`).

## 2. Find a NEW skill that is not in the catalog

When the catalog has nothing for the capability, search/import an external skill
from GitHub or the skills.sh registry. Pass a URL or an `org/repo/skill` key:
```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills/import" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" -H "Content-Type: application/json" \
  -d '{"source": "vercel-labs/agent-browser/agent-browser"}'
# also accepts https://skills.sh/<org>/<repo>/<skill> or a GitHub repo URL
```
Imported skills are audited on install. Only an actual **script body** or the
**SKILL.md** that contains a remote-fetch/dynamic-exec or secret-exfiltration
pattern is refused (hard-stop); supporting docs are allowed with a warning.
Prefer well-known sources and read the SKILL.md before importing.

## 3. Install a catalog skill into the company library

```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills/install-catalog" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" -H "Content-Type: application/json" \
  -d '{"catalogSkillId": "paperclipai:bundled:paperclip-operations:task-planning"}'
```
Returns `action: "created"` (or `"updated"`). The skill is now in the company
library and can be assigned to any agent.

## 4. Assign skills to an agent

Sync replaces the agent's desired skill set with the keys you pass (use canonical
keys or unique slugs). The server installs any missing ones from the catalog and
attaches them to the agent.
```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/agents/<agentId>/skills/sync" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" -H "Content-Type: application/json" \
  -d '{"desiredSkills": ["task-planning", "issue-triage"]}'
```
At hire time you can skip steps 3–4 and pass the same keys directly as
`desiredSkills` in the `agent-hires` body (see the `paperclip-create-agent`
skill).

## 5. Check what is installed

```sh
curl -sS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills" -H "Authorization: Bearer $PAPERCLIP_API_KEY"   # company library
curl -sS "$PAPERCLIP_API_URL/api/agents/<agentId>" -H "Authorization: Bearer $PAPERCLIP_API_KEY"                          # agent's assigned skills
```

## Governance

- Installing/assigning skills may require **board approval** depending on the
  company's skill policy. If a call returns a pending-approval response, surface
  it to the board rather than retrying.
- Any skill that expands browser access, external-system reach, filesystem scope,
  or secret handling must be **justified** — when you request it, say why the
  role needs it.
- Do not import skills from untrusted sources. Read the SKILL.md first.

## Typical flows

- **"I need to do X but lack the tool"** → `recommended?role=<your role>` → if found,
  `sync` it to yourself; if not, browse the catalog or `import` an external skill,
  then `sync`.
- **Equipping a new hire** → `recommended?role=<role>` → pass the keys as
  `desiredSkills` in the hire request.
- **Auditing the team** → for each agent, compare `GET /api/agents/<id>` skills
  against `recommended?role=<role>` and fill the gaps.
