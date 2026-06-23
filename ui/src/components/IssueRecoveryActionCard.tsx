import { useMemo } from "react";
import type {
  Agent,
  IssueRecoveryAction,
  IssueRecoveryActionKind,
  IssueRecoveryActionOutcome,
  IssueRecoveryActionStatus,
} from "@paperclipai/shared";
import { Eye, OctagonAlert, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import type { TFunction } from "i18next";
import { Link } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { agentUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  deriveRecoveryDisplayState,
  type RecoveryDisplayState,
} from "@/lib/recovery-display";

export type RecoveryCardCardState = RecoveryDisplayState;
export const deriveRecoveryCardState = deriveRecoveryDisplayState;

export type RecoveryResolveOutcome =
  | "todo"
  | "done"
  | "in_review"
  | "false_positive_done"
  | "false_positive_in_review";

export interface IssueRecoveryActionCardProps {
  action: IssueRecoveryAction;
  agentMap?: ReadonlyMap<string, Agent>;
  /** Preferred state hint (e.g. observe_only when watchdog tone is requested). Falls back to derived state. */
  forcedState?: RecoveryCardCardState;
  /** Optional click handler for resolve menu actions. If omitted, the buttons are not rendered. */
  onResolve?: (outcome: RecoveryResolveOutcome) => void;
  /** Whether the viewer can run destructive board-only actions (e.g. false-positive dismissal). */
  canFalsePositive?: boolean;
  className?: string;
}

const KIND_LABEL_KEY: Record<IssueRecoveryActionKind, string> = {
  missing_disposition: "issueNotices.recovery.kind.missingDisposition",
  stranded_assigned_issue: "issueNotices.recovery.kind.strandedAssignedIssue",
  workspace_validation: "issueNotices.recovery.kind.workspaceValidation",
  configuration_validation: "issueNotices.recovery.kind.configurationValidation",
  active_run_watchdog: "issueNotices.recovery.kind.activeRunWatchdog",
  issue_graph_liveness: "issueNotices.recovery.kind.issueGraphLiveness",
};

const KIND_HEADLINE_KEY: Record<IssueRecoveryActionKind, string> = {
  missing_disposition: "issueNotices.recovery.headline.missingDisposition",
  stranded_assigned_issue: "issueNotices.recovery.headline.strandedAssignedIssue",
  workspace_validation: "issueNotices.recovery.headline.workspaceValidation",
  configuration_validation: "issueNotices.recovery.headline.configurationValidation",
  active_run_watchdog: "issueNotices.recovery.headline.activeRunWatchdog",
  issue_graph_liveness: "issueNotices.recovery.headline.issueGraphLiveness",
};

const STATE_TONE: Record<RecoveryCardCardState, {
  labelKey: string;
  containerClass: string;
  iconWrapClass: string;
  iconClass: string;
  labelClass: string;
  Icon: typeof TriangleAlert;
  divider: string;
}> = {
  needed: {
    labelKey: "issueNotices.recovery.state.needed",
    containerClass:
      "border-amber-300/70 bg-amber-50/85 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100",
    iconWrapClass: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
    iconClass: "text-amber-700 dark:text-amber-300",
    labelClass: "text-amber-900 dark:text-amber-200",
    Icon: TriangleAlert,
    divider: "border-amber-300/60 dark:border-amber-500/30",
  },
  in_progress: {
    labelKey: "issueNotices.recovery.state.inProgress",
    containerClass:
      "border-sky-300/70 bg-sky-50/80 text-sky-950 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-100",
    iconWrapClass: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
    iconClass: "text-sky-700 dark:text-sky-300",
    labelClass: "text-sky-900 dark:text-sky-200",
    Icon: RefreshCw,
    divider: "border-sky-300/60 dark:border-sky-500/30",
  },
  observe_only: {
    labelKey: "issueNotices.recovery.state.observeOnly",
    containerClass:
      "border-border bg-muted/40 text-foreground dark:bg-muted/20",
    iconWrapClass: "bg-muted text-foreground/70",
    iconClass: "text-muted-foreground",
    labelClass: "text-muted-foreground",
    Icon: Eye,
    divider: "border-border/70",
  },
  escalated: {
    labelKey: "issueNotices.recovery.state.escalated",
    containerClass:
      "border-red-400/60 bg-red-50/85 text-red-950 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100",
    iconWrapClass: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200",
    iconClass: "text-red-700 dark:text-red-300",
    labelClass: "text-red-900 dark:text-red-200",
    Icon: OctagonAlert,
    divider: "border-red-400/50 dark:border-red-500/30",
  },
  resolved: {
    labelKey: "issueNotices.recovery.state.resolved",
    containerClass:
      "border-emerald-300/70 bg-emerald-50/80 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100",
    iconWrapClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
    iconClass: "text-emerald-700 dark:text-emerald-300",
    labelClass: "text-emerald-900 dark:text-emerald-200",
    Icon: Sparkles,
    divider: "border-emerald-300/60 dark:border-emerald-500/30",
  },
};

const OUTCOME_LABEL_KEY: Record<IssueRecoveryActionOutcome, string> = {
  restored: "issueNotices.recovery.outcome.restored",
  delegated: "issueNotices.recovery.outcome.delegated",
  false_positive: "issueNotices.recovery.outcome.falsePositive",
  blocked: "issueNotices.recovery.outcome.blocked",
  escalated: "issueNotices.recovery.outcome.escalated",
  cancelled: "issueNotices.recovery.outcome.cancelled",
};

function readEvidenceString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > 240 ? `${trimmed.slice(0, 237)}…` : trimmed;
}

