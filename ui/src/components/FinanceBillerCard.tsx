import type { FinanceByBiller } from "@paperclipai/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { formatCents, providerDisplayName } from "@/lib/utils";

interface FinanceBillerCardProps {
  row: FinanceByBiller;
}

export function FinanceBillerCard({ row }: FinanceBillerCardProps) {
  const { t } = useTranslation();
  const eventsLabel = t(
    row.eventCount === 1 ? "financeComp.financeBiller.eventOne" : "financeComp.financeBiller.eventOther",
    { count: row.eventCount },
  );
  const kindsLabel = t(
    row.kindCount === 1 ? "financeComp.financeBiller.kindOne" : "financeComp.financeBiller.kindOther",
    { count: row.kindCount },
  );

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{providerDisplayName(row.biller)}</CardTitle>
            <CardDescription className="mt-1 text-xs">
              {t("financeComp.financeBiller.eventsAcrossKinds", { events: eventsLabel, kinds: kindsLabel })}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold tabular-nums">{formatCents(row.netCents)}</div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t("financeComp.financeBiller.net")}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 pt-3">
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <div className="border border-border p-3">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{t("financeComp.financeBiller.debits")}</div>
            <div className="mt-1 font-medium tabular-nums">{formatCents(row.debitCents)}</div>
          </div>
          <div className="border border-border p-3">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{t("financeComp.financeBiller.credits")}</div>
            <div className="mt-1 font-medium tabular-nums">{formatCents(row.creditCents)}</div>
          </div>
          <div className="border border-border p-3">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{t("financeComp.financeBiller.estimated")}</div>
            <div className="mt-1 font-medium tabular-nums">{formatCents(row.estimatedDebitCents)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
