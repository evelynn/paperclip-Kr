import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Sparkles } from "lucide-react";
import { AGENT_ROLES, type CatalogSkillRecommendation } from "@paperclipai/shared";

import { companySkillsApi } from "@/api/companySkills";
import { agentRoleLabel } from "@/lib/agent-role-labels";
import { queryKeys } from "@/lib/queryKeys";
import { useToastActions } from "@/context/ToastContext";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RECOMMENDATION_LIMIT = 6;
// "general" has no role-specific catalog mapping, so it never yields role matches.
const SELECTABLE_ROLES = AGENT_ROLES.filter((role) => role !== "general");

interface SkillRecommendationRailProps {
  companyId: string;
  installedKeys: string[];
  className?: string;
}

/**
 * Role-based catalog skill recommendations. Bridges an agent role to the
 * catalog's `recommendedForRoles` taxonomy server-side and lets a non-developer
 * install a suggested skill in one click. Already-installed skills are excluded.
 */
export function SkillRecommendationRail({
  companyId,
  installedKeys,
  className,
}: SkillRecommendationRailProps) {
  const { t } = useTranslation();
  const { pushToast } = useToastActions();
  const queryClient = useQueryClient();
  const [role, setRole] = useState<string>("engineer");

  const excludeKey = useMemo(() => [...installedKeys].sort().join(","), [installedKeys]);

  const recommendationsQuery = useQuery({
    queryKey: [...queryKeys.companySkills.recommended(companyId, role), excludeKey],
    queryFn: () =>
      companySkillsApi.catalogRecommended(role, {
        limit: RECOMMENDATION_LIMIT,
        exclude: installedKeys,
      }),
    enabled: Boolean(companyId && role),
  });

  const install = useMutation({
    mutationFn: (catalogSkillId: string) =>
      companySkillsApi.installCatalog(companyId, { catalogSkillId, slug: null, force: false }),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.companySkills.list(companyId) }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.companySkills.recommended(companyId, role),
        }),
      ]);
      pushToast({ tone: "success", title: t("skillRecs.installedTitle"), body: result.skill.name });
    },
    onError: (error) => {
      pushToast({
        tone: "error",
        title: t("skillRecs.installFailed"),
        body: error instanceof Error ? error.message : undefined,
      });
    },
  });

  const recommendations = recommendationsQuery.data ?? [];

  return (
    <section
      className={cn(
        "mb-4 rounded-xl border border-border bg-card/60 p-4",
        className,
      )}
      aria-label={t("skillRecs.title")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-300">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("skillRecs.title")}</h3>
            <p className="text-xs text-muted-foreground">{t("skillRecs.subtitle")}</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t("skillRecs.role")}</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
          >
            {SELECTABLE_ROLES.map((roleOption) => (
              <option key={roleOption} value={roleOption}>
                {agentRoleLabel(roleOption, t)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3">
        {recommendationsQuery.isLoading ? (
          <p className="py-4 text-center text-xs text-muted-foreground">{t("skillRecs.loading")}</p>
        ) : recommendations.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">{t("skillRecs.empty")}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {recommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.skill.id}
                recommendation={recommendation}
                installing={install.isPending && install.variables === recommendation.skill.id}
                onInstall={() => install.mutate(recommendation.skill.id)}
                installLabel={t("skillRecs.install")}
                installingLabel={t("skillRecs.installing")}
                reasonLabel={
                  recommendation.reason === "role"
                    ? t("skillRecs.reasonRole")
                    : t("skillRecs.reasonDefault")
                }
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RecommendationCard({
  recommendation,
  installing,
  onInstall,
  installLabel,
  installingLabel,
  reasonLabel,
}: {
  recommendation: CatalogSkillRecommendation;
  installing: boolean;
  onInstall: () => void;
  installLabel: string;
  installingLabel: string;
  reasonLabel: string;
}) {
  const { skill } = recommendation;
  return (
    <div className="flex flex-col justify-between gap-2 rounded-lg border border-border bg-background p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">{skill.name}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{skill.description}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
          {reasonLabel}
        </span>
        <Button size="sm" variant="outline" onClick={onInstall} disabled={installing}>
          <Download className="mr-1 h-3.5 w-3.5" aria-hidden />
          {installing ? installingLabel : installLabel}
        </Button>
      </div>
    </div>
  );
}
