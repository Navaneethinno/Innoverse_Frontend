import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  Eye,
  History,
  Plus,
  Pencil,
  ShieldCheck,
  ShieldOff,
  Trash2,
  PowerOff,
  Power,
  Send,
} from "lucide-react";
import {
  mapUserListResponse,
  useHasUserAction,
  useUserAuthMutation,
  useUserCreateMutation,
  useUserDeauthMutation,
  useUserDeleteAuthMutation,
  useUserDeleteMutation,
  useUserDeactivateMutation,
  useUserReactivateMutation,
  useUserLookupsQuery,
  useUserSubmitMutation,
  useUserUpdateMutation,
  useUsersQuery,
} from "@/Hooks/Users/userHooks";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { notifications } from "@/Utils/Lib/notifications";
import { usersApi } from "@/Services/Users/users.api";
import { DataTable } from "@/Components/Common/DataTable";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { StatusFilterTabs, statusBucket } from "@/Components/Common/StatusFilterTabs";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { actionButtonClass } from "@/Components/Common/actionStyles";
import { pickDefaultPolicy, validatePassword } from "@/Utils/Lib/password-policy";
import { EMPTY_FORM, fieldValue, nameOf, userId } from "./UserForm";
import { AddUser } from "./AddUser";
import { EditUser } from "./EditUser";
import { AuditUser } from "./AuditUser";

// The users list endpoint only supports status 0/1/2 (all/active/inactive)
// server-side — there is no dedicated "pending" auth_status filter param
// confirmed for /user/list. To keep the same 3-tab All/Active/Pending
// pattern as Institutions/Profiles without inventing a new endpoint, the
// "Pending" tab fetches the same status:0 (all) page and narrows it
// client-side by auth_status — a best-effort match limited to what's on the
// current page (documented in the report as a follow-up once/if the
// backend exposes a real pending filter).
const isPending = (user) =>
  String(user?.process_status_name ?? user?.status_name ?? "").toLowerCase().includes("pending") ||
  String(user?.auth_status ?? "").toUpperCase() === "AUTH WAIT" ||
  Number(user?.status) === 9;
const isPendingDelete = (user) =>
  String(user?.process_status_name ?? "").toLowerCase().includes("pending delete");
const isInactive = (user) =>
  String(user?.status_name ?? "").toLowerCase().includes("inactive") || Number(user?.status) === 13;
