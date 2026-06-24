import { useEffect, useMemo, useState } from "react";
import type { AgentPermissions, TrustPreset } from "@paperclipai/shared";
import { Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, CollapsibleSection } from "./agent-config-primitives";
import {
  buildPermissionsForTrustPreset,
  clearSingleLowTrustBoundaryTarget,
  getLowTrustBoundary,
  getSingleLowTrustBoundaryTarget,
  getTrustPreset,
  isCeLowTrustBoundaryEditable,
  lowTrustBoundaryHasScope,
  setSingleLowTrustBoundaryTarget,
  summarizeLowTrustBoundaryTarget,
  trustPresetDescription,
  trustPresetLabel,
  type LowTrustBoundaryTarget,
} from "../lib/trust-policy-ui";
import { cn } from "../lib/utils";
import { t as translate, useTranslation } from "@/i18n";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

function formatCount(value: readonly unknown[] | undefined, kind: "project" | "issue" | "agent" | "binding") {
  const count = value?.length ?? 0;
  if (count === 0) return translate("agentConfig.trust.emptyValue");
  const keyBase = {
    project: "agentConfig.trust.countProject",
    issue: "agentConfig.trust.countIssue",
    agent: "agentConfig.trust.countAgent",
    binding: "agentConfig.trust.countBinding",
  }[kind];
  return translate(count === 1 ? `${keyBase}One` : `${keyBase}Other`, { count });
}

function PolicyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className={cn("min-w-0 text-right", value === "-" && "text-muted-foreground")}>{value}</span>
    </div>
  );
}

export interface LowTrustBoundaryCandidate {
  id: string;
  label: string;
}

type LowTrustBoundaryTargetType = LowTrustBoundaryTarget["type"];

const BOUNDARY_TARGET_LABELS: Record<LowTrustBoundaryTargetType, string> = {
  project: translate("agentConfig.trust.project"),
  root_issue: translate("agentConfig.trust.rootIssue"),
  issue: translate("agentConfig.trust.issue"),
};

