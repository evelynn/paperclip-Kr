import { Trans } from "@/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/i18n";

interface ShortcutEntry {
  keys: string[];
  /** Translation key (under `chromeComp.shortcuts`) for the shortcut label. */
  labelKey: string;
  /** Render keys as a simultaneous chord (joined with "+") rather than a
   *  "then" sequence. */
  combo?: boolean;
}

// Platform-appropriate label for the Cmd/Ctrl modifier so the cheatsheet shows
// the same key the user actually presses (re-pointed in the collapsible sidebar
// work — Cmd/Ctrl+B toggles the rail).
function getPlatformLabel() {
  if (typeof navigator === "undefined") return "";
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return nav.userAgentData?.platform || navigator.userAgent || "";
}

const META_KEY = /Mac|iPhone|iPad|iPod/.test(getPlatformLabel()) ? "⌘" : "Ctrl";

interface ShortcutSection {
  /** Translation key (under `chromeComp.shortcuts`) for the section title. */
  titleKey: string;
  shortcuts: ShortcutEntry[];
}

const sections: ShortcutSection[] = [
  {
    titleKey: "chromeComp.shortcuts.sectionInbox",
    shortcuts: [
      { keys: ["j"], labelKey: "chromeComp.shortcuts.moveDown" },
      { keys: ["↓"], labelKey: "chromeComp.shortcuts.moveDown" },
      { keys: ["k"], labelKey: "chromeComp.shortcuts.moveUp" },
      { keys: ["↑"], labelKey: "chromeComp.shortcuts.moveUp" },
      { keys: ["←"], labelKey: "chromeComp.shortcuts.collapseSelectedGroup" },
      { keys: ["→"], labelKey: "chromeComp.shortcuts.expandSelectedGroup" },
      { keys: ["Enter"], labelKey: "chromeComp.shortcuts.openSelectedItem" },
      { keys: ["a"], labelKey: "chromeComp.shortcuts.archiveItem" },
      { keys: ["y"], labelKey: "chromeComp.shortcuts.archiveItem" },
      { keys: ["r"], labelKey: "chromeComp.shortcuts.markAsRead" },
      { keys: ["U"], labelKey: "chromeComp.shortcuts.markAsUnread" },
    ],
  },
  {
    titleKey: "chromeComp.shortcuts.sectionTaskDetail",
    shortcuts: [
      { keys: ["y"], labelKey: "chromeComp.shortcuts.quickArchiveBackToInbox" },
      { keys: ["g", "i"], labelKey: "chromeComp.shortcuts.goToInbox" },
      { keys: ["g", "c"], labelKey: "chromeComp.shortcuts.focusCommentComposer" },
    ],
  },
  {
    titleKey: "chromeComp.shortcuts.sectionGlobal",
    shortcuts: [
      { keys: ["/"], labelKey: "chromeComp.shortcuts.searchCurrentPageOrQuickSearch" },
      { keys: ["c"], labelKey: "chromeComp.shortcuts.newTask" },
      { keys: ["["], labelKey: "chromeComp.shortcuts.toggleSidebar" },
      { keys: [META_KEY, "B"], labelKey: "chromeComp.shortcuts.collapseOrExpandSidebar", combo: true },
      { keys: ["]"], labelKey: "chromeComp.shortcuts.togglePanel" },
      { keys: ["?"], labelKey: "chromeComp.shortcuts.showKeyboardShortcuts" },
    ],
  },
];

function KeyCap({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium text-foreground shadow-[0_1px_0_1px_hsl(var(--border))]">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsCheatsheetContent() {
  const { t } = useTranslation();
  return (
    <>
      <div className="divide-y divide-border border-t border-border">
        {sections.map((section) => (
          <div key={section.titleKey} className="px-5 py-3">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t(section.titleKey)}
            </h3>
            <div className="space-y-1.5">
              {section.shortcuts.map((shortcut) => (
                <div
                  key={shortcut.labelKey + shortcut.keys.join()}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-sm text-foreground/90">{t(shortcut.labelKey)}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, i) => (
                      <span key={key} className="flex items-center gap-1">
                        {i > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {shortcut.combo ? "+" : t("chromeComp.shortcuts.separatorThen")}
                          </span>
                        )}
                        <KeyCap>{key}</KeyCap>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-5 py-3">
        <p className="text-xs text-muted-foreground">
          <Trans i18nKey="chromeComp.shortcuts.footer" components={[<KeyCap key="esc">Esc</KeyCap>]} />
        </p>
      </div>
    </>
  );
}

export function KeyboardShortcutsCheatsheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden" showCloseButton={false}>
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">{t("chromeComp.shortcuts.dialogTitle")}</DialogTitle>
        </DialogHeader>
        <KeyboardShortcutsCheatsheetContent />
      </DialogContent>
    </Dialog>
  );
}