function pickEvidenceSummary(action: IssueRecoveryAction): string | null {
  const evidence = action.evidence ?? {};
  const candidates = [
    "summary",
    "detectedProgressSummary",
    "missingDisposition",
    "retryReason",
    "latestRunErrorCode",
    "latestRunStatus",
    "latestIssueStatus",
  ] as const;
  for (const key of candidates) {
    const next = readEvidenceString(evidence[key]);
    if (next) return next;
  }
  return null;
}

function readEvidenceRunId(action: IssueRecoveryAction, key: "sourceRunId" | "correctiveRunId" | "latestRunId") {
  const evidence = action.evidence ?? {};
  const next = readEvidenceString(evidence[key]);
  return next;
}

function readWakePolicySummary(action: IssueRecoveryAction, t: TFunction): string | null {
  const policy = action.wakePolicy;
  if (!policy) return null;
  const type = readEvidenceString(policy.type);
  if (!type) return null;
  if (type === "wake_owner") return t("issueNotices.recovery.wake.correctiveWakeQueued");
  if (type === "board_escalation") return t("issueNotices.recovery.wake.boardEscalation");
  if (type === "manual") return t("issueNotices.recovery.wake.manual");
  if (type === "manual_repair_required") return t("issueNotices.recovery.wake.manualRepairRequired");
  if (type === "monitor") {
    const interval = readEvidenceString(policy.intervalLabel);
    return interval
      ? t("issueNotices.recovery.wake.monitorScheduledWithInterval", { interval })
      : t("issueNotices.recovery.wake.monitorScheduled");
  }
  return type.replaceAll("_", " ");
}

function formatTimeShort(value: string | Date | null | undefined, t: TFunction): string | null {
  if (!value) return null;
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const now = Date.now();
    const diffMs = date.getTime() - now;
    const absMin = Math.round(Math.abs(diffMs) / 60_000);
    if (absMin < 60) {
      return diffMs >= 0
        ? t("issueNotices.recovery.time.inMinutes", { minutes: absMin })
        : t("issueNotices.recovery.time.minutesAgo", { minutes: absMin });
    }
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

function shortenRunId(runId: string | null | undefined) {
  if (!runId) return null;
  if (runId.length <= 12) return runId;
  return runId.slice(0, 8);
}

function MetadataRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-0 px-3 py-1.5 text-xs sm:px-4">
      <dt className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-foreground/90">{children}</dd>
    </div>
  );
}