export function TrustPresetSection({
  permissions,
  onChange,
  disabled,
  companyId,
  projectCandidates = [],
  issueCandidates = [],
  candidatesLoading,
}: {
  permissions: Partial<AgentPermissions> | null | undefined;
  onChange: (permissions: Partial<AgentPermissions>) => void;
  disabled?: boolean;
  companyId?: string | null;
  projectCandidates?: LowTrustBoundaryCandidate[];
  issueCandidates?: LowTrustBoundaryCandidate[];
  candidatesLoading?: boolean;
}) {
  const { t } = useTranslation();
  const [policyOpen, setPolicyOpen] = useState(false);
  const preset = getTrustPreset(permissions);
  const boundary = getLowTrustBoundary(permissions);
  const boundaryTarget = getSingleLowTrustBoundaryTarget(boundary);
  const [targetType, setTargetType] = useState<LowTrustBoundaryTargetType>(boundaryTarget?.type ?? "project");
  const lowTrust = preset === "low_trust_review";
  const hasScope = lowTrustBoundaryHasScope(boundary);
  const boundaryEditable = isCeLowTrustBoundaryEditable(boundary);
  const policy = permissions?.authorizationPolicy ?? null;
  const managedPermissions = useMemo(
    () => buildPermissionsForTrustPreset(permissions, preset),
    [permissions, preset],
  );

  useEffect(() => {
    if (boundaryTarget) setTargetType(boundaryTarget.type);
  }, [boundaryTarget?.type]);

  function handlePresetChange(value: string) {
    const nextPreset: TrustPreset = value === "low_trust_review" ? "low_trust_review" : "standard";
    onChange(buildPermissionsForTrustPreset(permissions, nextPreset));
  }

  function handleBoundaryTargetChange(targetId: string) {
    if (!companyId || !targetId) return;
    onChange(setSingleLowTrustBoundaryTarget(permissions, companyId, { type: targetType, id: targetId }));
  }

  function handleClearBoundary() {
    onChange(clearSingleLowTrustBoundaryTarget(permissions));
  }

  const targetCandidates = targetType === "project" ? projectCandidates : issueCandidates;
  const boundaryValue = boundaryTarget?.type === targetType ? boundaryTarget.id : "";

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">{t("agentConfig.trust.heading")}</h3>
      <div className="rounded-lg border border-border p-4 space-y-3">
        <Field label={t("agentConfig.trust.presetLabel")} hint={t("agentConfig.trust.presetHint")}>
          <select
            className={inputClass}
            value={preset}
            onChange={(event) => handlePresetChange(event.target.value)}
            disabled={disabled}
          >
            <option value="standard">{trustPresetLabel("standard", t)}</option>
            <option value="low_trust_review">{trustPresetLabel("low_trust_review", t)}</option>
          </select>
        </Field>
        <p className="text-xs text-muted-foreground">{trustPresetDescription(preset, t)}</p>

        {lowTrust ? (
          <div
            role={hasScope ? "status" : "alert"}
            aria-live="polite"
            className={cn(
              "rounded-md border px-3 py-2.5 text-sm flex gap-2",
              hasScope
                ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-100"
                : "border-destructive/30 bg-destructive/10 text-destructive",
            )}
          >
            {hasScope ? (
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <p className="font-medium">
                  {hasScope ? t("agentConfig.trust.containmentActive") : t("agentConfig.trust.containmentNotConfigured")}
                </p>
                <p className="mt-1 text-xs leading-5">
                  {hasScope
                    ? t("agentConfig.trust.containmentActiveDescription")
                    : t("agentConfig.trust.containmentNotConfiguredDescription")}
                </p>
              </div>
              {boundaryEditable ? (
                <div className="rounded-md border border-border/70 bg-background/70 p-3 text-foreground space-y-3">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]">
                    <Field label={t("agentConfig.trust.boundaryType")}>
                      <select
                        className={inputClass}
                        value={targetType}
                        onChange={(event) => setTargetType(event.target.value as LowTrustBoundaryTargetType)}
                        disabled={disabled}
                      >
                        <option value="project">{t("agentConfig.trust.project")}</option>
                        <option value="root_issue">{t("agentConfig.trust.rootIssue")}</option>
                        <option value="issue">{t("agentConfig.trust.issue")}</option>
                      </select>
                    </Field>
                    <Field label={BOUNDARY_TARGET_LABELS[targetType]}>
                      <select
                        className={inputClass}
                        value={boundaryValue}
                        onChange={(event) => handleBoundaryTargetChange(event.target.value)}
                        disabled={disabled || !companyId || candidatesLoading || targetCandidates.length === 0}
                      >
                        <option value="">
                          {candidatesLoading
                            ? t("agentConfig.trust.loading")
                            : targetCandidates.length === 0
                              ? targetType === "project"
                                ? t("agentConfig.trust.noProjectsAvailable")
                                : t("agentConfig.trust.noIssuesAvailable")
                              : t("agentConfig.trust.selectBoundary")}
                        </option>
                        {targetCandidates.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {t("agentConfig.trust.ceBoundaryNote")}
                    </p>
                    {boundaryTarget ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs"
                        onClick={handleClearBoundary}
                        disabled={disabled}
                      >
                        {t("agentConfig.trust.clearBoundary")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-border/70 bg-background/70 p-3 text-foreground">
                  <p className="text-sm font-medium">{t("agentConfig.trust.managedByEe")}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t("agentConfig.trust.managedByEeDescription", { summary: summarizeLowTrustBoundaryTarget(boundary, t).toLowerCase() })}
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {t("agentConfig.trust.multiBoundaryPrompt")}
                <a
                  className="underline underline-offset-2 hover:text-foreground"
                  href="https://paperclip.ing/ee"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("agentConfig.trust.getPaperclipEe")}
                </a>
              </p>
              <CollapsibleSection
                title={t("agentConfig.trust.viewPolicy")}
                open={policyOpen}
                onToggle={() => setPolicyOpen((open) => !open)}
              >
                <div className="divide-y divide-border/60 text-foreground">
                  <PolicyRow label={t("agentConfig.trust.policyPreset")} value={t("agentConfig.trust.policyPresetValue")} />
                  <PolicyRow label={t("agentConfig.trust.rawOutput")} value={t("agentConfig.trust.rawOutputValue")} />
                  <PolicyRow label={t("agentConfig.trust.projects")} value={formatCount(boundary?.projectIds, "project")} />
                  <PolicyRow label={t("agentConfig.trust.rootIssue")} value={boundary?.rootIssueId ? boundary.rootIssueId.slice(0, 8) : t("agentConfig.trust.emptyValue")} />
                  <PolicyRow label={t("agentConfig.trust.explicitIssues")} value={formatCount(boundary?.issueIds, "issue")} />
                  <PolicyRow label={t("agentConfig.trust.allowedAgents")} value={formatCount(boundary?.allowedAgentIds, "agent")} />
                  <PolicyRow label={t("agentConfig.trust.allowedTools")} value={boundary?.allowedToolClasses?.join(" · ") || t("agentConfig.trust.emptyValue")} />
                  <PolicyRow label={t("agentConfig.trust.allowedSecrets")} value={formatCount(boundary?.allowedSecretBindingIds, "binding")} />
                  <PolicyRow label={t("agentConfig.trust.promotionTarget")} value={boundary?.outputPromotionTarget?.issueId?.slice(0, 8) ?? t("agentConfig.trust.emptyValue")} />
                  <PolicyRow
                    label={t("agentConfig.trust.eeFields")}
                    value={Object.keys(policy ?? {}).some((key) => !["trustPreset", "reviewPreset", "trustBoundary"].includes(key))
                      ? t("agentConfig.trust.eeFieldsValue")
                      : t("agentConfig.trust.emptyValue")}
                  />
                </div>
              </CollapsibleSection>
            </div>
          </div>
        ) : null}

        {managedPermissions.authorizationPolicy?.reviewPreset ? null : (
          <p className="text-xs text-muted-foreground">
            {t("agentConfig.trust.advancedPermissionsNote")}
          </p>
        )}
      </div>
    </div>
  );
}
