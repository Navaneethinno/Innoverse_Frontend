import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, Eye, History, Pencil, Plus, Search, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { ProfileAuditModal } from "@/Components/Profiles/ProfileAuditModal";
import { ProfilePermissionTree } from "@/Components/Profiles/ProfilePermissionTree";
import { DataTable } from "@/Components/Common/DataTable";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { Modal } from "@/Components/Common/Modal";
import {
  useHasProfileAction,
  useProfileAuthMutation,
  useProfileCreateMutation,
  useProfileDeauthMutation,
  useProfileDeleteAuthMutation,
  useProfileDeleteMutation,
  useProfileMenuItem,
  useProfileUpdateMutation,
  useProfilesQuery,
} from "@/Hooks/Profiles/profileHooks";
import { useActiveInstitutionsQuery } from "@/Hooks/Institutions/institutionHooks";
import { cn } from "@/Utils/Lib/cn";
import { notifications } from "@/Utils/Lib/notifications";

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
const TABS = ["all", "active", "pending"];
const TAB_LABEL = { all: "All", active: "Active", pending: "Pending" };

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

function renderProfileValue(profile, key) {
  const value = profile[key];
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key === "auth_status") return value == null ? "—" : <StatusBadge status={String(value)} />;
  return value == null || value === "" ? "—" : String(value);
}

function profileHasAction(profile, actionId) {
  return (profile.menu_actions ?? []).some((menu) =>
    Array.isArray(menu.actions) && menu.actions.some((action) => Number(action) === actionId),
  );
}

function profileId(profile) {
  return profile?.profile_id ?? profile?.id;
}

function EMPTY_FORM() {
  return { profile_name: "", inst_profile_id: "", menu_info: [] };
}

