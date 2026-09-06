import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  History,
  Plus,
  Pencil,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import {
  useUserAuthMutation,
  useUserAuditMutation,
  useUserCreateMutation,
  useUserDeauthMutation,
  useUserDeleteAuthMutation,
  useUserDeleteMutation,
  useUserLookupsQuery,
  useUserUpdateMutation,
  useUsersQuery,
} from "@/Hooks/Users/userHooks";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { notifications } from "@/Utils/Lib/notifications";
import { usersApi } from "@/Services/Users/users.api";
import { AuditModal } from "@/Components/Common/AuditModal";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { DataTable } from "@/Components/Common/DataTable";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { Modal } from "@/Components/Common/Modal";
import { cn } from "@/Utils/Lib/cn";
import {
  checkPasswordRequirements,
  pickDefaultPolicy,
  validatePassword,
} from "@/Utils/Lib/password-policy";

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
const TABS = ["all", "active", "pending"];
const TAB_LABEL = { all: "All", active: "Active", pending: "Pending" };

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

const EMPTY_FORM = {
  user_name: "",
  user_fname: "",
  user_lname: "",
  user_pwd: "",
  inst_id: "",
  profile_id: "",
  employee_id: "",
  email: "",
  mobile: "",
  gender: "",
  address: "",
  password_policy_id: "",
};
const fields = [
  ["user_name", "Username"],
  ["user_fname", "First name"],
  ["user_lname", "Last name"],
  ["user_pwd", "Password"],
  ["inst_id", "Institution"],
  ["profile_id", "Profile ID"],
  ["employee_id", "Employee ID"],
  ["email", "Email"],
  ["mobile", "Mobile"],
  ["gender", "Gender"],
  ["address", "Address"],
];

function fieldValue(user, key) {
  const aliases = {
    user_name: ["user_name", "auth_username", "username"],
    user_fname: ["user_fname", "first_name", "firstname", "fname", "user_first_name"],
    user_lname: ["user_lname", "last_name", "lastname", "lname", "user_last_name"],
    inst_id: ["inst_id", "institution_id"],
    profile_id: ["profile_id"],
    employee_id: ["employee_id", "employeeId"],
  };
  return (
    (aliases[key] || [key])
      .map((name) => user?.[name])
      .find((value) => value !== undefined && value !== null) || ""
  );
}
function userId(user) {
  return user?.user_id ?? user?.id;
}
function nameOf(user) {
  return fieldValue(user, "user_name") || "Unnamed user";
}