function MissingValue() {
  return <span className="text-muted-foreground">—</span>;
}

function AgentLink({
  agentId,
  agentMap,
  fallback,
}: {
  agentId: string | null | undefined;
  agentMap?: ReadonlyMap<string, Agent>;
  fallback?: string | null;
}) {
  const { t } = useTranslation();
  if (!agentId) {
    return fallback ? <span>{fallback}</span> : <MissingValue />;
  }
  const agent = agentMap?.get(agentId);
  const label = agent?.name ?? t("issueNotices.recovery.agentFallback", { id: agentId.slice(0, 8) });
  if (agent) {
    return (
      <Link
        to={agentUrl(agent)}
        className="rounded-sm font-medium underline-offset-2 hover:underline"
      >
        {label}
      </Link>
    );
  }
  return <span className="font-medium">{label}</span>;
}

function RunChip({
  runId,
  agentId,
  status,
}: {
  runId: string | null;
  agentId: string | null | undefined;
  status?: string | null;
}) {
  const { t } = useTranslation();
  if (!runId) return <MissingValue />;
  const short = shortenRunId(runId);
  const inner = (
    <>
      <code className="rounded bg-background/80 px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">
        {t("issueNotices.recovery.runLabel", { id: short })}
      </code>
      {status ? (
        <span className="font-sans text-[11px] text-muted-foreground">{status}</span>
      ) : null}
    </>
  );
  if (agentId) {
    return (
      <Link
        to={`/agents/${agentId}/runs/${runId}`}
        className="inline-flex items-center gap-2 rounded-sm underline-offset-2 hover:underline"
      >
        {inner}
      </Link>
    );
  }
  return <span className="inline-flex items-center gap-2">{inner}</span>;
}

const RESOLVE_OPTIONS: Array<{
  outcome: RecoveryResolveOutcome;
  labelKey: string;
  descriptionKey: string;
  destructive?: boolean;
  boardOnly?: boolean;
}> = [
  {
    outcome: "todo",
    labelKey: "issueNotices.recovery.resolve.todoLabel",
    descriptionKey: "issueNotices.recovery.resolve.todoDescription",
  },
  {
    outcome: "done",
    labelKey: "issueNotices.recovery.resolve.doneLabel",
    descriptionKey: "issueNotices.recovery.resolve.doneDescription",
  },
  {
    outcome: "in_review",
    labelKey: "issueNotices.recovery.resolve.inReviewLabel",
    descriptionKey: "issueNotices.recovery.resolve.inReviewDescription",
  },
  {
    outcome: "false_positive_done",
    labelKey: "issueNotices.recovery.resolve.falsePositiveDoneLabel",
    descriptionKey: "issueNotices.recovery.resolve.falsePositiveDoneDescription",
    destructive: true,
    boardOnly: true,
  },
  {
    outcome: "false_positive_in_review",
    labelKey: "issueNotices.recovery.resolve.falsePositiveInReviewLabel",
    descriptionKey: "issueNotices.recovery.resolve.falsePositiveInReviewDescription",
    destructive: true,
    boardOnly: true,
  },
];

