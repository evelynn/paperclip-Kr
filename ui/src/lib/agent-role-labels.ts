import type { TFunction } from "i18next";
import { AGENT_ROLE_LABELS } from "@paperclipai/shared";
import { i18n } from "@/i18n";

const FALLBACK = AGENT_ROLE_LABELS as Record<string, string>;

/**
 * Localized agent-role label. The acronym roles (CEO/CTO/PM/QA…) stay as-is in
 * Korean; the descriptive ones (Security/Engineer/Designer/DevOps/Researcher/
 * General) translate. `t` defaults to the global `i18n.t` so callers don't have
 * to thread it; component callers stay reactive via their own useTranslation.
 */
export function agentRoleLabel(role: string, t: TFunction = i18n.t): string {
  return t(`agentRoles.${role}`, { defaultValue: FALLBACK[role] ?? role });
}
