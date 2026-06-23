// @vitest-environment jsdom
//
// End-to-end validation of the Korean localization (paperclip-Kr).
//
// This exercises the real i18n runtime the app uses — locale resolution,
// resource bundles, and the t() lookups wired into the migrated surfaces — and
// renders a real localized component to prove the chain reaches the DOM in
// Korean. It is the regression guard for "is the app actually Korean?".
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";

import { getLocale, i18n, setLocale, t } from "./index";
import { PriorityIcon } from "../components/PriorityIcon";
import enMessages from "./locales/en.json";
import koMessages from "./locales/ko.json";

type LeafMap = Record<string, string>;
function flatten(obj: Record<string, unknown>, prefix = ""): LeafMap {
  const out: LeafMap = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") Object.assign(out, flatten(v as Record<string, unknown>, key));
    else out[key] = String(v);
  }
  return out;
}
function firstLeafOf(ns: string): string {
  const branch = (enMessages as Record<string, unknown>)[ns];
  const leaves = Object.keys(flatten({ [ns]: branch }));
  return leaves[0]!;
}
const HANGUL = /[가-힣]/;

function act(callback: () => void) {
  flushSync(callback);
}

async function useLocale(locale: string) {
  setLocale(locale);
  await i18n.changeLanguage(locale);
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function renderComponent(node: React.ReactElement): string {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(node));
  return container.textContent ?? "";
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null;
  container = null;
});

afterAll(async () => {
  await useLocale("en");
});

