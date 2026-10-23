import { API_ENDPOINTS } from "@/Utils/Constant";
import { mapUserListResponse } from "@/Hooks/UserManagement/userHooks";
import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { usersApi } from "@/Services/UserManagement/users.api";
import { PageTitle } from "@/Components/Common/PageTitle";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { TxnLimits } from "./TxnLimits";
import { useAuth } from "@/Hooks/useAuth";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { RowActions } from "@/Components/Common/RowActions";
import {
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
} from "@/Hooks/UserManagement/userHooks";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { notifications } from "@/Utils/Lib/notifications";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { pickDefaultPolicy, validatePassword } from "@/Utils/Lib/password-policy";
import { EMPTY_FORM, fieldValue, nameOf, userId } from "./UserForm";
import { AddUser } from "./AddUser";
import { EditUser } from "./EditUser";
import { useOwnIds } from "@/Hooks/useInstitutionScope";
import { AuditUser } from "./AuditUser";
import { deriveButtonVisibility, getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

// The users list endpoint only supports status 0/1/2 (all/active/inactive)
// server-side — there is no dedicated "pending" auth_status filter param
// confirmed for /user/list. To keep the same 3-tab All/Active/Pending
// pattern as Institutions/Profiles without inventing a new endpoint, the
// "Pending" tab fetches the same status:0 (all) page and narrows it
// client-side by auth_status — a best-effort match limited to what's on the
// current page (documented in the report as a follow-up once/if the
// backend exposes a real pending filter).
const numericId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export function User() {
  const tr = useConfigLabel();
  const [view, setView] = useState("users");
  // Real permission source — same menu_array the sidebar itself reads.
  // View is the one exception: it's not consistently granted via login's
  // menu_array actions[] the way the others are, so it's always shown
  // rather than gated — a user should always be able to look at a record.
  const canAdd = useHasUserAction("Add");
  const canEdit = useHasUserAction("Edit");
  const own = useOwnIds();
  const canAuthorize = useHasUserAction("Authorize");
  const hasDeauthorizePermission = useHasUserAction("Deauthorize");
  const canDeauthorize = hasDeauthorizePermission || canAuthorize;
  const canDelete = useHasUserAction("Delete");
  const canChangeStatus = useHasUserAction("Change Status");
  const canSubmit = useHasUserAction("Submit");

  const canChooseInstitution = useCanChooseInstitution();
  const ownInstitution = useAuth((state) => state.user?.inst_profile_id);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewingOnly, setViewingOnly] = useState(false);
  const [action, setAction] = useState(null);
  const [narration, setNarration] = useState("");
  const [audit, setAudit] = useState(null);
  const list = useServerList({ api: API_ENDPOINTS.USER_MANAGEMENT.USER.LIST, call: usersApi.list, select: (r) => mapUserListResponse(r).users, reloadOn: "users:data-changed" });
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

  // The server filters by tab (`filter`) and orders (`sort_by`) across all
  // records, so the loaded page is shown as-is.
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
      // data is a list ([kyc]); its first row is the user's KYC.
      const data = response?.data?.data ?? response?.data;
      const kyc = (Array.isArray(data) ? data[0] : data) ?? {};
      if (kyc && typeof kyc === "object") {
        setForm((current) => ({
          ...current,
          ...Object.fromEntries(
            Object.keys(EMPTY_FORM).map((key) => [key, fieldValue(kyc, key) || current[key]]),
          ),
        }));
      }
    } catch (error) {
      // A user with no KYC yet (404) is normal: the form stays as it is.
      if (error?.status === 404) return;
      notifications.error(
        error instanceof Error ? error.message : "Failed to load user KYC details",
      );
    }
  };

  // "Edit profile" on My profile links here as /users?edit=<user_id>: load
  // that record and open the normal (maker-checker) edit form, then drop the
  // param so a refresh or Back doesn't reopen it.
  const [searchParams, setSearchParams] = useSearchParams();
  const editParam = searchParams.get("edit");
  const handledEditParam = useRef(null);
  useEffect(() => {
    if (!editParam || handledEditParam.current === editParam) return;
    handledEditParam.current = editParam;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("edit");
      return next;
    }, { replace: true });
    if (!canEdit) return;
    usersApi
      .get({ user_id: Number(editParam) })
      .then((response) => {
        const record = Array.isArray(response?.data) ? response.data[0] : response?.data;
        if (record) void openEdit(record, { readOnly: String(record.user_id ?? record.id) === own.userId });
      })
      .catch((error) => notifications.error(error instanceof Error ? error.message : String(error)));
    // openEdit is recreated each render; running once per param is the intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam, canEdit]);

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
      // A bank / fintech user has no picker: its own institution.
      const institutionId = numericId(form.inst_id) || (canChooseInstitution ? null : numericId(ownInstitution));
      const profileId = numericId(form.profile_id);
      if (!institutionId || !profileId) {
        notifications.error("Please select a valid institution and profile");
        return;
      }
      if (editing)
        await updateMutation.mutateAsync({
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
        await createMutation.mutateAsync({
          ...userPayload,
          inst_id: institutionId,
          profile_id: profileId,
          password_policy_id: numericId(password_policy_id),
          is_draft: draft,
        });
      }
      setShowForm(false);
    } catch {
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
      if (action.type === "submit") await submitMutation.mutateAsync({ ...payload, narration });
      if (action.type === "auth") await authMutation.mutateAsync(payload);
      if (action.type === "deauth")
        await deauthMutation.mutateAsync({ ...payload, narration: narration });
      if (action.type === "delete")
        await deleteMutation.mutateAsync({ ...payload, narration });
      if (action.type === "deleteAuth") await deleteAuthMutation.mutateAsync(payload);
      if (action.type === "deactivate")
        await deactivateMutation.mutateAsync({ id, narration });
      if (action.type === "reactivate")
        await reactivateMutation.mutateAsync({ id, narration });
      setAction(null);
      setNarration("");
    } catch {
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
      label: tr("User"),
      align: "left",
      sortValue: nameOf,
      render: (u) => <span className="font-semibold text-slate-800">{nameOf(u)}</span>,
    },
    {
      key: "profile",
      label: tr("Profile"),
      sortValue: (u) => u.profile_name ?? u.profile?.name ?? fieldValue(u, "profile_id"),
      render: (u) => u.profile_name ?? u.profile?.name ?? fieldValue(u, "profile_id") ?? "-",
    },
    {
      key: "institution",
      label: tr("Institution"),
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
      label: tr("Status"),
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
      key: "process_status_name",
      label: tr("Process Status"),
      sortValue: (u) => String(u.process_status_name ?? ""),
      render: (u) => (u.process_status_name ? <StatusBadge status={String(u.process_status_name)} variant="subtle" /> : "—"),
    },
    {
      key: "auth_status",
      label: tr("Authorization Status"),
      sortValue: (u) => String(u.auth_status ?? ""),
      render: (u) => (u.auth_status ? <StatusBadge status={String(u.auth_status)} variant="subtle" /> : "—"),
    },
    {
      key: "actions",
      label: tr("Actions"),
      sortable: false,
      render: (user) => {
        // canDeauthorize is intentionally broader than canAuthorize (see its
        // definition above), so Reject visibility is computed against it
        // directly rather than through getMakerCheckerButtons's single
        // canAuthorize gate, which governs both Authorize and Deauthorize.
        const rawVisibility = getMakerCheckerButtons(user, { canAdd, canEdit, canAuthorize, canChangeStatus, canDelete, canSubmit });
        const rawDeauthorize = deriveButtonVisibility(user).deauthorize;
        // canDeauthorize is intentionally broader than canAuthorize, so
        // Reject visibility overrides the generic getMakerCheckerButtons
        // gate (which ties both Authorize and Deauthorize to canAuthorize)
        // rather than using its value directly.
        const visibility = {
          ...rawVisibility,
          deauthorize: canDeauthorize && rawDeauthorize && !rawVisibility.isPendingDelete,
        };
        // The server refuses any change to one's own account (that goes
        // through My Profile / Change Password): view and audit only.
        if (String(user.user_id ?? user.id) === own.userId) Object.assign(visibility, { edit: false, deactivate: false, reactivate: false, delete: false, submit: false, authorize: false, deauthorize: false });
        const pendingType = visibility.isPendingDelete ? "deleteAuth" : "auth";
        return (
          <RowActions
            buttons={visibility}
            onView={() => openEdit(user, { readOnly: true })}
            onEdit={() => openEdit(user)}
            onAudit={() => openAudit(user)}
            onSubmit={() => setAction({ type: "submit", user, label: tr("Submit draft") })}
            onAuthorize={() => setAction({ type: pendingType, user, label: "Authorize" })}
            onDeauthorize={() => setAction({ type: "deauth", user, label: "Deauthorize" })}
            onDeactivate={() => setAction({ type: "deactivate", user, label: "Deactivate" })}
            onReactivate={() => setAction({ type: "reactivate", user, label: "Activate" })}
            onDelete={() => setAction({ type: "delete", user, label: "Delete" })}
          />
        );
      },
    },
  ];

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <PageTitle>{tr("Users")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          {tr("Manage application users and access.")}
        </p>
      </div>
      {/* Transaction limits (handoff 13): same menu and permissions. */}
      <SegmentedSwitch className="mb-3" value={view} onChange={setView} options={[{ value: "users", label: tr("Users") }, { value: "limits", label: tr("Transaction limits") }]} />
      {view === "limits" ? (
        <TxnLimits />
      ) : (
        <>

      <ListTable list={list} actions={canAdd && (
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={openCreate}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
              style={{ background: "var(--primary)" }}
            >
              <Plus size={14} /> {tr("Add")} {tr("user")}
            </motion.button>
          )} columns={columns} rowKey={(u) => userId(u)} title={tr("Users")} emptyTitle={tr("No users found")} />

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
        destructive={["delete", "deleteAuth"].includes(action?.type)}
        pending={actionPending}
        confirmDisabled={["deauth", "delete"].includes(action?.type) && !narration.trim()}
        onClose={closeAction}
        onConfirm={() => void runAction()}
      >
        {["auth", "deauth"].includes(action?.type) && <PendingChangesDiff {...pendingInfo} />}
        <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Narration{["deauth", "delete"].includes(action?.type) ? " *" : ""}
          <textarea
            value={narration}
            onChange={(event) => setNarration(event.target.value)}
            placeholder={["deauth", "delete"].includes(action?.type) ? "Narration is required" : "Narration"}
            className="mt-1.5 min-h-24 w-full rounded-xl border border-border p-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-[var(--primary)]"
          />
        </label>
      </ConfirmDialog>

      <AuditUser audit={audit} onClose={() => setAudit(null)} />
        </>
      )}
    </div>
  );
}
