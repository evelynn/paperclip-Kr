import type { IssueWorkMode } from "@paperclipai/shared";
import type { TFunction } from "i18next";
import { ClipboardList, Hammer, MessageCircleQuestion, type LucideIcon } from "lucide-react";
import { i18n } from "@/i18n";

// Labels resolve through i18n. The `t` argument is optional and defaults to the
// global `i18n.t`, so non-component callers (and the exact-English unit tests
// under the default "en" locale) keep working; components that pass their own
// `t` from useTranslation re-render reactively on a language switch.

export type WorkModeTone = "neutral" | "ask" | "planning";

export interface WorkModeMeta {
  value: IssueWorkMode;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  tone: WorkModeTone;
  classes: {
    chip: string;
    container: string;
    menuItem: string;
    badge: string;
  };
}

const STANDARD_CLASSES = {
  chip: "border-border bg-muted/40 text-muted-foreground hover:bg-accent hover:text-foreground",
  container: "",
  menuItem: "text-foreground",
  badge: "",
};

const ASK_CLASSES = {
  chip: "border-sky-500/60 bg-sky-500/15 text-sky-800 hover:bg-sky-500/25 dark:border-sky-500/50 dark:bg-sky-500/15 dark:text-sky-200 dark:hover:bg-sky-500/25",
  container: "border-sky-500/60 bg-sky-50/60 supports-[backdrop-filter]:bg-sky-50/40 dark:border-sky-500/50 dark:bg-sky-500/[0.07] dark:supports-[backdrop-filter]:bg-sky-500/[0.07]",
  menuItem: "text-sky-700 dark:text-sky-300",
  badge: "border-sky-500/40 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200",
};

const PLANNING_CLASSES = {
  chip: "border-amber-500/60 bg-amber-500/15 text-amber-800 hover:bg-amber-500/25 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25",
  container: "border-amber-500/60 bg-amber-50/60 supports-[backdrop-filter]:bg-amber-50/40 dark:border-amber-500/50 dark:bg-amber-500/[0.07] dark:supports-[backdrop-filter]:bg-amber-500/[0.07]",
  menuItem: "text-amber-700 dark:text-amber-300",
  badge: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

export function isIssueWorkMode(value: unknown): value is IssueWorkMode {
  return value === "standard" || value === "ask" || value === "planning";
}

export function workModeMetaList(
  conferenceRoomChat: boolean,
  t: TFunction = i18n.t,
): WorkModeMeta[] {
  return [
    {
      value: "standard",
      label: t(conferenceRoomChat ? "workMode.standardCrc.label" : "workMode.standard.label"),
      shortLabel: t(conferenceRoomChat ? "workMode.standardCrc.short" : "workMode.standard.short"),
      icon: Hammer,
      tone: "neutral",
      classes: STANDARD_CLASSES,
    },
    {
      value: "planning",
      label: t(conferenceRoomChat ? "workMode.planningCrc.label" : "workMode.planning.label"),
      shortLabel: t(conferenceRoomChat ? "workMode.planningCrc.short" : "workMode.planning.short"),
      icon: ClipboardList,
      tone: "planning",
      classes: PLANNING_CLASSES,
    },
    {
      value: "ask",
      label: t(conferenceRoomChat ? "workMode.askCrc.label" : "workMode.ask.label"),
      shortLabel: t("workMode.ask.short"),
      icon: MessageCircleQuestion,
      tone: "ask",
      classes: ASK_CLASSES,
    },
  ];
}

export function workModeMetaFor(
  mode: IssueWorkMode,
  conferenceRoomChat: boolean,
  t: TFunction = i18n.t,
): WorkModeMeta {
  const modes = workModeMetaList(conferenceRoomChat, t);
  return modes.find((meta) => meta.value === mode) ?? modes[0]!;
}

export function nextWorkMode(mode: IssueWorkMode, conferenceRoomChat: boolean): IssueWorkMode {
  const modes = workModeMetaList(conferenceRoomChat);
  const index = modes.findIndex((meta) => meta.value === mode);
  return modes[(index + 1) % modes.length]?.value ?? "standard";
}

export function titleForPendingWorkMode(
  mode: IssueWorkMode,
  conferenceRoomChat: boolean,
  t: TFunction = i18n.t,
): string {
  if (mode === "ask") {
    return t("workMode.title.ask");
  }
  if (mode === "planning") {
    return t("workMode.title.planning", {
      mode: t(conferenceRoomChat ? "workMode.planningCrc.short" : "workMode.planning.short"),
    });
  }
  return t("workMode.title.standard", {
    mode: t(conferenceRoomChat ? "workMode.standardCrc.short" : "workMode.standard.short"),
  });
}