const numericId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export function User() {
  // Real permission source — same menu_array the sidebar itself reads.
  // View is the one exception: it's not consistently granted via login's
  // menu_array actions[] the way the others are, so it's always shown
  // rather than gated — a user should always be able to look at a record.
  const canAdd = useHasUserAction("Add");
  const canEdit = useHasUserAction("Edit");
  const canAuthorize = useHasUserAction("Authorize");
  const hasDeauthorizePermission = useHasUserAction("Deauthorize");
  const canDeauthorize = hasDeauthorizePermission || canAuthorize;
  const canDelete = useHasUserAction("Delete");
  const canChangeStatus = useHasUserAction("Change Status");
  const canSubmit = useHasUserAction("Submit");

  const [params, setParams] = useState({ page: 1, limit: 10, search: "", status: 0 });
  const [activeTab, setActiveTab] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewingOnly, setViewingOnly] = useState(false);
  const [action, setAction] = useState(null);
  const [narration, setNarration] = useState("");
  const [audit, setAudit] = useState(null);
  const usersQuery = useUsersQuery(params);
  const lookupsQuery = useUserLookupsQuery();
  const defaultPolicy = pickDefaultPolicy(lookupsQuery.passwordPolicies);
  const selectedPolicy =
    lookupsQuery.passwordPolicies.find((p) => String(p.id) === String(form.password_policy_id)) ??
    defaultPolicy;
  const createMutation = useUserCreateMutation();
  const updateMutation = useUserUpdateMutation();
  const submitMutation = useUserSubmitMutation();
  const authMutation = useUserAuthMutation();
  const deauthMutation = useUserDeauthMutation();
  const deleteMutation = useUserDeleteMutation();
  const deleteAuthMutation = useUserDeleteAuthMutation();
  const deactivateMutation = useUserDeactivateMutation();
  const reactivateMutation = useUserReactivateMutation();

  const rawUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const visibleUsers = useMemo(() => rawUsers.filter((user) => activeTab === "all" || statusBucket(user) === activeTab), [rawUsers, activeTab]);
  const pendingInfo = usePendingChanges(
    ({ id }) => usersApi.pending({ user_id: id }),
    numericId(action?.user ? userId(action.user) : null),
    ["auth", "deauth"].includes(action?.type),
  );

  const openCreate = () => {
    setEditing(null);
    setViewingOnly(false);
    setForm({ ...EMPTY_FORM, password_policy_id: defaultPolicy?.id ?? "" });
    setShowForm(true);
  };
  const openEdit = async (user, { readOnly = false } = {}) => {
    setEditing(user);
    setViewingOnly(readOnly);
    setForm(Object.fromEntries(Object.keys(EMPTY_FORM).map((key) => [key, fieldValue(user, key)])));
    setShowForm(true);
    const id = Number(userId(user));
    if (!Number.isInteger(id)) return;
    try {
      const response = await usersApi.getKyc({ user_id: id });
      const kyc = response?.data?.data ?? response?.data ?? {};
      if (kyc && typeof kyc === "object") {
        setForm((current) => ({
          ...current,
          ...Object.fromEntries(
            Object.keys(EMPTY_FORM).map((key) => [key, fieldValue(kyc, key) || current[key]]),
          ),
        }));
      }
    } catch (error) {
      notifications.error(
        error instanceof Error ? error.message : "Failed to load user KYC details",
      );
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (viewingOnly) return;
    const draft = event.nativeEvent.submitter?.dataset?.mode === "draft";
    if (!editing && !draft) {
      const issues = validatePassword(form.user_pwd, selectedPolicy);
      if (issues.length > 0) {
        notifications.error(`Password does not meet policy: ${issues.join(", ")}`);
        return;
      }
    }
    try {
      const institutionId = numericId(form.inst_id);
      const profileId = numericId(form.profile_id);
      if (!institutionId || !profileId) {
        notifications.error("Please select a valid institution and profile");
        return;
      }
      let result;
      if (editing)
        result = await updateMutation.mutateAsync({
          user_id: numericId(userId(editing)),
          user_name: form.user_name,
          inst_id: institutionId,
          profile_id: profileId,
          pwd_policy: numericId(form.password_policy_id) ?? undefined,
          is_draft: draft,
          expected_updated_time: editing.updated_time,
        });
      else {
        const { password_policy_id, ...userPayload } = form;
        result = await createMutation.mutateAsync({
          ...userPayload,
          inst_id: institutionId,
          profile_id: profileId,
          password_policy_id: numericId(password_policy_id),
          is_draft: draft,
        });
      }
      setShowForm(false);
    } catch (error) {
      // Mutation hooks already show the API error toast.
    }
  };
  const runAction = async () => {
    if (!action) return;
    try {
      const id = numericId(userId(action.user));
      if (!id) {
        notifications.error("The selected user has an invalid identifier");
        return;
      }
      const payload = { user_id: id };
      let result;
      if (action.type === "submit") result = await submitMutation.mutateAsync({ ...payload, narration });
      if (action.type === "auth") result = await authMutation.mutateAsync(payload);
      if (action.type === "deauth")
        result = await deauthMutation.mutateAsync({ ...payload, narration: narration });
      if (action.type === "delete")
        result = await deleteMutation.mutateAsync({ ...payload, narration });
      if (action.type === "deleteAuth") result = await deleteAuthMutation.mutateAsync(payload);
      if (action.type === "deactivate")
        result = await deactivateMutation.mutateAsync({ id, narration });
      if (action.type === "reactivate")
        result = await reactivateMutation.mutateAsync({ id, narration });
      setAction(null);
      setNarration("");
    } catch (error) {
      // Mutation hooks already show the API error toast.
    }
  };
  // AuditUser/AuditModal now own fetching the actual history pages
  // themselves (see AuditModal.jsx) — this just opens the dialog for a
  // given user, no pre-fetch needed.
  const openAudit = (user) => setAudit({ user });
  const closeAction = () => {
    setAction(null);
    setNarration("");
  };
  const actionPending =
    submitMutation.isPending ||
    authMutation.isPending ||
    deauthMutation.isPending ||
    deleteMutation.isPending ||
    deleteAuthMutation.isPending ||
    deactivateMutation.isPending ||
    reactivateMutation.isPending;

  const columns = [
    {
      key: "user",
      label: "User",
      align: "left",
      sortValue: nameOf,
      render: (u) => <span className="font-semibold text-slate-800">{nameOf(u)}</span>,
    },
    {
      key: "profile",
      label: "Profile",
      sortValue: (u) => u.profile_name ?? u.profile?.name ?? fieldValue(u, "profile_id"),
      render: (u) => u.profile_name ?? u.profile?.name ?? fieldValue(u, "profile_id") ?? "-",
    },
    {
      key: "institution",
      label: "Institution",
      sortValue: (u) =>
        u.inst_profile_name ??
        u.institution_name ??
        u.institution?.name ??
        fieldValue(u, "inst_id"),
      render: (u) =>
        u.inst_profile_name ??
        u.institution_name ??
        u.institution?.name ??
        fieldValue(u, "inst_id") ??
        "-",
    },
    {
      key: "status_name",
      label: "Status",
      sortValue: (u) => u.status_name ?? (u.status === 1 ? "Active" : "Inactive"),
      render: (u) =>
        u.status == null && !u.status_name ? (
          "—"
        ) : (
          <StatusBadge
            status={String(u.status_name ?? (u.status === 1 ? "ACTIVE" : "INACTIVE")).toUpperCase()}
          />
        ),
    },
    {
      key: "auth_status",
      label: "Authorization Status",
      sortValue: (u) => String(u.auth_status ?? ""),
      render: (u) => (u.auth_status ? <StatusBadge status={String(u.auth_status)} /> : "—"),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (user) => {
        const pending = isPending(user);
        const pendingDelete = isPendingDelete(user);
        const inactive = isInactive(user);
        const actions = [
          ...((canSubmit || canAdd) && Number(user?.status) === 9 ? [["submit", "Submit draft", Send, "submit"]] : []),
          ...(canAuthorize && pending && !pendingDelete ? [["auth", "Authorize", ShieldCheck, "auth"]] : []),
          ...(canDeauthorize && pending && !pendingDelete ? [["deauth", "Deauthorize", ShieldOff, "deauth"]] : []),
          ...(canAuthorize && pendingDelete ? [["deleteAuth", "Authorize delete", ShieldCheck, "deleteAuth"]] : []),
          ...(canDelete ? [["delete", "Delete", Trash2, "delete"]] : []),
          ...(canChangeStatus && !pending && !inactive ? [["deactivate", "Deactivate", PowerOff, "deactivate"]] : []),
          ...(canChangeStatus && !pending && inactive ? [["reactivate", "Reactivate", Power, "reactivate"]] : []),
        ];
        return <div className="flex flex-wrap items-center justify-center gap-1">
          <UiTooltip label="View">
            <button
              type="button"
              onClick={() => openEdit(user, { readOnly: true })}
              className={actionButtonClass("view")}
            >
              <Eye size={14} />
            </button>
          </UiTooltip>
          {canEdit && (
            <UiTooltip label="Edit">
              <button
                type="button"
                onClick={() => openEdit(user)}
                className={actionButtonClass("edit")}
              >
                <Pencil size={14} />
              </button>
            </UiTooltip>
          )}
          <UiTooltip label="Audit">
            <button
              type="button"
              onClick={() => openAudit(user)}
              className={actionButtonClass("view")}
            >
              <History size={14} />
            </button>
          </UiTooltip>
          {actions.map(([type, label, Icon, style]) => (
            <UiTooltip key={type} label={label}>
              <button type="button" onClick={() => setAction({ type, user, label, style })} className={actionButtonClass(style)}>
                <Icon size={14} />
              </button>
            </UiTooltip>
          ))}
        </div>;
      },
    },
  ];

  return (
    <div className="pt-3 pb-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400">
            User Management
          </p>
          <h1 className="text-xl font-black leading-none tracking-tight text-slate-800">Users</h1>
          <p className="mt-1 text-xs font-medium text-slate-400">
            Manage application users and access.
          </p>
        </div>
        {canAdd && (
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white shadow-lg shadow-blue-200/50"
            style={{ background: "var(--primary)" }}
          >
            <Plus size={14} /> Add user
          </motion.button>
        )}
      </div>

      <div className="mb-4">
        <StatusFilterTabs
          rows={rawUsers}
          value={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            setParams((current) => ({ ...current, page: 1, status: tab === "active" ? 1 : 0 }));
          }}
          search={params.search}
          onSearch={(search) => setParams((current) => ({ ...current, page: 1, search }))}
          searchPlaceholder="Search users..."
        />
      </div>

      {usersQuery.error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={16} />
          {usersQuery.error.message}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={visibleUsers}
        rowKey={(u) => userId(u)}
        isLoading={usersQuery.isLoading}
        title="Users"
        searchableKeys={["user_name", "email"]}
        emptyTitle="No users found"
        fetchMore={async (page, limit) => {
          const mapped = mapUserListResponse(
            await usersApi.list({ page, limit, search: "", status: 0 }),
          );
          return { rows: mapped.users, totalPages: mapped.pagination.totalPages };
        }}
        serverPagination={
          activeTab === "all"
            ? {
                page: usersQuery.pagination?.currentPage ?? params.page,
                totalPages: usersQuery.pagination?.totalPages ?? 1,
                totalRecords: usersQuery.pagination?.totalRecords ?? visibleUsers.length,
                onPageChange: (page) => setParams((p) => ({ ...p, page })),
              }
            : null
        }
      />

      <AnimatePresence>
        {showForm && !editing && (
          <AddUser
            open={showForm}
            onClose={() => setShowForm(false)}
            form={form}
            setForm={setForm}
            onSubmit={submit}
            institutions={lookupsQuery.institutions}
            profiles={lookupsQuery.profiles}
            passwordPolicies={lookupsQuery.passwordPolicies}
            selectedPolicy={selectedPolicy}
            submitting={createMutation.isPending || submitMutation.isPending}
          />
        )}
        {showForm && editing && (
          <EditUser
            open={showForm}
            onClose={() => setShowForm(false)}
            editing={editing}
            viewingOnly={viewingOnly}
            form={form}
            setForm={setForm}
            onSubmit={submit}
            institutions={lookupsQuery.institutions}
            profiles={lookupsQuery.profiles}
            passwordPolicies={lookupsQuery.passwordPolicies}
            selectedPolicy={selectedPolicy}
            submitting={updateMutation.isPending || submitMutation.isPending}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!action}
        title={`${action?.label ?? "Confirm action"} user`}
        confirmLabel={action?.label ?? "Confirm"}
        destructive={["delete", "deleteAuth"].includes(action?.style)}
        pending={actionPending}
        confirmDisabled={["deauth", "delete"].includes(action?.type) && !narration.trim()}
        onClose={closeAction}
        onConfirm={() => void runAction()}
      >
        {["auth", "deauth"].includes(action?.type) && <PendingChangesDiff {...pendingInfo} />}
        <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-500">
          Narration{["deauth", "delete"].includes(action?.type) ? " *" : ""}
          <textarea
            value={narration}
            onChange={(event) => setNarration(event.target.value)}
            placeholder={["deauth", "delete"].includes(action?.type) ? "Narration is required" : "Narration"}
            className="mt-1.5 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-blue-400"
          />
        </label>
      </ConfirmDialog>

      <AuditUser audit={audit} onClose={() => setAudit(null)} />
    </div>
  );
}