describe("Korean localization (E2E)", () => {
  it("renders a real component in Korean once the locale is ko", async () => {
    await useLocale("ko");
    expect(getLocale().split("-")[0]).toBe("ko");
    // The priority label resolves through the shared issue-labels helper.
    expect(renderComponent(<PriorityIcon priority="high" showLabel />)).toContain("높음");
  });

  it("renders the same component in English once the locale is en", async () => {
    await useLocale("en");
    expect(renderComponent(<PriorityIcon priority="high" showLabel />)).toContain("High");
  });

  // Representative keys from every migrated surface. If any of these regress to
  // English (or a sync drops the translation), this table fails loudly.
  const koExpectations: Array<[string, string, Record<string, unknown>?]> = [
    // Milestone A — navigation chrome
    ["nav.newTask", "새 작업"],
    ["nav.items.tasks", "작업"],
    ["nav.items.dashboard", "대시보드"],
    ["nav.sections.company", "회사"],
    ["nav.company.signOut", "로그아웃"],
    ["nav.agents.section", "에이전트"],
    ["nav.agents.liveCount", "실행 3건", { count: 3 }],
    ["nav.mobile.home", "홈"],
    ["commandPalette.placeholder", "작업, 에이전트, 프로젝트 검색..."],
    ["commandPalette.groups.actions", "액션"],
    // Milestone B — task vocabulary + board
    ["issues.status.inProgress", "진행 중"],
    ["issues.status.backlog", "백로그"],
    ["issues.priority.critical", "긴급"],
    ["issues.board.showMore", "3개 더 보기", { count: 3 }],
    // Milestone B — columns
    ["issues.columns.title.assignee", "담당자"],
    ["issues.columns.unassigned", "미배정"],
    // Milestone B — filters
    ["issues.filters.title", "필터"],
    ["issues.filters.presets.active", "활성"],
    ["issues.filters.liveOnly", "실행 중인 작업만"],
    // Milestone B — list toolbar / grouping
    ["issues.list.listView", "목록 보기"],
    ["issues.list.groupBy.assignee", "담당자"],
    ["issues.list.empty", "현재 필터 또는 검색과 일치하는 작업이 없습니다."],
    // Milestone B — list rows
    ["issues.row.markAsRead", "읽음으로 표시"],
    ["issues.assignee.me", "나"],
    ["issues.progress.blocked", "5개 차단됨", { count: 5 }],
    // Milestone B — new-task dialog
    ["issues.create.createTask", "작업 만들기"],
    ["issues.create.titlePlaceholder", "작업 제목"],
    ["issues.create.assignee.placeholder", "담당자"],
    ["issues.create.watchdog.set", "워치독 설정"],
    ["issues.create.lanes.cheap", "저비용"],
    ["issues.create.effort.high", "높음"],
    ["issues.create.workspaceModes.reuse_existing", "기존 워크스페이스 재사용"],
    // Task detail view
    ["issueDetail.header.live", "실시간"],
    ["issueDetail.tabs.chat", "채팅"],
    ["issueDetail.actions.pauseWork", "작업 일시 중지..."],
  ];

  it("resolves every migrated surface to Korean under ko", async () => {
    await useLocale("ko");
    for (const [key, expected, options] of koExpectations) {
      expect(t(key, options ?? {}), `key ${key} should be Korean`).toBe(expected);
    }
  });

  it("falls back to English under en for the same keys", async () => {
    await useLocale("en");
    expect(t("nav.newTask")).toBe("New Task");
    expect(t("issues.status.inProgress")).toBe("In Progress");
    expect(t("issues.filters.title")).toBe("Filters");
    expect(t("issues.list.empty")).toBe("No tasks match the current filters or search.");
  });

  it("preserves interpolation placeholders across locales", async () => {
    await useLocale("ko");
    expect(t("nav.company.reorder", { name: "Acme" })).toContain("Acme");
    expect(t("issues.list.rendering", { shown: 10, total: 42 })).toContain("10");
    expect(t("issues.list.rendering", { shown: 10, total: 42 })).toContain("42");
  });

  // Shared cross-cutting vocabulary added during the full-app pass. These are
  // resolved through helper functions (issue-labels, work-mode-meta, blockedInbox,
  // recovery-display, trust-policy-ui, agent-role-labels) at runtime.
  const sharedVocab: Array<[string, string, Record<string, unknown>?]> = [
    ["statusLabels.in_progress", "진행 중"],
    ["statusLabels.done", "완료"],
    ["workMode.standard.label", "표준"],
    ["workMode.standardCrc.short", "에이전트"],
    ["workMode.title.standard", "이 제출은 표준 모드입니다. 클릭하여 변경하세요.", { mode: "표준" }],
    ["blockedReasons.variant.needs_decision", "결정 필요"],
    ["blockedReasons.reason.open_recovery_issue", "복구 진행 중"],
    ["recovery.needed", "복구 필요"],
    ["recovery.escalated", "복구 에스컬레이션됨"],
    ["trust.source.lowTrust", "저신뢰 출처"],
    ["trust.presetLabel.low_trust_review", "저신뢰 검토"],
    ["agentRoles.engineer", "엔지니어"],
    ["agentRoles.designer", "디자이너"],
    ["misc.missingPluginTab", "워크스페이스 플러그인 탭을 사용할 수 없습니다."],
    ["chrome.routeError.title", "이 페이지에서 오류가 발생했습니다"],
  ];

  it("resolves shared cross-cutting vocabulary to Korean", async () => {
    await useLocale("ko");
    for (const [key, expected, options] of sharedVocab) {
      expect(t(key, options ?? {}), `key ${key} should be Korean`).toBe(expected);
    }
  });

  it("keeps acronym agent roles untranslated (CEO/PM/QA)", async () => {
    await useLocale("ko");
    expect(t("agentRoles.ceo")).toBe("CEO");
    expect(t("agentRoles.pm")).toBe("PM");
    expect(t("agentRoles.qa")).toBe("QA");
  });

  // Whole-app coverage: every top-level namespace must have a wired Korean bundle.
  it("resolves the first leaf of every namespace to its ko bundle value", async () => {
    await useLocale("ko");
    const koFlat = flatten(koMessages as Record<string, unknown>);
    const namespaces = Object.keys(enMessages as Record<string, unknown>);
    expect(namespaces.length).toBeGreaterThan(40); // the app grew far beyond the seed
    for (const ns of namespaces) {
      const leaf = firstLeafOf(ns);
      const resolved = t(leaf);
      expect(resolved, `namespace ${ns} (${leaf}) should resolve`).toBeTruthy();
      expect(resolved, `namespace ${ns} (${leaf}) should match ko bundle`).toBe(koFlat[leaf]);
    }
  });

  // The ko bundle is genuinely translated, not English placeholders. Allow for
  // proper nouns / interpolation-only / numeric leaves that legitimately carry
  // no Hangul, but require the clear majority to be Korean.
  it("has a genuinely Korean ko bundle (Hangul majority)", () => {
    const koFlat = flatten(koMessages as Record<string, unknown>);
    const enFlat = flatten(enMessages as Record<string, unknown>);
    const translatable = Object.entries(koFlat).filter(([key, val]) => {
      // Skip leaves whose English is itself non-alphabetic (placeholders/symbols).
      const en = enFlat[key] ?? "";
      return /[A-Za-z]/.test(en) && val.trim().length > 0;
    });
    const hangul = translatable.filter(([, val]) => HANGUL.test(val));
    const ratio = hangul.length / translatable.length;
    expect(translatable.length).toBeGreaterThan(2000); // thousands of localized leaves
    expect(ratio).toBeGreaterThan(0.85);
  });
});
