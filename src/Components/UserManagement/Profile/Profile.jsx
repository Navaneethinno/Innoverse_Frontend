import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, Eye, History, Pencil, Plus, Send, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { ProfilePermissionTree } from "@/Components/Profiles/ProfilePermissionTree";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { actionButtonClass } from "@/Components/Common/actionStyles";
import { StatusFilterTabs } from "@/Components/Common/StatusFilterTabs";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import {
  mapProfileListResponse,
  useHasProfileAction,
  useProfileAuthMutation,
  useProfileCreateMutation,
  useProfileSubmitMutation,
  useProfileDeauthMutation,
  useProfileDeleteAuthMutation,
  useProfileDeleteMutation,
  useProfileMenuItem,
  useProfileUpdateMutation,
  useProfilesQuery,
} from "@/Hooks/Profiles/profileHooks";
import { profilesApi } from "@/Services/Profiles/profiles.api";
import { useActiveInstitutionsQuery } from "@/Hooks/Institutions/institutionHooks";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { EMPTY_FORM, profileId } from "./ProfileForm";
import { AddProfile } from "./AddProfile";
import { EditProfile } from "./EditProfile";
import { AuthProfile } from "./AuthProfile";
import { DeauthProfile } from "./DeauthProfile";
import { DeleteProfile } from "./DeleteProfile";
import { AuditProfile } from "./AuditProfile";

// Fixed action ids for the checker's own Authorize/Deauthorize buttons, per
// payse's AuthProfile.jsx (action_id: 5 for authorize, 4 for deauthorize) —
// these identify the CHECKER's own action against the "Profiles" menu item,
// not any grant inside the profile record being approved. See
// profiles.api.js's auth/deauth comments for the full reasoning.
const AUTHORIZE_ACTION_ID = 5;
const DEAUTHORIZE_ACTION_ID = 4;

// Every non-active, non-terminal auth_status groups into "Pending" — the
// real specific value still shows per-row via StatusBadge.
const ACTIVE_STATUSES = ["ACTIVE", "AUTHORIZED"];
const TERMINAL_INACTIVE_STATUSES = ["INACTIVE", "DEACTIVATED"];

function statusOf(p) {
  return String(p.auth_status ?? p.status ?? "").toUpperCase();
}
function tabOf(p) {
  const status = statusOf(p);
  if (ACTIVE_STATUSES.includes(status)) return "active";
  if (TERMINAL_INACTIVE_STATUSES.includes(status)) return "inactive";
  return "pending";
}
function timestampOf(p) {
  const raw = p.updated_time ?? p.created_time;
  const time = raw ? new Date(raw).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
}

// Native select values are always strings. The Profile API expects numeric
// identifiers, so normalize them before building any request payload.
function numericId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function renderProfileValue(profile, key) {
  const value = profile[key];
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key === "auth_status" || key === "process_status_name")
    return value == null ? "—" : <StatusBadge status={String(value)} variant="subtle" />;
  return value == null || value === "" ? "—" : String(value);
}

