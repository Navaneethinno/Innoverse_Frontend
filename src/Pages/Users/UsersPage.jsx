import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  History,
  Plus,
  Pencil,
  ShieldCheck,
  ShieldOff,
  Trash2,
  X,
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
import { Skeleton } from "@/Components/UI/skeleton";
import { notifications } from "@/Utils/Lib/notifications";
import { usersApi } from "@/Services/Users/users.api";
import { AuditModal } from "@/Components/Common/AuditModal";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import {
  checkPasswordRequirements,
  pickDefaultPolicy,
  validatePassword,
} from "@/Utils/Lib/passwordPolicy";

const STATUS_OPTIONS = [
  { value: 0, label: "All statuses" },
  { value: 1, label: "Active" },
];

const glass = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(16px)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--glass-shadow)",
};
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

function UserForm({
  form,
  setForm,
  editing,
  onSubmit,
  onCancel,
  pending,
  institutions,
  profiles,
  passwordPolicy,
  readOnly = false,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const passwordRequirements = checkPasswordRequirements(form.user_pwd, passwordPolicy);

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
      <div className="flex justify-end gap-2 md:col-span-2">
        <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-slate-600">
          {readOnly ? "Close" : "Cancel"}
        </button>
        {!readOnly && (
          <button
            disabled={pending}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Saving..." : editing ? "Save changes" : "Add user"}
          </button>
        )}
      </div>
    </form>
  );
}

