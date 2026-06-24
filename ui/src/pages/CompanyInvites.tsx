import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { Check, Copy, ExternalLink, MailPlus } from "lucide-react";
import { accessApi } from "@/api/access";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/context/ToastContext";
import { useTranslation } from "@/i18n";
import { Link } from "@/lib/router";
import { queryKeys } from "@/lib/queryKeys";

const inviteRoleOptions = ["viewer", "operator", "admin", "owner"] as const;

const INVITE_HISTORY_PAGE_SIZE = 5;

function isInviteHistoryRow(value: unknown): value is Awaited<ReturnType<typeof accessApi.listInvites>>["invites"][number] {
  if (!value || typeof value !== "object") return false;
  return "id" in value && "state" in value && "createdAt" in value;
}

export function CompanyInvites() {
  const { t } = useTranslation();
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [humanRole, setHumanRole] = useState<"owner" | "admin" | "operator" | "viewer">("operator");
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);
  const [latestInviteCopied, setLatestInviteCopied] = useState(false);
  const latestInviteInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!latestInviteCopied) return;
    const timeout = window.setTimeout(() => {
      setLatestInviteCopied(false);
    }, 1600);
    return () => window.clearTimeout(timeout);
  }, [latestInviteCopied]);

  function selectLatestInviteUrl() {
    latestInviteInputRef.current?.focus();
    latestInviteInputRef.current?.select();
  }

  async function copyText(text: string, unavailableBody: string, afterFallback?: () => void) {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fall through to the unavailable message below.
    }

    const canUseLegacyCopy =
      typeof document !== "undefined" &&
      typeof document.execCommand === "function" &&
      (typeof document.queryCommandSupported !== "function" || document.queryCommandSupported("copy"));
    if (canUseLegacyCopy) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      try {
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        afterFallback?.();
        if (copied) return true;
      } catch {
        document.body.removeChild(textarea);
      }
    }

    afterFallback?.();
    pushToast({
      title: t("companyAdmin.invites.clipboard.unavailable"),
      body: unavailableBody,
      tone: "warn",
    });
    return false;
  }

  async function copyInviteUrl(url: string) {
    return copyText(url, t("companyAdmin.invites.clipboard.selectManually"), selectLatestInviteUrl);
  }

  useEffect(() => {
    setBreadcrumbs([
      { label: selectedCompany?.name ?? t("companyAdmin.invites.breadcrumbs.company"), href: "/dashboard" },
      { label: t("companyAdmin.invites.breadcrumbs.settings"), href: "/company/settings" },
      { label: t("companyAdmin.invites.breadcrumbs.invites") },
    ]);
  }, [selectedCompany?.name, setBreadcrumbs, t]);

  const inviteHistoryQueryKey = queryKeys.access.invites(selectedCompanyId ?? "", "all", INVITE_HISTORY_PAGE_SIZE);
  const invitesQuery = useInfiniteQuery({
    queryKey: inviteHistoryQueryKey,
    queryFn: ({ pageParam }) =>
      accessApi.listInvites(selectedCompanyId!, {
        limit: INVITE_HISTORY_PAGE_SIZE,
        offset: pageParam,
      }),
    enabled: !!selectedCompanyId,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
  });
  const inviteHistory = useMemo(
    () =>
      invitesQuery.data?.pages.flatMap((page) =>
        Array.isArray(page?.invites) ? page.invites.filter(isInviteHistoryRow) : [],
      ) ?? [],
    [invitesQuery.data?.pages],
  );

  const createInviteMutation = useMutation({
    mutationFn: () =>
      accessApi.createCompanyInvite(selectedCompanyId!, {
        allowedJoinTypes: "human",
        humanRole,
        agentMessage: null,
      }),
    onSuccess: async (invite) => {
      setLatestInviteUrl(invite.inviteUrl);
      setLatestInviteCopied(false);
      const copied = await copyText(invite.inviteUrl, t("companyAdmin.invites.clipboard.copyManually"));

      await queryClient.invalidateQueries({ queryKey: inviteHistoryQueryKey });
      pushToast({
        title: t("companyAdmin.invites.toast.inviteCreated"),
        body: copied
          ? t("companyAdmin.invites.toast.inviteReadyCopied")
          : t("companyAdmin.invites.toast.inviteReady"),
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: t("companyAdmin.invites.toast.createFailed"),
        body: error instanceof Error ? error.message : t("companyAdmin.invites.toast.unknownError"),
        tone: "error",
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => accessApi.revokeInvite(inviteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inviteHistoryQueryKey });
      pushToast({ title: t("companyAdmin.invites.toast.inviteRevoked"), tone: "success" });
    },
    onError: (error) => {
      pushToast({
        title: t("companyAdmin.invites.toast.revokeFailed"),
        body: error instanceof Error ? error.message : t("companyAdmin.invites.toast.unknownError"),
        tone: "error",
      });
    },
  });

  if (!selectedCompanyId) {
    return <div className="text-sm text-muted-foreground">{t("companyAdmin.invites.selectCompany")}</div>;
  }

  if (invitesQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">{t("companyAdmin.invites.loading")}</div>;
  }

  if (invitesQuery.error) {
    const message =
      invitesQuery.error instanceof ApiError && invitesQuery.error.status === 403
        ? t("companyAdmin.invites.errorForbidden")
        : invitesQuery.error instanceof Error
          ? invitesQuery.error.message
          : t("companyAdmin.invites.errorGeneric");
    return <div className="text-sm text-destructive">{message}</div>;
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MailPlus className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">{t("companyAdmin.invites.title")}</h1>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("companyAdmin.invites.intro")}
        </p>
      </div>

      <section className="space-y-4 rounded-xl border border-border p-5">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">{t("companyAdmin.invites.invitePerson")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("companyAdmin.invites.invitePersonDescription")}
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">{t("companyAdmin.invites.chooseRole")}</legend>
          <div className="rounded-xl border border-border">
            {inviteRoleOptions.map((option, index) => {
              const checked = humanRole === option;
              return (
                <label
                  key={option}
                  className={`flex cursor-pointer gap-3 px-4 py-4 ${index > 0 ? "border-t border-border" : ""}`}
                >
                  <input
                    type="radio"
                    name="invite-role"
                    value={option}
                    checked={checked}
                    onChange={() => setHumanRole(option)}
                    className="mt-1 h-4 w-4 border-border text-foreground"
                  />
                  <span className="min-w-0 space-y-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{t(`companyAdmin.invites.roles.${option}Label`)}</span>
                      {option === "operator" ? (
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                          {t("companyAdmin.invites.defaultBadge")}
                        </span>
                      ) : null}
                    </span>
                    <span className="block max-w-2xl text-sm text-muted-foreground">{t(`companyAdmin.invites.roles.${option}Description`)}</span>
                    <span className="block text-sm text-foreground">{t(`companyAdmin.invites.roles.${option}Gets`)}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
          {t("companyAdmin.invites.singleUseNote")}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => createInviteMutation.mutate()} disabled={createInviteMutation.isPending}>
            {createInviteMutation.isPending ? t("companyAdmin.invites.creating") : t("companyAdmin.invites.createInvite")}
          </Button>
          <span className="text-sm text-muted-foreground">{t("companyAdmin.invites.auditTrailNote")}</span>
        </div>

        {latestInviteUrl ? (
          <div className="space-y-3 rounded-lg border border-border px-4 py-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{t("companyAdmin.invites.latestInviteLink")}</div>
                {latestInviteCopied ? (
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                    <Check className="h-3.5 w-3.5" />
                    {t("companyAdmin.invites.copied")}
                  </div>
                ) : null}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("companyAdmin.invites.latestInviteDomainNote")}
              </div>
            </div>
            <label className="block space-y-1">
              <span className="sr-only">{t("companyAdmin.invites.latestInviteUrlLabel")}</span>
              <input
                ref={latestInviteInputRef}
                readOnly
                value={latestInviteUrl}
                onFocus={(event) => event.currentTarget.select()}
                onClick={(event) => event.currentTarget.select()}
                className="w-full rounded-md border border-border bg-muted/60 px-3 py-2 text-sm text-foreground outline-none transition-colors selection:bg-primary selection:text-primary-foreground focus:border-ring"
                aria-label={t("companyAdmin.invites.latestInviteUrlLabel")}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={async () => {
                  const copied = await copyInviteUrl(latestInviteUrl);
                  setLatestInviteCopied(copied);
                }}
              >
                <Copy className="h-4 w-4" />
                {t("companyAdmin.invites.copyLink")}
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={latestInviteUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {t("companyAdmin.invites.openInvite")}
                </a>
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">{t("companyAdmin.invites.inviteHistory")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("companyAdmin.invites.inviteHistoryDescription")}
            </p>
          </div>
          <Link to="/inbox/requests" className="text-sm underline underline-offset-4">
            {t("companyAdmin.invites.openJoinQueue")}
          </Link>
        </div>

        {inviteHistory.length === 0 ? (
          <div className="border-t border-border px-5 py-8 text-sm text-muted-foreground">
            {t("companyAdmin.invites.historyEmpty")}
          </div>
        ) : (
          <div className="border-t border-border">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 font-medium text-muted-foreground">{t("companyAdmin.invites.columnState")}</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">{t("companyAdmin.invites.columnFor")}</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">{t("companyAdmin.invites.columnInvitedBy")}</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">{t("companyAdmin.invites.columnCreated")}</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">{t("companyAdmin.invites.columnJoinRequest")}</th>
                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">{t("companyAdmin.invites.columnAction")}</th>
                  </tr>
                </thead>
                <tbody>
                  {inviteHistory.map((invite) => (
                    <tr key={invite.id} className="border-b border-border last:border-b-0">
                      <td className="px-5 py-3 align-top">
                        <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                          {formatInviteState(t, invite.state)}
                        </span>
                      </td>
                      <td className="px-5 py-3 align-top">{formatInviteAudience(t, invite)}</td>
                      <td className="px-5 py-3 align-top">
                        <div>{invite.invitedByUser?.name || invite.invitedByUser?.email || t("companyAdmin.invites.unknownInviter")}</div>
                        {invite.invitedByUser?.email && invite.invitedByUser.name ? (
                          <div className="text-xs text-muted-foreground">{invite.invitedByUser.email}</div>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 align-top text-muted-foreground">
                        {new Date(invite.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 align-top">
                        {invite.relatedJoinRequestId ? (
                          <Link to="/inbox/requests" className="underline underline-offset-4">
                            {t("companyAdmin.invites.reviewRequest")}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right align-top">
                        {invite.state === "active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => revokeMutation.mutate(invite.id)}
                            disabled={revokeMutation.isPending}
                          >
                            {t("companyAdmin.invites.revoke")}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t("companyAdmin.invites.inactive")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {invitesQuery.hasNextPage ? (
              <div className="flex justify-center border-t border-border px-5 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => invitesQuery.fetchNextPage()}
                  disabled={invitesQuery.isFetchingNextPage}
                >
                  {invitesQuery.isFetchingNextPage ? t("companyAdmin.invites.loadingMore") : t("companyAdmin.invites.viewMore")}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function formatInviteState(t: TFunction, state: "active" | "accepted" | "expired" | "revoked") {
  return t(`companyAdmin.invites.state.${state}`);
}

function formatInviteAudience(
  t: TFunction,
  invite: Awaited<ReturnType<typeof accessApi.listInvites>>["invites"][number],
) {
  if (invite.allowedJoinTypes === "agent") return t("companyAdmin.invites.audience.agent");
  if (invite.allowedJoinTypes === "both")
    return invite.humanRole
      ? t("companyAdmin.invites.audience.humanOrAgentWithRole", { role: invite.humanRole })
      : t("companyAdmin.invites.audience.humanOrAgent");
  return invite.humanRole ?? t("companyAdmin.invites.audience.human");
}