export function Profile() {
  const { t } = useTranslation("profiles");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [action, setAction] = useState(null);
  const [narration, setNarration] = useState("");
  const [auditProfile, setAuditProfile] = useState(null);
  const [viewProfile, setViewProfile] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM());

  const canAdd = useHasProfileAction("Add");
  const canEdit = useHasProfileAction("Edit");
  const canDelete = useHasProfileAction("Delete");
  const canAuthorize = useHasProfileAction("Authorize");
  const canSubmit = useHasProfileAction("Submit");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Same reasoning as InstitutionProfile.jsx: /profile/list has no
  // status-filter or search param (confirmed via Postman), so real
  // per-page server requests only produce correct results for the
  // genuinely unfiltered view. "All" with no search fetches real pages
  // from the server (scales to any record count); a tab or search
  // switches to a larger single fetch, filtered client-side.
  const needsFullBatch = activeTab !== "all" || search.trim() !== "";
  const profilesQuery = useProfilesQuery(needsFullBatch ? { page: 1, limit: 500 } : { page, limit });
  const { data: institutions = [] } = useActiveInstitutionsQuery();
  const checkerMenuItem = useProfileMenuItem();

  const createMutation = useProfileCreateMutation();
  const updateMutation = useProfileUpdateMutation();
  const submitMutation = useProfileSubmitMutation();
  const authMutation = useProfileAuthMutation();
  const deauthMutation = useProfileDeauthMutation();
  const deleteMutation = useProfileDeleteMutation();
  const deleteAuthMutation = useProfileDeleteAuthMutation();

  const profiles = useMemo(() => profilesQuery.data ?? [], [profilesQuery.data]);
  const institutionsById = new Map(institutions.map((institution) => [String(institution.id), institution]));

  const counts = useMemo(() => {
    const result = { all: profiles.length, active: 0, pending: 0, inactive: 0 };
    profiles.forEach((p) => {
      result[tabOf(p)] += 1;
    });
    return result;
  }, [profiles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = profiles.filter((p) => {
      const matchSearch = !q || String(p.profile_name ?? "").toLowerCase().includes(q);
      const matchTab = activeTab === "all" || tabOf(p) === activeTab;
      return matchSearch && matchTab;
    });
    if (activeTab === "pending" || activeTab === "all") {
      return [...rows].sort((a, b) => timestampOf(b) - timestampOf(a));
    }
    return rows;
  }, [profiles, search, activeTab]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM());
    setShowForm(true);
  };
  const openEdit = (profile) => {
    setEditing(profile);
    setForm({
      profile_name: profile.profile_name ?? "",
      inst_profile_id: profile.inst_profile_id ?? "",
      menu_info: Array.isArray(profile.menu_info) ? profile.menu_info : [],
    });
    setShowForm(true);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    const institutionId = numericId(form.inst_profile_id);
    if (!institutionId) {
      notifications.error("Please select a valid institution");
      return;
    }
    if (!Array.isArray(form.menu_info) || form.menu_info.length === 0) {
      notifications.error("Select at least one valid menu action");
      return;
    }
    try {
      const payload = {
        profile_info: {
          profile_id: editing ? numericId(profileId(editing)) : 0,
          profile_name: form.profile_name,
          inst_profile_id: institutionId,
        },
        menu_info: form.menu_info,
        is_draft: event.nativeEvent.submitter?.dataset?.mode === "draft",
      };
      const result = editing
        ? await updateMutation.mutateAsync(payload)
        : await createMutation.mutateAsync(payload);
      notifications.success(
        apiMessage(
          result,
          editing ? "Profile edit submitted for approval" : "Profile creation submitted for approval",
        ),
      );
      setShowForm(false);
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "Failed to save profile");
    }
  };

  const closeAction = () => {
    setAction(null);
    setNarration("");
  };

  const runAction = async () => {
    if (!action) return;
    const id = numericId(profileId(action.profile));
    const instProfileId = numericId(action.profile?.inst_profile_id);
    if (!id || !instProfileId) {
      notifications.error("The selected profile has an invalid identifier");
      return;
    }
    try {
      let result;
      if (action.type === "submit")
        result = await submitMutation.mutateAsync({ profile_id: id, narration });
      if (action.type === "auth")
        result = await authMutation.mutateAsync({
          profile_id: id,
          inst_profile_id: instProfileId,
          menu_id: checkerMenuItem?.menu_id,
          action_id: AUTHORIZE_ACTION_ID,
        });
      if (action.type === "deauth")
        result = await deauthMutation.mutateAsync({
          profile_id: id,
          inst_profile_id: instProfileId,
          menu_id: checkerMenuItem?.menu_id,
          action_id: DEAUTHORIZE_ACTION_ID,
          narration: narration,
        });
      if (action.type === "delete")
        result = await deleteMutation.mutateAsync({
          profile_id: id,
          inst_profile_id: instProfileId,
          del_narration: narration,
        });
      if (action.type === "deleteAuth")
        result = await deleteAuthMutation.mutateAsync({ profile_id: id, inst_profile_id: instProfileId });
      notifications.success(apiMessage(result, "Profile action completed"));
      setAction(null);
      setNarration("");
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "Action failed");
    }
  };

  const actionPending =
    submitMutation.isPending ||
    authMutation.isPending ||
    deauthMutation.isPending ||
    deleteMutation.isPending ||
    deleteAuthMutation.isPending;

  const columns = [
    { key: "profile_name", label: t("profileName"), align: "left", render: (p) => renderProfileValue(p, "profile_name") },
    {
      key: "institution_name",
      label: t("institutionName"),
      sortValue: (p) =>
        p.inst_profile_name ?? p.institution_name ?? institutionsById.get(String(p.inst_profile_id))?.name ?? "",
      render: (p) =>
        renderProfileValue(
          {
            institution_name:
              p.inst_profile_name ??
              p.institution_name ??
              institutionsById.get(String(p.inst_profile_id))?.name,
          },
          "institution_name",
        ),
    },
    {
      key: "code",
      label: t("institutionCode"),
      sortValue: (p) => institutionsById.get(String(p.inst_profile_id))?.code ?? "",
      render: (p) => renderProfileValue(institutionsById.get(String(p.inst_profile_id)) ?? {}, "code"),
    },
    {
      key: "status_name",
      label: t("common:status"),
      sortValue: (p) => p.status_name ?? p.status ?? "",
      render: (p) =>
        p.status == null && !p.status_name ? (
          "—"
        ) : (
          <StatusBadge status={String(p.status_name ?? (p.status === 1 ? "ACTIVE" : "INACTIVE")).toUpperCase()} />
        ),
    },
    {
      key: "process_status_name",
      label: "Process Status",
      sortValue: (p) => p.process_status_name ?? "",
      render: (p) => renderProfileValue(p, "process_status_name"),
    },
    { key: "auth_status", label: t("authorizationStatus"), sortValue: statusOf, render: (p) => renderProfileValue(p, "auth_status") },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (p) => {
        const visibility = getMakerCheckerButtons(p, { canAdd, canEdit, canAuthorize, canDelete, canSubmit });
        const actions = [
          ...(visibility.submitDraft ? [["submit", "Submit draft", Send, "submit"]] : []),
          ...(visibility.authorize
            ? [[visibility.isPendingDelete ? "deleteAuth" : "auth", "Authorize", ShieldCheck, visibility.isPendingDelete ? "deleteAuth" : "auth"]]
            : []),
          ...(visibility.deauthorize ? [["deauth", "Deauthorize", ShieldOff, "deauth"]] : []),
          ...(visibility.delete ? [["delete", "Delete", Trash2, "delete"]] : []),
        ];
        return (
          <div className="flex items-center justify-center gap-1">
            {visibility.edit && (
              <UiTooltip label="Edit">
                <button type="button" onClick={() => openEdit(p)} className={actionButtonClass("edit")}>
                  <Pencil size={14} />
                </button>
              </UiTooltip>
            )}
            <UiTooltip label="View">
              <button type="button" onClick={() => setViewProfile(p)} className={actionButtonClass("view")}>
                <Eye size={14} />
              </button>
            </UiTooltip>
            <UiTooltip label="Audit">
              <button type="button" onClick={() => setAuditProfile(p)} className={actionButtonClass("view")}>
                <History size={14} />
              </button>
            </UiTooltip>
            {actions.map(([type, label, Icon, style]) => (
              <UiTooltip key={type} label={label}>
                <button type="button" onClick={() => setAction({ type, profile: p, label, style })} className={actionButtonClass(style)}>
                  <Icon size={14} />
                </button>
              </UiTooltip>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <div className="pt-3 pb-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-0.5 text-[11px] font-bold uppercase tracking-widest text-blue-400">{t("userManagement")}</p>
          <h1 className="text-xl font-black leading-none tracking-tight text-slate-800">{t("profilesTitle")}</h1>
          <p className="mt-1 text-xs font-medium text-slate-400">
            {t("profilesActiveSummary", { count: profiles.length, active: counts.active })}
          </p>
        </div>
        {canAdd && (
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white shadow-lg shadow-blue-200/50"
            style={{ background: "#2266EE" }}
          >
            <Plus size={14} /> {t("newProfile")}
          </motion.button>
        )}
      </div>

      <div className="mb-4">
        <StatusFilterTabs
          rows={profiles}
          value={activeTab}
          onChange={(value) => {
            setActiveTab(value);
            setPage(1);
          }}
          search={search}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder={t("searchProfilesPlaceholder")}
        />
      </div>

      {profilesQuery.error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={14} /> {profilesQuery.error.message}
          <button onClick={() => void profilesQuery.refetch()} className="ml-auto text-xs font-bold underline">
            {t("common:retry")}
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(p) => profileId(p)}
        isLoading={profilesQuery.isLoading}
        title={t("profilesTitle")}
        searchableKeys={["profile_name"]}
        emptyTitle={t("noProfilesFound")}
        emptyDescription={t("adjustSearchOrFilter")}
        fetchMore={async (page, limit) => {
          const mapped = mapProfileListResponse(await profilesApi.list({ page, limit }));
          return { rows: mapped.profiles, totalPages: mapped.pagination.totalPages };
        }}
        serverPagination={
          needsFullBatch
            ? null
            : {
                page: profilesQuery.pagination?.currentPage ?? page,
                totalPages: profilesQuery.pagination?.totalPages ?? 1,
                totalRecords: profilesQuery.pagination?.totalRecords ?? filtered.length,
                onPageChange: setPage,
                limit,
                onLimitChange: (next) => {
                  setLimit(next);
                  setPage(1);
                },
              }
        }
      />

      <AnimatePresence>
        {showForm && !editing && (
          <AddProfile
            open={showForm}
            onClose={() => setShowForm(false)}
            form={form}
            setForm={setForm}
            institutions={institutions}
            onSubmit={submitForm}
            submitting={createMutation.isPending || submitMutation.isPending}
          />
        )}
        {showForm && editing && (
          <EditProfile
            open={showForm}
            onClose={() => setShowForm(false)}
            form={form}
            setForm={setForm}
            institutions={institutions}
            onSubmit={submitForm}
            submitting={updateMutation.isPending || submitMutation.isPending}
          />
        )}
      </AnimatePresence>

      <AuthProfile
        profile={action?.type === "auth" ? action.profile : null}
        pending={actionPending}
        onClose={closeAction}
        onConfirm={() => void runAction()}
      />
      <DeauthProfile
        profile={action?.type === "deauth" ? action.profile : null}
        narration={narration}
        setNarration={setNarration}
        pending={actionPending}
        onClose={closeAction}
        onConfirm={() => void runAction()}
      />
      <DeleteProfile
        profile={action?.type === "delete" ? action.profile : null}
        narration={narration}
        setNarration={setNarration}
        pending={actionPending}
        onClose={closeAction}
        onConfirm={() => void runAction()}
      />

      <ConfirmDialog
        open={["submit", "deleteAuth"].includes(action?.type)}
        title={`${action?.label ?? "Confirm action"} profile`}
        confirmLabel={action?.label ?? "Confirm"}
        destructive={action?.type === "deleteAuth"}
        pending={actionPending}
        onClose={closeAction}
        onConfirm={() => void runAction()}
      >
        {action?.type === "submit" && (
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Narration
            <textarea
              value={narration}
              onChange={(event) => setNarration(event.target.value)}
              className="mt-1.5 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-blue-400"
            />
          </label>
        )}
      </ConfirmDialog>

      {auditProfile && <AuditProfile profile={auditProfile} onClose={() => setAuditProfile(null)} />}

      {viewProfile && (
        <Modal open={!!viewProfile} onClose={() => setViewProfile(null)} title={t("viewProfile")} size="lg">
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("profileName")}</p>
              <p className="text-sm font-semibold text-slate-800">{viewProfile.profile_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("institution")}</p>
              <p className="text-sm font-semibold text-slate-800">
                {viewProfile.institution_name ?? institutionsById.get(String(viewProfile.inst_profile_id))?.name ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("authorizationStatus")}</p>
              {viewProfile.auth_status ? (
                <StatusBadge status={String(viewProfile.auth_status)} />
              ) : (
                <p className="text-sm font-semibold text-slate-800">—</p>
              )}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">{t("menuActionGrants")}</p>
            <ProfilePermissionTree selected={viewProfile.menu_actions ?? viewProfile.menu_info ?? []} onChange={() => {}} readOnly />
          </div>
        </Modal>
      )}
    </div>
  );
}