export function ProfilesPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [action, setAction] = useState(null);
  const [narration, setNarration] = useState("");
  const [auditProfile, setAuditProfile] = useState(null);
  const [viewProfile, setViewProfile] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM());
  const [submitting, setSubmitting] = useState(false);

  const canAdd = useHasProfileAction("Add");
  const canEdit = useHasProfileAction("Edit");
  const canDelete = useHasProfileAction("Delete");
  const canAuthorize = useHasProfileAction("Authorize");

  const [page, setPage] = useState(1);

  // Same reasoning as InstitutionListPage.jsx: /profile/list has no
  // status-filter or search param (confirmed via Postman), so real
  // per-page server requests only produce correct results for the
  // genuinely unfiltered view. "All" with no search fetches real pages
  // from the server (scales to any record count); a tab or search
  // switches to a larger single fetch, filtered client-side.
  const needsFullBatch = activeTab !== "all" || search.trim() !== "";
  const profilesQuery = useProfilesQuery(needsFullBatch ? { page: 1, limit: 500 } : { page, limit: 10 });
  const { data: institutions = [] } = useActiveInstitutionsQuery();
  const checkerMenuItem = useProfileMenuItem();

  const createMutation = useProfileCreateMutation();
  const updateMutation = useProfileUpdateMutation();
  const authMutation = useProfileAuthMutation();
  const deauthMutation = useProfileDeauthMutation();
  const deleteMutation = useProfileDeleteMutation();
  const deleteAuthMutation = useProfileDeleteAuthMutation();

  const profiles = useMemo(() => profilesQuery.data ?? [], [profilesQuery.data]);
  const institutionsById = new Map(institutions.map((institution) => [String(institution.id), institution]));

  const counts = useMemo(() => {
    const result = { all: profiles.length, active: 0, pending: 0 };
    profiles.forEach((p) => {
      const tab = tabOf(p);
      if (tab === "active" || tab === "pending") result[tab] += 1;
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
    setSubmitting(true);
    try {
      const payload = {
        profile_info: {
          profile_id: editing ? profileId(editing) : 0,
          profile_name: form.profile_name,
          inst_profile_id: form.inst_profile_id,
        },
        menu_info: form.menu_info,
      };
      if (editing) await updateMutation.mutateAsync(payload);
      else await createMutation.mutateAsync(payload);
      notifications.success(
        editing ? "Profile edit submitted for approval" : "Profile creation submitted for approval",
      );
      setShowForm(false);
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async () => {
    if (!action) return;
    const id = profileId(action.profile);
    const instProfileId = action.profile?.inst_profile_id;
    try {
      if (action.type === "auth")
        await authMutation.mutateAsync({
          profile_id: id,
          inst_profile_id: instProfileId,
          menu_id: checkerMenuItem?.menu_id,
          action_id: AUTHORIZE_ACTION_ID,
        });
      if (action.type === "deauth")
        await deauthMutation.mutateAsync({
          profile_id: id,
          inst_profile_id: instProfileId,
          menu_id: checkerMenuItem?.menu_id,
          action_id: DEAUTHORIZE_ACTION_ID,
          deauth_narration: narration,
        });
      if (action.type === "delete")
        await deleteMutation.mutateAsync({
          profile_id: id,
          inst_profile_id: instProfileId,
          del_narration: narration,
        });
      if (action.type === "deleteAuth")
        await deleteAuthMutation.mutateAsync({ profile_id: id, inst_profile_id: instProfileId });
      notifications.success("Profile action completed");
      setAction(null);
      setNarration("");
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "Action failed");
    }
  };

  const actionPending =
    authMutation.isPending ||
    deauthMutation.isPending ||
    deleteMutation.isPending ||
    deleteAuthMutation.isPending;

  const columns = [
    { key: "profile_name", label: "Profile Name", align: "left", render: (p) => renderProfileValue(p, "profile_name") },
    {
      key: "institution_name",
      label: "Institution Name",
      sortValue: (p) => p.institution_name ?? institutionsById.get(String(p.inst_profile_id))?.name ?? "",
      render: (p) => renderProfileValue({ institution_name: p.institution_name ?? institutionsById.get(String(p.inst_profile_id))?.name }, "institution_name"),
    },
    {
      key: "code",
      label: "Institution Code",
      sortValue: (p) => institutionsById.get(String(p.inst_profile_id))?.code ?? "",
      render: (p) => renderProfileValue(institutionsById.get(String(p.inst_profile_id)) ?? {}, "code"),
    },
    { key: "auth_status", label: "Authorization Status", sortValue: statusOf, render: (p) => renderProfileValue(p, "auth_status") },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (p) => {
        const canViewProfile = profileHasAction(p, 2);
        const canEditProfile = profileHasAction(p, 3);
        const canDeleteProfile = profileHasAction(p, 4);
        const canAuthorizeProfile = profileHasAction(p, 5);
        return (
          <div className="flex items-center justify-center gap-1">
            {canEditProfile && canEdit && (
              <button title="Edit" onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50">
                <Pencil size={14} />
              </button>
            )}
            {canViewProfile && (
              <button title="View" onClick={() => setViewProfile(p)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
                <Eye size={14} />
              </button>
            )}
            {canViewProfile && (
              <button title="Audit" onClick={() => setAuditProfile(p)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
                <History size={14} />
              </button>
            )}
            {canAuthorizeProfile && canAuthorize && (
              <>
                <button title="Authorize" onClick={() => setAction({ type: "auth", profile: p })} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50">
                  <ShieldCheck size={14} />
                </button>
                <button title="Deauthorize" onClick={() => setAction({ type: "deauth", profile: p })} className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50">
                  <ShieldOff size={14} />
                </button>
              </>
            )}
            {canDeleteProfile && canDelete && (
              <button title="Delete" onClick={() => setAction({ type: "delete", profile: p })} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="pt-3 pb-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-0.5 text-[11px] font-bold uppercase tracking-widest text-blue-400">User Management</p>
          <h1 className="text-xl font-black leading-none tracking-tight text-slate-800">Profiles</h1>
          <p className="mt-1 text-xs font-medium text-slate-400">
            {profiles.length} profiles · {counts.active} active
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
            <Plus size={14} /> New Profile
          </motion.button>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full max-w-xs">
          <Search size={13} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            type="text"
            placeholder="Search profiles…"
            className="w-full rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            style={{ background: "var(--glass-bg)", backdropFilter: "blur(12px)", border: "1px solid var(--glass-border)" }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((value) => (
            <button
              key={value}
              onClick={() => {
                setActiveTab(value);
                setPage(1);
              }}
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

      {profilesQuery.error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={14} /> {profilesQuery.error.message}
          <button onClick={() => void profilesQuery.refetch()} className="ml-auto text-xs font-bold underline">
            Retry
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(p) => profileId(p)}
        isLoading={profilesQuery.isLoading}
        title="Profiles"
        searchableKeys={["profile_name"]}
        emptyTitle="No profiles found"
        emptyDescription="Adjust your search or filter criteria"
        serverPagination={
          needsFullBatch
            ? null
            : {
                page: profilesQuery.pagination?.currentPage ?? page,
                totalPages: profilesQuery.pagination?.totalPages ?? 1,
                totalRecords: profilesQuery.pagination?.totalRecords ?? filtered.length,
                onPageChange: setPage,
              }
        }
      />

      <AnimatePresence>
        {showForm && (
          <Modal
            open={showForm}
            onClose={() => setShowForm(false)}
            title={editing ? "Edit profile" : "New profile"}
            size="lg"
            footer={
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
                  form="profile-form"
                  disabled={submitting}
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editing ? "Save changes" : "Create profile"}
                </button>
              </>
            }
          >
            <form onSubmit={submitForm} className="space-y-4" id="profile-form">
              <label className="block text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Profile name</span>
                <input
                  required
                  value={form.profile_name}
                  onChange={(e) => setForm({ ...form, profile_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 outline-none focus:border-blue-400"
                />
              </label>
              <label className="block text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Institution</span>
                <select
                  required
                  value={form.inst_profile_id}
                  onChange={(e) => setForm({ ...form, inst_profile_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 outline-none focus:border-blue-400"
                >
                  <option value="">Select institution…</option>
                  {institutions.map((inst) => {
                    const id = inst.id ?? inst.inst_id ?? inst.institution_id;
                    return (
                      <option key={id} value={id}>
                        {inst.name ?? id}
                      </option>
                    );
                  })}
                </select>
              </label>
              <div>
                <p className="mb-1.5 block text-sm font-medium text-slate-700">Menu / Action grants</p>
                <ProfilePermissionTree
                  selected={form.menu_info}
                  onChange={(menu_info) => setForm({ ...form, menu_info })}
                />
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!action}
        onClose={() => {
          setAction(null);
          setNarration("");
        }}
        title="Confirm profile action"
        description={
          action && (
            <>
              {action.type} profile <strong>{action.profile?.profile_name}</strong>?
            </>
          )
        }
        pending={actionPending}
        confirmDisabled={action && ["deauth", "delete"].includes(action.type) && !narration.trim()}
        destructive={action?.type === "delete"}
        onConfirm={() => void runAction()}
      >
        {action && ["deauth", "delete"].includes(action.type) && (
          <textarea
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Reason (required)"
            className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
          />
        )}
      </ConfirmDialog>

      {auditProfile && (
        <ProfileAuditModal profile={auditProfile} profileId={profileId(auditProfile)} onClose={() => setAuditProfile(null)} />
      )}

      {viewProfile && (
        <Modal open={!!viewProfile} onClose={() => setViewProfile(null)} title="View profile" size="lg">
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Profile Name</p>
              <p className="text-sm font-semibold text-slate-800">{viewProfile.profile_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Institution</p>
              <p className="text-sm font-semibold text-slate-800">
                {viewProfile.institution_name ?? institutionsById.get(String(viewProfile.inst_profile_id))?.name ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Authorization Status</p>
              {viewProfile.auth_status ? (
                <StatusBadge status={String(viewProfile.auth_status)} />
              ) : (
                <p className="text-sm font-semibold text-slate-800">—</p>
              )}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Menu / Action grants</p>
            <ProfilePermissionTree selected={viewProfile.menu_actions ?? viewProfile.menu_info ?? []} onChange={() => {}} readOnly />
          </div>
        </Modal>
      )}
    </div>
  );
}
