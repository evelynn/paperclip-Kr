import { Eye } from "lucide-react";
import type { IssueProductivityReview } from "@paperclipai/shared";
import type { TFunction } from "i18next";
import { Link } from "../lib/router";
import { cn } from "../lib/utils";
import { createIssueDetailPath } from "../lib/issueDetailBreadcrumb";
import { i18n, useTranslation } from "@/i18n";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function productivityReviewTriggerLabel(
  trigger: IssueProductivityReview["trigger"],
  t: TFunction = i18n.t,
): string {
  if (!trigger) return t("productivityReview.trigger.default");
  return t(`productivityReview.trigger.${trigger}`, {
    defaultValue: t("productivityReview.trigger.default"),
  });
}

export function ProductivityReviewBadge({
  review,
  className,
  hideLabel = false,
}: {
  review: IssueProductivityReview;
  className?: string;
  hideLabel?: boolean;
}) {
  const { t } = useTranslation();
  const label = productivityReviewTriggerLabel(review.trigger, t);
  const reviewIdentifier = review.reviewIdentifier ?? review.reviewIssueId.slice(0, 8);
  const reviewPath = createIssueDetailPath(review.reviewIdentifier ?? review.reviewIssueId);
  const statusLabel = t(`productivityReview.status.${review.status}`, {
    defaultValue: review.status.replace(/_/g, " "),
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={reviewPath}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 shrink-0 hover:bg-amber-500/20 transition-colors",
            className,
          )}
          aria-label={t("productivityReview.aria", { id: reviewIdentifier, label })}
        >
          <Eye className="h-3 w-3" aria-hidden />
          {hideLabel ? null : <span>{t("productivityReview.underReview")}</span>}
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1 text-xs">
          <div className="font-semibold">{t("productivityReview.open")}</div>
          <div>
            <span className="text-muted-foreground">{t("productivityReview.triggerLabel")}</span> {label}
          </div>
          {typeof review.noCommentStreak === "number" && review.noCommentStreak > 0 ? (
            <div>
              <span className="text-muted-foreground">{t("productivityReview.noCommentStreakLabel")}</span>{" "}
              {t("productivityReview.runs", { count: review.noCommentStreak })}
            </div>
          ) : null}
          <div>
            <span className="text-muted-foreground">{t("productivityReview.reviewLabel")}</span> {reviewIdentifier} ({statusLabel})
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
