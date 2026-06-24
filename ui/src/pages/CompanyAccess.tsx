import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import {
  HUMAN_COMPANY_MEMBERSHIP_ROLE_LABELS,
  type Agent,
} from "@paperclipai/shared";
import { Shield, ShieldCheck, Trash2, Users } from "lucide-react";
import { accessApi, type CompanyMember } from "@/api/access";
import { agentsApi } from "@/api/agents";
import { ApiError } from "@/api/client";
import { issuesApi } from "@/api/issues";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/context/ToastContext";
import { useTranslation } from "@/i18n";
import { Link, Navigate } from "@/lib/router";
import { queryKeys } from "@/lib/queryKeys";
import { usePluginSlots } from "@/plugins/slots";

const reassignmentIssueStatuses = "backlog,todo,in_progress,in_review,blocked,failed,timed_out";
type EditableMemberStatus = "pending" | "active" | "suspended";

export function CompanyAccess() {
  const { t } = useTranslation();
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [reassignmentTarget, setReassignmentTarget] = useState<string>("__unassigned");
  const [draftRole, setDraftRole] = useState<CompanyMember["membershipRole"]>(null);
  const [draftStatus, setDraftStatus] = useState<EditableMemberStatus>("active");

  useEffect(() => {
    setBreadcrumbs([
      { label: selectedCompany?.name ?? t("companyAdmin.access.breadcrumbs.company"), href: "/dashboard" },
      { label: t("companyAdmin.access.breadcrumbs.settings"), href: "/company/settings" },
      { label: t("companyAdmin.access.breadcrumbs.members") },
    ]);
  }, [selectedCompany?.name, setBreadcrumbs, t]);

  const membersQuery = useQuery({
    queryKey: queryKeys.access.companyMembers(selectedCompanyId ?? ""),
    queryFn: () => accessApi.listMembers(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId ?? ""),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const joinRequestsQuery = useQuery({
    queryKey: queryKeys.access.joinRequests(selectedCompanyId ?? "", "pending_approval"),
    queryFn: () => accessApi.listJoinRequests(selectedCompanyId!, "pending_approval"),
    enabled: !!selectedCompanyId && !!membersQuery.data?.access.canApproveJoinRequests,
  });

  const refreshAccessData = async () => {
    if (!selectedCompanyId) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.access.companyMembers(selectedCompanyId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.access.companyUserDirectory(selectedCompanyId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.access.joinRequests(selectedCompanyId, "pending_approval") });
  };

  const updateMemberMutation = useMutation({
    mutationFn: async (input: { memberId: string; membershipRole: CompanyMember["membershipRole"]; status: EditableMemberStatus }) => {
      return accessApi.updateMember(selectedCompanyId!, input.memberId, {
        membershipRole: input.membershipRole,
        status: input.status,
      });
    },
    onSuccess: async () => {
      setEditingMemberId(null);
      await refreshAccessData();
      pushToast({
        title: t("companyAdmin.access.toast.memberUpdated"),
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: t("companyAdmin.access.toast.memberUpdateFailed"),
        body: error instanceof Error ? error.message : t("companyAdmin.access.toast.unknownError"),
        tone: "error",
      });
    },
  });

  const approveJoinRequestMutation = useMutation({
    mutationFn: (requestId: string) => accessApi.approveJoinRequest(selectedCompanyId!, requestId),
    onSuccess: async () => {
      await refreshAccessData();
      pushToast({
        title: t("companyAdmin.access.toast.joinApproved"),
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: t("companyAdmin.access.toast.joinApproveFailed"),
        body: error instanceof Error ? error.message : t("companyAdmin.access.toast.unknownError"),
        tone: "error",
      });
    },
  });

  const rejectJoinRequestMutation = useMutation({
    mutationFn: (requestId: string) => accessApi.rejectJoinRequest(selectedCompanyId!, requestId),
    onSuccess: async () => {
      await refreshAccessData();
      pushToast({
        title: t("companyAdmin.access.toast.joinRejected"),
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: t("companyAdmin.access.toast.joinRejectFailed"),
        body: error instanceof Error ? error.message : t("companyAdmin.access.toast.unknownError"),
        tone: "error",
      });
    },
  });

  const editingMember = useMemo(
    () => membersQuery.data?.members.find((member) => member.id === editingMemberId) ?? null,
    [editingMemberId, membersQuery.data?.members],
  );
  const removingMember = useMemo(
    () => membersQuery.data?.members.find((member) => member.id === removingMemberId) ?? null,
    [removingMemberId, membersQuery.data?.members],
  );

  const assignedIssuesQuery = useQuery({
    queryKey: ["access", "member-assigned-issues", selectedCompanyId ?? "", removingMember?.principalId ?? ""],
    queryFn: () =>
      issuesApi.list(selectedCompanyId!, {
        assigneeUserId: removingMember!.principalId,
        status: reassignmentIssueStatuses,
      }),
    enabled: !!selectedCompanyId && !!removingMember,
  });

  const archiveMemberMutation = useMutation({
    mutationFn: async (input: { memberId: string; target: string }) => {
      const reassignment =
        input.target.startsWith("agent:")
          ? { assigneeAgentId: input.target.slice("agent:".length), assigneeUserId: null }
          : input.target.startsWith("user:")
            ? { assigneeAgentId: null, assigneeUserId: input.target.slice("user:".length) }
            : null;
      return accessApi.archiveMember(selectedCompanyId!, input.memberId, { reassignment });
    },
    onSuccess: async (result) => {
      setRemovingMemberId(null);
      setReassignmentTarget("__unassigned");
      await refreshAccessData();
      if (selectedCompanyId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(selectedCompanyId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.issues.listAssignedToMe(selectedCompanyId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.issues.listTouchedByMe(selectedCompanyId) });
      }
      pushToast({
        title: t("companyAdmin.access.toast.memberRemoved"),
        body:
          result.reassignedIssueCount > 0
            ? t(
                result.reassignedIssueCount === 1
                  ? "companyAdmin.access.toast.memberRemovedBodyOne"
                  : "companyAdmin.access.toast.memberRemovedBodyOther",
                { count: result.reassignedIssueCount },
              )
            : undefined,
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: t("companyAdmin.access.toast.memberRemoveFailed"),
        body: error instanceof Error ? error.message : t("companyAdmin.access.toast.unknownError"),
        tone: "error",
      });
    },
  });

  useEffect(() => {
    if (!editingMember) return;
    setDraftRole(editingMember.membershipRole);
    setDraftStatus(isEditableMemberStatus(editingMember.status) ? editingMember.status : "suspended");
  }, [editingMember]);

  useEffect(() => {
    if (!removingMember) return;
    setReassignmentTarget("__unassigned");
  }, [removingMember]);

  if (!selectedCompanyId) {
    return <div className="text-sm text-muted-foreground">{t("companyAdmin.access.selectCompany")}</div>;
  }

  if (membersQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">{t("companyAdmin.access.loading")}</div>;
  }

  if (membersQuery.error) {
    const message =
      membersQuery.error instanceof ApiError && membersQuery.error.status === 403
        ? t("companyAdmin.access.errorForbidden")
        : membersQuery.error instanceof Error
          ? membersQuery.error.message
          : t("companyAdmin.access.errorGeneric");
    return <div className="text-sm text-destructive">{message}</div>;
  }

  const members = membersQuery.data?.members ?? [];
  const access = membersQuery.data?.access;
  const pendingHumanJoinRequests =
    joinRequestsQuery.data?.filter((request) => request.requestType === "human") ?? [];
  const joinRequestActionPending =
    approveJoinRequestMutation.isPending || rejectJoinRequestMutation.isPending;
  const activeReassignmentUsers = members.filter(
    (member) =>
      member.status === "active" &&
      member.principalType === "user" &&
      member.id !== removingMemberId,
  );
  const activeReassignmentAgents = (agentsQuery.data ?? []).filter(isAssignableAgent);
  const assignedIssues = assignedIssuesQuery.data ?? [];

  return (
    <div className="max-w-6xl space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">{t("companyAdmin.access.title")}</h1>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("companyAdmin.access.intro", { name: selectedCompany?.name })}
        </p>
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {t("companyAdmin.access.coreNote")}
        </div>
      </div>

      {access && !access.currentUserRole && (
        <div className="rounded-xl border border-amber-500/40 px-4 py-3 text-sm text-amber-200">
          {t("companyAdmin.access.instanceAdminNote")}
        </div>
      )}

      <section className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">{t("companyAdmin.access.humans")}</h2>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t("companyAdmin.access.humansDescription")}
          </p>
        </div>

        {access?.canApproveJoinRequests && pendingHumanJoinRequests.length > 0 ? (
          <div className="space-y-3 rounded-xl border border-border px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{t("companyAdmin.access.pendingJoins.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("companyAdmin.access.pendingJoins.description")}
                </p>
              </div>
              <Badge variant="outline">{t("companyAdmin.access.pendingJoins.badge", { count: pendingHumanJoinRequests.length })}</Badge>
            </div>
            <div className="space-y-3">
              {pendingHumanJoinRequests.map((request) => (
                <PendingJoinRequestCard
                  key={request.id}
                  title={
                    request.requesterUser?.name ||
                    request.requestEmailSnapshot ||
                    request.requestingUserId ||
                    t("companyAdmin.access.pendingJoins.unknownRequester")
                  }
                  subtitle={
                    request.requesterUser?.email ||
                    request.requestEmailSnapshot ||
                    request.requestingUserId ||
                    t("companyAdmin.access.pendingJoins.noEmail")
                  }
                  context={
                    request.invite
                      ? request.invite.humanRole
                        ? t("companyAdmin.access.pendingJoins.joinInviteWithRole", {
                            types: request.invite.allowedJoinTypes,
                            role: request.invite.humanRole,
                          })
                        : t("companyAdmin.access.pendingJoins.joinInvite", {
                            types: request.invite.allowedJoinTypes,
                          })
                      : t("companyAdmin.access.pendingJoins.inviteUnavailable")
                  }
                  detail={t("companyAdmin.access.pendingJoins.submitted", {
                    date: new Date(request.createdAt).toLocaleString(),
                  })}
                  approveLabel={t("companyAdmin.access.pendingJoins.approve")}
                  rejectLabel={t("companyAdmin.access.pendingJoins.reject")}
                  disabled={joinRequestActionPending}
                  onApprove={() => approveJoinRequestMutation.mutate(request.id)}
                  onReject={() => rejectJoinRequestMutation.mutate(request.id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[minmax(0,1.5fr)_120px_120px_180px] gap-3 border-b border-border px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <div>{t("companyAdmin.access.table.userAccount")}</div>
            <div>{t("companyAdmin.access.table.role")}</div>
            <div>{t("companyAdmin.access.table.status")}</div>
            <div className="text-right">{t("companyAdmin.access.table.action")}</div>
          </div>
          {members.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground">{t("companyAdmin.access.table.empty")}</div>
          ) : (
            members.map((member) => {
              const removalReason = member.removal?.reason ?? null;
              const canArchive = member.removal?.canArchive ?? true;
              return (
                <div
                  key={member.id}
                  className="grid grid-cols-[minmax(0,1.5fr)_120px_120px_180px] gap-3 border-b border-border px-4 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{member.user?.name?.trim() || member.user?.email || member.principalId}</div>
                    <div className="truncate text-xs text-muted-foreground">{member.user?.email || member.principalId}</div>
                  </div>
                  <div className="text-sm">
                    {member.membershipRole
                      ? HUMAN_COMPANY_MEMBERSHIP_ROLE_LABELS[member.membershipRole]
                      : t("companyAdmin.access.table.roleUnset")}
                  </div>
                  <div>
                    <Badge variant={member.status === "active" ? "secondary" : member.status === "suspended" ? "destructive" : "outline"}>
                      {member.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingMemberId(member.id)}>
                        {t("companyAdmin.access.table.edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRemovingMemberId(member.id)}
                        disabled={!canArchive}
                        title={removalReason ?? undefined}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        {t("companyAdmin.access.table.remove")}
                      </Button>
                    </div>
                    {removalReason ? (
                      <div className="text-xs text-muted-foreground">{removalReason}</div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMemberId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("companyAdmin.access.editDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("companyAdmin.access.editDialog.description", {
                name: editingMember?.user?.name || editingMember?.user?.email || editingMember?.principalId,
              })}
            </DialogDescription>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">{t("companyAdmin.access.editDialog.companyRole")}</span>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2"
                    value={draftRole ?? ""}
                    onChange={(event) =>
                      setDraftRole((event.target.value || null) as CompanyMember["membershipRole"])
                    }
                  >
                    <option value="">{t("companyAdmin.access.editDialog.roleUnset")}</option>
                    {Object.entries(HUMAN_COMPANY_MEMBERSHIP_ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">{t("companyAdmin.access.editDialog.membershipStatus")}</span>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2"
                    value={draftStatus}
                    onChange={(event) =>
                      setDraftStatus(event.target.value as EditableMemberStatus)
                    }
                  >
                    <option value="active">{t("companyAdmin.access.editDialog.statusActive")}</option>
                    <option value="pending">{t("companyAdmin.access.editDialog.statusPending")}</option>
                    <option value="suspended">{t("companyAdmin.access.editDialog.statusSuspended")}</option>
                  </select>
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMemberId(null)}>
              {t("companyAdmin.access.editDialog.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (!editingMember) return;
                updateMemberMutation.mutate({
                  memberId: editingMember.id,
                  membershipRole: draftRole,
                  status: draftStatus,
                });
              }}
              disabled={updateMemberMutation.isPending}
            >
              {updateMemberMutation.isPending
                ? t("companyAdmin.access.editDialog.saving")
                : t("companyAdmin.access.editDialog.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removingMember} onOpenChange={(open) => !open && setRemovingMemberId(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("companyAdmin.access.removeDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("companyAdmin.access.removeDialog.description", { name: memberDisplayName(t, removingMember) })}
            </DialogDescription>
          </DialogHeader>
          {removingMember && (
            <div className="space-y-5">
              <div className="rounded-lg border border-border px-3 py-3">
                <div className="text-sm font-medium">{memberDisplayName(t, removingMember)}</div>
                <div className="text-sm text-muted-foreground">{removingMember.user?.email || removingMember.principalId}</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {assignedIssuesQuery.isLoading
                    ? t("companyAdmin.access.removeDialog.checking")
                    : t(
                        assignedIssues.length === 1
                          ? "companyAdmin.access.removeDialog.openTasksOne"
                          : "companyAdmin.access.removeDialog.openTasksOther",
                        { count: assignedIssues.length },
                      )}
                </div>
              </div>

              {assignedIssues.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t("companyAdmin.access.removeDialog.reassignment")}</div>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={reassignmentTarget}
                    onChange={(event) => setReassignmentTarget(event.target.value)}
                  >
                    <option value="__unassigned">{t("companyAdmin.access.removeDialog.leaveUnassigned")}</option>
                    {activeReassignmentUsers.length > 0 ? (
                      <optgroup label={t("companyAdmin.access.removeDialog.humans")}>
                        {activeReassignmentUsers.map((member) => (
                          <option key={member.id} value={`user:${member.principalId}`}>
                            {memberDisplayName(t, member)}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                    {activeReassignmentAgents.length > 0 ? (
                      <optgroup label={t("companyAdmin.access.removeDialog.agents")}>
                        {activeReassignmentAgents.map((agent) => (
                          <option key={agent.id} value={`agent:${agent.id}`}>
                            {t("companyAdmin.access.removeDialog.agentOption", { name: agent.name, role: agent.role })}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </select>
                  <div className="max-h-36 overflow-auto rounded-lg border border-border">
                    {assignedIssues.slice(0, 6).map((issue) => (
                      <div key={issue.id} className="border-b border-border px-3 py-2 text-sm last:border-b-0">
                        <div className="font-medium">{issue.identifier ?? issue.id.slice(0, 8)}</div>
                        <div className="truncate text-muted-foreground">{issue.title}</div>
                      </div>
                    ))}
                    {assignedIssues.length > 6 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        {t(
                          assignedIssues.length - 6 === 1
                            ? "companyAdmin.access.removeDialog.moreTasksOne"
                            : "companyAdmin.access.removeDialog.moreTasksOther",
                          { count: assignedIssues.length - 6 },
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingMemberId(null)}>
              {t("companyAdmin.access.removeDialog.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!removingMember) return;
                archiveMemberMutation.mutate({
                  memberId: removingMember.id,
                  target: reassignmentTarget,
                });
              }}
              disabled={archiveMemberMutation.isPending || assignedIssuesQuery.isLoading}
            >
              {archiveMemberMutation.isPending
                ? t("companyAdmin.access.removeDialog.removing")
                : t("companyAdmin.access.removeDialog.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CompanyAccessLegacyRoute() {
  const { t } = useTranslation();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { slots, isLoading, errorMessage } = usePluginSlots({
    slotTypes: ["companySettingsPage"],
    companyId: selectedCompanyId,
    enabled: !!selectedCompanyId,
  });

  useEffect(() => {
    setBreadcrumbs([
      { label: t("companyAdmin.access.breadcrumbs.settings"), href: "/company/settings" },
      { label: t("companyAdmin.access.legacy.breadcrumbAccess") },
    ]);
  }, [setBreadcrumbs, t]);

  const permissionsSlot = slots.find((slot) => slot.routePath === "permissions");
  if (permissionsSlot) {
    return <Navigate to="/company/settings/permissions" replace />;
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">{t("companyAdmin.access.legacy.checking")}</div>;
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">{t("companyAdmin.access.legacy.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("companyAdmin.access.legacy.intro")}
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border px-5 py-5">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">{t("companyAdmin.access.legacy.unavailableTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("companyAdmin.access.legacy.unavailableBody")}
          </p>
          {errorMessage ? (
            <p className="text-sm text-destructive">{t("companyAdmin.access.legacy.pluginUnavailable", { error: errorMessage })}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/company/settings/members">{t("companyAdmin.access.legacy.openMembers")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/company/settings/invites">{t("companyAdmin.access.legacy.openInvites")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function memberDisplayName(t: TFunction, member: CompanyMember | null) {
  if (!member) return t("companyAdmin.access.thisMember");
  return member.user?.name?.trim() || member.user?.email || member.principalId;
}

function isAssignableAgent(agent: Agent) {
  return agent.status !== "terminated" && agent.status !== "pending_approval";
}

function isEditableMemberStatus(status: CompanyMember["status"]): status is EditableMemberStatus {
  return status === "pending" || status === "active" || status === "suspended";
}

function PendingJoinRequestCard({
  title,
  subtitle,
  context,
  detail,
  detailSecondary,
  approveLabel,
  rejectLabel,
  disabled,
  onApprove,
  onReject,
}: {
  title: string;
  subtitle: string;
  context: string;
  detail: string;
  detailSecondary?: string;
  approveLabel: string;
  rejectLabel: string;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-xl border border-border px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div>
            <div className="font-medium">{title}</div>
            <div className="text-sm text-muted-foreground">{subtitle}</div>
          </div>
          <div className="text-sm text-muted-foreground">{context}</div>
          <div className="text-sm text-muted-foreground">{detail}</div>
          {detailSecondary ? <div className="text-sm text-muted-foreground">{detailSecondary}</div> : null}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onReject} disabled={disabled}>
            {rejectLabel}
          </Button>
          <Button type="button" onClick={onApprove} disabled={disabled}>
            {approveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