export function UsersPage() {
  const [params, setParams] = useState({ page: 1, limit: 10, search: "", status: 0 });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewingOnly, setViewingOnly] = useState(false);
  const [action, setAction] = useState(null);
  const [narration, setNarration] = useState("");
  const [audit, setAudit] = useState(null);
  const usersQuery = useUsersQuery(params);
  const lookupsQuery = useUserLookupsQuery();
  const createMutation = useUserCreateMutation();
  const updateMutation = useUserUpdateMutation();
  const authMutation = useUserAuthMutation();
  const deauthMutation = useUserDeauthMutation();
  const deleteMutation = useUserDeleteMutation();
  const deleteAuthMutation = useUserDeleteAuthMutation();
  const auditMutation = useUserAuditMutation();
  const openCreate = () => {
    setEditing(null);
    setViewingOnly(false);
    setForm(EMPTY_FORM);
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
      else
        await createMutation.mutateAsync({
          ...form,
          inst_id: Number.isInteger(institutionId) ? institutionId : 0,
          profile_id: Number.isInteger(profileId) ? profileId : 0,
        });
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
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">User Management</p>
          <h1 className="text-3xl font-bold text-slate-800">Users</h1>
          <p className="mt-1 text-slate-500">Manage application users and access.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 font-semibold text-white"
        >
          <Plus size={18} /> Add user
        </button>
      </div>
      <div className="relative z-20 rounded-2xl p-4" style={glass}>
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            value={params.search}
            onChange={(event) => setParams({ ...params, page: 1, search: event.target.value })}
            placeholder="Search users"
            className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 outline-none focus:border-blue-400"
          />
          <FilterSelect
            value={params.status}
            onChange={(status) => setParams({ ...params, page: 1, status })}
            options={STATUS_OPTIONS}
            className="w-full md:w-48"
          />
        </div>
      </div>
      {usersQuery.error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle size={18} />
          {usersQuery.error.message}
        </div>
      )}
      <div className="relative z-0 overflow-hidden rounded-2xl" style={glass}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200/70 text-xs uppercase text-slate-500">
              <tr>
                {["User", "Profile", "Institution", "Status", "Actions"].map((heading) => (
                  <th key={heading} className="px-5 py-4">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersQuery.isLoading
                ? Array.from({ length: 5 }, (_, index) => (
                    <tr key={index}>
                      <td colSpan="5" className="px-5 py-4">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  ))
                : usersQuery.data.map((user) => (
                    <tr key={userId(user)} className="hover:bg-white/50">
                      <td className="px-5 py-4 font-semibold text-slate-800">{nameOf(user)}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {user.profile_name ??
                          user.profile?.name ??
                          fieldValue(user, "profile_id") ??
                          "-"}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {user.institution_name ??
                          user.institution?.name ??
                          fieldValue(user, "inst_id") ??
                          "-"}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge
                          status={user.auth_status ?? (user.status === 1 ? "ACTIVE" : "INACTIVE")}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1">
                          <button
                            title="View"
                            onClick={() => openEdit(user, { readOnly: true })}
                            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            title="Edit"
                            onClick={() => openEdit(user)}
                            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            title="Audit"
                            onClick={() => openAudit(user)}
                            className="rounded-lg p-2 text-slate-600"
                          >
                            <History size={16} />
                          </button>
                          <button
                            title="Authorize"
                            onClick={() => setAction({ type: "auth", user })}
                            className="rounded-lg p-2 text-emerald-600"
                          >
                            <ShieldCheck size={16} />
                          </button>
                          <button
                            title="Deauthorize"
                            onClick={() => setAction({ type: "deauth", user })}
                            className="rounded-lg p-2 text-amber-600 hover:bg-amber-50"
                          >
                            <ShieldOff size={16} />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => setAction({ type: "delete", user })}
                            className="rounded-lg p-2 text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            title="Delete authorization"
                            onClick={() => setAction({ type: "deleteAuth", user })}
                            className="rounded-lg p-2 text-red-700"
                          >
                            Delete auth
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              {!usersQuery.isLoading && usersQuery.data.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200/70 px-5 py-4 text-sm text-slate-600">
          <span>
            Page {usersQuery.pagination?.currentPage ?? params.page} of{" "}
            {usersQuery.pagination?.totalPages ?? 0} ({usersQuery.pagination?.totalRecords ?? 0}{" "}
            users)
          </span>
          <div className="flex gap-2">
            <button
              disabled={params.page === 1}
              onClick={() => setParams({ ...params, page: params.page - 1 })}
              className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={params.page >= (usersQuery.pagination?.totalPages ?? params.page)}
              onClick={() => setParams({ ...params, page: params.page + 1 })}
              className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {(showForm || action) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
              {showForm && (
                <>
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-xl font-bold">
                      {viewingOnly ? "View user" : editing ? "Edit user" : "Add user"}
                    </h2>
                    <button onClick={() => setShowForm(false)}>
                      <X />
                    </button>
                  </div>
                  <UserForm
                    form={form}
                    setForm={setForm}
                    editing={editing}
                    readOnly={viewingOnly}
                    onSubmit={submit}
                    onCancel={() => setShowForm(false)}
                    pending={createMutation.isPending || updateMutation.isPending}
                    institutions={lookupsQuery.institutions}
                    profiles={lookupsQuery.profiles}
                    passwordPolicy={passwordPolicy}
                  />
                </>
              )}
              {action && (
                <>
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-xl font-bold">Confirm user action</h2>
                    <button onClick={() => setAction(null)}>
                      <X />
                    </button>
                  </div>
                  <p className="text-slate-600">
                    {action.type} user <strong>{nameOf(action.user)}</strong>?
                  </p>
                  {["deauth", "delete"].includes(action.type) && (
                    <textarea
                      value={narration}
                      onChange={(event) => setNarration(event.target.value)}
                      placeholder="Narration"
                      className="mt-4 min-h-24 w-full rounded-xl border p-3"
                    />
                  )}
                  <div className="mt-5 flex justify-end gap-2">
                    <button onClick={() => setAction(null)} className="rounded-xl px-4 py-2">
                      Cancel
                    </button>
                    <button
                      disabled={
                        actionPending ||
                        (["deauth", "delete"].includes(action.type) && !narration.trim())
                      }
                      onClick={runAction}
                      className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
                    >
                      {actionPending ? "Working..." : "Confirm"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
