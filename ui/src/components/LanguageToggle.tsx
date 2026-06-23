import { Languages } from "lucide-react";

import { cn } from "@/lib/utils";
import { setLocale, useTranslation } from "@/i18n";
import { instanceSettingsApi } from "@/api/instanceSettings";

type LanguageToggleVariant = "icon" | "menu-action";

interface LanguageToggleProps {
  className?: string;
  /**
   * `icon` (default): compact pill — suitable for the onboarding front door
   * and other floating chrome.
   *
   * `menu-action`: full-width row with label + description + icon — matches the
   * surrounding `MenuAction` / `ThemeToggle` rows in `SidebarAccountMenu`.
   */
  variant?: LanguageToggleVariant;
  /** Called after the locale switches; menus use it to dismiss themselves. */
  onAfterToggle?: () => void;
}

// The first-run slice ships real Korean + English translations; the remaining
// locales are English placeholders until translated, so the switcher toggles
// between the two languages that are actually localized today.
const PRIMARY_LOCALE = "ko";
const SECONDARY_LOCALE = "en";

/**
 * Canonical language switcher. Persists the choice via `setLocale` (localStorage)
 * and re-renders reactively through `useTranslation`'s i18n subscription.
 */
export function LanguageToggle({ className, variant = "icon", onAfterToggle }: LanguageToggleProps) {
  const { t, i18n } = useTranslation();
  const isKorean = (i18n.language ?? "").split("-")[0] === PRIMARY_LOCALE;
  const next = isKorean ? SECONDARY_LOCALE : PRIMARY_LOCALE;

  const label = isKorean
    ? t("account.language.switchToEnglish", { defaultValue: "Switch to English" })
    : t("account.language.switchToKorean", { defaultValue: "Switch to Korean" });
  const description = t("account.language.description", {
    defaultValue: "Change the display language.",
  });

  function handleClick() {
    setLocale(next);
    // PAP-Kr: one selector drives both the UI and the agents. Persist the choice
    // as the instance-wide agent language so every agent responds in it. The
    // setting is admin-gated, so for non-admins this PATCH simply 403s and is
    // ignored — they still get the UI switch.
    void instanceSettingsApi.updateGeneral({ agentLanguage: next }).catch(() => {});
    onAfterToggle?.();
  }

  if (variant === "menu-action") {
    return (
      <button
        type="button"
        className={cn(
          "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/60",
          className,
        )}
        onClick={handleClick}
        aria-label={label}
      >
        <span className="mt-0.5 rounded-lg border border-border bg-background/70 p-2 text-muted-foreground">
          <Languages className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{label}</span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-background/70 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground",
        className,
      )}
    >
      <Languages className="size-3.5" />
      <span>{isKorean ? "EN" : "한국어"}</span>
    </button>
  );
}