export function IssueRecoveryActionCard({
  action,
  agentMap,
  forcedState,
  onResolve,
  canFalsePositive = false,
  className,
}: IssueRecoveryActionCardProps) {
  const { t } = useTranslation();
  const cardState: RecoveryCardCardState = forcedState ?? deriveRecoveryCardState(action);
  const tone = STATE_TONE[cardState];
  const ToneIcon = tone.Icon;

  const headline = useMemo(() => {
    if (cardState === "resolved" && action.outcome) {
      const outcomeLabel = OUTCOME_LABEL_KEY[action.outcome]
        ? t(OUTCOME_LABEL_KEY[action.outcome])
        : action.outcome;
      return t("issueNotices.recovery.headline.resolvedAs", { outcome: outcomeLabel });
    }
    return t(KIND_HEADLINE_KEY[action.kind] ?? KIND_HEADLINE_KEY.missing_disposition);
  }, [action.kind, action.outcome, cardState, t]);

  const wakeSummary = readWakePolicySummary(action, t);
  const evidenceSummary = pickEvidenceSummary(action);
  const sourceRunId = readEvidenceRunId(action, "sourceRunId") ?? readEvidenceRunId(action, "latestRunId");
  const correctiveRunId = readEvidenceRunId(action, "correctiveRunId");
  const showAttempt = action.attemptCount > 1 && action.maxAttempts !== null;
  const showTimeoutInline = (() => {
    if (!action.timeoutAt) return false;
    try {
      const date = action.timeoutAt instanceof Date ? action.timeoutAt : new Date(action.timeoutAt);
      const diffMs = date.getTime() - Date.now();
      return diffMs > 0 && diffMs < 60 * 60 * 1000;
    } catch {
      return false;
    }
  })();
  const updatedAtLabel = formatTimeShort(action.updatedAt, t);

  const ariaState = ({
    needed: t("issueNotices.recovery.aria.needed"),
    in_progress: t("issueNotices.recovery.aria.inProgress"),
    observe_only: t("issueNotices.recovery.aria.observeOnly"),
    escalated: t("issueNotices.recovery.aria.escalated"),
    resolved: t("issueNotices.recovery.aria.resolved"),
  } satisfies Record<RecoveryCardCardState, string>)[cardState];

  const showResolveActions = onResolve !== undefined && cardState !== "resolved";
  const visibleResolveOptions = RESOLVE_OPTIONS.filter((option) => {
    if (option.boardOnly && !canFalsePositive) return false;
    return true;
  });

  return (
    <section
      role="status"
      aria-label={t("issueNotices.recovery.aria.cardLabel", { state: ariaState })}
      data-recovery-state={cardState}
      data-recovery-kind={action.kind}
      className={cn(
        "relative w-full overflow-hidden rounded-lg border text-sm shadow-[0_1px_0_rgba(15,23,42,0.02)]",
        tone.containerClass,
        className,
      )}
    >
      <header className="flex items-start gap-3 px-3 py-2.5 sm:px-4">
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            tone.iconWrapClass,
          )}
          aria-hidden
        >
          <ToneIcon className={cn("h-4 w-4", tone.iconClass)} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]">
            <span className={tone.labelClass}>{t(tone.labelKey)}</span>
            <span className="text-muted-foreground/60" aria-hidden>·</span>
            <code className="rounded bg-background/70 px-1.5 py-0.5 font-mono text-[11px] tracking-normal text-muted-foreground">
              {KIND_LABEL_KEY[action.kind] ? t(KIND_LABEL_KEY[action.kind]) : action.kind}
            </code>
            {updatedAtLabel ? (
              <>
                <span className="text-muted-foreground/60" aria-hidden>·</span>
                <span className="font-medium normal-case tracking-normal text-muted-foreground">
                  {updatedAtLabel}
                </span>
              </>
            ) : null}
          </div>
          <p className="mt-1 text-[14px] leading-6">{headline}</p>
        </div>
      </header>
      <dl className={cn("border-t bg-background/40 dark:bg-background/20", tone.divider)}>
        <MetadataRow label={t("issueNotices.recovery.meta.owner")}>
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {action.ownerType === "agent" && action.ownerAgentId ? (
              <>
                <span className="text-muted-foreground">{t("issueNotices.recovery.owner.recovery")}</span>
                <AgentLink agentId={action.ownerAgentId} agentMap={agentMap} />
              </>
            ) : action.ownerType === "board" ? (
              <span className="font-medium">{t("issueNotices.recovery.owner.board")}</span>
            ) : action.ownerType === "user" && action.ownerUserId ? (
              <span className="font-medium">{t("issueNotices.recovery.owner.user", { id: action.ownerUserId.slice(0, 6) })}</span>
            ) : action.ownerType === "system" ? (
              <span className="font-medium">{t("issueNotices.recovery.owner.system")}</span>
            ) : (
              <span className="text-muted-foreground">{t("issueNotices.recovery.owner.unassigned")}</span>
            )}
            {action.returnOwnerAgentId ? (
              <>
                <span className="text-muted-foreground">{t("issueNotices.recovery.owner.returnsTo")}</span>
                <AgentLink agentId={action.returnOwnerAgentId} agentMap={agentMap} />
              </>
            ) : null}
          </span>
        </MetadataRow>
        <MetadataRow label={t("issueNotices.recovery.meta.sourceRun")}>
          <RunChip runId={sourceRunId} agentId={action.previousOwnerAgentId} />
        </MetadataRow>
        {correctiveRunId ? (
          <MetadataRow label={t("issueNotices.recovery.meta.correctiveRun")}>
            <RunChip runId={correctiveRunId} agentId={action.previousOwnerAgentId} />
          </MetadataRow>
        ) : null}
        <MetadataRow label={t("issueNotices.recovery.meta.evidence")}>
          {evidenceSummary ? (
            <span className="break-words font-mono text-[11px] text-foreground/80">{evidenceSummary}</span>
          ) : (
            <MissingValue />
          )}
        </MetadataRow>
        <MetadataRow label={t("issueNotices.recovery.meta.nextAction")}>
          {action.nextAction ? <span>{action.nextAction}</span> : <MissingValue />}
        </MetadataRow>
        <MetadataRow label={t("issueNotices.recovery.meta.wake")}>
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {wakeSummary ? <span>{wakeSummary}</span> : <MissingValue />}
            {showAttempt ? (
              <span className="rounded-md border border-border/50 bg-background/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {t("issueNotices.recovery.attemptOf", { count: action.attemptCount, max: action.maxAttempts })}
              </span>
            ) : null}
            {showTimeoutInline ? (
              <span className="rounded-md border border-border/50 bg-background/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {t("issueNotices.recovery.timesOut", { time: formatTimeShort(action.timeoutAt, t) ?? t("issueNotices.recovery.timesOutSoon") })}
              </span>
            ) : null}
          </span>
        </MetadataRow>
        {cardState === "resolved" && action.outcome ? (
          <MetadataRow label={t("issueNotices.recovery.meta.resolution")}>
            <span className={cn("font-medium", tone.labelClass)}>
              {t("issueNotices.recovery.resolvedAsLabel", { outcome: OUTCOME_LABEL_KEY[action.outcome] ? t(OUTCOME_LABEL_KEY[action.outcome]) : action.outcome })}
              {action.resolvedAt ? ` · ${formatTimeShort(action.resolvedAt, t) ?? ""}` : ""}
            </span>
          </MetadataRow>
        ) : null}
      </dl>
      {showResolveActions ? (
        <div className={cn("flex flex-wrap items-center gap-2 border-t px-3 py-2.5 sm:px-4", tone.divider)}>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="default"
                data-testid="recovery-action-resolve-trigger"
                aria-label={t("issueNotices.recovery.resolve.triggerAria")}
              >
                {t("issueNotices.recovery.resolve.trigger")}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={6}
              className="w-72 p-1.5"
            >
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {t("issueNotices.recovery.resolve.heading")}
              </div>
              <div className="flex flex-col">
                {visibleResolveOptions.map((option) => (
                  <button
                    key={option.outcome}
                    type="button"
                    onClick={() => onResolve?.(option.outcome)}
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      option.destructive ? "text-destructive" : null,
                    )}
                  >
                    <span className="font-medium leading-5">{t(option.labelKey)}</span>
                    <span className="text-[11px] leading-4 text-muted-foreground">{t(option.descriptionKey)}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          {cardState === "observe_only" ? (
            <span className="text-[11px] text-muted-foreground">
              {t("issueNotices.recovery.resolve.observeOnlyHint")}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {t("issueNotices.recovery.resolve.openUntilDecision")}
            </span>
          )}
        </div>
      ) : null}
    </section>
  );
}

export type { IssueRecoveryActionStatus };

export default IssueRecoveryActionCard;
