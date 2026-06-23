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
});
