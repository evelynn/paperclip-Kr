import { useState } from "react";
import { ChevronDown, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { cn, relativeTime } from "@/lib/utils";
import { formatBytes, isHtmlGuideContentType, outputFilename, type IssueOutputItem } from "@/lib/issue-output";
import { OutputFileTile } from "./OutputFileTile";
import { OutputHtmlGuideViewer } from "./OutputHtmlGuideViewer";

interface OutputRowProps {
  item: IssueOutputItem;
  creatorName?: string | null;
}

/** Compact row for a non-primary output ("ALSO PRODUCED"). */
export function OutputRow({ item, creatorName }: OutputRowProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const filename = outputFilename(item);
  const meta = item.metadata;
  // Self-contained HTML guides can be previewed inline (sandboxed) without
  // leaving the page; the preview stays collapsed so the row list stays compact.
  const isGuide = Boolean(meta && isHtmlGuideContentType(meta.contentType));

  const metaBits: string[] = [];
  if (meta) {
    metaBits.push(meta.contentType);
    metaBits.push(formatBytes(meta.byteSize));
  }
  if (creatorName) metaBits.push(creatorName);
  metaBits.push(relativeTime(item.createdAt));

  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex items-center gap-2.5 p-2">
        <OutputFileTile contentType={meta?.contentType} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground" title={filename}>
            {filename}
          </p>
          <p
            className={cn(
              "truncate text-[11px]",
              item.degraded ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {item.degraded ? t("tailComp.outputRow.detailsUnavailable") : metaBits.join(" · ")}
          </p>
        </div>
        {meta ? (
          <div className="flex shrink-0 items-center gap-1">
            {isGuide ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-expanded={expanded}
                title={expanded ? t("tailComp.outputRow.hidePreview") : t("tailComp.outputRow.preview")}
                aria-label={expanded ? t("tailComp.outputRow.hidePreview") : t("tailComp.outputRow.preview")}
                onClick={() => setExpanded((value) => !value)}
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
              </Button>
            ) : null}
            <Button asChild variant="ghost" size="icon-sm" title={t("tailComp.outputRow.openInNewTab")}>
              <a href={meta.openPath} target="_blank" rel="noreferrer" aria-label={t("tailComp.outputRow.openAriaLabel", { filename })}>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="ghost" size="icon-sm" title={t("tailComp.outputRow.download")}>
              <a href={meta.downloadPath} aria-label={t("tailComp.outputRow.downloadAriaLabel", { filename })}>
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
        ) : null}
      </div>
      {isGuide && expanded && meta ? (
        <div className="border-t border-border">
          <OutputHtmlGuideViewer src={meta.contentPath} title={filename} />
        </div>
      ) : null}
    </div>
  );
}
