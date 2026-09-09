import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  Eye,
  History,
  Plus,
  Pencil,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import {
  mapUserListResponse,
  useHasUserAction,
  useUserAuthMutation,
  useUserCreateMutation,
  useUserDeauthMutation,
  useUserDeleteAuthMutation,
  useUserDeleteMutation,
  useUserLookupsQuery,
  useUserUpdateMutation,
  useUsersQuery,
} from "@/Hooks/Users/userHooks";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { usersApi } from "@/Services/Users/users.api";
import { DataTable } from "@/Components/Common/DataTable";
import { cn } from "@/Utils/Lib/cn";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { pickDefaultPolicy, validatePassword } from "@/Utils/Lib/password-policy";
import { EMPTY_FORM, fieldValue, nameOf, userId } from "./UserForm";
import { AddUser } from "./AddUser";
import { EditUser } from "./EditUser";
import { AuthUser } from "./AuthUser";
import { DeauthUser } from "./DeauthUser";
import { DeleteUser } from "./DeleteUser";
import { AuditUser } from "./AuditUser";

// The users list endpoint only supports status 0/1/2 (all/active/inactive)
// server-side — there is no dedicated "pending" auth_status filter param
// confirmed for /user/list. To keep the same 3-tab All/Active/Pending
// pattern as Institutions/Profiles without inventing a new endpoint, the
// "Pending" tab fetches the same status:0 (all) page and narrows it
// client-side by auth_status — a best-effort match limited to what's on the
// current page (documented in the report as a follow-up once/if the
// backend exposes a real pending filter).
const ACTIVE_STATUSES = ["ACTIVE", "AUTHORIZED"];
const TERMINAL_INACTIVE_STATUSES = ["INACTIVE", "DEACTIVATED"];
const TABS = ["all", "active", "pending", "inactive"];
const TAB_LABEL = { all: "All", active: "Active", pending: "Pending", inactive: "Inactive" };

function userTabOf(user) {
  const status = String(user.auth_status ?? (user.status === 1 ? "ACTIVE" : "INACTIVE")).toUpperCase();
  if (ACTIVE_STATUSES.includes(status)) return "active";
  if (TERMINAL_INACTIVE_STATUSES.includes(status)) return "inactive";
  return "pending";
}
function userTimestamp(user) {
  const raw = user.updated_time ?? user.created_time;
  const time = raw ? new Date(raw).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
}

