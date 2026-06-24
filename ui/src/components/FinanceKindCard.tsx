import type { FinanceByKind } from "@paperclipai/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { financeEventKindDisplayName, formatCents } from "@/lib/utils";

interface FinanceKindCardProps {
  rows: FinanceByKind[];
}

export function FinanceKindCard({ rows }: FinanceKindCardProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-1">
        <CardTitle className="text-base">{t("financeComp.financeKind.title")}</CardTitle>
        <CardDescription>{t("financeComp.financeKind.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4 pt-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("financeComp.financeKind.empty")}</p>
        ) : (
          rows.map((row) => {
            const eventsLabel = t(
              row.eventCount === 1 ? "financeComp.financeKind.eventOne" : "financeComp.financeKind.eventOther",
              { count: row.eventCount },
            );
            const billersLabel = t(
              row.billerCount === 1 ? "financeComp.financeKind.billerOne" : "financeComp.financeKind.billerOther",
              { count: row.billerCount },
            );
            return (
              <div
                key={row.eventKind}
                className="flex items-center justify-between gap-3 border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{financeEventKindDisplayName(row.eventKind)}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("financeComp.financeKind.eventsBillers", { events: eventsLabel, billers: billersLabel })}
                  </div>
                </div>
                <div className="text-right tabular-nums">
                  <div className="text-sm font-medium">{formatCents(row.netCents)}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("financeComp.financeKind.debits", { amount: formatCents(row.debitCents) })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