function PasswordPolicyField({ policies, policy, selectedId, onSelect, requirements }) {
  const [expanded, setExpanded] = useState(false);
  const options = policies.length > 0
    ? policies.map((p) => ({ value: p.id, label: p.name }))
    : [{ value: "", label: "No policies available" }];

  return (
    <div className="md:col-span-2">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">Password policy</span>
      <FilterSelect value={selectedId} onChange={onSelect} options={options} className="w-full" />
      {policy && (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            View Password Policy
            <ChevronDown size={13} className={cn("transition-transform", expanded && "rotate-180")} />
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              {requirements.length === 0 ? (
                <li className="text-xs text-slate-400">No specific requirements for this policy.</li>
              ) : (
                requirements.map((req) => (
                  <li key={req.key} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Check size={12} className="text-slate-400" />
                    {req.label}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function UserForm({
  form,
  setForm,
  editing,
  onSubmit,
  institutions,
  profiles,
  passwordPolicies,
  selectedPolicy,
  readOnly = false,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const passwordRequirements = checkPasswordRequirements(form.user_pwd, selectedPolicy);
  const policyRequirements = checkPasswordRequirements("", selectedPolicy);

  return (
    <form onSubmit={onSubmit} id="user-form" className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {fields
        .filter(([key]) => !(readOnly && key === "user_pwd"))
        .map(([key, label]) => (
        <label key={key} className="text-sm text-slate-700">
          <span className="mb-1.5 block font-medium">{label}</span>
          <div className="relative">
            {key === "inst_id" || key === "profile_id" ? (
              <select
                required={!editing}
                disabled={readOnly}
                value={form[key]}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">Select {key === "inst_id" ? "institution" : "profile"}</option>
                {(key === "inst_id" ? institutions : profiles).map((option) => {
                  const id =
                    option.inst_profile_id ??
                    option.institution_id ??
                    option.inst_id ??
                    option.profile_id ??
                    option.id;
                  const label =
                    option.institution_name ??
                    option.inst_name ??
                    option.profile_name ??
                    option.name ??
                    id;
                  return (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                required={!readOnly && !editing && ["user_name", "user_pwd"].includes(key)}
                readOnly={readOnly}
                type={
                  key === "user_pwd"
                    ? showPassword
                      ? "text"
                      : "password"
                    : key === "email"
                      ? "email"
                      : "text"
                }
                value={editing && key === "user_pwd" ? "" : form[key]}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                className={`w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 outline-none focus:border-blue-400${key === "user_pwd" ? " pr-10" : ""}${readOnly ? " bg-slate-50 text-slate-500" : ""}`}
              />
            )}
            {key === "user_pwd" && !readOnly && (
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          </div>
          {key === "user_pwd" && !editing && !readOnly && passwordRequirements.length > 0 && (
            <ul className="mt-2 space-y-1">
              {passwordRequirements.map((req) => (
                <li
                  key={req.key}
                  className={`flex items-center gap-1.5 text-xs ${req.met ? "text-emerald-600" : "text-slate-400"}`}
                >
                  {req.met ? <Check size={13} /> : <span className="h-1 w-1 rounded-full bg-current" />}
                  {req.label}
                </li>
              ))}
            </ul>
          )}
        </label>
      ))}
      {!readOnly && !editing && (
        <PasswordPolicyField
          policies={passwordPolicies}
          policy={selectedPolicy}
          selectedId={form.password_policy_id}
          onSelect={(value) => setForm({ ...form, password_policy_id: value })}
          requirements={policyRequirements}
        />
      )}
    </form>
  );
}

export function UsersPage() {
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
  const auditMutation = useUserAuditMutation();

  const rawUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const visibleUsers = useMemo(() => {
    if (activeTab === "all") return rawUsers;
    const rows = rawUsers.filter((u) => userTabOf(u) === activeTab);
    return activeTab === "pending" ? [...rows].sort((a, b) => userTimestamp(b) - userTimestamp(a)) : rows;
  }, [rawUsers, activeTab]);
  const counts = useMemo(() => {
    const result = { all: rawUsers.length, active: 0, pending: 0 };
    rawUsers.forEach((u) => {
      const tab = userTabOf(u);
      if (tab === "active" || tab === "pending") result[tab] += 1;
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
      if (editing)
        await updateMutation.mutateAsync({
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
        await createMutation.mutateAsync({
          ...userPayload,
          inst_id: Number.isInteger(institutionId) ? institutionId : 0,
          profile_id: Number.isInteger(profileId) ? profileId : 0,
        });
      }
      notifications.success(editing ? "User updated successfully" : "User added successfully");
      setShowForm(false);
    } catch (error) {
      notifications.error(error.message);
    }
  };
  const runAction = async () => {
    if (!action) return;
    try {
      const payload = { user_id: userId(action.user) };
      if (action.type === "auth") await authMutation.mutateAsync(payload);
      if (action.type === "deauth")
        await deauthMutation.mutateAsync({ ...payload, deauth_narration: narration });
      if (action.type === "delete")
        await deleteMutation.mutateAsync({ ...payload, del_narration: narration });
      if (action.type === "deleteAuth") await deleteAuthMutation.mutateAsync(payload);
      notifications.success("User action completed");
      setAction(null);
      setNarration("");
    } catch (error) {
      notifications.error(error.message);
    }
  };
  const openAudit = async (user) => {
    try {
      const response = await auditMutation.mutateAsync({
        user_id: userId(user),
        page: 1,
        limit: 10,
      });
      const entries = Array.isArray(response)
        ? response
        : (response?.data?.user_audit_array ?? response?.data?.audit_array ?? response?.data ?? []);
      setAudit({ user, entries });
    } catch (error) {
      notifications.error(error.message);
    }
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
      sortValue: (u) => u.institution_name ?? u.institution?.name ?? fieldValue(u, "inst_id"),
      render: (u) => u.institution_name ?? u.institution?.name ?? fieldValue(u, "inst_id") ?? "-",
    },
    {
      key: "status",
      label: "Status",
      sortValue: (u) => String(u.auth_status ?? (u.status === 1 ? "ACTIVE" : "INACTIVE")),
      render: (u) => <StatusBadge status={u.auth_status ?? (u.status === 1 ? "ACTIVE" : "INACTIVE")} />,
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (user) => (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <button title="View" onClick={() => openEdit(user, { readOnly: true })} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
            <Eye size={14} />
          </button>
          <button title="Edit" onClick={() => openEdit(user)} className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50">
            <Pencil size={14} />
          </button>
          <button title="Audit" onClick={() => openAudit(user)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
            <History size={14} />
          </button>
          <button title="Authorize" onClick={() => setAction({ type: "auth", user })} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50">
            <ShieldCheck size={14} />
          </button>
          <button title="Deauthorize" onClick={() => setAction({ type: "deauth", user })} className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50">
            <ShieldOff size={14} />
          </button>
          <button title="Delete" onClick={() => setAction({ type: "delete", user })} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50">
            <Trash2 size={14} />
          </button>
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
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-3.5 py-2 text-sm font-bold text-white"
        >
          <Plus size={16} /> Add user
        </button>
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
        {showForm && (
          <Modal
            open={showForm}
            onClose={() => setShowForm(false)}
            title={viewingOnly ? "View user" : editing ? "Edit user" : "Add user"}
            size="lg"
            footer={
              !viewingOnly && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-lg px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="user-form"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving..."
                      : editing
                        ? "Save changes"
                        : "Add user"}
                  </button>
                </>
              )
            }
          >
            <UserForm
              form={form}
              setForm={setForm}
              editing={editing}
              readOnly={viewingOnly}
              onSubmit={submit}
              institutions={lookupsQuery.institutions}
              profiles={lookupsQuery.profiles}
              passwordPolicies={lookupsQuery.passwordPolicies}
              selectedPolicy={selectedPolicy}
            />
          </Modal>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!action}
        onClose={() => setAction(null)}
        title="Confirm user action"
        description={
          action && (
            <>
              {action.type} user <strong>{nameOf(action.user)}</strong>?
            </>
          )
        }
        pending={actionPending}
        confirmDisabled={action && ["deauth", "delete"].includes(action.type) && !narration.trim()}
        destructive={action?.type === "delete"}
        onConfirm={runAction}
      >
        {action && ["deauth", "delete"].includes(action.type) && (
          <textarea
            value={narration}
            onChange={(event) => setNarration(event.target.value)}
            placeholder="Narration"
            className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
          />
        )}
      </ConfirmDialog>

      {audit && (
        <AuditModal
          title={nameOf(audit.user)}
          entries={audit.entries}
          onClose={() => setAudit(null)}
        />
      )}
    </div>
  );
}