export function User() {
  // Real permission source — same menu_array the sidebar itself reads.
  // View is the one exception: it's not consistently granted via login's
  // menu_array actions[] the way the others are, so it's always shown
  // rather than gated — a user should always be able to look at a record.
  const canAdd = useHasUserAction("Add");
  const canEdit = useHasUserAction("Edit");
  const canAuthorize = useHasUserAction("Authorize");
  const canDeauthorize = useHasUserAction("Deauthorize");
  const canDelete = useHasUserAction("Delete");

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
  const authMutation = useUserAuthMutation();
  const deauthMutation = useUserDeauthMutation();
  const deleteMutation = useUserDeleteMutation();
  const deleteAuthMutation = useUserDeleteAuthMutation();

  const rawUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const visibleUsers = useMemo(() => {
    if (activeTab === "all") return rawUsers;
    const rows = rawUsers.filter((u) => userTabOf(u) === activeTab);
    return activeTab === "pending" ? [...rows].sort((a, b) => userTimestamp(b) - userTimestamp(a)) : rows;
  }, [rawUsers, activeTab]);
  const counts = useMemo(() => {
    const result = { all: rawUsers.length, active: 0, pending: 0, inactive: 0 };
    rawUsers.forEach((u) => {
      result[userTabOf(u)] += 1;
    });
    return result;
  }, [rawUsers]);

  const selectTab = (tab) => {
    setActiveTab(tab);
    setParams((p) => ({ ...p, page: 1, status: tab === "active" ? 1 : 0 }));
  };

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
      notifications.error(error instanceof Error ? error.message : "Failed to load user KYC details");
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (viewingOnly) return;
    if (!editing) {
      const issues = validatePassword(form.user_pwd, selectedPolicy);
      if (issues.length > 0) {
        notifications.error(`Password does not meet policy: ${issues.join(", ")}`);
        return;
      }
    }
    try {
      const institutionId = Number(form.inst_id);
      const profileId = Number(form.profile_id);
      let result;
      if (editing)
        result = await updateMutation.mutateAsync({
          user_id: userId(editing),
          user_name: form.user_name,
          user_pwd: "",
          inst_id: Number.isInteger(institutionId) ? institutionId : 0,
          profile_id: Number.isInteger(profileId) ? profileId : 0,
          user_fname: form.user_fname,
          user_lname: form.user_lname,
          email: form.email,
          mobile: form.mobile,
          gender: form.gender,
          address: form.address,
          employee_id: form.employee_id,
        });
      else {
        const { password_policy_id, ...userPayload } = form;
        void password_policy_id;
        result = await createMutation.mutateAsync({
          ...userPayload,
          inst_id: Number.isInteger(institutionId) ? institutionId : 0,
          profile_id: Number.isInteger(profileId) ? profileId : 0,
        });
      }
      notifications.success(
        apiMessage(result, editing ? "User updated successfully" : "User added successfully"),
      );
      setShowForm(false);
    } catch (error) {
      notifications.error(error.message);
    }
  };
  const runAction = async () => {
    if (!action) return;
    try {
      const payload = { user_id: userId(action.user) };
      let result;
      if (action.type === "auth") result = await authMutation.mutateAsync(payload);
      if (action.type === "deauth")
        result = await deauthMutation.mutateAsync({ ...payload, narration: narration });
      if (action.type === "delete")
        result = await deleteMutation.mutateAsync({ ...payload, del_narration: narration });
      if (action.type === "deleteAuth") result = await deleteAuthMutation.mutateAsync(payload);
      notifications.success(apiMessage(result, "User action completed"));
      setAction(null);
      setNarration("");
    } catch (error) {
      notifications.error(error.message);
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
    authMutation.isPending ||
    deauthMutation.isPending ||
    deleteMutation.isPending ||
    deleteAuthMutation.isPending;

  const columns = [
    { key: "user", label: "User", align: "left", sortValue: nameOf, render: (u) => <span className="font-semibold text-slate-800">{nameOf(u)}</span> },
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
        u.inst_profile_name ?? u.institution_name ?? u.institution?.name ?? fieldValue(u, "inst_id"),
      render: (u) =>
        u.inst_profile_name ?? u.institution_name ?? u.institution?.name ?? fieldValue(u, "inst_id") ?? "-",
    },
    {
      key: "status_name",
      label: "Status",
      sortValue: (u) => u.status_name ?? (u.status === 1 ? "Active" : "Inactive"),
      render: (u) =>
        u.status == null && !u.status_name ? (
          "—"
        ) : (
          <StatusBadge status={String(u.status_name ?? (u.status === 1 ? "ACTIVE" : "INACTIVE")).toUpperCase()} />
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
      render: (user) => (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <UiTooltip label="View">
            <button onClick={() => openEdit(user, { readOnly: true })} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
              <Eye size={14} />
            </button>
          </UiTooltip>
          {canEdit && (
            <UiTooltip label="Edit">
              <button onClick={() => openEdit(user)} className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50">
                <Pencil size={14} />
              </button>
            </UiTooltip>
          )}
          <UiTooltip label="Audit">
            <button onClick={() => openAudit(user)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
              <History size={14} />
            </button>
          </UiTooltip>
          {canAuthorize && (
            <UiTooltip label="Authorize">
              <button onClick={() => setAction({ type: "auth", user })} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50">
                <ShieldCheck size={14} />
              </button>
            </UiTooltip>
          )}
          {canDeauthorize && (
            <UiTooltip label="Deauthorize">
              <button onClick={() => setAction({ type: "deauth", user })} className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50">
                <ShieldOff size={14} />
              </button>
            </UiTooltip>
          )}
          {canDelete && (
            <UiTooltip label="Delete">
              <button onClick={() => setAction({ type: "delete", user })} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            </UiTooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="pt-3 pb-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400">User Management</p>
          <h1 className="text-xl font-black leading-none tracking-tight text-slate-800">Users</h1>
          <p className="mt-1 text-xs font-medium text-slate-400">Manage application users and access.</p>
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

      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full max-w-xs">
          <Search size={13} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={params.search}
            onChange={(event) => setParams({ ...params, page: 1, search: event.target.value })}
            placeholder="Search users"
            className="w-full rounded-xl py-2 pl-9 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
            style={{ background: "var(--glass-bg)", backdropFilter: "blur(12px)", border: "1px solid var(--glass-border)" }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((value) => (
            <button
              key={value}
              onClick={() => selectTab(value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-bold transition-all",
                activeTab === value
                  ? "border-transparent text-white shadow-md shadow-blue-200/50"
                  : "text-slate-500 hover:border-blue-200 hover:text-blue-600",
              )}
              style={
                activeTab === value
                  ? { background: "#2266EE", border: "none" }
                  : { background: "var(--glass-bg)", backdropFilter: "blur(12px)", borderColor: "var(--glass-border)" }
              }
            >
              {TAB_LABEL[value]} ({counts[value]})
            </button>
          ))}
        </div>
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
            submitting={createMutation.isPending}
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
            submitting={updateMutation.isPending}
          />
        )}
      </AnimatePresence>

      <AuthUser
        user={action?.type === "auth" ? action.user : null}
        pending={actionPending}
        onClose={closeAction}
        onConfirm={runAction}
      />
      <DeauthUser
        user={action?.type === "deauth" ? action.user : null}
        narration={narration}
        setNarration={setNarration}
        pending={actionPending}
        onClose={closeAction}
        onConfirm={runAction}
      />
      <DeleteUser
        user={action?.type === "delete" ? action.user : null}
        narration={narration}
        setNarration={setNarration}
        pending={actionPending}
        onClose={closeAction}
        onConfirm={runAction}
      />

      <AuditUser audit={audit} onClose={() => setAudit(null)} />
    </div>
  );
}
